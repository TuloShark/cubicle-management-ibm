# Kubernetes Deployment Guide
## IBM Cubicle Management System

---

## **COMPREHENSIVE KUBERNETES MIGRATION PLAN**

### **Overview**
This document outlines the complete migration strategy from Docker Compose to Kubernetes for the IBM Cubicle Management System, ensuring data persistence, high availability, and production-ready deployment.

---

## **ARCHITECTURE SUMMARY**

### **Current System (Docker Compose)**
- **3 Services**: MongoDB, Node.js API, Vue.js Frontend
- **Single Host**: All services on one machine
- **Shared Network**: Internal Docker network
- **Volume Mounts**: Local Docker volumes

### **Target System (Kubernetes)**
- **Microservices Architecture**: Independently scalable components
- **High Availability**: Multiple replicas with load balancing
- **Persistent Storage**: Kubernetes PersistentVolumes with cloud storage
- **Auto-scaling**: Horizontal Pod Autoscaling based on metrics
- **Monitoring**: Prometheus, Grafana, and centralized logging
- **Backup & Recovery**: Automated backups with disaster recovery procedures

---

## **DEPLOYMENT PHASES**

### **Phase 1: Prerequisites Setup**
```bash
# 1. Kubernetes cluster (EKS, GKE, AKS, or on-premises)
# 2. kubectl configured
# 3. Docker registry access
# 4. DNS management
# 5. SSL certificates (Let's Encrypt or purchased)
```

### **Phase 2: Storage Configuration**
- **MongoDB**: 50GB SSD storage with automatic scaling
- **Application Logs**: 10GB shared storage across pods
- **Static Assets**: 5GB for future file uploads
- **Backups**: 100GB for automated backup retention

### **Phase 3: Database Migration**
- **StatefulSet** deployment for MongoDB
- **Replica Set** configuration for high availability
- **Automated backups** with CronJobs
- **Monitoring** with MongoDB Exporter

### **Phase 4: Application Deployment**
- **API**: 3 replicas with auto-scaling (3-10 pods)
- **Frontend**: 2 replicas with auto-scaling (2-5 pods)
- **Load Balancing**: Nginx Ingress Controller
- **SSL Termination**: Automatic certificate management

### **Phase 5: Monitoring & Observability**
- **Metrics**: Prometheus + Grafana dashboards
- **Logging**: Fluent Bit + Elasticsearch + Kibana
- **Alerts**: AlertManager for critical issues
- **Health Checks**: Liveness, readiness, and startup probes

### **Phase 6: Backup & Recovery**
- **Daily MongoDB backups** at 2 AM
- **Weekly application state backups**
- **Disaster recovery procedures**
- **Point-in-time recovery capabilities**

---

## **DATA PERSISTENCE STRATEGY**

### **1. Database Persistence**
```yaml
# MongoDB with persistent storage
- PersistentVolumeClaim: 50GB SSD
- StorageClass: fast-ssd (cloud provider specific)
- Backup Schedule: Daily at 2 AM
- Retention: 30 days local, 1 year cloud
```

### **2. Application Data**
```yaml
# Logs and temporary files
- Application Logs: Shared 10GB volume
- Static Assets: 5GB for future uploads
- Cache Data: EmptyDir volumes (ephemeral)
```

### **3. Configuration Management**
```yaml
# ConfigMaps for non-sensitive data
- Application settings
- Nginx configuration
- Logging configuration

# Secrets for sensitive data
- Database credentials
- API keys
- SSL certificates
```

---

## **SCALING & PERFORMANCE**

### **Horizontal Pod Autoscaling (HPA)**
```yaml
API Pods:
- Min: 3 replicas
- Max: 10 replicas
- CPU threshold: 70%
- Memory threshold: 80%

Frontend Pods:
- Min: 2 replicas
- Max: 5 replicas
- CPU threshold: 80%
- Memory threshold: 85%
```

### **Resource Requirements**
```yaml
MongoDB:
- CPU: 500m-1 core
- Memory: 1-2GB
- Storage: 50GB SSD

API:
- CPU: 250m-500m per pod
- Memory: 512MB-1GB per pod

Frontend:
- CPU: 100m-200m per pod
- Memory: 128MB-256MB per pod
```

---

## **SECURITY IMPLEMENTATION**

### **Network Security**
- **NetworkPolicies**: Restrict inter-pod communication
- **Ingress Security**: Rate limiting, IP whitelisting
- **SSL/TLS**: Automatic certificate management

### **Pod Security**
- **Non-root containers**: All pods run as non-root users
- **ReadOnlyRootFilesystem**: Immutable container filesystems
- **SecurityContexts**: Dropped capabilities, restricted privileges

### **Data Security**
- **Secrets Management**: Kubernetes secrets or external vault
- **Encryption**: At-rest and in-transit encryption
- **Access Control**: RBAC for service accounts

---

## **DEPLOYMENT INSTRUCTIONS**

### **1. Environment Preparation**
```bash
# Clone repository
git clone <repository-url>
cd cubicle-management-ibm

# Set environment variables
export DOCKER_REGISTRY="your-registry.com"
export API_IMAGE_TAG="v1.0.0"
export FRONTEND_IMAGE_TAG="v1.0.0"
```

