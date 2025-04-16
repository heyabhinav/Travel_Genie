document.addEventListener('DOMContentLoaded', () => {
    // Initialize map
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initialize geocoder
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
    })
    .on('markgeocode', function(e) {
        const bbox = e.geocode.bbox;
        const poly = L.polygon([
            bbox.getSouthEast(),
            bbox.getNorthEast(),
            bbox.getNorthWest(),
            bbox.getSouthWest()
        ]);
        map.fitBounds(poly.getBounds());
        const center = poly.getBounds().getCenter();
        L.marker(center).addTo(map);

        // Update location input
        document.getElementById('activityLocation').value = e.geocode.name;
        // Store coordinates for saving later
        document.getElementById('activityLocation').dataset.coordinates = JSON.stringify([center.lat, center.lng]);
    })
    .addTo(map);

    // DOM Elements
    const newTripBtn = document.getElementById('newTripBtn');
    const newTripModal = document.getElementById('newTripModal');
    const cancelNewTrip = document.getElementById('cancelNewTrip');
    const newTripForm = document.getElementById('newTripForm');
    const tripList = document.getElementById('tripList');
    const tripDetails = document.getElementById('tripDetails');
    const emptyState = document.getElementById('emptyState');
    const activitiesList = document.getElementById('activitiesList');
    const newActivityForm = document.getElementById('newActivityForm');
    const addActivityBtn = document.getElementById('addActivityBtn');
    const activityModal = document.getElementById('activityModal');
    const cancelActivity = document.getElementById('cancelActivity');

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

    cancelNewTrip.addEventListener('click', () => {
        newTripModal.classList.remove('active');
    });

    addActivityBtn.addEventListener('click', () => {
        activityModal.classList.add('active');
    });

    cancelActivity.addEventListener('click', () => {
        activityModal.classList.remove('active');
        newActivityForm.reset();
    });

    // Create New Trip
    newTripForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tripData = {
            name: document.getElementById('newTripName').value,
            startDate: document.getElementById('newTripStart').value,
            endDate: document.getElementById('newTripEnd').value,
            activities: {},
            createdAt: Date.now(),
            userId: auth.currentUser.uid
        };

        try {
            // Save to Firebase
            const tripRef = await db.ref('trips').push(tripData);
            
            // Add to UI
            addTripToList(tripRef.key, tripData);
            
            // Close modal and reset form
            newTripModal.classList.remove('active');
            newTripForm.reset();
            
            // Show trip details
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

    function showTripDetails(tripId, tripData) {
        tripDetails.classList.remove('hidden');
        document.getElementById('tripName').value = tripData.name;
        document.getElementById('startDate').value = tripData.startDate;
        document.getElementById('endDate').value = tripData.endDate;
        
        // Store current trip ID
        tripDetails.dataset.tripId = tripId;
        
        // Load activities
        loadActivities(tripId);
        
        // Update map markers
        updateMapMarkers(tripData.activities || {});
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
            time: document.getElementById('activityTime').value,
            notes: document.getElementById('activityNotes').value,
            coordinates: JSON.parse(locationInput.dataset.coordinates || '[0,0]'),
            createdAt: Date.now()
        };

        try {
            // Save to Firebase
            const activityRef = await db.ref(`trips/${tripId}/activities`).push(activityData);
            
            // Add to UI
            addActivityToList(activityRef.key, activityData);
            
            // Close modal and reset form
            activityModal.classList.remove('active');
            newActivityForm.reset();
            
            // Update map
            updateMapMarkers({
                [activityRef.key]: activityData
            });
        } catch (error) {
            alert('Error adding activity: ' + error.message);
        }
    });

    function loadActivities(tripId) {
        const activitiesRef = db.ref(`trips/${tripId}/activities`);
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
        activityElement.draggable = true;
        activityElement.innerHTML = `
            <div class="activity-time">${activity.time}</div>
            <div class="activity-details">
                <h4>${activity.name}</h4>
                <p>${activity.location}</p>
            </div>
            <div class="activity-actions">
                <button class="btn-edit"><i class="fas fa-edit"></i></button>
                <button class="btn-delete"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
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
        
        // Save to Firebase
        // Implementation depends on your data structure
    }
});
