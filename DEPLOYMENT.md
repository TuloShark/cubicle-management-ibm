# 🚀 Deployment Guide

This guide covers different deployment strategies for the Space Optimization Demo application.

## 📋 Prerequisites

- Docker & Docker Compose installed
- Node.js 18+ (for local development)
- MongoDB 7+ (for local development without Docker)
- Git for cloning the repository

## 🐳 Docker Deployment (Recommended)

### Quick Start
```bash
# Clone the repository
git clone <your-repository-url>
cd space-optimization-demo

# Copy and configure environment files
cp api/.env.example api/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your configuration
# At minimum, set:
# - Firebase configuration in frontend/.env
# - MongoDB URI in api/.env (if not using Docker MongoDB)
# - Notification settings in api/.env (optional)

# Start all services
docker-compose up --build
```

### Services
- **Frontend**: http://localhost:8080
- **API**: http://localhost:3000
- **MongoDB**: localhost:27017

### Production Configuration
For production deployment, update the following:

1. **Environment Variables**:
   ```bash
   # In api/.env
   NODE_ENV=production
   MONGODB_URI=mongodb://admin:password@mongodb:27017/space_optimization?authSource=admin
   JWT_SECRET=your-secure-secret-key
   NOTIFICATIONS_ENABLED=true
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
   MONDAY_API_KEY=your_monday_api_key
   MONDAY_BOARD_ID=your_monday_board_id
   
   # In frontend/.env
   VITE_API_BASE_URL=https://your-api-domain.com
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   ```

2. **Docker Compose for Production**:
   ```yaml
   # Use environment-specific compose file
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## 🖥️ Local Development

### Backend Setup
```bash
cd api
npm install
cp .env.example .env
# Configure your .env file
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Configure your .env file
npm run dev
```

### Database Setup
```bash
# Using local MongoDB
mongosh
use space_optimization
# Create collections and seed data
node api/seed.js
```

## ☁️ Cloud Deployment

### AWS Deployment with ECS

1. **Build and Push Images**:
   ```bash
   # Build images
   docker build -t space-optimization-api ./api
   docker build -t space-optimization-frontend ./frontend
   
   # Tag for ECR
   docker tag space-optimization-api:latest <account-id>.dkr.ecr.<region>.amazonaws.com/space-optimization-api:latest
   docker tag space-optimization-frontend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/space-optimization-frontend:latest
   
   # Push to ECR
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/space-optimization-api:latest
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/space-optimization-frontend:latest
   ```

2. **ECS Task Definition**: Use the provided task definitions in `deployment/aws/`

3. **Database**: Use Amazon DocumentDB or MongoDB Atlas

### Google Cloud Platform with Cloud Run

1. **Build and Deploy**:
   ```bash
   # Backend
   gcloud builds submit --tag gcr.io/PROJECT_ID/space-optimization-api ./api
   gcloud run deploy space-optimization-api --image gcr.io/PROJECT_ID/space-optimization-api --platform managed
   
   # Frontend
   gcloud builds submit --tag gcr.io/PROJECT_ID/space-optimization-frontend ./frontend
   gcloud run deploy space-optimization-frontend --image gcr.io/PROJECT_ID/space-optimization-frontend --platform managed
   ```

2. **Database**: Use Google Cloud Firestore or MongoDB Atlas

### Digital Ocean App Platform

1. Create `app.yaml`:
   ```yaml
   name: space-optimization-demo
   services:
   - name: api
     source_dir: /api
     github:
       repo: your-username/space-optimization-demo
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     
   - name: frontend
     source_dir: /frontend
     github:
       repo: your-username/space-optimization-demo
       branch: main
     build_command: npm run build
     run_command: npm run preview
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
   
   databases:
   - name: mongodb
     engine: MONGODB
     version: "7"
   ```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication with Google Sign-In
3. Generate service account key for backend
4. Configure security rules

### Slack Integration
1. Create a Slack app in your workspace
2. Enable incoming webhooks
3. Copy webhook URL to environment variables

### Monday.com Integration
1. Create a Monday.com account
2. Generate API token
3. Create a board for notifications
4. Copy API key and board ID to environment variables

## 📊 Monitoring & Logging

### Application Logs
```bash
# View Docker logs
docker-compose logs -f api
docker-compose logs -f frontend

# View specific service logs
docker logs space-optimization-api
```

### Health Checks
- **API Health**: http://localhost:3000/api/health
- **Frontend Health**: http://localhost:8080
- **Database Health**: Check MongoDB connection in logs

### Performance Monitoring
- Use application performance monitoring (APM) tools
- Monitor API response times
- Track user interactions and errors

## 🔒 Security Considerations

### Production Security
1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS**: Use SSL certificates in production
3. **Firewall**: Restrict database access
4. **Authentication**: Configure Firebase security rules
5. **Rate Limiting**: Enable API rate limiting
6. **CORS**: Configure appropriate CORS policies

### Database Security
1. **Authentication**: Use strong MongoDB credentials
2. **Network**: Restrict network access
3. **Backup**: Regular database backups
4. **Encryption**: Enable encryption at rest

## 🧪 Testing Deployment

### Smoke Tests
```bash
# Test API health
curl http://localhost:3000/api/health

# Test frontend
curl http://localhost:8080

# Test database connection
docker exec -it space-optimization-mongodb mongosh -u admin -p password
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load tests
artillery run load-tests/api-load-test.yml
```

## 🔄 Updates & Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose down
docker-compose up --build

# Or for zero-downtime updates
docker-compose up --build --no-deps api
docker-compose up --build --no-deps frontend
```

### Database Migrations
```bash
# Create backup before updates
docker exec space-optimization-mongodb mongodump

# Apply any schema changes
node api/migrations/migrate.js
```

### Monitoring Updates
- Monitor application logs during updates
- Check health endpoints after deployment
- Verify all integrations are working
- Test critical user flows

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**:
   ```bash
   # Check MongoDB logs
   docker logs space-optimization-mongodb
   
   # Verify connection string in api/.env
   # Ensure MongoDB is accessible from API container
   ```

2. **Firebase Authentication Issues**:
   ```bash
   # Verify Firebase configuration
   # Check service account key permissions
   # Validate Firebase security rules
   ```

3. **Build Failures**:
   ```bash
   # Clear Docker cache
   docker system prune -a
   
   # Rebuild images
   docker-compose build --no-cache
   ```

4. **Network Issues**:
   ```bash
   # Check Docker networks
   docker network ls
   
   # Inspect network configuration
   docker network inspect demo_space-optimization-network
   ```

For additional support, please refer to the [Troubleshooting Guide](TROUBLESHOOTING.md) or open an issue on GitHub.
