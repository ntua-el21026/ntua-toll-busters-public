require('dotenv').config();
require('./config/security');
const path = require('path');
const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');

const adminRoutes = require('./routes/admin');
const coreRoutes = require('./routes/core');
const authRoutes = require('./routes/auth');
const invoiceRoutes = require('./routes/invoice');

require('dotenv').config(); // Load environment variables

const app = express(); //set up express app




app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/admin', adminRoutes); //links to admin.js
app.use('/api', coreRoutes); //links to core.js
app.use('/api', authRoutes);
app.use('/api', invoiceRoutes);


// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 9115;
    const httpsOptions = {
        key: fs.readFileSync(path.join(__dirname, '../ssl/server.key')),
        cert: fs.readFileSync(path.join(__dirname, '../ssl/server.crt')),
    };
    https.createServer(httpsOptions, app).listen(PORT, '127.0.0.1', () => {
        console.log(`HTTPS server running at https://localhost:${PORT}`);
    });
}

module.exports = app; // Export the app for testing
