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
- **81 Cubicles** across 3 sections (A, B, C)
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

**Backend** (`.env` in `/api/`):
```env
MONGO_URI=mongodb://localhost:27017/demo
SEED=true
PORT=3000
FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
ADMIN_UIDS=uid1,uid2,uid3
```

**Frontend** (`.env` in `/frontend/`):
```env
VITE_API_KEY=your_firebase_api_key
VITE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_PROJECT_ID=your-project-id
VITE_STORAGE_BUCKET=your-project.appspot.com
VITE_MESSAGING_SENDER_ID=123456789
VITE_APP_ID=1:123456789:web:abcdef
VITE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ADMIN_UIDS=uid1,uid2,uid3
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```

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
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/demo` |
| `FIREBASE_CREDENTIALS_JSON` | Firebase service account JSON | `'{"type":"service_account",...}'` |
| `ADMIN_UIDS` | Comma-separated admin user IDs | `uid1,uid2,uid3` |

### Frontend Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_KEY` | Firebase API key | `AIzaSyB...` |
| `VITE_PROJECT_ID` | Firebase project ID | `my-project-123` |
| `VITE_AUTH_DOMAIN` | Firebase auth domain | `my-project.firebaseapp.com` |

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
