document.addEventListener('DOMContentLoaded', () => {
    // Check if the user is logged in by verifying the token in localStorage
    const token = localStorage.getItem('authToken');

    if (!token) {
        // Redirect to login page if no token is found
        alert('You must log in to access the dashboard.');
        window.location.href = '/index.html';
        return;
    }

    try {
        // Decode the token payload to ensure the user is authorized
        const decodedToken = JSON.parse(atob(token.split('.')[1])); // Decode the JWT payload
        const now = Math.floor(Date.now() / 1000);

        if (decodedToken.exp < now) {
            // Token has expired, redirect to login
            alert('Your session has expired. Please log in again.');
            localStorage.removeItem('authToken');
            window.location.href = '/index.html';
            return;
        }

        // Display the username in the welcome message
        const username = decodedToken.username || "User";
        const welcomeMessage = document.getElementById('welcome-message');
        welcomeMessage.textContent = `Welcome to your dashboard, ${username}!`;

    } catch {
        // If token decoding fails, redirect to login
        console.error('Invalid session token.');
        alert('Unauthorized access. Please log in.');
        localStorage.removeItem('authToken');
        window.location.href = '/index.html';
        return;
    }

    // Protect access to Statistics and Invoices links
    const protectLinks = (selector, errorMessage) => {
        const link = document.querySelector(selector);
        if (link) {
            link.addEventListener('click', (e) => {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    e.preventDefault();
                    alert(errorMessage);
                    window.location.href = '/index.html';
                }
            });
        }
    };

    protectLinks('a[href="statistics.html"]', 'You are not authorized to view statistics. Please log in.');
    protectLinks('a[href="invoices.html"]', 'You are not authorized to view invoices. Please log in.');
});
