# BloodLife — Bug Fix Report (Production Hardening)

Companion to the production audit. Every change below addresses a real issue found in the codebase.

## Critical

### 1. Secrets committed in repository
**Problem:** `servers/.env` contained live MongoDB credentials, JWT secret, email password, and Twilio keys.  
**Fix:** Deleted `servers/.env` from the tree. Added `servers/.env.example` (placeholders only) and root `.gitignore` so `.env` cannot be re-committed.  
**Action required:** Rotate all previously exposed credentials before deploying.

### 2. MongoDB URI logged on startup
**Problem:** `config/db.js` printed the full connection string.  
**Fix:** Removed URI logging; log only success or failure message.

## High

### 3. No unique constraint on donor email
**Problem:** Uniqueness was only checked in application code → race under concurrent signups.  
**Fix:** `email: { unique: true, lowercase: true }` on Donor schema, plus supporting indexes for search.

### 4. Unauthenticated full donor dump
**Problem:** `GET /api/donors` returned every donor document (PII) without auth. Dashboard only needed counts.  
**Fix:** Removed the open list endpoint. Added authenticated `GET /api/donors/stats` returning `{ totalDonors, availableDonors, activeRequests }`. Updated `dashboard.js` to use it.

### 5. No rate limiting
**Problem:** Login, register, and OTP endpoints could be brute-forced.  
**Fix:** `express-rate-limit` — general API 120/min; auth 30/15min; OTP 10/15min.

### 6. Open CORS and missing security headers
**Problem:** `cors()` allowed any origin; no Helmet.  
**Fix:** Helmet enabled (CSP disabled to allow existing CDN fonts/icons). CORS restricted when `CORS_ORIGINS` is set.

### 7. Dual registration paths with weak validation
**Problem:** Frontend called inline `POST /api/donors/register` which skipped uniqueness pre-check and field validation that lived only in `authService`.  
**Fix:** Inline route removed. `donorController.register` calls the same `authService.registerDonor` with full validation. `/api/auth/register` remains as an alternate entry using the same service.

### 8. Business logic embedded in server.js
**Problem:** Search, emergency, register, and requests lived as inline handlers.  
**Fix:** Moved to `controllers/donorController.js` and `routes/donor.js`. `server.js` only wires middleware, mounts routers, and serves static files.

### 9. Missing / broken hero images
**Problem:** `client/assets` was empty; `index.html` referenced `*.jpg.jpg` paths.  
**Fix:** Corrected paths and added SVG placeholder heroes so the Home slider renders without 404s. Replace with production photography when available.

### 10. API error leakage
**Problem:** Many handlers returned `error.message` (raw Mongoose text) to clients.  
**Fix:** Client-facing messages are generic or validated user-facing strings; details stay in server logs.

## Medium

### 11. `GET /api/requests` was public
**Fix:** Requires JWT via `protect` middleware (dashboard already sent the token).

### 12. Weak registration validation
**Fix:** Server now enforces required fields, email format, 10-digit phone, password length ≥ 8, terms and data consent.

### 13. Unused dependencies and debug files
**Fix:** Removed `bcryptjs`, `dns-test.js`, Tailwind leftover config/src/client package.json.

### 14. OTP always logged
**Fix:** OTP console log only when `NODE_ENV !== 'production'`. Mailer still falls back to console when SMTP is unset (dev).

### 15. Unbounded search results
**Fix:** Donor search limited to 100 matches.

### 16. Donor schema lacked timestamps
**Fix:** `{ timestamps: true }` on Donor and indexes on EmergencyRequest.

## Low

### 17. Login debug console logs
**Fix:** Removed from `Login.js`.

### 18. No npm start script
**Fix:** `"start": "node server.js"` in server `package.json`.

### 19. Verbose root/fallback console logs
**Fix:** Removed from `server.js`.

## Not changed (by design / documented)
- JWT still stored in `localStorage` (existing auth model; cookie migration would change client contract significantly).
- OTP store remains in-process memory (documented limitation for multi-instance; Redis recommended at scale).
- Client-side math CAPTCHA remains UX-only (no third-party CAPTCHA keys in project); server validates real fields tightly instead.
- Twilio env vars were never used in code; omitted from `.env.example` rather than implementing unused SMS.

## Verification
- `node --check` passed on all modified backend modules.
- Frontend `fetch` paths for register, search, emergency, auth, stats, and requests aligned with mounted routes.
- Static paths for CSS, SCRIPT, HTML, assets unchanged for the browser.
