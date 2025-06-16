# IBM Cubicle Management System

## Enterprise Space Optimization Platform

The IBM Cubicle Management System is a comprehensive, production-ready enterprise application designed for efficient office space utilization, real-time reservation management, and advanced business analytics. Built with modern web technologies and enterprise-grade architecture, this system provides scalable workspace management solutions for corporate environments.

---

## 🏗️ System Architecture

### Technical Stack

**Backend Infrastructure:**
- **Node.js 18+** with Express.js 5.x framework
- **MongoDB 6.0+** with Mongoose ODM and advanced indexing
- **Socket.IO 4.8+** for real-time WebSocket communication
- **Firebase Admin SDK** for enterprise authentication
- **Winston** structured logging with audit trails
- **Express Rate Limiting** with Redis-compatible storage

**Frontend Application:**
- **Vue.js 3.5+** with Composition API and TypeScript 5.0+
- **IBM Carbon Design System** (@carbon/vue 3.0+)
- **Vite 6.3+** for optimized build pipeline
- **Vue Router 4.5+** with authentication guards
- **Chart.js 4.4+** for data visualization
- **Axios** HTTP client with interceptors

**Infrastructure & DevOps:**
- **Docker** containerization with multi-stage builds
- **Docker Compose** orchestration with health checks
- **Nginx** reverse proxy with SSL termination support
- **MongoDB** with replica sets and sharding support
- **Redis** session storage and caching layer

### Database Architecture

**Collections & Models:**
- **Cubicles**: 54-cubicle grid system (6×9 layout) with sections A, B, C
- **Reservations**: Temporal reservation management with user tracking
- **UtilizationReports**: Pre-computed analytics with Excel export capability
- **NotificationHistory**: Audit trail for all system notifications
- **NotificationSettings**: User preference management system

**Indexing Strategy:**
- Compound indexes on date/cubicle combinations for reservation queries
- Section-based indexes for spatial analytics
- User-based indexes for permission checking and audit trails
- Background index creation with performance monitoring

---

## 🎯 Core Features

### Reservation Management
- **Real-time Grid Interface**: Interactive 6×9 cubicle grid with live status updates
- **Conflict Prevention**: Atomic reservation transactions with database-level constraints
- **Role-based Access Control**: Admin and user permissions with Firebase JWT integration
- **WebSocket Synchronization**: Instant updates across all connected clients
- **Audit Trail**: Complete reservation history with user attribution

### Analytics & Reporting
- **Utilization Reports**: Comprehensive weekly/daily analytics with trend analysis
- **Excel Export**: Multi-sheet reports with advanced business metrics
- **Peak Hours Analysis**: 10-slot time breakdown with usage patterns
- **Section Performance**: Comparative analysis across cubicle sections
- **User Activity Tracking**: Individual usage patterns and preferences
- **Predictive Analytics**: Week-over-week trends with growth indicators

### Enterprise Integrations
- **Email Notifications**: SMTP integration with HTML templates and scheduling
- **Slack Integration**: Webhook-based notifications with rich message formatting
- **Firebase Authentication**: Enterprise SSO with Google Workspace integration
- **Monday.com API**: Project management integration for task automation
- **Sentry Error Monitoring**: Production error tracking with performance insights

### Security & Compliance
- **JWT Token Management**: Secure authentication with automatic refresh
- **Rate Limiting**: API protection with configurable limits per endpoint
- **Input Validation**: Comprehensive data sanitization using express-validator
- **CORS Configuration**: Production-ready cross-origin resource sharing
- **Audit Logging**: Complete audit trail for compliance requirements

---

## 🚀 Production Deployment

### Prerequisites
- **Node.js 18+** LTS version
- **MongoDB 6.0+** with replica set configuration
- **Redis 6.0+** for session management
- **Docker & Docker Compose** for containerized deployment
- **Firebase Project** with Authentication enabled
- **SMTP Server** for email notifications (optional)

### Environment Configuration

Create production environment files:

**Backend Configuration** (`/demo/api/.env`):
```bash
# Application Settings
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Database Configuration
MONGO_URI=mongodb://username:password@mongodb-host:27017/cubicle_management?authSource=admin

# Firebase Authentication
FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project",...}
ADMIN_UIDS=firebase-uid-1,firebase-uid-2

# Email Services
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=notifications@company.com
EMAIL_PASS=app-specific-password
EMAIL_FROM="IBM Space Management <notifications@company.com>"

# Notification Services
NOTIFICATIONS_ENABLED=true
EMAIL_NOTIFICATIONS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Security Configuration
JWT_SECRET=your-secure-random-string
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Frontend Configuration** (`/demo/frontend/.env`):
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Application Configuration
VITE_API_BASE_URL=https://api.your-domain.com
VITE_ADMIN_UIDS=firebase-uid-1,firebase-uid-2

# Error Monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_ENVIRONMENT=production
```

