const { getConnection } = require('../config/db');

async function executeReport(query, parameters) {
    const connection = await getConnection();
    try {
        return await connection.execute(query, parameters);
    } finally {
        connection.release();
    }
}

exports.getTollStationPasses = async (req, res) => {
    const { tollStationID, date_from, date_to } = req.params;
    const format = req.query.format; // Default format is JSON unless specified otherwise
    const requestTimestamp = new Date().toISOString(); // Capture the timestamp of the API call

    try {
        
        // Ensure date format is correct (YYYYMMDD) before querying the database
        if (!/^\d{8}$/.test(date_from) || !/^\d{8}$/.test(date_to)) {
            return res.status(400).json({ status: 'failed', info: 'Invalid date format. Use YYYYMMDD' });
        }
        
        // SQL query to retrieve passes and fetch station operator name
        const query = `
            SELECT p.pass_id, DATE_FORMAT(p.pass_time, '%Y-%m-%d %H:%i:%s') AS pass_time, 
                    p.tag_ref, p.charge, p.tag_home_op_id, o.operator_name,o.op_id
            FROM passes p
            JOIN toll_stations ts ON p.toll_id = ts.toll_id
            JOIN operators o ON ts.op_id = o.op_id
            WHERE p.toll_id = ?
            AND p.pass_time BETWEEN STR_TO_DATE(?, '%Y%m%d')
            AND STR_TO_DATE(?, '%Y%m%d')
            ORDER BY p.pass_time ASC;
        `;
        
        const [rows] = await executeReport(query, [tollStationID, date_from, date_to]);
        console.log(`Query executed successfully. Retrieved ${rows.length} records.`);
        
        // Fetch the station operator name
        const operatorName = rows.length > 0 ? rows[0].operator_name : "Unknown";
        
        // Transform passes into required format
        const passesList = rows.map((row, index) => ({
            passIndex: index + 1,
            passID: row.pass_id,
            timestamp: row.pass_time,
            tagID: row.tag_ref,
            tagProvider: row.tag_home_op_id,
            passType: row.tag_home_op_id === row.op_id ? "home" : "visitor",
            passCharge: row.charge
        }));
        
        // Handle CSV response format if requested
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="tollStationPasses.csv"');
            const csvHeader = `stationID,stationOperator,requestTimestamp,periodFrom,periodTo,nPasses,passIndex,passID,passTimestamp,tagID,tagProvider,passType,passCharge\n`;
            const csvData = passesList.map(pass => 
                `${tollStationID},${operatorName},${requestTimestamp},${date_from},${date_to},${passesList.length},${Object.values(pass).join(',')}`
            ).join('\n');
            console.log('Returning CSV response with', rows.length, 'records.');
            return res.send(csvHeader + csvData);
        }
        
        // Default JSON response with operator name, number of passes, and timestamp
        console.log('Returning JSON response with', rows.length, 'records.');
        res.status(200).json({
            stationID: tollStationID,
            stationOperator: operatorName,
            requestTimestamp,
            periodFrom: date_from,
            periodTo: date_to,
            nPasses: rows.length,
            passList: passesList
        });
    } catch {
        console.error('Toll station report failed.');
        res.status(500).json({ status: 'failed', info: 'Internal server error' });
    }
};

exports.getPassAnalysis = async(req,res) => {
    const {stationOpID,tagOpID,date_from,date_to} = req.params;
    const format = req.query.format || 'json';
    const requestTimestamp = new Date().toISOString(); //capture timpestamp of API call 
    
    try {

        //ensure date format is correct before querying
        if (!/^\d{8}$/.test(date_from) || !/^\d{8}$/.test(date_to)) {
            return res.status(400).json({ status: 'failed', info: 'Invalid date format. Use YYYYMMDD' });
        }

        const query = `
        SELECT p.pass_id, DATE_FORMAT(p.pass_time, '%Y-%m-%d %H:%i:%s') AS pass_time, p.tag_ref, p.charge, p.toll_id
        FROM passes p
        JOIN toll_stations ts ON p.toll_id = ts.toll_id
        WHERE ts.op_id = ? AND p.tag_home_op_id = ?
        AND p.pass_time BETWEEN STR_TO_DATE(?, '%Y%m%d') AND STR_TO_DATE(?, '%Y%m%d')
        ORDER BY p.pass_time ASC;
    `;

        const[rows]= await executeReport(query, [stationOpID,tagOpID,date_from,date_to]);
        console.log(`Query executed succesfully. Retrieved ${rows.length} records.`);


        const passesList = rows.map((row,index)=> ({
            passIndex: index+1,
            passID: row.pass_id,
            stationID: row.toll_id,
            timestamp:row.pass_time,
            tagID: row.tag_ref,
            passCharge: row.charge
        }));

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="tollStationPasses.csv"');
            const csvHeader = `stationOpID,tagOpID,requestTimestamp,periodFrom,periodTo,nPasses,passIndex,passID,passTimestamp,tagID,passCharge\n`;
            const csvData = passesList.map(pass =>
                `${stationOpID},${tagOpID},${requestTimestamp},${date_from},${date_to},${passesList.length},${Object.values(pass).join(',')}`
            ).join('\n');
            console.log('Returning CSV response with', rows.length, 'records.');
            return res.send(csvHeader + csvData);
        }

         //Default JSON response
        console.log('Returning JSON response with', rows.length, 'records.');
        res.status(200).json({
            stationOpID,
            tagOpID,
            requestTimestamp,
            periodFrom: date_from,
            periodTo: date_to,
            nPasses: rows.length,
            passList: passesList
        });
    } catch {
        console.error('Pass analysis failed.');
        res.status(500).json({ status: 'failed', info: 'Internal server error' });
    }
};

