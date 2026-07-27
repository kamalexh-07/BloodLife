/**
 * Create or update an admin account from environment variables.
 *
 * Usage:
 *   node scripts/seed-admin.js
 *
 * Requires in .env:
 *   ADMIN_EMAIL=admin@bloodlife.local
 *   ADMIN_PASSWORD=ChangeMe123!
 *   ADMIN_NAME=BloodLife Admin
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Donor = require("../models/Donor");

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = process.env.ADMIN_NAME || "BloodLife Admin";

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }
  if (!email || !password || password.length < 8) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) in .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME || "blooddb",
  });

  const hash = await bcrypt.hash(password, 10);
  const existing = await Donor.findOne({ email });

  if (existing) {
    existing.password = hash;
    existing.role = "admin";
    existing.name = name;
    await existing.save();
    console.log(`Updated existing account to admin: ${email}`);
  } else {
    await Donor.create({
      name,
      email,
      password: hash,
      role: "admin",
      mobileNumber: "0000000000",
      bloodGroup: "O+",
      country: "India",
      state: "Tamil Nadu",
      district: "Chennai",
      streetAddress: "Admin",
      pincode: "600001",
      terms: true,
      dataConsent: true,
      isAvailable: false,
    });
    console.log(`Created admin account: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
