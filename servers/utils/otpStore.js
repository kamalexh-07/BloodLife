/**
 * In-memory OTP store for the forgot-password flow.
 *
 * NOTE: This is process-memory only — it resets on server restart and does not
 * scale across multiple server instances. That's fine for a single-instance
 * deployment; if BloodLife ever runs multiple server processes/instances behind
 * a load balancer, this should move to a shared store (e.g. Redis) instead.
 */

const OTP_TTL_MS = 2 * 60 * 1000; // 2 minutes to enter the OTP
const VERIFIED_TTL_MS = 10 * 60 * 1000; // 10 minutes to complete password reset after verify
const MAX_ATTEMPTS = 5;

/** @type {Map<string, {otp: string, expiresAt: number, verified: boolean, attempts: number}>} */
const store = new Map();

function normalizeKey(identifier) {
  return String(identifier || '').trim().toLowerCase();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setOtp(identifier) {
  const key = normalizeKey(identifier);
  const otp = generateOtp();
  store.set(key, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    verified: false,
    attempts: 0,
  });
  // Log OTP only outside production so local/demo flows remain usable without SMTP.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[otpStore] OTP for "${key}": ${otp} (expires in ${Math.floor(OTP_TTL_MS / 1000)}s)`);
  }
  return { otp, expiresIn: Math.floor(OTP_TTL_MS / 1000) };
}

function verifyOtp(identifier, otp) {
  const key = normalizeKey(identifier);
  const entry = store.get(key);
  const otpStr = String(otp || '').trim();

  if (!entry) {
    return { ok: false, reason: 'No OTP requested for this account, or it already expired.' };
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return { ok: false, reason: 'OTP expired. Please request a new one.' };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return { ok: false, reason: 'Too many incorrect attempts. Please request a new OTP.' };
  }
  if (entry.otp !== otpStr) {
    entry.attempts += 1;
    return { ok: false, reason: 'Invalid OTP.' };
  }

  // Mark verified and extend the window so the user has time to set a new password
  // (JWT reset token is also 10m — keep them aligned).
  entry.verified = true;
  entry.expiresAt = Date.now() + VERIFIED_TTL_MS;
  return { ok: true };
}

function isVerified(identifier) {
  const entry = store.get(normalizeKey(identifier));
  return Boolean(entry && entry.verified && Date.now() <= entry.expiresAt);
}

function consume(identifier) {
  store.delete(normalizeKey(identifier));
}

module.exports = { setOtp, verifyOtp, isVerified, consume };
