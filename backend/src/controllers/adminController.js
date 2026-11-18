const fs = require('fs');
const { hashPassword } = require("../passwords");
const csv = require('csv-parser');
const path = require('path');
const { getConnection, dbConfig } = require('../config/db');
const { pipeline } = require('node:stream/promises');

exports.healthcheck = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [stations] = await connection.execute('SELECT COUNT(*) AS count FROM toll_stations');
        const [tags] = await connection.execute('SELECT COUNT(DISTINCT tag_ref) AS distinct_tags FROM passes');
        const [passes] = await connection.execute('SELECT COUNT(*) AS count FROM passes');

        //Build connection string (example: add host and database name)
        const connectionString = `mysql://${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`;

        res.status(200).json({
            status: 'OK',
            dbconnection: connectionString,
            n_stations: stations[0].count,
            n_tags: tags[0].distinct_tags, 
            n_passes: passes[0].count,
        });
    } catch {
        console.error('Database health check failed.');
                
        // Build connection string with failure details
        const connectionString = `mysql://${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`;
        res.status(401).json({
            status: 'failed',
            dbconnection: connectionString,
        });
    } finally {
        if (connection) connection.release();
    }
};


// Helper function to insert into operators
async function insertOperator(connection, opId, operatorName, email) {
    if (!opId || !operatorName || !email) {
        throw new Error('Invalid operator data');
    }
    const query = `
        INSERT IGNORE INTO operators (op_id, operator_name, email)
        VALUES (?, ?, ?);
    `;
    await connection.execute(query, [opId, operatorName, email]);
}

// Delete dependent rows first so the session can keep foreign-key checks enabled.
async function clearPassesData(connection) {
    await connection.execute('DELETE FROM passes');
    await connection.execute('DELETE FROM invoices');
}

async function clearDatabase(connection) {
    await clearPassesData(connection);
    await connection.execute('DELETE FROM toll_stations');
    await connection.execute('DELETE FROM operators');
}

