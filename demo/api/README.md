# Backend API - Space Optimization Demo

This is the backend API for the Space Optimization demo. It provides endpoints for cubicle management, reservations, and user administration.

## Prerequisites
- Node.js 18+
- Docker & Docker Compose (for containerized setup)

## Setup (Local)
1. Install dependencies:
   ```sh
   npm install
   ```
2. Create a `.env` file (see `.env.example` for reference).
3. Start the API:
   ```sh
   npm start
   ```

## Setup (Docker)
1. Build and run all services:
   ```sh
   docker-compose up --build
   ```
2. The API will be available at [http://localhost:3000](http://localhost:3000)

## Endpoints
- `GET /cubicles` - List all cubicles
- `POST /reserve` - Reserve a cubicle
- `PUT /cubicles/:id` - Update cubicle status
- `GET /cubicles/:id/reservation` - Get reservation info
- `GET /users/:uid` - Get user info (admin)
- `DELETE /users/:uid` - Delete user (admin)

## Environment Variables
- `MONGO_URI` - MongoDB connection string
- `SEED` - Seed demo data (true/false)
- `PORT` - API port
- `FIREBASE_CREDENTIALS_JSON` - Firebase admin credentials
- `ADMIN_UIDS` - Comma-separated admin user UIDs

## Logging
Logs are written to `api.log` and the console.

## Testing
Add your tests in the `test/` directory and run with your preferred test runner.

## CI/CD
See `.github/workflows/docker-demo.yml` for automated build and deployment.
