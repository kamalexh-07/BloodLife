# Changelog

## Production hardening (2026-07-27)

### Security
- Removed committed `servers/.env` secrets from the project tree
- Added `servers/.env.example` and root `.gitignore` (ignores `.env`, `node_modules`)
- Added Helmet security headers
- Added express-rate-limit on general API, auth, and OTP routes
- Scoped CORS via `CORS_ORIGINS` env (dev-friendly default when unset)
- Stopped logging MongoDB URI on connect
- Stopped leaking internal error messages to API clients
- Unique index on `Donor.email`; search/support indexes added
- Protected `GET /api/requests` with JWT middleware
- Replaced unauthenticated full donor list with authenticated `GET /api/donors/stats` (counts only)
- Gated OTP console logging behind non-production `NODE_ENV`
- Request body size limits (100kb)

### Backend
- Moved donor register / search / emergency / stats / requests into `controllers/donorController.js`
- Added `routes/donor.js`; cleaned `server.js` to mounting + static only
- Unified registration validation through `authService.registerDonor` (used by both `/api/donors/register` and `/api/auth/register`)
- Server-side validation: required fields, email format, 10-digit phone, password min length, terms/consent
- Removed unused `bcryptjs` dependency; added `helmet`, `express-rate-limit`
- Removed debug `dns-test.js`
- Added `npm start` script
- Donor and EmergencyRequest models: timestamps, indexes
- Search results capped at 100 documents

### Frontend
- Dashboard uses `/api/donors/stats` instead of loading every donor
- Fixed Home hero image paths (removed double `.jpg` extension)
- Added SVG placeholder hero assets under `client/assets/images/`
- Removed debug `console.log` from Login.js
- Removed unused Tailwind scaffolding (`client/src`, `tailwind.config.js`, client `package.json`)

### Ops
- Documented required env vars in `.env.example`
- Note: rotate any credentials that were previously committed

## Admin module (2026-07-27)

### Added
- Donor schema field `role` (`user` | `admin`, default `user`)
- `verifyAdmin` middleware (JWT + role check)
- Admin APIs under `/api/admin/*`
- Admin UI: login, dashboard, donors, requests, profile
- `npm run seed-admin` to create the first admin from env vars
- Public donor search/stats exclude admin accounts

### Security
- Admin login is separate from donor login
- All admin routes (except login) require JWT + `role === "admin"`
- Registration always forces `role: "user"`
