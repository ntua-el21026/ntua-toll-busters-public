const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateUser } = require("../middleware/authMiddleware");



if (!authController.login || !authController.logout) {
    console.error("❌ Error: authController functions not found");
}

router.post('/login', authController.login);
router.post('/logout',authenticateUser, authController.logout);

router.use(authController.checkBlacklist);


module.exports = router;
