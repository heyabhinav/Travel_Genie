document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const profileForm = document.getElementById('profileForm');
    const avatarUpload = document.getElementById('avatarUpload');
    const changePasswordBtn = document.getElementById('changePassword');
    const deleteAccountBtn = document.getElementById('deleteAccount');
    const preferencesForm = document.querySelector('.preferences-form');
    const modal = document.getElementById('passwordChangeModal');
    const closeBtn = document.querySelector('.modal .close');
    const passwordChangeForm = document.getElementById('passwordChangeForm');
    const submitBtn = passwordChangeForm.querySelector('button[type="submit"]');

    // Check if delete account button exists
    if (!deleteAccountBtn) {
        console.error('Delete account button not found in the DOM');
    }

    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadUserProfile(user);
            loadUserStats(user.uid);
        } else {
            window.location.href = 'auth.html';
        }
    });

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

    // Handle password change modal

    changePasswordBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Handle password change form submission
    passwordChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = auth.currentUser;
        if (!user) {
            alert('No user is currently logged in');
            return;
        }

        // Disable submit button to prevent multiple submissions
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate new password
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
            return;
        }

        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters long!');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
            return;
        }

        try {
            // Create credentials with current password
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );

            // Reauthenticate user
            await user.reauthenticateWithCredential(credential);

            // Update password
            await user.updatePassword(newPassword);

            // Clear form and close modal
            passwordChangeForm.reset();
            modal.style.display = 'none';

            alert('Password updated successfully! Please log in again with your new password.');
            
            try {
                // Sign out the user
                await auth.signOut();
                // Redirect to auth page
                window.location.href = 'auth.html';
            } catch (signOutError) {
                console.error('Error during sign out:', signOutError);
                // Force redirect to auth page even if signOut fails
                window.location.href = 'auth.html';
            }
        } catch (error) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Change Password';
            
            if (error.code === 'auth/wrong-password') {
                alert('Current password is incorrect!');
            } else {
                console.error('Password update error:', error);
                alert('Error updating password: ' + error.message);
            }
        }
    });

    // Handle account deletion
    deleteAccountBtn?.addEventListener('click', async () => {
        console.log('Delete account button clicked');
        
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            console.log('User cancelled account deletion');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            console.error('No user is currently logged in');
            return;
        }
        
        console.log('Starting account deletion process...');

        try {
            // 1. Delete user's avatar from storage if it exists
            if (user.photoURL && user.photoURL.includes('avatars')) {
                const avatarRef = storage.ref(`avatars/${user.uid}`);
                await avatarRef.delete().catch(console.error);
            }

            // 2. Delete user data from databasegti
            await db.ref(`users/${user.uid}`).remove();
            
            // 3. Delete user account
            await user.delete();
            
            console.log('Account successfully deleted, redirecting...');
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error during account deletion:', error);
            if (error.code === 'auth/requires-recent-login') {
                alert('For security reasons, please log out and log back in before deleting your account.');
                return;
            }
            alert('Error deleting account: ' + error.message);
        }
    });
});
