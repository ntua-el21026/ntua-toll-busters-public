// Base Axios instance
const api = window.axios.create({
    baseURL: 'https://localhost:9115/api', // Backend base URL
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
});

// Keep Axios error objects, including submitted credentials and headers, inside the client.
api.interceptors.response.use(undefined, (error) => {
    const status = error?.response?.status;
    const detail = Number.isInteger(status) && status >= 300 && status <= 599 ? ` (HTTP ${status})` : '';
    return Promise.reject(new Error(`API request failed${detail}.`));
});

// Login API call
export const login = async (username, password) => {
    const data = new URLSearchParams();
    data.append('username', username);
    data.append('password', password);

    const response = await api.post('/login', data);
    return response.data;
};

// Logout
export const logout = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('Unauthorized: Missing token');
    const headers = { "X-OBSERVATORY-AUTH": token };
    try {
        await api.post('/logout', {}, {headers});
        localStorage.removeItem('authToken'); // Clear the token on successful logout
        console.log('Logged out successfully!');
    } catch (error) {
        console.error('Logout failed:', error.message);
        throw error;
    }
};


// Fetch unpaid invoices for the logged-in user
export const fetchUserUnpaidInvoices = async (username) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('Unauthorized: Missing token');
    }
    try {
        const response = await api.get('/invoice/generate', {
            headers: {
                'X-OBSERVATORY-AUTH': token,
            },
        });
        return response.data.allInvoices.filter(
            (invoice) =>
                invoice.issuing_op_id === username.replace('_operator', '') &&
                invoice.invoice_status === 'Pending'
        );
    } catch (error) {
        console.error("error", error.message);
        throw error;
    }
}

// Pay a specific invoice
export const payInvoice = async (issuingOpId, receivingOpId) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
        throw new Error('Unauthorized: Missing token');
    }

    const response = await api.post('/invoice/pay',
        { issuing_op_id: issuingOpId, receiving_op_id: receivingOpId },
        {
            headers: {
                'X-OBSERVATORY-AUTH': token,
                'Content-Type': 'application/json',
            },
        }
    );

    return response.data;
};


export const fetchAllStationPasses = async (startDate, endDate) => {
    const token = localStorage.getItem('authToken'); // Retrieve the token
    if (!token) {
        throw new Error('Unauthorized: Missing token');
    }

    try {
        const response = await api.get(`/tollstations`, {
            params: {
                date_from: startDate,
                date_to: endDate,
            },
            headers: {
                'X-OBSERVATORY-AUTH': token, // Add the token in the header
            },
        });
        return response.data.tollStationPasses; // Array of stationID and passageCount
    } catch (error) {
        console.error('Error fetching all toll station passes:', error.message);
        throw error;
    }
};








export default api;
