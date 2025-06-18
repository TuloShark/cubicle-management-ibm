# IBM Cubicle Management System - Development Operations Guide

## 🚀 Overview

This comprehensive guide covers the complete development workflow for the IBM Cubicle Management System, including deployment, database management, backup operations, monitoring, and troubleshooting. The system provides automated Docker builds, Kubernetes deployment, comprehensive backup/restore functionality, and database analysis tools for team collaboration.

## 📋 Prerequisites

- **Docker** installed and running
```bash
brew install --cask docker
open /Applications/Docker.app
```
- **minikube** installed and configured 
```bash
minikube start --driver=docker --cpus=4 --memory=7680
```
- **kubectl** installed and configured
```bash
eval $(minikube docker-env)
```
verify:
```bash
kubectl cluster-info
kubectl get nodes
```
- **Git** for cloning the repository

## 🎯 Quick Start for New Users

### 1. Clone and Deploy
```bash
git clone <repository-url>
cd cubicle-management-ibm
./scripts/deploy.sh
```

**Result:** Application accessible at `http://localhost:8080` (or 8081 if 8080 is busy)

### 2. Work on the Application
- Access frontend: `http://localhost:8080`
- API health: `http://localhost:8080/api/health`
- Full API: `http://localhost:8080/api`

### 3. Database Analysis and Review
```bash
./scripts/database-review.sh
```

### 4. Create Backup
```bash
./scripts/manual-backup.sh
```

### 4. Stop Application
```bash
./scripts/stop.sh              # Stop localhost access only
./scripts/stop.sh --all        # Stop entire application
```

## 🔄 Complete Development Workflow

### Phase 1: Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd cubicle-management-ibm

# Deploy entire system
./scripts/deploy.sh
```

**What happens:**
- ✅ Checks and starts minikube
- ✅ Builds Docker images (if needed)
- ✅ Deploys MongoDB, API, and Frontend
- ✅ Sets up automatic port-forwarding
- ✅ Runs health checks
- ✅ Provides access URLs

### Phase 2: Development Work
```bash
# Application is now accessible
curl http://localhost:8080/health      # Frontend health
curl http://localhost:8080/api/health  # API health

# View all running components
kubectl get pods -n cubicle-management
```

### Phase 3: Database Analysis and Monitoring
```bash
# Comprehensive database review and analysis
./scripts/database-review.sh
```

**What this provides:**
- ✅ Collection counts and statistics
- ✅ Data integrity checks (orphaned records, invalid references)
- ✅ Duplicate detection across all collections
- ✅ Storage and performance analysis
- ✅ Index analysis and recommendations
- ✅ Sample data inspection
- ✅ Data quality assessment

### Phase 4: Create Backup (Team Collaboration)
```bash
# After making changes/adding data
./scripts/manual-backup.sh
```

**Backup Types:**
- **Empty Database**: Creates structure-only backup for new deployments
- **Full Database**: Captures all reservations, users, and analytics data

### Phase 5: Stop Application
```bash
# Option 1: Stop localhost access only (quick restart)
./scripts/stop.sh

# Option 2: Stop entire application (clean shutdown)
./scripts/stop.sh --all         # With confirmation
./scripts/stop.sh --all --force # Skip confirmation
```

### Phase 6: Restore from Backup (Team Member)
```bash
# Clone and deploy fresh system
git clone <repository-url>
cd cubicle-management-ibm
./scripts/deploy.sh

# Restore teammate's data
./scripts/manual-restore.sh backup-20250618-143022

# Application now has exact state from backup
```

## 📊 Detailed Command Reference

### Deployment Commands

#### Primary Deployment
```bash
./scripts/deploy.sh              # Standard deployment
./scripts/deploy.sh --force-build # Force rebuild images
./scripts/deploy.sh --help       # Show all options
```

**Features:**
- Automatic minikube setup
- Docker image building and loading
- Kubernetes deployment
- Port-forwarding to localhost:8080
- Health verification

#### Stop Commands
```bash
./scripts/stop.sh               # Stop port-forwarding only
./scripts/stop.sh --all         # Stop entire deployment
./scripts/stop.sh --all --force # Force stop without confirmation
./scripts/stop.sh --help        # Show options
```

### Database Analysis Commands

#### Comprehensive Database Review
```bash
./scripts/database-review.sh
```

**Output includes:**
- **Database Overview**: Collections list and document counts
- **Cubicles Analysis**: Distribution by floor, duplicates check, sample data
- **Reservations Analysis**: Status breakdown, recent activity, date range analysis
- **Data Integrity**: Orphaned records, invalid references, date validation
- **Storage Statistics**: Database size, storage usage, index analysis
- **Performance Analysis**: Index recommendations and query optimization

**Sample Output:**
```
================================================================================
          IBM CUBICLE MANAGEMENT SYSTEM - DATABASE REVIEW
