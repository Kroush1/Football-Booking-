# Football Field Booking System

Full-stack football field appointment booking system with dynamic config and admin dashboard.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express + Socket.io
- Database: MongoDB + Mongoose

## Folder Structure

- `backend/` Express API, MongoDB models, booking/config logic
- `frontend/` React app for booking + admin dashboard

## Backend APIs

- `POST /book` create booking
- `GET /slots?date=YYYY-MM-DD` available slots for date
- `GET /config` get booking configuration
- `GET /export` export all bookings as CSV
- `GET /admin/bookings` list all bookings (admin auth)
- `PUT /admin/booking/:id` edit booking (admin auth)
- `DELETE /admin/booking/:id` delete booking (admin auth)
- `PUT /admin/config` update date range/slots/day slots (admin auth)
- `POST /admin/auth/login` validate basic credentials (admin auth)

## Constraints Implemented

- Prevent booking same time twice (`date + time` unique index)
- Prevent same phone booking more than once (`phone` unique)
- Booking date must be within `startDate` to `endDate`
- Booking time must exist in available slots config
- Only full-hour slots are accepted (`HH:00`, no `:30`)
- Backend input validation for name/phone/date/time
- Dynamic config updates reflected immediately

## Run Locally

1. Install Node.js 18+ and MongoDB
2. Backend:
   - `cd backend`
   - `copy .env.example .env` (Windows PowerShell: `Copy-Item .env.example .env`)
   - Update `.env` values if needed
   - `npm install`
   - `npm run dev`
3. Frontend:
   - `cd frontend`
   - `npm install`
   - `npm run dev`
4. Open frontend URL (typically `http://localhost:5173`)

## Admin Access

- Go to `/admin` in frontend
- Default credentials from backend `.env.example`:
  - username: `admin`
  - password: `admin123`
- Auth is HTTP Basic stored in browser localStorage

## Notes

- CSV export endpoint: `GET http://localhost:5000/export`
- Real-time updates are powered by Socket.io
- Frontend includes loading states and success/error toast notifications

## Deploy on Vercel (Frontend + Backend)

### 1) Deploy Backend (Project 1)

- Import the same GitHub repo in Vercel.
- Set **Root Directory** to `backend`.
- Framework preset: **Other**.
- Build/Output can stay default (using `backend/vercel.json`).
- Add Environment Variables:
  - `MONGO_URI`
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
- Deploy and copy backend URL, example:
  - `https://football-backend.vercel.app`

### 2) Deploy Frontend (Project 2)

- Import the same GitHub repo again in Vercel (second project).
- Set **Root Directory** to `frontend`.
- Framework preset: **Vite**.
- Add environment variable:
  - `VITE_API_BASE=https://football-backend.vercel.app`
- Deploy.

### 3) Important Limitation

- Vercel serverless functions do not keep persistent WebSocket connections.
- The app API works on Vercel, but real-time Socket.io updates are disabled in serverless mode.
