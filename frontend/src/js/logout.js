import { logout } from '../utils/api.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Call the logout API to invalidate the token
        await logout();

    } catch (error) {
        console.error('Failed to log out:', error);
        alert('An error occurred while logging out. Please refresh page or go to login.');
    }
});
