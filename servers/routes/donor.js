const express = require("express");
const router = express.Router();
const donorController = require("../controllers/donorController");
const { protect } = require("../middleware/auth");

router.post("/register", donorController.register);
router.get("/search", donorController.search);
router.post("/emergency-alert", donorController.emergencyAlert);
router.get("/stats", protect, donorController.stats);

module.exports = router;
