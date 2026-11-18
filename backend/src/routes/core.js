const express = require('express');
const router = express.Router();
const coreController = require('../controllers/coreController');
const { authenticateUser } = require("../middleware/authMiddleware");

router.get('/tollStationPasses/:tollStationID/:date_from/:date_to', authenticateUser, coreController.getTollStationPasses);
router.get('/passAnalysis/:stationOpID/:tagOpID/:date_from/:date_to', authenticateUser, coreController.getPassAnalysis);
router.get('/passesCost/:tollOpID/:tagOpID/:date_from/:date_to', authenticateUser, coreController.getPassesCost);
router.get('/chargesBy/:tollOpID/:date_from/:date_to', authenticateUser, coreController.getChargesBy);
router.get('/tollstations', authenticateUser, coreController.getAllTollStationsPasses);


module.exports = router;
