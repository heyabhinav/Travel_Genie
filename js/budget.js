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
            // Get trip details including budget
            db.ref('trips').child(tripId).once('value', (snapshot) => {
                const tripData = snapshot.val();
                if (tripData && tripData.budget) {
                    const budget = parseFloat(tripData.budget) || 0;
                    document.getElementById('totalBudget').textContent = `Rs.${budget.toFixed(2)}`;
                    loadTripExpenses(tripId, budget);
                    updateCharts(tripId);
                } else {
                    resetBudgetDisplay();
                }
            });
        } else {
            resetBudgetDisplay();
        }
    });

    // Load trip expenses
    function loadTripExpenses(tripId, tripBudget) {
        const userId = auth.currentUser.uid;
        const expensesRef = db.ref(`users/${userId}/expenses/${tripId}`);
        expensesRef.on('value', (snapshot) => {
            expensesList.innerHTML = '';
            let totalSpent = 0;
            let expenses = [];
            
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    const expense = child.val();
                    expense.id = child.key;
                    expenses.push(expense);
                    totalSpent += parseFloat(expense.amount) || 0;
                });

                // Sort expenses by date
                expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // Apply filters
                const categoryValue = categoryFilter.value;
                const dateValue = dateFilter.value;
                
                expenses = expenses.filter(expense => {
                    const categoryMatch = !categoryValue || expense.category === categoryValue;
                    const dateMatch = !dateValue || expense.date === dateValue;
                    return categoryMatch && dateMatch;
                });

                // Display expenses
                expenses.forEach(expense => {
                    addExpenseToList(expense);
                });

                // Update category chart
                updateCategoryChart(expenses);
                
            }

            // Update totals
            const budget = parseFloat(tripBudget) || 0;
            const spent = parseFloat(totalSpent) || 0;
            const remaining = budget - spent;

            console.log(budget, spent, remaining);
            
            document.getElementById('totalBudget').textContent = `Rs.${budget.toFixed(2)}`;
            document.getElementById('totalSpent').textContent = `Rs.${spent.toFixed(2)}`;
            document.getElementById('remaining').textContent = remaining >= 0 ? `Rs.${remaining.toFixed(2)}` : `-Rs.${Math.abs(remaining).toFixed(2)}`;
            
            // Add warning class if over budget
            const remainingElement = document.getElementById('remaining');
            if (remaining < 0) {
                remainingElement.classList.add('over-budget');
            } else {
                remainingElement.classList.remove('over-budget');
            }

            updateTotalAmount(budget, spent);
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
                ${expense.notes ? `<div class="expense-notes"><i class="fas fa-note-sticky"></i> ${expense.notes}</div>` : ''}
            </div>
            <div class="expense-amount">
                <span>Rs.${expense.amount}</span>
                <div class="expense-actions">
                    <button class="btn-icon delete-expense" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Add event listener for delete button
        const deleteBtn = expenseElement.querySelector('.delete-expense');
        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this expense?')) {
                const tripId = tripSelect.value;
                const userId = auth.currentUser.uid;
                db.ref(`users/${userId}/expenses/${tripId}/${expense.id}`).remove()
                    .then(() => {
                        loadTripExpenses(tripId);
                    })
                    .catch(error => alert('Error deleting expense: ' + error.message));
            }
        });

        expensesList.appendChild(expenseElement);
    }

    // Update total amount display
    function updateTotalAmount(budget, spent) {
        const remaining = budget - spent;
        document.getElementById('totalSpent').textContent = `Rs.${spent.toFixed(2)}`;
        document.getElementById('remaining').textContent = remaining >= 0 ? 
            `Rs.${remaining.toFixed(2)}` : 
            `-Rs.${Math.abs(remaining).toFixed(2)}`;
    }

    // Initialize and update charts
    function updateCharts(tripId) {
        const userId = auth.currentUser.uid;
        const expensesRef = db.ref(`users/${userId}/expenses/${tripId}`);
        expensesRef.once('value', (snapshot) => {
            const expenses = [];
            if (snapshot.exists()) {
                snapshot.forEach((child) => {
                    expenses.push(child.val());
                });
                updateCategoryChart(expenses);
            } else {
                if (categoryChart) {
                    categoryChart.destroy();
                    categoryChart = null;
                }
            }
        });
    }

    function updateCategoryChart(expenses) {
        const categoryLabels = {
            accommodation: 'Accommodation',
            transportation: 'Transportation',
            food: 'Food & Dining',
            activities: 'Activities',
            shopping: 'Shopping',
            other: 'Other'
        };

        const categoryColors = {
            accommodation: '#FF6384',
            transportation: '#36A2EB',
            food: '#FFCE56',
            activities: '#4BC0C0',
            shopping: '#9966FF',
            other: '#FF9F40'
        };

        const categories = {};
        expenses.forEach(expense => {
            categories[expense.category] = (categories[expense.category] || 0) + parseFloat(expense.amount);
        });

        const labels = Object.keys(categories).map(key => categoryLabels[key]);
        const colors = Object.keys(categories).map(key => categoryColors[key]);

        const data = {
            labels: labels,
            datasets: [{
                data: Object.values(categories),
                backgroundColor: colors
            }]
        };

        if (categoryChart) {
            categoryChart.destroy();
        }

        const ctx = document.getElementById('categoryChart');
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: Rs.${value} (${percentage}%)`;
                            }
                        }
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
            alert('Please select a trip first!');
            return;
        }

        const expenseData = {
            title: document.getElementById('expenseTitle').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            category: document.getElementById('expenseCategory').value,
            date: document.getElementById('expenseDate').value,
            notes: document.getElementById('expenseNotes').value || ''
        };

        try {
            const userId = auth.currentUser.uid;
            await db.ref(`users/${userId}/expenses/${tripId}`).push(expenseData);
            expenseModal.classList.remove('active');
            expenseForm.reset();

            // Get current trip budget and update totals
            db.ref('trips').child(tripId).once('value', (snapshot) => {
                const tripData = snapshot.val();
                if (tripData && tripData.budget) {
                    const budget = parseFloat(tripData.budget) || 0;
                    loadTripExpenses(tripId, budget);
                }
            });
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
        document.getElementById('totalBudget').textContent = 'Rs.0';
        document.getElementById('totalSpent').textContent = 'Rs.0';
        document.getElementById('remaining').textContent = 'Rs.0';
        document.getElementById('remaining').classList.remove('over-budget');
        
        if (categoryChart) {
            categoryChart.destroy();
            categoryChart = null;
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
