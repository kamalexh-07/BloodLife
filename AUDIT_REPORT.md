# BloodLife — Full-Stack Audit Report

## ⚠️ Environment constraint (read first)

This sandbox has **no network egress**. That means:
- `npm install` could not be run — I could not install/verify backend dependencies (including the new `nodemailer` dependency added this session).
- No connection to MongoDB (the `.env` `MONGODB_URI` points to what appears to be a remote Atlas cluster) — no live database testing.
- The backend server itself could not be started — `node server.js` fails immediately at `require('dotenv')` since `node_modules` doesn't exist and can't be installed here.

**What this means for the audit:** the frontend audit (below) is based on real, live, headless-browser rendering (Playwright), since static file serving needs no network. The backend/database/full-flow audit is a **rigorous static code + contract audit** — every route was read, and every frontend `fetch()` call was matched against it field-by-field (method, path, request body shape, response shape) — but none of it was exercised live end-to-end. Before shipping, run this in an environment with network access: `cd servers && npm install && npm run start` (or `node server.js`) against a real MongoDB instance, then re-run the flows below.

---

## Frontend — verified live (headless browser, desktop + mobile)

All 12 pages (Home, Login, Register, Forgot Password, Dashboard, Profile, Find Donor,
Emergency Request, About, Contact, Privacy, Terms) were rendered at 1440×900 and 375×812,
with console/network errors captured.

- **Broken links:** none found — every internal `.html` link resolves.
- **Missing resources:** one found and fixed — `index.html` hero images used Windows-style
  backslash paths (`..\assets\images\...`). Browsers tolerate this via URL normalization
  (confirmed via screenshot — images rendered fine), but it's not spec-correct and could
  break in stricter tooling. Fixed to forward slashes.
- **JavaScript/console errors:** one real bug found and fixed — see `BUG_FIX_REPORT.md`
  (OTP input navigation on Forgot Password, from the earlier session). No other JS errors
  found this session, beyond expected noise from Google Fonts (403, blocked by this
  sandbox's disabled network) and unimplemented backend routes (404s — resolved this
  session, see below).
- **Responsive:** all pages collapse correctly at mobile width — sidebar→bottom tab bar,
  desktop tables→mobile card lists, two-column forms→single column. No overflow or overlap
  found at either breakpoint.
- **Accessibility:** all `<img>` tags have meaningful `alt` text. Form inputs are backed by
  visible `<label>` or `aria-label` on every audited form (login, register, forgot-password,
  find-donor, emergency-request). Focus-visible states and `prefers-reduced-motion` support
  are present in both stylesheets.
- **Form validation:** present and functioning across register, login, find-donor
  (CAPTCHA-gated), emergency-request (CAPTCHA-gated). Forgot-password enforces an 8-char
  minimum password client-side, matched server-side (see below).
- **Loading states:** dashboard, profile, and donor search all show a loading/placeholder
  state while awaiting API responses.

## Backend — static code + contract audit

### Route inventory vs. frontend contract

Every frontend `fetch()` call was traced to a backend handler:

| Frontend call | Backend route | Status before this session | Status now |
|---|---|---|---|
| `POST /api/auth/login` | `routes/auth.js` → `authController.login` | ✅ working (dead duplicate also existed in `server.js`) | ✅ working, duplicate removed |
| `POST /api/donors/register` | `server.js` inline | ✅ working | ✅ working |
| `POST /api/auth/forgot-password` | `server.js` inline stub | 🔴 fake — logged body, returned canned success, no OTP ever generated | ✅ real OTP generation + email delivery |
| `POST /api/auth/verify-otp` | *(did not exist)* | 🔴 **404 — route didn't exist** | ✅ implemented |
| `POST /api/auth/reset-password` | *(did not exist)* | 🔴 **404 — route didn't exist** | ✅ implemented |
| `GET /api/auth/me` | `routes/auth.js` → `authController.me` | ✅ working | ✅ working |
| `PATCH /api/auth/me/availability` | `routes/auth.js` | ✅ working | ✅ working |
| `GET /api/locations/countries` (+states/districts) | `routes/location.js` | ✅ working | ✅ working |
| `GET /api/donors/search` | `server.js` inline | 🔴 always returned one hardcoded fake donor, ignored query params; response shape (`name`/`bloodType`/`location`/`phone`) didn't even match what `F_D.js` reads (`firstName`/`lastName`/`bloodType`/`phone`) | ✅ real MongoDB query, filtered by blood group/country/state/district, response shape corrected to match frontend |
| `POST /api/donors/emergency-alert` | `server.js` inline | 🔴 logged to console only, never persisted | ✅ saves to new `EmergencyRequest` collection |
| `GET /api/donors` (dashboard stats) | `server.js` inline | ✅ working (real DB) | ✅ working |
| `GET /api/requests` (dashboard recent requests) | `server.js` inline | 🔴 always returned `[]` | ✅ returns real recent `EmergencyRequest` documents |

### Dead / duplicate code — removed this session

