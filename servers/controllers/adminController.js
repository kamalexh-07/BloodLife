const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Donor = require("../models/Donor");
const EmergencyRequest = require("../models/EmergencyRequest");
const { formatPersonName } = require("../utils/personName");

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

function assertJwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    throw new Error("Server configuration error");
  }
}

function publicUser(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  delete o.password;
  o.name = formatPersonName(o.name) || o.name;
  return o;
}

/** POST /api/admin/login */
exports.login = async (req, res) => {
  try {
    assertJwtSecret();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Donor.findOne({ email, role: "admin" });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: "Admin login successful",
      token,
      admin: {
        _id: admin._id,
        name: formatPersonName(admin.name) || admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Admin login error:", err.message);
    res.status(500).json({ message: "Login failed" });
  }
};

/** GET /api/admin/dashboard */
exports.dashboard = async (req, res) => {
  try {
    const [
      totalDonors,
      availableDonors,
      unavailableDonors,
      totalRequests,
      openRequests,
      urgentRequests,
      fulfilledRequests,
      recentDonors,
      recentRequests,
    ] = await Promise.all([
      Donor.countDocuments({ role: { $ne: "admin" } }),
      Donor.countDocuments({ role: { $ne: "admin" }, isAvailable: true }),
      Donor.countDocuments({ role: { $ne: "admin" }, isAvailable: false }),
      EmergencyRequest.countDocuments(),
      EmergencyRequest.countDocuments({ status: "Open" }),
      EmergencyRequest.countDocuments({ status: "Urgent" }),
      EmergencyRequest.countDocuments({ status: "Fulfilled" }),
      Donor.find({ role: { $ne: "admin" } })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("name email bloodGroup district isAvailable createdAt")
        .lean(),
      EmergencyRequest.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select("patientName bloodGroup district status hospitalName createdAt")
        .lean(),
    ]);

    res.json({
      stats: {
        totalDonors,
        availableDonors,
        unavailableDonors,
        totalRequests,
        openRequests,
        urgentRequests,
        fulfilledRequests,
      },
      recentDonors: recentDonors.map((d) => ({
        ...d,
        name: formatPersonName(d.name) || d.name,
      })),
      recentRequests,
    });
  } catch (err) {
    console.error("Admin dashboard error:", err.message);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};

/** GET /api/admin/users */
exports.listUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { role: { $ne: "admin" } };

    const q = String(req.query.q || "").trim();
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: re }, { email: re }, { mobileNumber: re }, { district: re }];
    }

    let bloodGroup = req.query.bloodGroup;
    if (typeof bloodGroup === "string" && bloodGroup.trim()) {
      bloodGroup = bloodGroup.replace(/^([A-Za-z]{1,2})\s+$/, "$1+").trim();
      filter.bloodGroup = bloodGroup;
    }

    if (req.query.district) {
      filter.district = String(req.query.district).trim();
    }

    if (req.query.availability === "true") filter.isAvailable = true;
    if (req.query.availability === "false") filter.isAvailable = false;

    const [total, users] = await Promise.all([
      Donor.countDocuments(filter),
      Donor.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      users: users.map((u) => ({
        ...u,
        name: formatPersonName(u.name) || u.name,
      })),
    });
  } catch (err) {
    console.error("Admin list users error:", err.message);
    res.status(500).json({ message: "Failed to load donors" });
  }
};

/** GET /api/admin/users/:id */
exports.getUser = async (req, res) => {
  try {
    const user = await Donor.findById(req.params.id).select("-password");
    if (!user || user.role === "admin") {
      return res.status(404).json({ message: "Donor not found" });
    }
    res.json(publicUser(user));
  } catch (err) {
    console.error("Admin get user error:", err.message);
    res.status(500).json({ message: "Failed to load donor" });
  }
};

/** PUT /api/admin/users/:id */
exports.updateUser = async (req, res) => {
  try {
    const user = await Donor.findById(req.params.id);
    if (!user || user.role === "admin") {
      return res.status(404).json({ message: "Donor not found" });
    }

    const allowed = [
      "name",
      "mobileNumber",
      "whatsappNumber",
      "bloodGroup",
      "country",
      "state",
      "district",
      "streetAddress",
      "pincode",
      "isAvailable",
    ];

    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      if (key === "name") {
        const n = formatPersonName(req.body.name);
        if (n) user.name = n;
      } else if (key === "isAvailable") {
        user.isAvailable = Boolean(req.body.isAvailable);
      } else if (key === "mobileNumber" || key === "whatsappNumber") {
        const phone = String(req.body[key]).trim();
        if (phone && !/^\d{10}$/.test(phone)) {
          return res.status(400).json({ message: `${key} must be a 10-digit number` });
        }
        user[key] = phone;
      } else {
        user[key] = String(req.body[key]).trim();
      }
    }

    // Never allow elevating role or changing email/password via this route
    await user.save();
    res.json({ message: "Donor updated successfully", user: publicUser(user) });
  } catch (err) {
    console.error("Admin update user error:", err.message);
    res.status(500).json({ message: "Failed to update donor" });
  }
};

