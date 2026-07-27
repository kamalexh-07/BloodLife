const Donor = require("../models/Donor");
const EmergencyRequest = require("../models/EmergencyRequest");
const { registerDonor } = require("../services/authService");

/**
 * POST /api/donors/register
 * Public donor registration (used by the frontend register form).
 */
exports.register = async (req, res) => {
  try {
    await registerDonor(req.body);
    res.status(201).json({ message: "Donor registered successfully!" });
  } catch (error) {
    const status = error.status || (error.code === 11000 ? 409 : 500);
    const message =
      error.code === 11000
        ? "Email already registered"
        : error.status
          ? error.message
          : "Registration failed";
    if (!error.status && error.code !== 11000) {
      console.error("Donor Register Error:", error.message);
    }
    res.status(status).json({ message });
  }
};

/**
 * GET /api/donors/search
 * Public search of available donors (limited fields, no emails).
 */
exports.search = async (req, res) => {
  try {
    let { bloodGroup, country, state, district } = req.query;

    // Query-string parsers treat "+" as space (x-www-form-urlencoded).
    if (typeof bloodGroup === "string") {
      bloodGroup = bloodGroup.replace(/^([A-Za-z]{1,2})\s+$/, "$1+").trim();
    }

    const query = { isAvailable: true, role: { $ne: "admin" } };
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (country) query.country = String(country).trim();
    if (state) query.state = String(state).trim();
    if (district) query.district = String(district).trim();

    const donors = await Donor.find(query)
      .select("name mobileNumber whatsappNumber bloodGroup district state isAvailable")
      .limit(100)
      .lean();

    const results = donors.map((d) => {
      const parts = (d.name || "").trim().split(/\s+/);
      return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
        bloodType: d.bloodGroup,
        phone: d.mobileNumber,
        whatsappNumber: d.whatsappNumber || "",
        district: d.district,
        state: d.state || "",
        isAvailable: d.isAvailable !== false,
      };
    });

    res.json(results);
  } catch (error) {
    console.error("Donor Search Error:", error.message);
    res.status(500).json({ message: "Search failed" });
  }
};

/**
 * POST /api/donors/emergency-alert
 * Public emergency blood request.
 */
exports.emergencyAlert = async (req, res) => {
  try {
    const {
      bloodGroup,
      country,
      state,
      district,
      hospitalName,
      hospitalAddress,
      patientName,
      mobileNumber,
      whatsappNumber,
    } = req.body;

    if (
      !bloodGroup ||
      !country ||
      !state ||
      !district ||
      !hospitalName ||
      !hospitalAddress ||
      !patientName ||
      !mobileNumber
    ) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    const phone = String(mobileNumber).trim();
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: "Mobile number must be a 10-digit number" });
    }

    await EmergencyRequest.create({
      bloodGroup: String(bloodGroup).trim(),
      country: String(country).trim(),
      state: String(state).trim(),
      district: String(district).trim(),
      hospitalName: String(hospitalName).trim(),
      hospitalAddress: String(hospitalAddress).trim(),
      patientName: String(patientName).trim(),
      mobileNumber: phone,
      whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : undefined,
    });

    res.status(201).json({
      message: "Emergency alert sent successfully! Nearby donors will be notified.",
    });
  } catch (error) {
    console.error("Emergency Alert Error:", error.message);
    res.status(500).json({ message: "Emergency alert failed" });
  }
};

/**
 * GET /api/donors/stats
 * Authenticated aggregate counts for the dashboard (no PII).
 */
exports.stats = async (req, res) => {
  try {
    const [totalDonors, availableDonors, activeRequests] = await Promise.all([
      Donor.countDocuments({ role: { $ne: "admin" } }),
      Donor.countDocuments({ role: { $ne: "admin" }, isAvailable: true }),
      EmergencyRequest.countDocuments({ status: { $in: ["Open", "Urgent"] } }),
    ]);

    res.json({ totalDonors, availableDonors, activeRequests });
  } catch (error) {
    console.error("Stats Error:", error.message);
    res.status(500).json({ message: "Failed to load stats" });
  }
};

/**
 * GET /api/requests
 * Authenticated recent emergency requests for the dashboard.
 */
exports.listRequests = async (req, res) => {
  try {
    const requests = await EmergencyRequest.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("patientName bloodGroup district status createdAt")
      .lean();

    res.json(
      requests.map((r) => ({
        name: r.patientName,
        bloodGroup: r.bloodGroup,
        district: r.district,
        status: r.status,
        createdAt: r.createdAt,
      }))
    );
  } catch (error) {
    console.error("Fetch Requests Error:", error.message);
    res.status(500).json({ message: "Failed to load requests" });
  }
};
