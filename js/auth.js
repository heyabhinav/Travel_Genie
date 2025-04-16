document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const switchBtn = document.getElementById('switchBtn');
    const switchText = document.getElementById('switchText');
    const submitBtn = document.getElementById('submitBtn');
    const nameGroup = document.getElementById('nameGroup');
    
    let isLogin = true;

    // Check if there's a mode parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'signup') {
        toggleAuthMode();
    }

    // Toggle between login and signup
    switchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    function toggleAuthMode() {
        isLogin = !isLogin;
        nameGroup.classList.toggle('hidden');
        authTitle.textContent = isLogin ? 'Sign In' : 'Sign Up';
        authSubtitle.textContent = isLogin 
            ? 'Welcome back to TravelGenie!'
            : 'Create your TravelGenie account';
        submitBtn.textContent = isLogin ? 'Sign In' : 'Sign Up';
        switchText.textContent = isLogin 
            ? "Don't have an account?"
            : 'Already have an account?';
        switchBtn.textContent = isLogin ? 'Sign Up' : 'Sign In';
    }

    // Handle form submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name').value;

        try {
            if (isLogin) {
                // Sign in
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                window.location.href = 'profile.html';
            } else {
                // Sign up
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                // Update profile with name
                await userCredential.user.updateProfile({
                    displayName: name
                });
                window.location.href = 'profile.html';
            }
        } catch (error) {
            alert(error.message);
        }
    });

    // Google Sign In
    const googleBtn = document.querySelector('.btn-google');
    googleBtn.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
            window.location.href = 'profile.html';
        } catch (error) {
            alert(error.message);
        }
    });

    // Check auth state
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            console.log('User is signed in:', user);
        }
    });
});
