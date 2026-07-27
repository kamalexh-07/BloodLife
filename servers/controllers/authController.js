const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authService = require("../services/authService");
const Donor = require("../models/Donor");
const otpStore = require("../utils/otpStore");
const { sendOtpEmail } = require("../utils/mailer");
const { formatPersonName } = require("../utils/personName");

const RESET_TOKEN_PURPOSE = "password-reset";
const BCRYPT_ROUNDS = 10;

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findDonorByIdentifier(identifier) {
  const id = String(identifier || "").trim();
  if (!id) return Promise.resolve(null);
  return Donor.findOne({
    $or: [
      { email: { $regex: new RegExp(`^${escapeRegex(id)}$`, "i") } },
      { mobileNumber: id },
    ],
  });
}

exports.register = async (req, res) => {
  try {
    const donor = await authService.registerDonor(req.body);
    res.status(201).json({
      message: "Donor registered successfully!",
      donor,
    });
  } catch (err) {
    const status = err.status || (err.code === 11000 ? 409 : 500);
    const message =
      err.code === 11000
        ? "Email already registered"
        : err.status
          ? err.message
          : "Registration failed";
    if (!err.status && err.code !== 11000) {
      console.error("Register Error:", err.message);
    }
    res.status(status).json({ message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.loginDonor(req.body.email, req.body.password);
    res.status(200).json({
      message: "Login successful!",
      ...result,
    });
  } catch (err) {
    const status = err.status || 401;
    res.status(status).json({
      message: err.status ? err.message : "Invalid email or password",
    });
  }
};

exports.me = async (req, res) => {
  try {
    res.status(200).json({
      _id: req.user._id,
      name: formatPersonName(req.user.name) || req.user.name,
      email: req.user.email,
      phone: req.user.mobileNumber,
      mobileNumber: req.user.mobileNumber,
      whatsappNumber: req.user.whatsappNumber || "",
      bloodGroup: req.user.bloodGroup,
      district: req.user.district,
      state: req.user.state,
      country: req.user.country,
      streetAddress: req.user.streetAddress || "",
      pincode: req.user.pincode || "",
      isAvailable: req.user.isAvailable !== false,
    });
  } catch (err) {
    console.error("Me Error:", err.message);
    res.status(500).json({ message: "Failed to load profile" });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    req.user.isAvailable = Boolean(req.body.isAvailable);
    await req.user.save();

    res.status(200).json({
      message: "Availability updated successfully",
      isAvailable: req.user.isAvailable,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.mobileNumber,
        isAvailable: req.user.isAvailable,
      },
    });
  } catch (err) {
    console.error("Availability Error:", err.message);
    res.status(500).json({ message: "Failed to update availability" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      whatsappNumber,
      streetAddress,
      pincode,
      district,
      isAvailable,
    } = req.body;

    if (mobileNumber !== undefined) {
      const phone = String(mobileNumber).trim();
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ message: "Mobile number must be a 10-digit number" });
      }
      req.user.mobileNumber = phone;
    }

    if (whatsappNumber !== undefined) {
      const wa = String(whatsappNumber).trim();
      if (wa && !/^\d{10}$/.test(wa)) {
        return res.status(400).json({ message: "WhatsApp number must be a 10-digit number" });
      }
      req.user.whatsappNumber = wa;
    }

    if (name !== undefined) {
      const n = formatPersonName(name);
      if (n) req.user.name = n;
    }
    if (streetAddress !== undefined) {
      req.user.streetAddress = String(streetAddress).trim();
    }
    if (pincode !== undefined) {
      req.user.pincode = String(pincode).trim();
    }
    if (district !== undefined) {
      const d = String(district).trim();
      if (d) req.user.district = d;
    }
    if (isAvailable !== undefined) {
      req.user.isAvailable = Boolean(isAvailable);
    }

    await req.user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.mobileNumber,
        mobileNumber: req.user.mobileNumber,
        whatsappNumber: req.user.whatsappNumber || "",
        bloodGroup: req.user.bloodGroup,
        district: req.user.district,
        state: req.user.state,
        country: req.user.country,
        streetAddress: req.user.streetAddress || "",
        pincode: req.user.pincode || "",
        isAvailable: req.user.isAvailable !== false,
      },
    });
  } catch (err) {
    console.error("Update Profile Error:", err.message);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const emailPhone = String(req.body.emailPhone || "").trim();

    if (!emailPhone) {
      return res.status(400).json({ message: "Email or phone number is required" });
    }

    const donor = await findDonorByIdentifier(emailPhone);
    const { otp, expiresIn } = otpStore.setOtp(emailPhone);

    if (donor) {
      await sendOtpEmail(donor.email, otp);
    }

    res.status(200).json({
      message: "If that account exists, an OTP has been sent.",
      expiresIn,
    });
  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    res.status(500).json({ message: "Failed to process request" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const emailPhone = String(req.body.emailPhone || "").trim();
    const otp = String(req.body.otp || "").trim();

    if (!emailPhone || !otp) {
      return res.status(400).json({ message: "Email/phone and OTP are required" });
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      console.error("JWT_SECRET is missing or too short");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const result = otpStore.verifyOtp(emailPhone, otp);
    if (!result.ok) {
      return res.status(400).json({ message: result.reason });
    }

    const normalizedId = emailPhone.toLowerCase();
    const token = jwt.sign(
      { emailPhone: normalizedId, purpose: RESET_TOKEN_PURPOSE },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.status(200).json({ message: "OTP verified", token });
  } catch (error) {
    console.error("Verify OTP Error:", error.message);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing reset token" });
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      console.error("JWT_SECRET is missing or too short");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Reset token is invalid or expired" });
    }

    if (decoded.purpose !== RESET_TOKEN_PURPOSE) {
      return res.status(401).json({ message: "Invalid reset token" });
    }

    if (!otpStore.isVerified(decoded.emailPhone)) {
      return res.status(401).json({ message: "OTP verification has expired, please start again" });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const donor = await findDonorByIdentifier(decoded.emailPhone);
    if (!donor) {
      return res.status(404).json({ message: "Account not found" });
    }

    donor.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await donor.save();
    otpStore.consume(decoded.emailPhone);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    res.status(500).json({ message: "Failed to reset password" });
  }
};