- `routes/authRoutes.js`, `routes/donorRoutes.js`, `services/donorService.js` — empty files, not required anywhere. Deleted.
- `models/User.js` — not a valid Mongoose model (referenced undefined `User`/`generateToken`), not required anywhere. Deleted.
- `routes/donor.js` + `controllers/donorController.js` — never mounted in `server.js`; controller imported `axios` (not installed) and called undefined functions. Deleted.
- `server.js` inline `POST /api/auth/login` — unreachable dead code (the `routes/auth.js` version, mounted earlier, always won). Also contained an insecure hardcoded JWT-secret fallback (`'your_jwt_secret'`). Removed.
- `server.js` inline `POST /api/auth/forgot-password` fake stub — replaced by the real implementation in `routes/auth.js`.
- Confirmed live and *not* removed: `POST /api/auth/register` (router version) is a working, real endpoint — just not currently called by the frontend (which uses `/api/donors/register` instead). This is unused-but-functional, not dead/broken code, so it was left in place rather than deleted, in case something else depends on it.

### JWT flow

- Login issues a JWT (`{ id, email }`, 1h expiry) signed with `JWT_SECRET` from `.env`.
- `middleware/auth.js`'s `protect` correctly verifies the `Authorization: Bearer` header and attaches `req.user`, used by `/api/auth/me` and the availability update.
- New password-reset tokens are separately scoped JWTs (`{ emailPhone, purpose: 'password-reset' }`, 10-minute expiry) so they can't be reused as login tokens or vice versa — checked in `resetPassword` via the `purpose` claim.

### Password hashing

- Registration and password reset both hash with `bcrypt` (cost factor 10). Login compares with `bcrypt.compare`. Consistent throughout — no plaintext password ever leaves the hashing boundary.

### MongoDB / schema

- `Donor` schema had a duplicate `password` field (defined twice) — Mongoose silently used the second definition, so it wasn't a functional bug, just dead weight. Removed.
- No indexes are defined beyond Mongo's default `_id`. **Recommendation (not applied — a production/scale decision, not a bug):** add a unique index on `Donor.email` to enforce uniqueness at the database layer (currently only enforced by an application-level `findOne` check in `authService`, which has a race-condition window under concurrent signups).
- `connectDB()` calls `process.exit(1)` on any connection failure, with no retry/backoff. **Flagged, not changed** — this is an architectural choice (fail-fast vs. degrade-gracefully) that affects ops/deploy behavior and wasn't part of the approved fix list this session.

### Validation / error handling

- Registration and login return generic 500s with `error.message` echoed to the client on failure — leaks internal error detail (e.g., raw Mongoose validation errors) to the frontend. Not fixed this session (would change API error-response shape, which the frontend doesn't currently parse beyond `.message`, so low risk — but flagging as a hardening item for a future pass rather than folding it into this large batch of changes silently).
- New OTP endpoints do return safe, minimal error messages and don't leak whether an account exists (the forgot-password endpoint responds identically whether or not the email/phone matches an account).

### CORS

- `app.use(cors())` with no origin restriction — fine for local dev, should be scoped to the real frontend origin(s) before production. Flagged, not changed (deployment-environment decision).

## Full user flows — traced end-to-end in code

1. **Register** → `POST /api/donors/register` → hashes password, saves `Donor`. ✅ complete.
2. **Login** → `POST /api/auth/login` (router) → verifies password, issues JWT. ✅ complete.
3. **Forgot Password** → `POST /api/auth/forgot-password` → generates OTP, emails it (or logs it if email isn't configured/reachable), 2-minute expiry. ✅ now complete (was broken).
4. **OTP verify** → `POST /api/auth/verify-otp` → checks OTP, issues a 10-minute reset token. ✅ now complete (route didn't exist before).
5. **Reset Password** → `POST /api/auth/reset-password` (Bearer reset token) → re-hashes and saves new password, invalidates the OTP. ✅ now complete (route didn't exist before).
6. **Register as Donor** — same as #1, this is the donor-registration flow. ✅ complete.
7. **Find Donor** → `GET /api/donors/search` → now a real, filtered, correctly-shaped MongoDB query. ✅ now complete (was fake).
8. **Emergency Request** → `POST /api/donors/emergency-alert` → now persisted to `EmergencyRequest`, feeds the dashboard's "Recent Blood Requests" and stats. ✅ now complete (was fake).
9. **Profile** → `GET /api/auth/me` → read-only view. ✅ complete.
10. **Logout** → clears `localStorage` token client-side, no server-side session to invalidate (JWTs are stateless, this is expected/correct for this auth model). ✅ complete.

## Not done this session (explicitly out of scope / needs your call)

- Live end-to-end run against a real server + MongoDB (blocked by sandbox network — see top of this doc).
- Unique index on `Donor.email`.
- `connectDB()` fail-fast vs. graceful-degrade behavior.
- Scoping CORS to specific origins.
- Standardizing error-response detail (avoid echoing raw Mongo errors to the client).
- `POST /api/alerts` — a separate, generic endpoint not called by any current frontend page. Still a stub (console.log only). Left as-is since nothing in the app currently depends on it; flagging in case it's meant for a future integration.
- Email deliverability of the OTP flow could not be tested live in this sandbox (no network). The code logs the OTP to the server console as a fallback if email sending fails or isn't configured, so the flow remains usable/demoable even without working SMTP — but real delivery needs to be verified once deployed with network access.
