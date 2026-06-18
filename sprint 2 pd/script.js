
const DEFAULT_BUDGET = 50000;
const LOW_BALANCE_THRESHOLD = 5000;


const CURRENCY_RATES = {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095
};

const CURRENCY_SYMBOLS = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
};


let expenses = [];
let currentCurrency = 'INR';
let editingIndex = -1;
let expenseChart = null;


document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadExpensesFromStorage();
    setTodayDate();
    setupEventListeners();
    updateDashboard();
    initChart();
}


function setupEventListeners() {
    
    document.getElementById('expenseForm').addEventListener('submit', handleAddExpense);
    
    
    document.getElementById('currencySelect').addEventListener('change', (e) => {
        currentCurrency = e.target.value;
        updateDashboard();
    });
    
    
    document.getElementById('editForm').addEventListener('submit', handleEditExpense);
    
    
    document.getElementById('modalClose').addEventListener('click', closeEditModal);
    document.getElementById('modalCancel').addEventListener('click', closeEditModal);
    
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('editModal');
        if (e.target === modal) {
            closeEditModal();
        }
    });
    

    document.getElementById('downloadReportBtn').addEventListener('click', downloadReport);
}


function setTodayDate() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    document.getElementById('todayDate').textContent = today;
    
   
    const today_formatted = new Date().toISOString().split('T')[0];
    document.getElementById('date').valueAsDate = new Date();
}

function handleAddExpense(e) {
    e.preventDefault();
    
    const category = document.getElementById('category').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const notes = document.getElementById('notes').value;
    
    if (!category || !amount || !date) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (amount <= 0) {
        showNotification('Amount must be greater than zero', 'error');
        return;
    }
    
    
    const expense = {
        id: Date.now(),
        category,
        amount,
        date,
        notes,
        createdAt: new Date().toISOString()
    };
    
    expenses.push(expense);
    saveExpensesToStorage();
    updateDashboard();
    
    // Reset form
    document.getElementById('expenseForm').reset();
    document.getElementById('date').valueAsDate = new Date();
    
    showNotification('Expense added successfully!', 'success');
}

function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        expenses = expenses.filter(exp => exp.id !== id);
        saveExpensesToStorage();
        updateDashboard();
        showNotification('Expense deleted successfully', 'success');
    }
}

function openEditModal(id) {
    const expense = expenses.find(exp => exp.id === id);
    if (!expense) return;
    
    editingIndex = expenses.indexOf(expense);
    
    
    document.getElementById('editCategory').value = expense.category;
    document.getElementById('editAmount').value = expense.amount;
    document.getElementById('editDate').value = expense.date;
    document.getElementById('editNotes').value = expense.notes;
    
    
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    editingIndex = -1;
    document.getElementById('editForm').reset();
}

function handleEditExpense(e) {
    e.preventDefault();
    
    if (editingIndex === -1) return;
    
    const category = document.getElementById('editCategory').value;
    const amount = parseFloat(document.getElementById('editAmount').value);
    const date = document.getElementById('editDate').value;
    const notes = document.getElementById('editNotes').value;
    
    if (amount <= 0) {
        showNotification('Amount must be greater than zero', 'error');
        return;
    }
    
    
    expenses[editingIndex] = {
        ...expenses[editingIndex],
        category,
        amount,
        date,
        notes
    };
    
    saveExpensesToStorage();
    updateDashboard();
    closeEditModal();
    showNotification('Expense updated successfully!', 'success');
}


function updateDashboard() {
    updateSummaryCards();
    updateExpenseTable();
    checkLowBalance();
    generateInsights();
    updateChart();
}

function updateSummaryCards() {
    const totalExpenses = calculateTotalExpenses();
    const remainingBalance = DEFAULT_BUDGET - totalExpenses;
    const totalTransactions = expenses.length;
    
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    
    document.getElementById('totalExpenses').textContent = 
        `${symbol}${formatCurrency(totalExpenses)}`;
    
    document.getElementById('remainingBalance').textContent = 
        `${symbol}${formatCurrency(remainingBalance)}`;
    
    document.getElementById('totalTransactions').textContent = totalTransactions;
}