### Docker Production Deployment

```bash
# Clone repository
git clone https://github.com/ibm/cubicle-management-system.git
cd cubicle-management-system

# Configure environment variables
cp demo/.env.example demo/.env
# Edit demo/.env with production values

# Build and deploy with Docker Compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose ps
docker-compose logs api
docker-compose logs frontend
```

### Kubernetes Deployment

```yaml
# kubernetes/cubicle-management.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cubicle-management-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cubicle-management-api
  template:
    metadata:
      labels:
        app: cubicle-management-api
    spec:
      containers:
      - name: api
        image: cubicle-management/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: connection-string
        - name: FIREBASE_CREDENTIALS_JSON
          valueFrom:
            secretKeyRef:
              name: firebase-secret
              key: service-account-json
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

## 📊 API Documentation

### Authentication Endpoints
```http
POST   /auth/login              # User authentication
POST   /auth/refresh            # Token refresh
POST   /auth/logout             # User logout
GET    /auth/profile            # User profile
```

### Cubicle Management
```http
GET    /api/cubicles            # Get all cubicles with status
GET    /api/cubicles/:date      # Get cubicles for specific date
POST   /reserve                 # Create reservation
DELETE /reservations/:id        # Cancel reservation
PUT    /cubicles/:id/status     # Update cubicle status (admin)
```

### Analytics & Reporting
```http
GET    /api/utilization-reports           # List reports (paginated)
GET    /api/utilization-reports/:id       # Get specific report
POST   /api/utilization-reports/generate  # Generate custom report (admin)
GET    /api/utilization-reports/:id/export # Export Excel report
DELETE /api/utilization-reports/:id       # Delete report (admin)
```

### User Management
```http
GET    /api/users               # List users (admin)
GET    /api/users/:uid          # Get user details
PUT    /api/users/:uid          # Update user (admin/self)
POST   /api/users/:uid/admin    # Grant admin privileges (admin)
```

### Real-time WebSocket Events
```javascript
// Client-side WebSocket connection
const socket = io('wss://api.your-domain.com');

// Subscribe to real-time updates
socket.on('statistics-update', (data) => {
  // Handle live statistics updates
});

socket.on('reservation-update', (data) => {
  // Handle reservation status changes
});

socket.on('cubicle-status-update', (data) => {
  // Handle cubicle availability changes
});
```

---

## � Business Intelligence Features

### Utilization Analytics
- **Capacity Planning**: Historical trends with predictive modeling
- **Peak Usage Identification**: Optimal scheduling recommendations
- **Space Efficiency Metrics**: ROI calculations for office space investment
- **User Behavior Analysis**: Individual and team usage patterns
- **Section Performance**: Comparative utilization across office areas

### Excel Report Generation
The system generates comprehensive Excel reports with multiple worksheets:

1. **Executive Summary**: Key metrics and KPIs
2. **Daily Breakdown**: Day-by-day utilization analysis
3. **Section Analysis**: Performance metrics by office sections
4. **User Activity**: Individual usage statistics and rankings
5. **Peak Hours**: Hourly utilization patterns with heatmaps
6. **Advanced Analytics**: Trend analysis and business insights

### Notification System
- **Email Notifications**: Automated reports and reservation confirmations
- **Slack Integration**: Team notifications and alerts
- **Custom Scheduling**: Configurable notification frequency
- **User Preferences**: Individual notification settings management

---

## 🔧 Development & Maintenance

### Local Development Setup

```bash
# Backend Development
cd demo/api
npm install
npm run dev

# Frontend Development
cd demo/frontend
npm install
npm run dev

# Database Setup (if using local MongoDB)
mongod --dbpath /data/db

# Redis Setup (optional, for session management)
redis-server
```

### Code Quality & Testing

```bash
# Backend Testing
cd demo/api
npm test
npm run test:coverage
npm run lint
npm run lint:fix

# Frontend Testing
cd demo/frontend
npm test
npm run test:e2e
npm run lint
npm run type-check
```

### Performance Monitoring

```bash
# Database Performance
# Monitor slow queries
db.setLogLevel(1, "command")

