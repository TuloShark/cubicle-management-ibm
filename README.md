# 🏢 Space Optimization Demo

A comprehensive cubicle management and utilization analytics platform built with Vue.js, Node.js, and MongoDB. Features real-time reservations, advanced reporting, and business intelligence dashboards.

## 🚀 Features

### 📊 **Analytics & Reporting**
- **Weekly Utilization Reports** with Excel export
- **Real-time Statistics** via WebSocket connections
- **Peak Hours Analysis** with 10-slot time breakdown
- **Week-over-week Trends** with predictive analytics
- **User Activity Tracking** and favorite section analysis
- **Advanced Business Metrics** (efficiency, capacity utilization, growth indicators)

### 🎯 **Space Management**
- **54 Cubicles** across 3 sections (A, B, C) in 6×9 grid layout
- **Real-time Reservation System** with instant updates
- **Interactive Section Views** with availability status
- **User-friendly Booking Interface** with conflict prevention

### 🔐 **Authentication & Authorization**
- **Firebase Authentication** with Google, GitHub, Email/Password
- **Role-based Access Control** (Admin/User permissions)
- **JWT Token Management** with automatic refresh
- **Admin Dashboard** for user management

### 🎨 **Modern UI/UX**
- **Carbon Design System** components and icons
- **Responsive Design** for mobile and desktop
- **Real-time Updates** without page refresh
- **Dark/Light Theme** support
- **Accessibility** compliant interface

## 🏗️ Architecture

```
📁 demo/
├── 📁 api/                    # Backend (Node.js/Express)
│   ├── 📁 controllers/        # Route handlers
│   ├── 📁 models/            # MongoDB schemas
│   ├── 📁 middleware/        # Auth & validation
│   └── 📄 index.js           # Server entry point
└── 📁 frontend/              # Frontend (Vue.js)
    ├── 📁 src/
    │   ├── 📁 views/         # Page components
    │   ├── 📁 composables/   # Vue composition functions
    │   └── 📁 router/        # Navigation routing
    └── 📄 package.json
```

## 🛠️ Tech Stack

### **Backend**
- **Node.js** v18+ with Express.js
- **MongoDB** with Mongoose ODM
- **Firebase Admin SDK** for authentication
- **Socket.IO** for real-time communication
- **XLSX** for Excel report generation
- **Winston** for structured logging

### **Frontend**
- **Vue.js 3** with Composition API
- **Vue Router 4** for SPA navigation
- **Carbon Design System** for UI components
- **Chart.js** for data visualization
- **Axios** for HTTP requests
- **Socket.IO Client** for real-time updates

### **Infrastructure**
- **Docker** containerization support
- **GitHub Actions** CI/CD pipeline
- **Firebase** for authentication services
- **MongoDB Atlas** cloud database option

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Firebase project with Authentication enabled

### 1. Clone & Install
```bash
git clone <repository-url>
cd demo

# Install backend dependencies
cd api && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Environment Configuration

#### Backend Configuration
Create a `.env` file in the `/api/` directory using the provided template:

```bash
cp .env.template .env
```

**Required Configuration:**

| Variable | Description | Notes |
|----------|-------------|-------|
| `MONGO_URI` | MongoDB connection string | Local: `mongodb://localhost:27017/db_name`<br/>Atlas: Use connection string from MongoDB Atlas |
| `FIREBASE_CREDENTIALS_JSON` | Firebase service account JSON | Generate from Firebase Console → Project Settings → Service Accounts |
| `ADMIN_UIDS` | Admin user Firebase UIDs | Comma-separated list from Firebase Authentication console |
| `EMAIL_HOST` | SMTP server hostname | Gmail: `smtp.gmail.com`, Outlook: `smtp-mail.outlook.com` |
| `EMAIL_PORT` | SMTP server port | TLS: `587`, SSL: `465` |
| `EMAIL_SECURE` | Use SSL connection | `true` for port 465, `false` for port 587 |
| `EMAIL_USER` | SMTP username | Usually your email address |
| `EMAIL_PASS` | SMTP password | Use app-specific passwords for Gmail/Outlook |
| `EMAIL_FROM` | Sender email format | `"App Name <email@domain.com>"` |

**Optional Configuration:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `SEED` | `false` | Populate database with sample data |
| `NOTIFICATIONS_ENABLED` | `true` | Enable notification system |
| `EMAIL_NOTIFICATIONS_ENABLED` | `true` | Enable email notifications |
| `FRONTEND_URL` | `http://localhost:8080` | Frontend URL for email links |

#### Frontend Configuration
Create a `.env` file in the `/frontend/` directory:

**Firebase Configuration** (from Firebase Console → Project Settings → General):

| Variable | Description |
|----------|-------------|
| `VITE_API_KEY` | Web API Key |
| `VITE_AUTH_DOMAIN` | Authentication domain |
| `VITE_PROJECT_ID` | Project ID |
| `VITE_STORAGE_BUCKET` | Storage bucket |
| `VITE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_APP_ID` | App ID |
| `VITE_MEASUREMENT_ID` | Analytics measurement ID (optional) |

**Application Configuration:**

| Variable | Description |
|----------|-------------|
| `VITE_ADMIN_UIDS` | Same admin UIDs as backend |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN (optional) |

#### Firebase Setup Guide

1. **Create Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com)
2. **Enable Authentication**: Authentication → Sign-in method → Enable Email/Password, Google, GitHub
3. **Generate Service Account**: Project Settings → Service Accounts → Generate new private key
4. **Get Web App Config**: Project Settings → General → Your apps → Web app → Config
5. **Set Admin Users**: Note down UIDs from Authentication → Users after first login