function calculateTotalExpenses() {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function formatCurrency(amount) {
    const converted = amount * CURRENCY_RATES[currentCurrency];
    return converted.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function updateExpenseTable() {
    const tbody = document.getElementById('expenseTableBody');
    
    if (expenses.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5" class="text-center">No expenses yet. Add one to get started!</td>
            </tr>
        `;
        return;
    }
    
    
    const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    
    tbody.innerHTML = sortedExpenses.map(expense => `
        <tr>
            <td>${expense.category}</td>
            <td>${symbol}${formatCurrency(expense.amount)}</td>
            <td>${formatDate(expense.date)}</td>
            <td>${expense.notes ? expense.notes.substring(0, 30) + (expense.notes.length > 30 ? '...' : '') : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-edit" onclick="openEditModal(${expense.id})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteExpense(${expense.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getEmojiForCategory(category) {
    const emojis = {
        'Food': 'F',
        'Transport': 'T',
        'Entertainment': 'E',
        'Shopping': 'S',
        'Utilities': 'U',
        'Health': 'H',
        'Travel': 'Tr',
        'Other': 'O'
    };
    return emojis[category] || 'O';
}


function initChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#6366f1',
                    '#8b5cf6',
                    '#ec4899',
                    '#f59e0b',
                    '#10b981',
                    '#06b6d4',
                    '#3b82f6',
                    '#ef4444'
                ],
                borderColor: '#1e293b',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#f1f5f9',
                        font: { size: 12, weight: 'bold' },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const symbol = CURRENCY_SYMBOLS[currentCurrency];
                            const value = context.parsed;
                            const converted = value * CURRENCY_RATES[currentCurrency];
                            return `${symbol}${converted.toLocaleString('en-IN', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                            })}`;
                        }
                    },
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#f1f5f9',
                    borderColor: '#6366f1',
                    borderWidth: 1
                }
            }
        }
    });
}

function updateChart() {
    const categoryData = {};
    
    expenses.forEach(expense => {
        if (!categoryData[expense.category]) {
            categoryData[expense.category] = 0;
        }
        categoryData[expense.category] += expense.amount;
    });
    
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data = data;
    expenseChart.update();
}


function checkLowBalance() {
    const totalExpenses = calculateTotalExpenses();
    const remainingBalance = DEFAULT_BUDGET - totalExpenses;
    
    const warningBanner = document.getElementById('lowBalanceWarning');
    
    if (remainingBalance < LOW_BALANCE_THRESHOLD) {
        warningBanner.style.display = 'block';
    } else {
        warningBanner.style.display = 'none';
    }
}


function generateInsights() {
    const container = document.getElementById('insightsContainer');
    
    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="insight-placeholder">
                <p>Add expenses to see personalized spending insights</p>
            </div>
        `;
        return;
    }
    
    const categoryData = {};
    let totalExpenses = 0;
    
    expenses.forEach(expense => {
        if (!categoryData[expense.category]) {
            categoryData[expense.category] = 0;
        }
        categoryData[expense.category] += expense.amount;
        totalExpenses += expense.amount;
    });
    
    
    const insights = [];
    
    
    const highestCategory = Object.keys(categoryData).reduce((a, b) => 
        categoryData[a] > categoryData[b] ? a : b
    );
    const highestAmount = categoryData[highestCategory];
    const highestPercentage = ((highestAmount / totalExpenses) * 100).toFixed(1);
    
    insights.push(
        `${highestCategory} is your highest spending category at ${highestPercentage}% of total expenses.`
    );
    
    
    const avgExpense = totalExpenses / expenses.length;
    if (expenses.length > 1) {
        insights.push(
            `Your average expense is ${CURRENCY_SYMBOLS[currentCurrency]}${formatCurrency(avgExpense)}. ` +
            `You've made ${expenses.length} transactions this month.`
        );
    }
    
    
    const remainingBalance = DEFAULT_BUDGET - totalExpenses;
    const percentageUsed = ((totalExpenses / DEFAULT_BUDGET) * 100).toFixed(1);
    
    if (percentageUsed > 80) {
        insights.push(
            `You've used ${percentageUsed}% of your budget! Consider cutting back on ${highestCategory}.`
        );
    } else if (percentageUsed > 50) {
        insights.push(
            `You're at ${percentageUsed}% of your budget. Pace yourself to avoid overspending!`
        );
    }
    
    
    const categoryCount = Object.keys(categoryData).length;
    if (categoryCount === 1) {
        insights.push(
            `Try diversifying your spending across different categories for better financial health.`
        );
    }
    
    
    if (totalExpenses < DEFAULT_BUDGET * 0.3) {
        insights.push(
            `Great spending control! You're well within your budget limits.`
        );
    }
    
    
    container.innerHTML = insights.map(insight => `
        <div class="insight-card">
            <p>${insight}</p>
        </div>
    `).join('');
}