exports.getPassesCost = async(req,res) => {
    const {tollOpID,tagOpID,date_from,date_to} = req.params;
    const format = req.query.format || 'json';
    const requestTimestamp = new Date().toISOString(); //capture timpestamp of API call 
    
    try {
        
        // Ensure date format is correct (YYYYMMDD) before querying the database
        if (!/^\d{8}$/.test(date_from) || !/^\d{8}$/.test(date_to)) {
            return res.status(400).json({ status: 'failed', info: 'Invalid date format. Use YYYYMMDD' });
        }        

        const query = `
            SELECT COUNT(*) AS nPasses, SUM(p.charge) AS passesCost
            FROM passes p
            JOIN toll_stations ts ON p.toll_id = ts.toll_id
            WHERE ts.op_id = ? AND p.tag_home_op_id = ?
            AND p.pass_time BETWEEN STR_TO_DATE(?, '%Y%m%d') AND STR_TO_DATE(?, '%Y%m%d');
        `;

        const [rows] = await executeReport(query, [tollOpID, tagOpID, date_from, date_to]);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="passesCost.csv"');
            const csvHeader = `tollOpID,tagOpID,requestTimestamp,periodFrom,periodTo,nPasses,passesCost\n`;
            const csvData = `${tollOpID},${tagOpID},${requestTimestamp},${date_from},${date_to},${rows[0].nPasses},${rows[0].passesCost || 0}\n`;
            console.log('Returning CSV response.');
            return res.send(csvHeader + csvData);
        }

        res.status(200).json({
            tollOpID,
            tagOpID,
            requestTimestamp,
            periodFrom: date_from,
            periodTo: date_to,
            nPasses: rows[0].nPasses,
            passesCost: rows[0].passesCost || 0
        });
    } catch {
        res.status(500).json({ status: 'failed', info: 'Internal server error' });
    }
};

exports.getChargesBy = async (req, res) => {
    const { tollOpID, date_from, date_to } = req.params;
    const format = req.query.format || 'json';
    const requestTimestamp = new Date().toISOString();

    try {

        if (!/^\d{8}$/.test(date_from) || !/^\d{8}$/.test(date_to)) {
            return res.status(400).json({ status: 'failed', info: 'Invalid date format. Use YYYYMMDD' });
        }

        const query = `
            SELECT p.tag_home_op_id AS visitingOpID, COUNT(*) AS nPasses, SUM(p.charge) AS passesCost
            FROM passes p
            JOIN toll_stations ts ON p.toll_id = ts.toll_id
            WHERE ts.op_id = ? AND p.tag_home_op_id <> ?
            AND p.pass_time BETWEEN STR_TO_DATE(?, '%Y%m%d') AND STR_TO_DATE(?, '%Y%m%d')
            GROUP BY p.tag_home_op_id;
        `;

        const [rows] = await executeReport(query, [tollOpID, tollOpID, date_from, date_to]);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="chargesBy.csv"');
            const csvHeader = `tollOpID,requestTimestamp,periodFrom,periodTo,visitingOpID,nPasses,passesCost\n`;
            const csvData = rows.map(row => 
                `${tollOpID},${requestTimestamp},${date_from},${date_to},${row.visitingOpID},${row.nPasses},${row.passesCost || 0}`
            ).join('\n');
            console.log('Returning CSV response.');
            return res.send(csvHeader + csvData);
        }

        res.status(200).json({
            tollOpID,
            requestTimestamp,
            periodFrom: date_from,
            periodTo: date_to,
            vOpList: rows.map(row => ({
                visitingOpID: row.visitingOpID,
                nPasses: row.nPasses,
                passesCost: row.passesCost || 0
            }))
        });
    } catch {
        console.error('Charge report failed.');
        res.status(500).json({ status: 'failed', info: 'Internal server error' });
    }
};

exports.getAllTollStationsPasses = async (req, res) => {
    const { date_from, date_to } = req.query; // Use query parameters instead of request body
    const format = req.query.format || 'json'; // Default format is JSON

    try {

        // Ensure date format is correct (YYYYMMDD) before querying the database
        if (!/^\d{8}$/.test(date_from) || !/^\d{8}$/.test(date_to)) {
            return res.status(400).json({ status: 'failed', info: 'Invalid date format. Use YYYYMMDD' });
        }

        // Construct a query to fetch all toll stations with their pass counts in the period
        const query = `
            SELECT 
                p.toll_id AS stationID, 
                COUNT(p.pass_id) AS passageCount
            FROM passes p
            WHERE p.pass_time BETWEEN STR_TO_DATE(?, '%Y%m%d') AND STR_TO_DATE(?, '%Y%m%d')
            GROUP BY p.toll_id
            ORDER BY p.toll_id ASC;
        `;

        const [rows] = await executeReport(query, [date_from, date_to]);
        console.log(`Query executed successfully. Retrieved ${rows.length} records.`);


        // Return the result
        res.status(200).json({
            status: "success",
            tollStationPasses: rows,
        });

    } catch {
        console.error('Toll station report failed.');
        res.status(500).json({ status: 'failed', info: 'Internal server error' });
    }
};


