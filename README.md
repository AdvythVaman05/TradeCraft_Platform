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

