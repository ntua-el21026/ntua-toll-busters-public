import { login } from './utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.getElementById('toggle-password');
    const passwordField = document.getElementById('password');

    togglePassword.addEventListener('click', () => {
        const type = passwordField.type === 'password' ? 'text' : 'password';
        passwordField.type = type;
        togglePassword.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }

        try {
            const data = await login(username, password); // Call the login function from /utils/api.js

            if (data.token) {
                // ✅ Store the token properly in localStorage
                localStorage.setItem('authToken', data.token);
                console.log('Login successful! Token saved.');

                // ✅ Redirect to the dashboard
                window.location.href = 'src/views/dashboard.html';
            } else {
                console.error('Login failed: No token received.');
                alert('Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed. Check your credentials and try again.');
        }
    });
});
