# BloodLife — Handoff Summary

## Run locally

```bash
cd servers
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, optional EMAIL_*
npm install
npm start
```

Open `http://localhost:5000` (redirects to `/HTML/index.html`).

**Important:** If this project was previously shared with a real `.env`, rotate MongoDB, JWT, and email credentials before production use.

## Working features

| Feature | Status |
|---------|--------|
| Register / Login / Logout | ✅ |
| Forgot Password (OTP) / Reset Password | ✅ |
| Donor Registration | ✅ |
| Donor Search | ✅ |
| Emergency Blood Request | ✅ |
| Dashboard stats + recent requests | ✅ |
| Profile / Edit Profile | ✅ |
| Availability toggle | ✅ |

## Auth

- JWT in `localStorage.userToken`
- Protected routes: `/api/auth/me*`, `/api/donors/stats`, `/api/requests`
- OTP logs to console only when `NODE_ENV` is not `production` and/or email is not configured

## Security stack

- Helmet, rate limiting, CORS via `CORS_ORIGINS`, unique email index, no secrets in repo
