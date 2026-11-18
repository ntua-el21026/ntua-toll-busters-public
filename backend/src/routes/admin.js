const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require("fs");
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateUser, requireAdmin } = require("../middleware/authMiddleware");

// Configure multer for file uploads
const UPLOADS_DIR = path.join(__dirname, "../../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}


const upload = multer({
    dest: path.join(__dirname, '../../uploads'), // Temporary storage
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'text/csv') {
            return cb(new Error('Only CSV files are allowed'), false);
        }
        cb(null, true);
    },
});

//endpoints
router.get('/healthcheck', authenticateUser, requireAdmin, adminController.healthcheck);
router.post('/resetstations', authenticateUser, requireAdmin, adminController.resetStations);
router.post('/resetpasses', authenticateUser, requireAdmin, adminController.resetPasses);
router.post('/addpasses', authenticateUser, requireAdmin, upload.single('file'), adminController.addPasses);
router.post("/usermod", authenticateUser, requireAdmin, adminController.userMod);
router.get("/users", authenticateUser, requireAdmin, adminController.getUsers);

module.exports = router;