function downloadReport() {
    const totalExpenses = calculateTotalExpenses();
    const remainingBalance = DEFAULT_BUDGET - totalExpenses;
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    
    // Create a temporary div for PDF content
    const reportDiv = document.createElement('div');
    reportDiv.style.padding = '20px';
    reportDiv.style.fontFamily = 'Arial, sans-serif';
    reportDiv.style.color = '#333';
    reportDiv.style.backgroundColor = 'white';
    
    // Build HTML content
    let htmlContent = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0088bb; margin: 0 0 5px 0; font-size: 28px;">Personal Finance Report</h1>
            <p style="color: #666; margin: 5px 0;">Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div style="display: flex; gap: 15px; margin: 30px 0; justify-content: space-around;">
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
                <h3 style="color: #666; margin: 0; font-size: 14px;">Total Expenses</h3>
                <p style="font-size: 24px; font-weight: bold; color: #0088bb; margin: 10px 0 0 0;">${symbol}${formatCurrency(totalExpenses)}</p>
            </div>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
                <h3 style="color: #666; margin: 0; font-size: 14px;">Remaining Balance</h3>
                <p style="font-size: 24px; font-weight: bold; color: #00a366; margin: 10px 0 0 0;">${symbol}${formatCurrency(remainingBalance)}</p>
            </div>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
                <h3 style="color: #666; margin: 0; font-size: 14px;">Total Transactions</h3>
                <p style="font-size: 24px; font-weight: bold; color: #0088bb; margin: 10px 0 0 0;">${expenses.length}</p>
            </div>
        </div>
        
        <h2 style="color: #0088bb; border-bottom: 2px solid #0088bb; padding-bottom: 10px; margin-top: 40px;">Expense Summary</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr style="background: #0088bb; color: white;">
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Category</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Amount</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Date</th>
                    <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Notes</th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map((expense, index) => `
                    <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
                        <td style="padding: 12px; border: 1px solid #ddd;">${expense.category}</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${symbol}${formatCurrency(expense.amount)}</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${formatDate(expense.date)}</td>
                        <td style="padding: 12px; border: 1px solid #ddd;">${expense.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px;">
            <p style="margin: 0;">This report was generated from your Finance Manager Dashboard</p>
            <p style="margin: 5px 0 0 0;">© 2026 Personal Finance Manager - All rights reserved</p>
        </div>
    `;
    
    reportDiv.innerHTML = htmlContent;

    const element = reportDiv;
    const opt = {
        margin: 10,
        filename: `Finance_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        showNotification('Report downloaded successfully!', 'success');
    }).catch((err) => {
        console.error('PDF generation error:', err);
        showNotification('Error generating PDF. Please try again.', 'error');
    });
}


function saveExpensesToStorage() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

function loadExpensesFromStorage() {
    const stored = localStorage.getItem('expenses');
    if (stored) {
        try {
            expenses = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading expenses from storage:', e);
            expenses = [];
        }
    } else {
        expenses = [];
    }
}


function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}


const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


function getRemainingBudgetPercentage() {
    const totalExpenses = calculateTotalExpenses();
    const remainingBalance = DEFAULT_BUDGET - totalExpenses;
    return (remainingBalance / DEFAULT_BUDGET) * 100;
}

function getTotalCategoryExpense(category) {
    return expenses
        .filter(exp => exp.category === category)
        .reduce((sum, exp) => sum + exp.amount, 0);
}


window.debugFinance = {
    getExpenses: () => expenses,
    getBudget: () => DEFAULT_BUDGET,
    getTotalExpenses: () => calculateTotalExpenses(),
    getRemainingBalance: () => DEFAULT_BUDGET - calculateTotalExpenses(),
    clearAllData: () => {
        if (confirm('Are you sure you want to clear all expenses? This cannot be undone!')) {
            expenses = [];
            saveExpensesToStorage();
            updateDashboard();
            showNotification('All data cleared!', 'success');
        }
    }
};

console.log('Finance Manager Dashboard loaded successfully!');
console.log('Tip: Use window.debugFinance for debugging and clearing data');
