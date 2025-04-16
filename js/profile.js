document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadUserProfile(user);
            loadUserStats(user.uid);
        } else {
            window.location.href = 'auth.html';
        }
    });

    // DOM Elements
    const profileForm = document.getElementById('profileForm');
    const avatarUpload = document.getElementById('avatarUpload');
    const changePasswordBtn = document.getElementById('changePassword');
    const deleteAccountBtn = document.getElementById('deleteAccount');
    const preferencesForm = document.querySelector('.preferences-form');

    // Load user profile
    async function loadUserProfile(user) {
        document.getElementById('userName').textContent = user.displayName || 'Anonymous';
        document.getElementById('userEmail').textContent = user.email;
        
        if (user.photoURL) {
            document.getElementById('profileImage').src = user.photoURL;
        }

        // Load additional profile data from database
        const profileRef = db.ref(`users/${user.uid}/profile`);
        profileRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                document.getElementById('fullName').value = data.fullName || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('location').value = data.location || '';
                
                // Load preferences
                document.getElementById('emailNotifications').checked = data.emailNotifications || false;
                document.getElementById('shareProfile').checked = data.shareProfile || false;
                document.getElementById('currency').value = data.currency || 'USD';
            }
        });
    }

    // Load user stats
    async function loadUserStats(userId) {
        const statsRef = db.ref(`users/${userId}/stats`);
        statsRef.once('value', (snapshot) => {
            if (snapshot.exists()) {
                const stats = snapshot.val();
                document.getElementById('tripsCount').textContent = stats.trips || 0;
                document.getElementById('countriesCount').textContent = stats.countries || 0;
                document.getElementById('activitiesCount').textContent = stats.activities || 0;
                document.getElementById('buddiesCount').textContent = stats.buddies || 0;
            }
        });
    }

    // Handle profile form submission
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = auth.currentUser;
        if (!user) return;

        const profileData = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            location: document.getElementById('location').value,
            updatedAt: Date.now()
        };

        try {
            // Update display name
            await user.updateProfile({
                displayName: profileData.fullName
            });

            // Update additional profile data in database
            await db.ref(`users/${user.uid}/profile`).update(profileData);
            
            alert('Profile updated successfully!');
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        }
    });

    // Handle avatar upload
    avatarUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const user = auth.currentUser;
        if (!user) return;

        try {
            // Create storage reference
            const storageRef = storage.ref(`avatars/${user.uid}`);
            
            // Upload file
            const snapshot = await storageRef.put(file);
            
            // Get download URL
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            // Update user profile
            await user.updateProfile({
                photoURL: downloadURL
            });
            
            // Update avatar in UI
            document.getElementById('profileImage').src = downloadURL;
            
            alert('Profile picture updated successfully!');
        } catch (error) {
            alert('Error uploading profile picture: ' + error.message);
        }
    });

    // Handle preferences changes
    preferencesForm.addEventListener('change', async (e) => {
        const user = auth.currentUser;
        if (!user) return;

        const preferences = {
            emailNotifications: document.getElementById('emailNotifications').checked,
            shareProfile: document.getElementById('shareProfile').checked,
            currency: document.getElementById('currency').value
        };

        try {
            await db.ref(`users/${user.uid}/profile`).update(preferences);
        } catch (error) {
            alert('Error updating preferences: ' + error.message);
        }
    });

    // Handle password change
    changePasswordBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const email = user.email;
        try {
            await auth.sendPasswordResetEmail(email);
            alert('Password reset email sent. Please check your inbox.');
        } catch (error) {
            alert('Error sending password reset email: ' + error.message);
        }
    });

    // Handle account deletion
    deleteAccountBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        try {
            // Delete user data from database
            await db.ref(`users/${user.uid}`).remove();
            
            // Delete user account
            await user.delete();
            
            window.location.href = '../index.html';
        } catch (error) {
            alert('Error deleting account: ' + error.message);
        }
    });
});