================================================================================

DATABASE OVERVIEW
----------------------------------------
Database Name: space_optimization
Collections:
  - cubicles: 54 documents
  - reservations: 6 documents
  - notificationhistories: 0 documents

CUBICLES ANALYSIS
----------------------------------------
Total Cubicles: 54
✓ No duplicate cubicles found

DATA INTEGRITY CHECKS
----------------------------------------
⚠️  Found 6 reservations with invalid cubicle references
✓ All reservation dates are valid
```

#### Individual Database Queries
```bash
# Quick collection counts
kubectl exec -it mongodb-0 -n cubicle-management -- mongosh \
  --username admin --password rootpass123 --authenticationDatabase admin \
  space_optimization --eval "db.stats()"

# Check specific collection
kubectl exec -it mongodb-0 -n cubicle-management -- mongosh \
  --username admin --password rootpass123 --authenticationDatabase admin \
  space_optimization --eval "db.reservations.find().pretty()"

# Find duplicates in any collection
kubectl exec -it mongodb-0 -n cubicle-management -- mongosh \
  --username admin --password rootpass123 --authenticationDatabase admin \
  space_optimization --eval "db.cubicles.aggregate([
    {\$group: {_id: '\$name', count: {\$sum: 1}}}, 
    {\$match: {count: {\$gt: 1}}}
  ])"
```

### Backup Commands

#### Create Backup
```bash
./scripts/manual-backup.sh
```

**Output Examples:**
```
=== Backup Completed Successfully ===
Backup Name: backup-20250618-143022
Type: Full Database (5 collections)
Location: ./backups/backup-20250618-143022.tar.gz
Size: 2.4K
```

**For Empty Database:**
```
Type: Empty Database (Structure Only)
ℹ️  This backup contains an empty database structure.
   When restored, it will create a clean database ready for new data.
```

#### Restore Backup
```bash
./scripts/manual-restore.sh <backup-name>

# Examples
./scripts/manual-restore.sh backup-20250618-143022
```

**Interactive Process:**
1. Validates backup file exists
2. Shows current deployment status
3. Confirms destructive operation
4. Restores database
5. Provides verification results

#### List Available Backups
```bash
ls -la ./backups/
./scripts/manual-restore.sh     # Shows available backups if none specified
```

## 🤝 Team Collaboration Workflow

### Scenario 1: Sharing Your Work
```bash
# You have been working on the app
./scripts/manual-backup.sh

# Commit backup to repository (optional)
git add backups/backup-*.tar.gz
git commit -m "Backup with new features"
git push origin main

# Share backup name with team
echo "Use backup: backup-20250618-143022"
```

### Scenario 2: Using Teammate's Work
```bash
# Clone fresh repository
git clone <repository-url>
cd cubicle-management-ibm

# Deploy clean system
./scripts/deploy.sh

# Restore teammate's state
./scripts/manual-restore.sh backup-20250618-143022

# You now have their exact data and configurations
```

### Scenario 3: Regular Development Cycle
```bash
# Start work session
./scripts/deploy.sh

# Work on features...
# Test at http://localhost:8080

# End of session - create backup
./scripts/manual-backup.sh

# Stop for the day
./scripts/stop.sh --all
```

### Scenario 3: Database Analysis and Maintenance
```bash
# Start work session
./scripts/deploy.sh

# Analyze current database state
./scripts/database-review.sh

# Work on features and test at http://localhost:8080

# Check data integrity after changes
./scripts/database-review.sh

# Create backup with validated data
./scripts/manual-backup.sh

# Stop for the day
./scripts/stop.sh --all
```

### Scenario 4: Troubleshooting Data Issues
```bash
# Identify problems
./scripts/database-review.sh

# Review specific issues (e.g., orphaned reservations)
kubectl exec -it mongodb-0 -n cubicle-management -- mongosh \
  --username admin --password rootpass123 --authenticationDatabase admin \
  space_optimization --eval "db.reservations.find({}, {_id:1, cubicleId:1, userId:1})"

# Fix data issues (example: remove orphaned reservations)
kubectl exec -it mongodb-0 -n cubicle-management -- mongosh \
  --username admin --password rootpass123 --authenticationDatabase admin \
  space_optimization --eval "db.reservations.deleteMany({cubicleId: null})"

