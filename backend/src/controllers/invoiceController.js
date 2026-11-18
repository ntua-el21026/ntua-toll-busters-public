const { getConnection } = require('../config/db');

exports.createInvoices = async (req, res) => {
    const username = req.user?.username || '';    
    const match = username.match(/^(\w+)_operator$/);

    if (!match) {
        return res.status(403).json({ status: "error", message: "Unauthorized. Only operators can generate invoices." });
    }

    let connection;
    try {
        connection = await getConnection();

        // 🔹 Fetch ALL invoices from the database (including old ones)
        const [allInvoices] = await connection.execute(
            `SELECT issuing_op_id, receiving_op_id, total_amount, invoice_status, issue_date 
            FROM invoices 
            ORDER BY issue_date DESC`
        );


        res.status(201).json({
            status: "success",  
            allInvoices, 
        });

    } catch {
        console.error("Invoice listing failed.");
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    } finally {
        if (connection) connection.release();
    }
};



exports.payInvoice = async (req, res) => {
    const username = req.user?.username || ''; // Get username from authentication
    const match = username.match(/^(\w+)_operator$/);

    if (!match) {
        return res.status(403).json({ status: "error", message: "Unauthorized. Only operators can mark invoices as paid." });
    }

    const operatorId = match[1]; // Extract OPID from "OPID_operator"
    const { issuing_op_id, receiving_op_id } = req.body;

    if (!issuing_op_id || !receiving_op_id) {
        return res.status(400).json({ status: "error", message: "Missing issuing_op_id or receiving_op_id." });
    }

    let connection;
    try {
        connection = await getConnection();

        // 🔹 Check if the invoice exists and is still "Pending"
        const [invoice] = await connection.execute(
            `SELECT invoice_id, issuing_op_id, receiving_op_id, invoice_status
            FROM invoices
            WHERE issuing_op_id = ? AND receiving_op_id = ? AND invoice_status = 'Pending'`,
            [issuing_op_id, receiving_op_id]
        );

        if (invoice.length === 0) {
            return res.status(404).json({ status: "error", message: "Invoice not found or already paid." });
        }

        // Only the issuing operator may mark an invoice as paid.
        if (operatorId !== issuing_op_id) {
            return res.status(403).json({ status: "error", message: "Unauthorized. Only the issuing operator can mark this invoice as paid." });
        }

        // 🔹 Mark the invoice as "Paid"
        await connection.execute(
            `UPDATE invoices SET invoice_status = 'Paid' WHERE issuing_op_id = ? AND receiving_op_id = ? AND invoice_status = 'Pending'`,
            [issuing_op_id, receiving_op_id]
        );


        res.status(200).json({ status: "success", message: "Invoice marked as paid successfully." });

    } catch {
        console.error("Marking the invoice paid failed.");
        res.status(500).json({ status: "error", message: "Internal Server Error" });
    } finally {
        if (connection) connection.release();
    }
};
