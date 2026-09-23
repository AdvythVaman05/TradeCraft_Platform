# TradeCraft Platform

This project consists of a Django REST API backend and a React + Vite frontend.

## Prerequisites

- Python 3.x
- Node.js and npm
- PostgreSQL database (configured via NEON_URL environment variable)

## Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install Python dependencies:
   ```bash
   pip install -r ../requirements.txt
   ```

5. Set up environment variables:
   Create a `.env` file in the `backend` directory with:
   ```
   # Use your hosted Postgres (Neon) connection string in production
   NEON_URL=your_postgresql_connection_string

   # (Optional) Force local SQLite for development to avoid remote DB issues
   USE_SQLITE=true
   ```

6. Run database migrations:
   ```bash
   python manage.py migrate
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Option 1: Run Separately (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd backend
python manage.py runserver
```
The backend will run on `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173` (default Vite port)

### Option 2: Run Both with Concurrently

If you have `concurrently` installed globally or in the root directory, you can run both from the root:

```bash
# From the root directory
npm install -g concurrently
concurrently "cd backend && python manage.py runserver" "cd frontend && npm run dev"
```

Or create a root `package.json` with scripts (see below).

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin

## Additional Commands

### Backend
- Create migrations: `python manage.py makemigrations`
- Run migrations: `python manage.py migrate`
- Create superuser: `python manage.py createsuperuser`
- Collect static files: `python manage.py collectstatic`

### Frontend
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Lint code: `npm run lint`

## Security Architecture & Hardening

TradeCraft Platform incorporates defense-in-depth security hardening across the full stack:

### 1. Authentication & Token Management
- **Stateless JWT with State-Backed Revocation**: Short-lived access tokens (15 minutes by default) paired with refresh tokens (7 days).
- **Refresh Token Rotation & Blacklisting**: Every call to `/api/auth/refresh/` invalidates the submitted refresh token and issues a new pair via `rest_framework_simplejwt.token_blacklist`.
- **Explicit Logout**: `/api/auth/logout/` invalidates the active refresh token in the database blacklist.
- **Frontend Token Refresh**: React application seamlessly intercepts 401 Unauthorized responses, refreshes credentials transparently, and retries queued API calls without interrupting the user experience.

### 2. Password Policies & Hashing
- **Django Password Validators**: Enabled in `AUTH_PASSWORD_VALIDATORS` (UserAttributeSimilarityValidator, MinimumLengthValidator, CommonPasswordValidator, NumericPasswordValidator) and enforced on user registration.
- **Cryptographic Hashing**: Passwords are saved exclusively via Django's cryptographic hashing framework (`PBKDF2` with SHA-256 / Argon2) and never stored in plaintext or fast unsalted digests.

### 3. Rate Limiting & Denial of Service Protection
- **Scoped Rate Throttling**: Authentication endpoints (`/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/logout/`, `/api/users/register/`) are protected by DRF `ScopedRateThrottle` (`10/minute` default).
- **Global Throttles**: Configurable anonymous (`100/minute`) and authenticated (`1000/minute`) throttles protect public and user endpoints against brute-force and scraping.

### 4. Data Privacy & Object-Level Authorization
- **Strict Serializer Isolation**: `PublicUserSerializer` exposes only non-sensitive attributes (`id`, `username`, `bio`), preventing leakage of email, phone, UPI IDs, QR codes, or financial balances.
- **Transaction & Listing Ownership**: Custom permission classes and queryset filtering ensure only authorized transaction participants (buyer/seller) or listing providers can view or modify records.
- **Atomic Financial Transactions**: Time Credit transfers are performed inside database transactions (`select_for_update`) with atomic `F()` expressions to prevent race conditions.

### 5. Real-Time Communication & WebSockets
- **WebSocket Authentication Middleware**: Channels ASGI stack validates JWT access tokens supplied in connection handshake parameters and associates authenticated users with WebSocket connections.
- **Strict Room Authorization**: `verify_user_room_access` validates room name formats via regular expressions and verifies database participation before joining socket channels.

### 6. Production Security & Verification
- **Environment & Secrets Configuration**: `SECRET_KEY` and database credentials are required and fail-fast at startup if missing.
- **Security Headers & Cookies**: Full suite of security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `SameSite=Lax`, and HTTPS secure cookies).
- **File Upload Protection**: Uploaded UPI QR codes are validated with Pillow for genuine image signatures and stored using sanitized UUID filenames.
- **Automated Verification**: Run tests with:
  ```bash
  python manage.py test core
  python manage.py check --deploy
  ```