# Verify fixes
./scripts/database-review.sh
```

## 🔧 Configuration Details

### System Components
- **MongoDB**: Database with persistent storage (50Gi)
- **API**: Node.js backend (3 replicas)
- **Frontend**: Vue.js + Nginx (1 replica)
- **Port-Forward**: Automatic localhost access

### Storage Configuration
- **MongoDB Data**: Preserved across restarts (PVC)
- **Application Logs**: Simplified (emptyDir)
- **Backup Storage**: Local `./backups/` directory

### Network Configuration
- **Frontend**: `http://localhost:8080` (or 8081)
- **API Health**: `http://localhost:8080/api/health`
- **API Endpoints**: `http://localhost:8080/api/*`

## 🛠️ Troubleshooting

### Common Issues

#### 1. Port Already in Use
```
Port 8080 is already in use. Trying port 8081...
```
**Solution:** The system automatically uses port 8081. Access app at the displayed URL.

#### 2. MongoDB Pod Not Found
```
Error: MongoDB pod not found
```
**Solution:**
```bash
kubectl get pods -n cubicle-management
./scripts/deploy.sh  # Redeploy if needed
```

#### 3. Backup File Not Found
```
Error: Backup file not found
```
**Solution:**
```bash
ls -la ./backups/                    # Check available backups
./scripts/manual-restore.sh          # Shows available options
```

#### 4. Minikube Not Running
```
Error: Cannot connect to Kubernetes cluster
```
**Solution:**
```bash
minikube start
./scripts/deploy.sh  # Will check and start minikube
```

#### 5. Database Issues
```
⚠️  Found X reservations with invalid cubicle references
```
**Solution:**
```bash
./scripts/database-review.sh           # Identify specific issues
# Review and fix data manually via MongoDB commands
kubectl exec -it mongodb-0 -n cubicle-management -- mongosh --username admin --password rootpass123 --authenticationDatabase admin space_optimization
```

#### 6. Data Integrity Problems
```
Data appears corrupted or incomplete
```
**Solution:**
```bash
./scripts/database-review.sh           # Full analysis
./scripts/manual-restore.sh backup-*   # Restore from known good backup
./scripts/database-review.sh           # Verify restoration
```

### Health Checks
```bash
# Check all components
kubectl get pods,svc -n cubicle-management

# Test application
curl http://localhost:8080/health
curl http://localhost:8080/api/health

# View logs
kubectl logs -f deployment/cubicle-api -n cubicle-management
kubectl logs -f deployment/cubicle-frontend -n cubicle-management
```

### Reset Everything
```bash
# Complete cleanup
./scripts/stop.sh --all --force
kubectl delete namespace cubicle-management

# Fresh start
./scripts/deploy.sh
```

## 🎯 Best Practices

### Development Workflow
1. **Start each session** with `./scripts/deploy.sh`
2. **Analyze database state** with `./scripts/database-review.sh`
3. **Create backups** before major changes
4. **Monitor data integrity** during development
5. **Test functionality** after changes
6. **Share backups** with team members
7. **Clean shutdown** with `./scripts/stop.sh --all`

### Database Management
- **Regular analysis**: Run database review after significant changes
- **Data integrity**: Check for orphaned records and invalid references
- **Performance monitoring**: Review index usage and query performance
- **Cleanup maintenance**: Remove invalid data before creating backups
- **Documentation**: Track data issues and resolutions

### Backup Strategy
- **Before new features**: Create backup of stable state
- **After major work**: Backup before sharing with team
- **Regular intervals**: Daily backups during active development
- **Test restores**: Verify backups work in clean environment

### Team Coordination
- **Naming convention**: Use descriptive backup names when sharing
- **Documentation**: Include backup name in commit messages
- **Testing**: Verify application works after restore
- **Communication**: Share backup details with team

## 📁 File Structure

```
cubicle-management-ibm/
├── scripts/
│   ├── deploy.sh             # Main deployment script
│   ├── stop.sh              # Stop script with options
│   ├── manual-backup.sh     # Backup creation
│   ├── manual-restore.sh    # Backup restoration
│   └── database-review.sh   # Database analysis and review
├── backups/                 # Local backup storage
│   └── backup-*.tar.gz     # Timestamped backups
├── k8s/                    # Kubernetes configurations
└── demo/                   # Application source code
```

## 🔒 Security Considerations

- Scripts require cluster admin permissions
- Backup files contain sensitive database content
- Local storage should be secured appropriately
- Consider backup encryption for production environments
- MongoDB passwords are stored in Kubernetes secrets

---

**This system provides a complete, automated development environment with team collaboration features through the backup/restore system. Perfect for distributed team development!** 🎉
