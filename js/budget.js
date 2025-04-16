document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tripSelect = document.getElementById('tripSelect');
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    const expenseModal = document.getElementById('expenseModal');
    const expenseForm = document.getElementById('expenseForm');
    const cancelExpense = document.getElementById('cancelExpense');
    const categoryFilter = document.getElementById('categoryFilter');
    const dateFilter = document.getElementById('dateFilter');
    const clearFilters = document.getElementById('clearFilters');
    const expensesList = document.getElementById('expensesList');

    // Charts
    let categoryChart;
    let spendingChart;

    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadUserTrips(user.uid);
        } else {
            window.location.href = 'auth.html';
        }
    });

    // Load user's trips
    function loadUserTrips(userId) {
        const tripsRef = db.ref('trips');
        tripsRef.orderByChild('userId').equalTo(userId).on('value', (snapshot) => {
            tripSelect.innerHTML = '<option value="">Select a Trip</option>';
            
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const trip = child.val();
                    const option = document.createElement('option');
                    option.value = child.key;
                    option.textContent = trip.name;
                    tripSelect.appendChild(option);
                });
            }
        });
    }

    // Trip selection change
    tripSelect.addEventListener('change', () => {
        const tripId = tripSelect.value;
        if (tripId) {
            loadTripExpenses(tripId);
            updateCharts(tripId);
        } else {
            resetBudgetDisplay();
        }
    });

    // Load trip expenses
    function loadTripExpenses(tripId) {
        const userId = auth.currentUser.uid;
        const expensesRef = db.ref(`users/${userId}/expenses/${tripId}`);
        expensesRef.on('value', (snapshot) => {
            expensesList.innerHTML = '';
            let totalSpent = 0;
            
            if (snapshot.exists()) {
                const expenses = [];
                snapshot.forEach((child) => {
                    const expense = child.val();
                    expense.id = child.key;
                    expenses.push(expense);
                    totalSpent += parseFloat(expense.amount);
                });

                // Sort expenses by date
                expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Apply filters
                const categoryValue = categoryFilter.value;
                const dateValue = dateFilter.value;
                
                const filteredExpenses = expenses.filter(expense => {
                    const categoryMatch = !categoryValue || expense.category === categoryValue;
                    const dateMatch = !dateValue || expense.date === dateValue;
                    return categoryMatch && dateMatch;
                });

                // Display expenses
                filteredExpenses.forEach(expense => {
                    addExpenseToList(expense);
                });
            }

            updateTotalAmount(totalSpent);
        });
    }

    // Add expense to list
    function addExpenseToList(expense) {
        const expenseElement = document.createElement('div');
        expenseElement.className = 'expense-item';
        expenseElement.innerHTML = `
            <div class="expense-details">
                <div class="expense-title">${expense.title}</div>
                <div class="expense-meta">
                    <span class="category-${expense.category}">
                        <i class="fas fa-tag"></i> ${expense.category}
                    </span>
                    <span><i class="fas fa-calendar"></i> ${expense.date}</span>
                </div>
            </div>
            <div class="expense-amount">Rs.${parseFloat(expense.amount).toFixed(2)}</div>
            <div class="expense-actions">
                <button class="btn-edit" data-id="${expense.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" data-id="${expense.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add event listeners for edit and delete buttons
        expenseElement.querySelector('.btn-edit').addEventListener('click', () => {
            editExpense(expense);
        });

        expenseElement.querySelector('.btn-delete').addEventListener('click', () => {
            deleteExpense(expense.id);
        });

        expensesList.appendChild(expenseElement);
    }

    // Update total amount display
    function updateTotalAmount(total) {
        document.getElementById('totalSpent').textContent = `Rs.${total.toFixed(2)}`;
        // You might want to update the remaining budget here as well
        // based on the total budget set for the trip
    }

    // Initialize and update charts
    function updateCharts(tripId) {
        const expensesRef = db.ref(`expenses/${tripId}`);
        expensesRef.once('value', (snapshot) => {
            const expenses = [];
            snapshot.forEach((child) => {
                expenses.push(child.val());
            });

            updateCategoryChart(expenses);
            updateSpendingChart(expenses);
        });
    }

    function updateCategoryChart(expenses) {
        const categories = {};
        expenses.forEach(expense => {
            categories[expense.category] = (categories[expense.category] || 0) + parseFloat(expense.amount);
        });

        const data = {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#4a90e2', // accommodation
                    '#e74c3c', // transportation
                    '#2ecc71', // food
                    '#f1c40f', // activities
                    '#9b59b6', // shopping
                    '#95a5a6'  // other
                ]
            }]
        };

        if (categoryChart) {
            categoryChart.destroy();
        }

        categoryChart = new Chart(document.getElementById('categoryChart'), {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    function updateSpendingChart(expenses) {
        const dailySpending = {};
        expenses.forEach(expense => {
            dailySpending[expense.date] = (dailySpending[expense.date] || 0) + parseFloat(expense.amount);
        });

        const sortedDates = Object.keys(dailySpending).sort();

        const data = {
            labels: sortedDates,
            datasets: [{
                label: 'Daily Spending',
                data: sortedDates.map(date => dailySpending[date]),
                borderColor: '#4a90e2',
                fill: false
            }]
        };

        if (spendingChart) {
            spendingChart.destroy();
        }

        spendingChart = new Chart(document.getElementById('spendingChart'), {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Modal handlers
    addExpenseBtn.addEventListener('click', () => {
        expenseModal.classList.add('active');
        expenseForm.reset();
        document.getElementById('expenseDate').valueAsDate = new Date();
    });

    cancelExpense.addEventListener('click', () => {
        expenseModal.classList.remove('active');
    });

    // Form submission
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tripId = tripSelect.value;
        if (!tripId) {
            alert('Please select a trip first');
            return;
        }

        const userId = auth.currentUser.uid;
        const expenseData = {
            title: document.getElementById('expenseTitle').value,
            amount: document.getElementById('expenseAmount').value,
            category: document.getElementById('expenseCategory').value,
            date: document.getElementById('expenseDate').value,
            notes: document.getElementById('expenseNotes').value,
            createdAt: Date.now(),
            userId: userId
        };

        try {
            // Save expense to user's expenses
            await db.ref(`users/${userId}/expenses/${tripId}`).push(expenseData);
            expenseModal.classList.remove('active');
            expenseForm.reset();
            loadTripExpenses(tripId); // Reload expenses after adding
        } catch (error) {
            alert('Error adding expense: ' + error.message);
        }
    });

    // Filter handlers
    function applyFilters() {
        const tripId = tripSelect.value;
        if (tripId) {
            loadTripExpenses(tripId);
        }
    }

    categoryFilter.addEventListener('change', applyFilters);
    dateFilter.addEventListener('change', applyFilters);

    clearFilters.addEventListener('click', () => {
        categoryFilter.value = '';
        dateFilter.value = '';
        applyFilters();
    });

    // Reset budget display
    function resetBudgetDisplay() {
        expensesList.innerHTML = '';
        document.getElementById('totalSpent').textContent = '$0';
        document.getElementById('remaining').textContent = '$0';
        
        if (categoryChart) {
            categoryChart.destroy();
        }
        if (spendingChart) {
            spendingChart.destroy();
        }
    }

    // Edit expense
    function editExpense(expense) {
        // Implement edit functionality
        console.log('Edit expense:', expense);
    }

    // Delete expense
    function deleteExpense(expenseId) {
        if (confirm('Are you sure you want to delete this expense?')) {
            const tripId = tripSelect.value;
            db.ref(`expenses/${tripId}/${expenseId}`).remove()
                .catch(error => alert('Error deleting expense: ' + error.message));
        }
    }
});