### 3. Start Development Servers
```bash
# Terminal 1 - Backend
cd api && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 📊 API Documentation

### **Authentication Endpoints**
```http
POST   /reserve                    # Reserve a cubicle (user)
GET    /api/cubicle-stats          # Real-time statistics
GET    /report/daily               # Daily report (admin)
```

### **Utilization Reports**
```http
GET    /api/utilization-reports               # List reports (paginated)
GET    /api/utilization-reports/:id           # Get specific report
GET    /api/utilization-reports/:id/export    # Export Excel report
POST   /api/utilization-reports/generate      # Generate custom week report (admin)
POST   /api/utilization-reports/generate-current # Generate current week (admin)
DELETE /api/utilization-reports/:id           # Delete report (admin)
```

### **User Management**
```http
GET    /api/users                  # List users (admin)
GET    /api/users/:uid             # Get user details
PUT    /api/users/:uid             # Update user (admin/self)
POST   /api/users/:uid/setAdmin    # Set admin status (admin)
```

## 📈 Excel Reports Structure

Generated reports include 6 detailed sheets:

1. **Summary** - Key metrics and KPIs
2. **Daily Breakdown** - Day-by-day utilization data
3. **Section Analysis** - Performance by sections A, B, C
4. **User Activity** - Individual user statistics
5. **Peak Hours** - Hourly utilization patterns
6. **Advanced Analytics** - Business insights and trends

### Report Metrics Include:
- **Utilization Percentages** (average, peak, lowest)
- **User Engagement** (active users, favorite sections)
- **Efficiency Metrics** (capacity utilization, turnover rates)
- **Trend Analysis** (week-over-week changes, predictions)
- **Business Insights** (consistency scores, growth indicators)

## 🔐 Security Features

- **JWT Authentication** with Firebase integration
- **Role-based Authorization** (Admin/User levels)
- **Rate Limiting** on API endpoints
- **Input Validation** with express-validator
- **CORS Protection** for cross-origin requests
- **Error Handling** with structured logging

## 🌐 Real-time Features

- **Live Cubicle Status** updates via WebSocket
- **Instant Reservation** confirmations
- **Dynamic Statistics** refresh automatically
- **Multi-user Synchronization** prevents conflicts
- **Connection Management** with automatic reconnection

## 🧪 Testing & Development

### Running Tests
```bash
# Backend tests
cd api && npm test

# Frontend tests  
cd frontend && npm test
```

### Development Tools
- **ESLint** for code linting
- **Prettier** for code formatting
- **Vue DevTools** for debugging
- **MongoDB Compass** for database management

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual containers
docker build -t space-demo-api ./api
docker build -t space-demo-frontend ./frontend
```

## 📝 Environment Variables Reference

### Backend Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/cubicle_db` |
| `FIREBASE_CREDENTIALS_JSON` | Firebase service account JSON string | Complete JSON from Firebase Console |
| `ADMIN_UIDS` | Comma-separated admin user Firebase UIDs | From Firebase Authentication console |
| `EMAIL_HOST` | SMTP server hostname | Provider-specific hostname |
| `EMAIL_PORT` | SMTP server port | `587` (TLS) or `465` (SSL) |
| `EMAIL_USER` | SMTP authentication username | Usually your email address |
| `EMAIL_PASS` | SMTP authentication password | App-specific password recommended |
| `EMAIL_FROM` | Email sender format | `"App Name <email@domain.com>"` |

### Backend Optional Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `SEED` | `false` | Populate database with sample data |
| `EMAIL_SECURE` | `false` | Use SSL connection (true for port 465) |
| `NOTIFICATIONS_ENABLED` | `true` | Enable notification system |
| `EMAIL_NOTIFICATIONS_ENABLED` | `true` | Enable email notifications |
| `FRONTEND_URL` | `http://localhost:8080` | Frontend URL for generating links |

### Frontend Required Variables
| Variable | Description | Source |
|----------|-------------|--------|
| `VITE_API_KEY` | Firebase Web API key | Firebase Console → Project Settings |
| `VITE_PROJECT_ID` | Firebase project identifier | Firebase Console → Project Settings |
| `VITE_AUTH_DOMAIN` | Firebase authentication domain | Firebase Console → Project Settings |
| `VITE_STORAGE_BUCKET` | Firebase storage bucket | Firebase Console → Project Settings |
| `VITE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Firebase Console → Project Settings |
| `VITE_APP_ID` | Firebase app identifier | Firebase Console → Project Settings |

### Frontend Optional Variables
| Variable | Description |
|----------|-------------|
| `VITE_MEASUREMENT_ID` | Google Analytics measurement ID |
| `VITE_ADMIN_UIDS` | Admin user IDs (same as backend) |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [API Documentation](#api-documentation)
- Review the [Environment Configuration](#environment-configuration)

## 🚧 Future Enhancements

### Planned Features
- [ ] **Slack Notifications** for report generation
- [ ] **Monday.com Integration** for project management
- [ ] **Advanced Analytics Dashboard** with more visualizations
- [ ] **Mobile App** (React Native)
- [ ] **Calendar Integration** (Google Calendar, Outlook)
- [ ] **Resource Allocation** algorithms
- [ ] **Predictive Analytics** with ML models

---

Built with ❤️ using modern web technologies for efficient space management.
