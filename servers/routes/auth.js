const express = require("express");
const router = express.Router();

const {
    register,
    login,
    me,
    updateAvailability,
    updateProfile,
    forgotPassword,
    verifyOtp,
    resetPassword
} = require("../controllers/authController");

const { protect } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

router.get("/me", protect, me);
router.patch("/me", protect, updateProfile);
router.patch("/me/availability", protect, updateAvailability);

module.exports = router;