### **2. Create Environment File**
```bash
# Copy and configure environment
cp demo/.env.example demo/.env
# Edit demo/.env with production values
```

### **3. Deploy to Kubernetes**
```bash
# Full deployment with image build
./deploy.sh --build-images --registry your-registry.com

# Or deploy with existing images
./deploy.sh --api-tag v1.0.0 --frontend-tag v1.0.0
```

### **4. Verify Deployment**
```bash
# Check pod status
kubectl get pods -n cubicle-management

# Check services
kubectl get services -n cubicle-management

# Check ingress
kubectl get ingress -n cubicle-management

# Check logs
kubectl logs -f deployment/cubicle-api -n cubicle-management
```

---

## **MONITORING SETUP**

### **Prometheus Configuration**
```bash
# Install Prometheus Operator
kubectl apply -f https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/main/bundle.yaml

# Deploy ServiceMonitors
kubectl apply -f k8s/monitoring.yaml
```

### **Grafana Dashboards**
- **Application Performance**: Response times, request rates
- **Infrastructure**: CPU, memory, storage utilization
- **Business Metrics**: Active reservations, user activity
- **Database**: MongoDB performance and connections

### **Log Aggregation**
```bash
# Deploy Fluent Bit for log collection
kubectl apply -f k8s/monitoring.yaml

# Access logs through Kibana or Grafana
kubectl port-forward svc/kibana 5601:5601 -n logging
```

---

## **BACKUP & RECOVERY**

### **Automated Backups**
- **MongoDB**: Daily backups at 2 AM Costa Rica time
- **Application State**: Weekly configuration backups
- **Retention**: 30 days local, 1 year in cloud storage

### **Disaster Recovery**
```bash
# Database recovery from backup
kubectl apply -f k8s/backup.yaml

# Application recovery
./deploy.sh --restore-from-backup backup-20231215
```

### **RTO/RPO Targets**
- **Recovery Time Objective (RTO)**: 1 hour for critical systems
- **Recovery Point Objective (RPO)**: 24 hours for database
- **Business Continuity**: 99.9% uptime target

---

## **COST OPTIMIZATION**

### **Resource Optimization**
- **Right-sizing**: Monitor and adjust resource requests/limits
- **Cluster Autoscaling**: Automatic node scaling based on demand
- **Spot Instances**: Use for non-critical workloads

### **Storage Optimization**
- **Lifecycle Policies**: Automatic backup archival
- **Compression**: Enable compression for backups
- **Monitoring**: Track storage usage and growth

---

## **MAINTENANCE PROCEDURES**

### **Updates & Upgrades**
```bash
# Rolling updates for zero-downtime deployments
kubectl set image deployment/cubicle-api api=new-image:tag -n cubicle-management

# Database maintenance
kubectl exec -it mongodb-0 -n cubicle-management -- mongo --eval "db.runCommand({compact: 'collection_name'})"
```

### **Health Monitoring**
```bash
# Check cluster health
kubectl get nodes
kubectl top nodes
kubectl top pods -n cubicle-management

# Check application health
curl -f https://api.cubicle-management.company.com/api/health
```

---

## **TROUBLESHOOTING GUIDE**

### **Common Issues**
1. **Pod Startup Issues**: Check logs and resource constraints
2. **Database Connection**: Verify secrets and network policies
3. **Storage Issues**: Check PVC status and node capacity
4. **Ingress Problems**: Verify DNS and certificate configuration

### **Diagnostic Commands**
```bash
# Pod diagnostics
kubectl describe pod <pod-name> -n cubicle-management
kubectl logs <pod-name> -n cubicle-management

# Network diagnostics
kubectl exec -it <pod-name> -n cubicle-management -- nslookup mongodb-service

# Storage diagnostics
kubectl get pv,pvc -n cubicle-management
```

---

## **MIGRATION TIMELINE**

### **Week 1: Planning & Preparation**
- [ ] Infrastructure provisioning
- [ ] Environment setup
- [ ] CI/CD pipeline configuration

### **Week 2: Development & Testing**
- [ ] Kubernetes manifests creation
- [ ] Local testing with minikube
- [ ] Integration testing

### **Week 3: Staging Deployment**
- [ ] Staging environment deployment
- [ ] Data migration testing
- [ ] Performance testing

### **Week 4: Production Migration**
- [ ] Production deployment
- [ ] Data migration
- [ ] Monitoring setup
- [ ] Documentation completion

---

## **SUCCESS METRICS**

### **Performance Targets**
- **Response Time**: < 200ms for API calls
- **Availability**: 99.9% uptime
- **Scalability**: Handle 10x current load
- **Recovery**: < 1 hour RTO for critical issues

### **Operational Excellence**
- **Automated Deployments**: Zero-downtime releases
- **Monitoring Coverage**: 100% of critical components
- **Backup Success**: 100% backup completion rate
- **Security Compliance**: All security scans passing

---

This comprehensive plan ensures a smooth migration to Kubernetes with robust data persistence, high availability, and production-ready operational practices.
