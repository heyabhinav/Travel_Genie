document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const profileForm = document.getElementById('profileForm');
    const avatarUpload = document.getElementById('avatarUpload');
    const changePasswordBtn = document.getElementById('changePassword');
    const deleteAccountBtn = document.getElementById('deleteAccount');
    const logoutButton = document.getElementById('logoutButton');
    const preferencesForm = document.querySelector('.preferences-form');
    const modal = document.getElementById('passwordChangeModal');
    const closeBtn = document.querySelector('.modal .close');
    const passwordChangeForm = document.getElementById('passwordChangeForm');
    const submitBtn = passwordChangeForm.querySelector('button[type="submit"]');

    // Check if required buttons exist
    if (!deleteAccountBtn) {
        console.error('Delete account button not found in the DOM');
    }
    if (!logoutButton) {
        console.error('Logout button not found in the DOM');
    }

    // Handle logout
    logoutButton.addEventListener('click', async () => {
        try {
            await auth.signOut();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Error signing out. Please try again.');
        }
    });

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
        try {
            console.log('Avatar upload change event triggered');
            const file = e.target.files[0];
            if (!file) {
                console.log('No file selected');
                return;
            }

            const user = auth.currentUser;
            if (!user) {
                console.log('No user logged in');
                alert('Please log in to update your profile picture');
                return;
            }

            console.log('File selected:', file.name);

            // Show loading state
            const profileImage = document.getElementById('profileImage');
            if (!profileImage) {
                console.error('Profile image element not found');
                return;
            }
            profileImage.style.opacity = '0.5';

            // Create a storage reference
            const fileRef = storage.ref().child(`avatars/${user.uid}`);
            console.log('Uploading to:', fileRef.fullPath);

            // Upload the file
            const uploadTask = fileRef.put(file);

            // Monitor upload progress
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload progress:', progress + '%');
                },
                (error) => {
                    console.error('Upload error:', error);
                    profileImage.style.opacity = '1';
                    alert('Error uploading file: ' + error.message);
                },
                async () => {
                    try {
                        // Get the download URL
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        console.log('File uploaded, URL:', downloadURL);

                        // Update profile
                        await user.updateProfile({
                            photoURL: downloadURL
                        });
            
                        // Update UI
                        profileImage.src = downloadURL;
                        profileImage.style.opacity = '1';

                        // Update database
                        await db.ref(`users/${user.uid}/profile/photoURL`).set(downloadURL);

                        console.log('Profile updated successfully');
                        alert('Profile picture updated successfully!');
                    } catch (error) {
                        console.error('Error updating profile:', error);
                        profileImage.style.opacity = '1';
                        alert('Error updating profile: ' + error.message);
                    }
                }
            );
        } catch (error) {
            console.error('Error initializing upload:', error);
            alert('Error initializing upload: ' + error.message);
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

    // Handle account deletion modal
    const deleteAccountModal = document.getElementById('passwordModal');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const passwordInput = document.getElementById('dltPassword');

    deleteAccountBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            deleteAccountModal.classList.add('show');
            passwordInput.value = ''; // Clear previous input
            passwordInput.focus();
        }
    });

    cancelDeleteBtn.addEventListener('click', () => {
        deleteAccountModal.classList.remove('show');
    });

    // Close modal if clicking outside
    deleteAccountModal.addEventListener('click', (e) => {
        if (e.target === deleteAccountModal) {
            deleteAccountModal.classList.remove('show');
        }
    });

    // Handle account deletion confirmation
    confirmDeleteBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const password = passwordInput.value;
        if (!password) {
            alert('Please enter your password');
            return;
        }

        try {
            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                password
            );
            await user.reauthenticateWithCredential(credential);

            // Delete user data from database
            await db.ref(`users/${user.uid}`).remove();
            
            // Delete user's avatar from storage if it exists
            if (user.photoURL && user.photoURL.includes('avatars')) {
                try {
                    await storage.ref(`avatars/${user.uid}`).delete();
                } catch (storageError) {
                    console.error('Error deleting avatar:', storageError);
                }
            }

            // Delete user's trips
            try {
                await db.ref(`trips`).orderByChild('userId').equalTo(user.uid).once('value', async (snapshot) => {
                    const updates = {};
                    snapshot.forEach(child => {
                        updates[child.key] = null;
                    });
                    if (Object.keys(updates).length > 0) {
                        await db.ref('trips').update(updates);
                    }
                });
            } catch (tripsError) {
                console.error('Error deleting trips:', tripsError);
            }
            
            // Delete user account
            await user.delete();
            
            // Close modal and redirect
            deleteAccountModal.classList.remove('show');
            alert('Your account has been successfully deleted.');
            window.location.href = '../index.html';
        } catch (error) {
            if (error.code === 'auth/wrong-password') {
                alert('Incorrect password. Please try again.');
            } else {
                alert('Error deleting account: ' + error.message);
            }
        }
    });
});