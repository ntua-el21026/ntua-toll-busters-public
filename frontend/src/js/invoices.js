import { fetchUserUnpaidInvoices, payInvoice } from '../utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
    const noInvoicesMessage = document.getElementById('no-invoices-message');

    const generateAndDisplayUnpaidInvoices = async () => {
        try {
          
            const username = validateToken();
            if (!username) return;

            const unpaidInvoices = await fetchUserUnpaidInvoices(username);
            updateInvoiceTable(unpaidInvoices);
        } catch (error) {
            console.error('Error generating or fetching invoices:', error.message);
            alert('Failed to fetch invoices. Please try again.');
        }
    };

    const updateInvoiceTable = (invoices) => {
        const tableBody = document.querySelector('#invoice-table tbody');
        tableBody.innerHTML = ''; // Clear the table before populating it

        if (invoices.length === 0) {
            return;
        }

        invoices.forEach((invoice) => {
            const totalAmount = !isNaN(Number(invoice.total_amount))
                ? Number(invoice.total_amount).toFixed(2)
                : '0.00';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${invoice.receiving_op_id}</td>
                <td>€${totalAmount}</td>
                <td>
                    <button class="pay-button" data-issuing="${invoice.issuing_op_id}" data-receiving="${invoice.receiving_op_id}">Pay</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.querySelectorAll('.pay-button').forEach((button) => {
            button.addEventListener('click', () => {
                const issuingOpId = button.getAttribute('data-issuing');
                const receivingOpId = button.getAttribute('data-receiving');
                handlePayInvoice(issuingOpId, receivingOpId);
            });
        });
    };

    const handlePayInvoice = async (issuingOpId, receivingOpId) => {
        try {
            const response = await payInvoice(issuingOpId, receivingOpId);
            alert(response.message);
            generateAndDisplayUnpaidInvoices();
        } catch (error) {
            console.error('Error paying invoice:', error.message);
            alert('Failed to pay the invoice. Please try again.');
        }
    };

    // Validate token and ensure unauthorized users see the message
    const validateToken = () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            alert('You must log in to access the invoices.');
            return null;
        }

        try {
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);

            if (decodedToken.exp < now) {
                alert('Your session has expired. Please log in again.');
                localStorage.removeItem('authToken');
                return null;
            }
            return decodedToken.username; // Return username (e.g., OP001_operator)
        } catch {
            console.error('Invalid session token.');
            return null;
        }
    };

    // Fetch invoices on page load
    generateAndDisplayUnpaidInvoices();
});
