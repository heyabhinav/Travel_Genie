
  // Tab switching functionality
   const tabs = document.querySelectorAll('.tab');
   const forms = document.querySelectorAll('.form');

   tabs.forEach(tab => {
       tab.addEventListener('click', () => {
           const tabId = tab.getAttribute('data-tab');
           
           // Reset success messages
           document.querySelectorAll('.success-message').forEach(msg => {
               msg.style.display = 'none';
           });
           
           // Reset error messages
           document.querySelectorAll('.error').forEach(error => {
               error.style.display = 'none';
           });
           
           // Reset form fields
           document.querySelectorAll('input').forEach(input => {
               input.value = '';
           });
           
           // Update active tab
           tabs.forEach(t => t.classList.remove('active'));
           tab.classList.add('active');
           
           // Show active form
           forms.forEach(form => {
               form.classList.remove('active');
               if (form.id === `${tabId}-form`) {
                   form.classList.add('active');
               }
           });
       });
   });

   // Switch tab links
   document.querySelectorAll('.switch-tab').forEach(link => {
       link.addEventListener('click', (e) => {
           e.preventDefault();
           const tabId = link.getAttribute('data-tab');
           
           document.querySelector(`.tab[data-tab="${tabId}"]`).click();
       });
   });

   // Form validation functions
   function validateEmail(email) {
       const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       return re.test(String(email).toLowerCase());
   }

   // Login form validation
   const loginBtn = document.getElementById('login-btn');
   loginBtn.addEventListener('click', () => {
       let isValid = true;
       const email = document.getElementById('login-email').value;
       const password = document.getElementById('login-password').value;
       
       // Reset error messages
       document.querySelectorAll('#login-form .error').forEach(error => {
           error.style.display = 'none';
       });
       
       // Validate email
       if (!validateEmail(email)) {
           document.getElementById('login-email-error').style.display = 'block';
           isValid = false;
       }
       
       // Validate password
       if (password.trim() === '') {
           document.getElementById('login-password-error').style.display = 'block';
           isValid = false;
       }
       
       // If valid, show success message
       if (isValid) {
           document.getElementById('login-success').style.display = 'block';
           
           // In a real application, you would send the form data to the server here
           console.log('Login form submitted with:', { email, password });
       }
   });

   // Sign up form validation
   const signupBtn = document.getElementById('signup-btn');
   signupBtn.addEventListener('click', () => {
       let isValid = true;
       const name = document.getElementById('signup-name').value;
       const email = document.getElementById('signup-email').value;
       const password = document.getElementById('signup-password').value;
       const confirm = document.getElementById('signup-confirm').value;
       
       // Reset error messages
       document.querySelectorAll('#signup-form .error').forEach(error => {
           error.style.display = 'none';
       });
       
       // Validate name
       if (name.trim() === '') {
           document.getElementById('signup-name-error').style.display = 'block';
           isValid = false;
       }
       
       // Validate email
       if (!validateEmail(email)) {
           document.getElementById('signup-email-error').style.display = 'block';
           isValid = false;
       }
       
       // Validate password
       if (password.length < 6) {
           document.getElementById('signup-password-error').style.display = 'block';
           isValid = false;
       }
       
       // Validate password confirmation
       if (password !== confirm) {
           document.getElementById('signup-confirm-error').style.display = 'block';
           isValid = false;
       }
       
       // If valid, show success message
       if (isValid) {
           document.getElementById('signup-success').style.display = 'block';
           
           // In a real application, you would send the form data to the server here
           console.log('Signup form submitted with:', { name, email, password });
       }
   });


