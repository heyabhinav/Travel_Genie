document.addEventListener('DOMContentLoaded', () => {
    let map = null;
    let markers = [];

    // Initialize map
    function initializeMap() {
        if (!map) {
            map = L.map('map', {
                center: [20, 0],
                zoom: 2,
                zoomControl: true,
                scrollWheelZoom: true
            });

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            // Initialize geocoder
            const geocoder = L.Control.Geocoder.nominatim();
            const control = L.Control.geocoder({
                geocoder: geocoder,
                defaultMarkGeocode: false,
                position: 'topleft',
                placeholder: 'Search for a place...'
            }).on('markgeocode', function(e) {
                const latlng = e.geocode.center;
                clearMarkers();
                const marker = L.marker(latlng).addTo(map);
                markers.push(marker);
                map.setView(latlng, 13);

                // Update location input in activity form
                document.getElementById('activityLocation').value = e.geocode.name;
                document.getElementById('activityLocation').dataset.coordinates = JSON.stringify([latlng.lat, latlng.lng]);
            }).addTo(map);

            // Force map to update its size
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }

    // Clear existing markers
    function clearMarkers() {
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
    }

    // DOM Elements
    const newTripBtn = document.getElementById('newTripBtn');
    const newTripModal = document.getElementById('newTripModal');
    // Navigation between days
    document.getElementById('prevDay').addEventListener('click', () => {
        const currentDayElement = document.getElementById('currentDay');
        let currentDay = parseInt(currentDayElement.textContent.split(' ')[1]);
        if (currentDay > 1) {
            currentDay--;
            currentDayElement.textContent = `Day ${currentDay}`;
            filterActivitiesByDay(currentDay);
        }
    });

    document.getElementById('nextDay').addEventListener('click', () => {
        const currentDayElement = document.getElementById('currentDay');
        let currentDay = parseInt(currentDayElement.textContent.split(' ')[1]);
        const tripStartDate = document.getElementById('tripStartDate').value;
        const tripEndDate = document.getElementById('tripEndDate').value;
        const maxDays = getTripDuration(tripStartDate, tripEndDate);
        
        if (currentDay < maxDays) {
            currentDay++;
            currentDayElement.textContent = `Day ${currentDay}`;
            filterActivitiesByDay(currentDay);
        }
    });

    // Filter activities by day
    function filterActivitiesByDay(day) {
        const activities = document.querySelectorAll('.activity-item');
        activities.forEach(activity => {
            const activityDay = parseInt(activity.dataset.day);
            activity.style.display = activityDay === day ? 'flex' : 'none';
        });
    }

    // Initialize Sortable for activities
    new Sortable(activitiesList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function(evt) {
            // Handle reordering
            saveActivitiesOrder();
        }
    });

    // Show/Hide Modals
    newTripBtn.addEventListener('click', () => {
        newTripModal.classList.add('active');
    });

    // Close modals when clicking close buttons (using onclick in HTML)
    document.querySelectorAll('.close-btn, .btn-secondary').forEach(button => {
        button.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    addActivityBtn.addEventListener('click', () => {
        activityModal.classList.add('active');
    });

    // Create New Trip
    newTripForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tripData = {
            name: document.getElementById('newTripName').value,
            startDate: document.getElementById('newTripStart').value,
            endDate: document.getElementById('newTripEnd').value,
            budget: parseFloat(document.getElementById('newTripBudget').value),
            userId: auth.currentUser.uid,
            createdAt: Date.now()
        };

        try {
            const tripRef = await db.ref('trips').push(tripData);
            newTripModal.classList.remove('active');
            newTripForm.reset();
            showTripDetails(tripRef.key, tripData);
        } catch (error) {
            alert('Error creating trip: ' + error.message);
        }
    });

    // Load user's trips
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadUserTrips(user.uid);
        } else {
            window.location.href = 'auth.html';
        }
    });

    async function loadUserTrips(userId) {
        const tripsRef = db.ref('trips');
        // Remove any existing listeners
        tripsRef.off('value');
        
        tripsRef.orderByChild('userId').equalTo(userId).on('value', (snapshot) => {
            tripList.innerHTML = '';
            
            if (snapshot.exists()) {
                emptyState.classList.add('hidden');
                snapshot.forEach((child) => {
                    addTripToList(child.key, child.val());
                });
            } else {
                emptyState.classList.remove('hidden');
                tripDetails.classList.add('hidden');
            }
        });
    }

    function addTripToList(tripId, tripData) {
        const tripCard = document.createElement('div');
        tripCard.className = 'trip-card';
        tripCard.innerHTML = `
            <h3>${tripData.name}</h3>
            <p>${formatDate(tripData.startDate)} - ${formatDate(tripData.endDate)}</p>
        `;
        
        tripCard.addEventListener('click', () => {
            document.querySelectorAll('.trip-card').forEach(card => card.classList.remove('active'));
            tripCard.classList.add('active');
            showTripDetails(tripId, tripData);
        });
        
        tripList.appendChild(tripCard);
    }

    // Calculate trip duration in days
    function getTripDuration(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Populate day selector in activity modal
    function populateDaySelector(startDate, endDate) {
        const daySelector = document.getElementById('activityDay');
        daySelector.innerHTML = '';
        
        const duration = getTripDuration(startDate, endDate);
        for (let i = 1; i <= duration; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i - 1);
            
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Day ${i} - ${date.toLocaleDateString()}`;
            daySelector.appendChild(option);
        }
    }

    // Show trip details
    function showTripDetails(tripId, tripData) {
        tripDetails.dataset.tripId = tripId;
        tripName.value = tripData.name;
        tripStartDate.value = tripData.startDate;
        tripEndDate.value = tripData.endDate;
        
        tripDetails.classList.remove('hidden');
        
        // Initialize map when showing trip details
        setTimeout(() => {
            initializeMap();
            if (map) {
                map.invalidateSize();
            }
        }, 100);
        
        loadActivities(tripId);
        
        // Update day selector when showing trip details
        populateDaySelector(tripData.startDate, tripData.endDate);
    }

    // Handle new activity form submission
    newActivityForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tripId = tripDetails.dataset.tripId;
        if (!tripId) {
            alert('Please select a trip first');
            return;
        }

        const locationInput = document.getElementById('activityLocation');
        const activityData = {
            name: document.getElementById('activityName').value,
            location: locationInput.value,
            day: parseInt(document.getElementById('activityDay').value),
            time: document.getElementById('activityTime').value,
            notes: document.getElementById('activityNotes').value,
            coordinates: JSON.parse(locationInput.dataset.coordinates || '[0,0]'),
            createdAt: Date.now()
        };

        try {
            // Save to Firebase
            const activityRef = await db.ref(`trips/${tripId}/activities`).push(activityData);
            
            // Close modal and reset form
            activityModal.classList.remove('active');
            newActivityForm.reset();
            
            // The UI will update automatically through the Firebase listener
            // No need to manually update UI or map here
        } catch (error) {
            alert('Error adding activity: ' + error.message);
        }
    });

    function loadActivities(tripId) {
        const activitiesRef = db.ref(`trips/${tripId}/activities`);
        // Remove any existing listeners
        activitiesRef.off('value');
        
        activitiesRef.on('value', (snapshot) => {
            activitiesList.innerHTML = '';
            
            if (snapshot.exists()) {
                const activities = snapshot.val();
                Object.entries(activities).forEach(([key, activity]) => {
                    addActivityToList(key, activity);
                });
            }
        });
    }

    function addActivityToList(activityId, activity) {
        const activityElement = document.createElement('div');
        activityElement.className = 'activity-item';
        activityElement.dataset.id = activityId;
        activityElement.dataset.day = activity.day;
        
        activityElement.innerHTML = `
            <div class="activity-time">${activity.time}</div>
            <div class="activity-details">
                <strong>${activity.name}</strong>
                <div class="activity-location">
                    <i class="fas fa-location-dot"></i> ${activity.location}
                </div>
                ${activity.notes ? `<div class="activity-notes"><i class="fas fa-note-sticky"></i> ${activity.notes}</div>` : ''}
            </div>
            <div class="activity-actions">
                <button class="btn-icon edit-activity" title="Edit Activity">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-activity" title="Delete Activity">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Only show activities for the current day
        const currentDay = parseInt(document.getElementById('currentDay').textContent.split(' ')[1]);
        activityElement.style.display = activity.day === currentDay ? 'flex' : 'none';
        
        activitiesList.appendChild(activityElement);
    }

    function updateMapMarkers(activities) {
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        Object.values(activities).forEach(activity => {
            if (activity.coordinates) {
                L.marker(activity.coordinates)
                    .bindPopup(activity.name)
                    .addTo(map);
            }
        });
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    function saveActivitiesOrder() {
        // Implementation for saving the new order of activities
        const activities = Array.from(activitiesList.children).map((el, index) => {
            return {
                id: el.dataset.id,
                order: index
            };
        });
    }
});