# Check index usage
db.reservations.getIndexes()
db.reservations.stats()

# Application Performance
# Memory usage monitoring
node --inspect index.js

# CPU profiling
node --prof index.js
```

### Security Hardening

```bash
# Update dependencies
npm audit
npm audit fix

# Security headers validation
curl -I https://your-domain.com

# SSL certificate verification
openssl s_client -connect your-domain.com:443

# Firewall configuration
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 🏢 Enterprise Integration

### Firebase Authentication Setup
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication with desired providers
3. Generate service account credentials
4. Configure admin users in Firebase Authentication console

### MongoDB Atlas Configuration
1. Create MongoDB Atlas cluster
2. Configure network access and database users
3. Enable MongoDB Charts for additional analytics
4. Set up backup and monitoring alerts

### Slack Integration Setup
1. Create Slack app at [api.slack.com](https://api.slack.com)
2. Configure incoming webhooks
3. Set up bot permissions and OAuth scopes
4. Install app to desired Slack workspace

### Monday.com Integration
1. Create Monday.com developer account
2. Generate API token with appropriate permissions
3. Configure board templates for automation
4. Set up webhook endpoints for bidirectional sync

---

## 📋 System Requirements

### Minimum Hardware Requirements
- **CPU**: 2 cores, 2.4GHz
- **RAM**: 4GB (8GB recommended)
- **Storage**: 20GB SSD
- **Network**: 100Mbps bandwidth

### Production Hardware Requirements
- **CPU**: 4+ cores, 3.0GHz
- **RAM**: 16GB (32GB recommended)
- **Storage**: 100GB SSD with backup
- **Network**: 1Gbps bandwidth
- **Load Balancer**: Nginx or AWS ALB
- **CDN**: CloudFlare or AWS CloudFront

### Browser Support
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Mobile**: iOS 14+, Android 10+

---

## 🔒 Security & Compliance

### Data Protection
- **Encryption at Rest**: AES-256 encryption for database storage
- **Encryption in Transit**: TLS 1.3 for all API communications
- **PII Protection**: Data anonymization for analytics
- **Backup Encryption**: Encrypted database backups with rotation

### Access Control
- **Multi-factor Authentication**: Firebase MFA integration
- **Role-based Permissions**: Granular access control
- **Session Management**: Secure JWT token handling
- **API Rate Limiting**: DDoS protection and abuse prevention

### Compliance Features
- **GDPR Compliance**: Data export and deletion capabilities
- **Audit Logging**: Complete activity trail for compliance
- **Data Retention**: Configurable data retention policies
- **Privacy Controls**: User consent management

---

## 🚨 Monitoring & Alerting

### Application Monitoring
- **Health Checks**: Automated endpoint monitoring
- **Performance Metrics**: Response time and throughput tracking
- **Error Tracking**: Real-time error detection and alerting
- **Resource Usage**: CPU, memory, and disk utilization

### Database Monitoring
- **Query Performance**: Slow query detection and optimization
- **Connection Pooling**: Database connection management
- **Replication Lag**: MongoDB replica set monitoring
- **Index Usage**: Query optimization recommendations

### Infrastructure Monitoring
- **Container Health**: Docker container status monitoring
- **Load Balancing**: Traffic distribution and failover
- **SSL Certificate**: Automatic certificate renewal monitoring
- **Backup Verification**: Database backup integrity checks

---

## 📞 Support & Maintenance

### Production Support
- **24/7 Monitoring**: Automated alerting and incident response
- **Backup & Recovery**: Daily automated backups with disaster recovery
- **Security Updates**: Regular security patches and updates
- **Performance Optimization**: Ongoing performance tuning and optimization

### Documentation & Training
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **User Guides**: Comprehensive end-user documentation
- **Admin Training**: System administration and configuration guides
- **Developer Resources**: Integration guides and code examples

---

## 📄 License & Legal

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-party Licenses
- **Vue.js**: MIT License
- **Express.js**: MIT License
- **MongoDB**: Server Side Public License (SSPL)
- **Firebase**: Google Terms of Service
- **Carbon Design System**: Apache License 2.0

---

## 🤝 Contributors & Acknowledgments

**Development Team:**
- IBM Space Optimization Engineering Team
- Enterprise Architecture and Security Team
- DevOps and Infrastructure Team

**Special Thanks:**
- IBM Design System Team for Carbon UI components
- Firebase Team for authentication infrastructure
- MongoDB Team for database optimization guidance

---

*Built with enterprise-grade architecture for scalable workspace management solutions.*
```