// Helper function to insert into toll_stations
async function insertTollStation(connection, tollId, opId, stationName, pm, locality, road, lat, long, price) {
    if (!tollId || !opId || !stationName || !pm || !locality || !road || lat === undefined || long === undefined || price === undefined) {
        throw new Error('Invalid toll station data');
    }
    const query = `
        INSERT IGNORE INTO toll_stations (toll_id, op_id, toll_name, pm, locality, road, lat, longitude, price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    await connection.execute(query, [tollId, opId, stationName, pm, locality, road, lat, long, price]);
}

exports.resetStations = async (req, res) => {
    const filePath = path.join(__dirname, '../../csv/tollstations2024.csv');
    const tollStations = [];
    let connection;

    try {
        // Check if the CSV file exists
        if (!fs.existsSync(filePath)) {
            throw new Error('CSV file not found at the expected location');
        }

        await pipeline(fs.createReadStream(filePath), csv(), async function (rows) {
            for await (const row of rows) {
                const normalizedRow = {};
                for (const key in row) {
                    normalizedRow[key.trim()] = row[key].trim();
                }
                tollStations.push(normalizedRow);
            }
        });

        connection = await getConnection();

        // Clear all tables
        await clearDatabase(connection);

        // Process each station
        for (const station of tollStations) {
            const {
                OpID: opId,
                Operator: operatorName,
                Email: email,
                TollID: tollId,
                Name: stationName,
                PM: pm,
                Locality: locality,
                Road: road,
                Lat: latRaw,
                Long: longRaw,
                Price2: priceRaw,
            } = station;

            const lat = parseFloat(latRaw);
            const long = parseFloat(longRaw);
            const price = parseFloat(priceRaw);

            if (!opId || !operatorName || !tollId || !stationName) {
                throw new Error('Invalid station CSV row');
            }

            await insertOperator(connection, opId, operatorName, email);
            await insertTollStation(connection, tollId, opId, stationName, pm, locality, road, lat, long, price);
        }

        // Respond with success
        res.status(200).json({ status: 'OK' });
    } catch {
        console.error('Station reset failed.');
        res.status(500).json({ status: 'failed', info: 'Station reset failed' });
    } finally {
        if (connection) connection.release();
    }
};

// Helper function: Initialize admin account
async function initializeAdminAccount(connection) {
    // Existing accounts are retained. Bootstrap requires an explicitly supplied
    // one-time local password; there is no fixed administrative default.
    if (!process.env.ADMIN_BOOTSTRAP_PASSWORD) return;
    await connection.execute(
        'INSERT IGNORE INTO users (username, password_hash, user_role) VALUES (?, ?, ?)',
        ['admin', await hashPassword(process.env.ADMIN_BOOTSTRAP_PASSWORD), 'admin']
    );
}

exports.resetPasses = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        await clearPassesData(connection);
        await initializeAdminAccount(connection);

        res.status(200).json({ status: 'OK' });
    } catch {
        console.error('Pass reset failed.');
        res.status(500).json({ status: 'failed', info: 'Pass reset failed' });
    } finally {
        if (connection) connection.release();
    }
};

function convertTimestampToMySQLFormat(timestamp) {
    try {
        // Check if the timestamp is in the expected format: YYYY-MM-DD hh:mm
        const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
        if (!regex.test(timestamp)) {
            throw new Error(`Invalid timestamp format: ${timestamp}`);
        }

        // Append ":00" to match MySQL DATETIME format
        return `${timestamp}:00`;
    } catch (error) {
        console.error('Pass timestamp conversion failed.');
        return null; // Return null for invalid timestamps
    }
}

// Helper function to convert CSV timestamp to MySQL datetime format
function convertTimestampToMySQLFormat(ts) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 19).replace('T', ' ');
}

exports.addPasses = async (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ status: 'failed', info: 'No file uploaded' });
    }

    const passes = [];
    const invalidPasses = [];

    let connection;
    try {
        await pipeline(fs.createReadStream(file.path), csv(), async function (rows) {
            for await (const row of rows) {
                const cleanRow = {};
                for (const key in row) {
                    cleanRow[key.trim().replace(/^\uFEFF/, '')] = row[key].trim();
                }
                const convertedTimestamp = convertTimestampToMySQLFormat(cleanRow.timestamp);
                if (convertedTimestamp && cleanRow.tollID && cleanRow.tagHomeID &&
                    !isNaN(parseFloat(cleanRow.charge))) {
                    passes.push({
                        pass_time: convertedTimestamp,
                        toll_id: cleanRow.tollID,
                        tag_home_op_id: cleanRow.tagHomeID,
                        charge: parseFloat(cleanRow.charge),
                        tag_ref: cleanRow.tagRef || null,
                    });
                } else {
                    invalidPasses.push({ row: cleanRow, reason: 'Invalid or missing fields' });
                }
            }
        });

        connection = await getConnection();
        const newPassIds = [];
        for (const pass of passes) {
            try {
                // INSERT IGNORE preserves the established duplicate handling.
                const [result] = await connection.execute(
                    `INSERT IGNORE INTO passes (pass_time, toll_id, tag_home_op_id, charge, tag_ref)
                    VALUES (?, ?, ?, ?, ?)`,
                    [pass.pass_time, pass.toll_id, pass.tag_home_op_id, pass.charge, pass.tag_ref]
                );
                if (result.affectedRows === 1) newPassIds.push(result.insertId);
            } catch {
                invalidPasses.push({ row: pass, reason: 'Database insert failed' });
            }
        }

        // Define a single invoice month for all passes (e.g. current month's first day)
        const invoiceMonth = new Date().toISOString().slice(0, 7) + '-01';

        // ─── Invoice Logic: Process only the newly inserted passes ─────────────
        if (newPassIds.length > 0) {
            // Group new passes by an unordered operator pair only (ignore pass time).
            // Also, ensure we skip passes where the home operator equals the toll station operator.
            const [groups] = await connection.execute(
            `SELECT 
                LEAST(p.tag_home_op_id, ts.op_id) AS op_min,
                GREATEST(p.tag_home_op_id, ts.op_id) AS op_max,
                SUM(
                CASE 
                    WHEN p.tag_home_op_id = LEAST(p.tag_home_op_id, ts.op_id)
                    THEN p.charge ELSE -p.charge
                END
                ) AS net_amount,
                GROUP_CONCAT(p.pass_id) AS pass_ids
                FROM passes p
                JOIN toll_stations ts ON p.toll_id = ts.toll_id
                WHERE p.pass_id IN (${newPassIds.join(",")})
                AND p.tag_home_op_id <> ts.op_id
                GROUP BY LEAST(p.tag_home_op_id, ts.op_id), GREATEST(p.tag_home_op_id, ts.op_id)
                HAVING net_amount <> 0`
            );

            const createdInvoices = [];
            const updatedInvoices = [];
            const passIdsToDelete = [];

            // Process each grouped result
            for (const group of groups) {
                const { op_min, op_max, net_amount, pass_ids } = group;
                const netAmt = parseFloat(Math.abs(net_amount).toFixed(2));
                if (isNaN(netAmt) || netAmt <= 0) continue;

                // Determine roles: if net_amount > 0, then op_min owes op_max; if negative, vice versa.
                let issuer, receiver;
                if (net_amount > 0) {
                    issuer = op_min;
                    receiver = op_max;
                } else {
                    issuer = op_max;
                    receiver = op_min;
                }

                // Check if a pending invoice already exists for this operator pair with the constant invoiceMonth
                const [existingInvoice] = await connection.execute(
                    `SELECT invoice_id, total_amount FROM invoices 
                    WHERE issuing_op_id = ? 
                    AND receiving_op_id = ? 
                    AND invoice_month = ?
                    AND invoice_status = 'Pending'`,
                    [issuer, receiver, invoiceMonth]
                );

                if (existingInvoice.length > 0) {
                    // Update the pending invoice by adding the new net amount
                    const invoice = existingInvoice[0];
                    const newTotal = parseFloat((parseFloat(invoice.total_amount) + netAmt).toFixed(2));
                    await connection.execute(
                    `UPDATE invoices SET total_amount = ? WHERE invoice_id = ?`,
                    [newTotal, invoice.invoice_id]
                    );
                    updatedInvoices.push({
                    invoice_id: invoice.invoice_id,
                    issuing_op_id: issuer,
                    receiving_op_id: receiver,
                    newTotal,
                    });
                } else {
                  // Insert a new invoice if no pending invoice exists for this pair with the constant month
                    await connection.execute(
                        `INSERT INTO invoices 
                        (issuing_op_id, receiving_op_id, invoice_month, total_amount, issue_date, invoice_status)
                        VALUES (?, ?, ?, ?, NOW(), 'Pending')`,
                    [issuer, receiver, invoiceMonth, netAmt]
                    );
                    createdInvoices.push({
                    issuing_op_id: issuer,
                    receiving_op_id: receiver,
                    total_amount: netAmt,
                    invoice_month: invoiceMonth,
                    });
                }

                // Collect the pass IDs from this group for deletion
                if (pass_ids) {
                    passIdsToDelete.push(...pass_ids.split(','));
                }
            }

            return res.status(200).json({
                status: 'OK',
                inserted: newPassIds.length,
                createdInvoices,
                updatedInvoices,
                invalid: invalidPasses.length,
                invalidPasses,
            });
        } else {
            return res.status(200).json({
                status: 'OK',
                inserted: newPassIds.length,
                message: 'No new passes to process for invoicing.',
                invalid: invalidPasses.length,
                invalidPasses,
            });
        }
    } catch {
        console.error('Pass import failed.');
        return res.status(500).json({ status: 'failed', info: 'Pass import failed' });
    } finally {
        try {
            fs.unlinkSync(file.path);
        } catch (error) {
            if (error.code !== 'ENOENT') console.error('Staged upload cleanup failed.');
        } finally {
            if (connection) connection.release();
        }
    }
};


exports.userMod = async (req, res) => {
	const { username, passw } = req.body;

	if (!username || !passw) {
		console.error("Missing user modification parameters");
		return res.status(400).json({ status: "error", info: "Missing parameters" });
	}

	let connection;
	try {
		// 1. Hash the password server-side
		const hashedPassword = await hashPassword(passw);

		connection = await getConnection();

		// Check if user exists
		const [existingUser] = await connection.execute(
			"SELECT * FROM users WHERE username = ?",
			[username]
		);

		if (existingUser.length > 0) {
			// Update password if user exists
			await connection.execute(
				"UPDATE users SET password_hash = ? WHERE username = ?",
				[hashedPassword, username]
			);
		} else {
			// Create new user
			await connection.execute(
				"INSERT INTO users (username, password_hash, user_role) VALUES (?, ?, 'operator')",
				[username, hashedPassword]
			);
		}

		res.status(200).json({ status: "success" });
	} catch {
		console.error("User modification failed.");
		res.status(500).json({ status: "error", info: "User modification unavailable" });
	} finally {
		if (connection) connection.release();
	}
};

exports.getUsers = async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const [users] = await connection.execute("SELECT username FROM users");

        res.status(200).json({ users: users.map(u => u.username) });
    } catch {
        res.status(500).json({ status: "error", info: "Database error" });
    } finally {
        if (connection) connection.release();
    }
};