/** DELETE /api/admin/users/:id */
exports.deleteUser = async (req, res) => {
  try {
    const user = await Donor.findById(req.params.id);
    if (!user || user.role === "admin") {
      return res.status(404).json({ message: "Donor not found" });
    }
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    await user.deleteOne();
    res.json({ message: "Donor deleted successfully" });
  } catch (err) {
    console.error("Admin delete user error:", err.message);
    res.status(500).json({ message: "Failed to delete donor" });
  }
};

/** GET /api/admin/requests */
exports.listRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {};
    const q = String(req.query.q || "").trim();
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { patientName: re },
        { hospitalName: re },
        { district: re },
        { mobileNumber: re },
      ];
    }

    if (req.query.status) {
      const status = String(req.query.status).trim();
      if (["Open", "Urgent", "Fulfilled"].includes(status)) {
        filter.status = status;
      }
    }

    let bloodGroup = req.query.bloodGroup;
    if (typeof bloodGroup === "string" && bloodGroup.trim()) {
      bloodGroup = bloodGroup.replace(/^([A-Za-z]{1,2})\s+$/, "$1+").trim();
      filter.bloodGroup = bloodGroup;
    }

    if (req.query.district) {
      filter.district = String(req.query.district).trim();
    }

    const [total, requests] = await Promise.all([
      EmergencyRequest.countDocuments(filter),
      EmergencyRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      requests,
    });
  } catch (err) {
    console.error("Admin list requests error:", err.message);
    res.status(500).json({ message: "Failed to load requests" });
  }
};

/** PUT /api/admin/requests/:id */
exports.updateRequest = async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const status = req.body.status;
    if (status !== undefined) {
      if (!["Open", "Urgent", "Fulfilled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      request.status = status;
    }

    const optional = ["patientName", "hospitalName", "hospitalAddress", "district", "bloodGroup"];
    for (const key of optional) {
      if (req.body[key] !== undefined) {
        request[key] = String(req.body[key]).trim();
      }
    }

    await request.save();
    res.json({ message: "Request updated successfully", request });
  } catch (err) {
    console.error("Admin update request error:", err.message);
    res.status(500).json({ message: "Failed to update request" });
  }
};

/** DELETE /api/admin/requests/:id */
exports.deleteRequest = async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    await request.deleteOne();
    res.json({ message: "Request deleted successfully" });
  } catch (err) {
    console.error("Admin delete request error:", err.message);
    res.status(500).json({ message: "Failed to delete request" });
  }
};

/** GET /api/admin/me */
exports.me = async (req, res) => {
  try {
    res.json({
      _id: req.user._id,
      name: formatPersonName(req.user.name) || req.user.name,
      email: req.user.email,
      role: req.user.role,
      mobileNumber: req.user.mobileNumber || "",
      createdAt: req.user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load profile" });
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** PATCH /api/admin/me */
exports.updateProfile = async (req, res) => {
  try {
    assertJwtSecret();

    if (req.body.name !== undefined) {
      const n = formatPersonName(req.body.name);
      if (n) req.user.name = n;
    }

    if (req.body.mobileNumber !== undefined) {
      const phone = String(req.body.mobileNumber).trim();
      if (phone && !/^\d{10}$/.test(phone)) {
        return res.status(400).json({ message: "Mobile number must be a 10-digit number" });
      }
      req.user.mobileNumber = phone;
    }

    let emailChanged = false;
    if (req.body.email !== undefined) {
      const newEmail = String(req.body.email).trim().toLowerCase();

      if (!newEmail || !EMAIL_RE.test(newEmail)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      if (newEmail !== req.user.email) {
        const existing = await Donor.findOne({
          email: newEmail,
          _id: { $ne: req.user._id },
        });
        if (existing) {
          return res.status(409).json({ message: "This email address is already in use" });
        }
        req.user.email = newEmail;
        emailChanged = true;
      }
    }

    await req.user.save();

    const adminPayload = {
      _id: req.user._id,
      name: formatPersonName(req.user.name) || req.user.name,
      email: req.user.email,
      role: req.user.role,
      mobileNumber: req.user.mobileNumber || "",
    };

    // Email is part of the JWT payload, so issue a fresh token whenever it changes.
    if (emailChanged) {
      const token = jwt.sign(
        { id: req.user._id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      return res.json({
        message: "Profile updated successfully. Email changed — your session has been refreshed.",
        admin: adminPayload,
        emailChanged: true,
        token,
      });
    }

    res.json({
      message: "Profile updated successfully",
      admin: adminPayload,
      emailChanged: false,
    });
  } catch (err) {
    console.error("Admin profile update error:", err.message);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/** POST /api/admin/change-password */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const admin = await Donor.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const ok = await bcrypt.compare(String(currentPassword), admin.password);
    if (!ok) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    admin.password = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    await admin.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Admin change password error:", err.message);
    res.status(500).json({ message: "Failed to change password" });
  }
};
