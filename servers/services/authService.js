const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Donor = require("../models/Donor");
const { formatPersonName } = require("../utils/personName");

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

function assertJwtSecret() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    throw new Error("Server configuration error");
  }
}

const registerDonor = async (data) => {
  const {
    name,
    email,
    mobileNumber,
    whatsappNumber,
    bloodGroup,
    country,
    state,
    district,
    streetAddress,
    pincode,
    password,
    terms,
    dataConsent,
    donationOpportunities,
    emergencyContact,
  } = data;

  if (!name || !email || !mobileNumber || !bloodGroup || !country || !state || !district || !streetAddress || !pincode || !password) {
    throw Object.assign(new Error("Please fill in all required fields"), { status: 400 });
  }

  if (!terms || !dataConsent) {
    throw Object.assign(new Error("You must accept the terms and data consent"), { status: 400 });
  }

  if (String(password).length < 8) {
    throw Object.assign(new Error("Password must be at least 8 characters"), { status: 400 });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const phone = String(mobileNumber).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    throw Object.assign(new Error("Invalid email address"), { status: 400 });
  }

  if (!/^\d{10}$/.test(phone)) {
    throw Object.assign(new Error("Mobile number must be a 10-digit number"), { status: 400 });
  }

  const existingDonor = await Donor.findOne({ email: emailNorm });
  if (existingDonor) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(String(password), BCRYPT_ROUNDS);

  const donor = await Donor.create({
    name: formatPersonName(name) || String(name).trim(),
    email: emailNorm,
    mobileNumber: phone,
    whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : phone,
    bloodGroup: String(bloodGroup).trim(),
    country: String(country).trim(),
    state: String(state).trim(),
    district: String(district).trim(),
    streetAddress: String(streetAddress).trim(),
    pincode: String(pincode).trim(),
    password: hashedPassword,
    terms: Boolean(terms),
    dataConsent: Boolean(dataConsent),
    donationOpportunities: Boolean(donationOpportunities),
    emergencyContact: Boolean(emergencyContact),
    role: "user",
  });

  return {
    _id: donor._id,
    name: donor.name,
    email: donor.email,
  };
};

const loginDonor = async (email, password) => {
  assertJwtSecret();

  if (!email || !password) {
    throw Object.assign(new Error("Email and password are required"), { status: 400 });
  }

  const donor = await Donor.findOne({ email: String(email).trim().toLowerCase() });

  if (!donor) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  const validPassword = await bcrypt.compare(String(password), donor.password);

  if (!validPassword) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  const token = jwt.sign(
    {
      id: donor._id,
      email: donor.email,
      role: donor.role || "user",
    },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    firstName: (formatPersonName(donor.name) || donor.name || "User").split(" ")[0],
  };
};

module.exports = {
  registerDonor,
  loginDonor,
};
