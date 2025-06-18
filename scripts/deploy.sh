#!/bin/bash

# ================================================================================
# Kubernetes Deployment Script
# IBM Cubicle Management System - Production Deployment
# ================================================================================

set -e

# Determine the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Change to project root for consistent paths
cd "${PROJECT_ROOT}"

echo "🔍 Project root: ${PROJECT_ROOT}"
echo "📁 Working from: $(pwd)"

# Configuration
NAMESPACE="cubicle-management"
DOCKER_REGISTRY=""  # Empty for local images
API_IMAGE_TAG="${API_IMAGE_TAG:-latest}"
FRONTEND_IMAGE_TAG="${FRONTEND_IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YIGHLLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check if minikube is available and start it
check_minikube() {
    log "Checking minikube status..."
    
    if ! command -v minikube &> /dev/null; then
        error "minikube is not installed. Please install minikube first."
        echo "Install minikube: https://minikube.sigs.k8s.io/docs/start/"
        exit 1
    fi
    
    # Check if minikube is running
    if ! minikube status &> /dev/null; then
        log "Starting minikube..."
        minikube start
    fi
    
    # Enable ingress addon
    if ! minikube addons list | grep "ingress" | grep "enabled" &> /dev/null; then
        log "Enabling ingress addon..."
        minikube addons enable ingress
    fi
    
    success "Minikube is ready"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if kubectl can connect to cluster
    if ! kubectl cluster-info &> /dev/null; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if Docker is installed for building images
    if ! command -v docker &> /dev/null; then
        warning "Docker is not installed. Skipping image build."
    fi
    
    success "Prerequisites check completed"
}

# Function to create namespace
create_namespace() {
    log "Creating namespace..."
    kubectl apply -f k8s/namespace.yaml
    success "Namespace created/updated"
}

# Function to create secrets
create_secrets() {
    log "Creating secrets..."
    
    # Apply secrets from YAML configuration
    kubectl apply -f k8s/secrets.yaml
    
    success "Secrets created/updated"
}

build_images() {
    log "Preparing Docker images..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Configure Docker environment for minikube FIRST
    eval $(minikube docker-env)
    log "Using minikube's Docker daemon for building images"
    
    # Function to check if source files are newer than image
    should_rebuild_image() {
        local image_name=$1
        local source_dir=$2
        
        # If force build is enabled, always rebuild
        if [[ "${FORCE_BUILD}" == "true" ]]; then
            return 0
        fi
        
        # If image doesn't exist, rebuild
        if ! docker image inspect "${image_name}" &> /dev/null; then
            return 0
        fi
        
        # Simplified approach: check if key files have been modified recently
        # Instead of complex timestamp comparison, just check if important files are newer than 1 hour
        local key_files=()
        if [[ "$source_dir" == *"api"* ]]; then
            key_files=("$source_dir/package.json" "$source_dir/Dockerfile" "$source_dir/index.js")
        else
            key_files=("$source_dir/package.json" "$source_dir/Dockerfile" "$source_dir/nginx.conf" "$source_dir/vite.config.js")
        fi
        
        # Check if any key file was modified in the last hour (3600 seconds)
        local current_time=$(date +%s)
        for file in "${key_files[@]}"; do
            if [[ -f "$file" ]]; then
                local file_time=$(stat -f "%m" "$file" 2>/dev/null || echo "0")
                if [[ $((current_time - file_time)) -lt 3600 ]]; then
                    log "Detected recent changes in $(basename "$file"), rebuilding..."
                    return 0
                fi
            fi
        done
        
        return 1
    }
    
    # Build images directly in minikube's Docker context
    log "Building images in minikube's Docker context..."
    
    # Build API image if needed
    if should_rebuild_image "cubicle-api:${API_IMAGE_TAG}" "demo/api"; then
        log "Building API image..."
        docker build -t cubicle-api:${API_IMAGE_TAG} demo/api/
        success "API image built"
    else
        log "API image already exists and is up to date"
    fi
    
    # Build Frontend image if needed
    if should_rebuild_image "cubicle-frontend:${FRONTEND_IMAGE_TAG}" "demo/frontend"; then
        log "Building Frontend image..."
        # Ensure production environment variables are available
        if [[ ! -f "demo/frontend/.env.production" ]]; then
            error "Frontend .env.production file missing. Please ensure Firebase configuration is set up."
            exit 1
        fi
        
        # Build with production environment
        log "Building frontend with production environment configuration..."
        docker build -t cubicle-frontend:${FRONTEND_IMAGE_TAG} demo/frontend/
        success "Frontend image built with production configuration"
    else
        log "Frontend image already exists and is up to date"
    fi
    
    # Verify images are available in minikube's Docker daemon
    if docker image inspect "cubicle-api:${API_IMAGE_TAG}" &> /dev/null; then
        log "✓ API image verified in minikube"
    else
        error "API image not found in minikube - build failed"
        exit 1
    fi
    
    if docker image inspect "cubicle-frontend:${FRONTEND_IMAGE_TAG}" &> /dev/null; then
        log "✓ Frontend image verified in minikube"
    else
        error "Frontend image not found in minikube - build failed"
        exit 1
    fi
    
    success "Images ready for deployment"
}

# Function to deploy storage
deploy_storage() {
    log "Deploying storage..."
    kubectl apply -f k8s/storage.yaml
    
    # Check PVC status (some PVCs use WaitForFirstConsumer and won't bind until pods use them)
    log "Checking PVC status..."
    kubectl get pvc -n ${NAMESPACE}
    
    # Only wait for PVCs that should bind immediately (not WaitForFirstConsumer)
    log "Storage deployed - PVCs with WaitForFirstConsumer will bind when pods are created"
    
    success "Storage deployed"
}

# Function to deploy ConfigMaps
deploy_configmaps() {
    log "Deploying ConfigMaps..."
    kubectl apply -f k8s/configmaps.yaml
    success "ConfigMaps deployed"
}

# Function to deploy MongoDB
deploy_mongodb() {
    log "Deploying MongoDB..."
    kubectl apply -f k8s/mongodb.yaml
    
    # Wait for MongoDB to be ready
    log "Waiting for MongoDB to be ready..."
    kubectl wait --for=condition=Ready pod -l app=cubicle-management,component=database -n ${NAMESPACE} --timeout=600s
    
    success "MongoDB deployed and ready"
}

# Function to deploy API
deploy_api() {
    log "Deploying API..."
    
    # Update image tag in deployment
    if [[ -z "${DOCKER_REGISTRY}" ]]; then
        # Local deployment
        sed -i.bak "s|image: cubicle-api:latest .*|image: cubicle-api:${API_IMAGE_TAG}|g" k8s/api-deployment.yaml
    else
        # Registry deployment
        sed -i.bak "s|image: cubicle-api:latest .*|image: ${DOCKER_REGISTRY}/cubicle-api:${API_IMAGE_TAG}|g" k8s/api-deployment.yaml
    fi
    
    kubectl apply -f k8s/api-deployment.yaml
    
    # Wait for API to be ready
    log "Waiting for API to be ready..."
    kubectl wait --for=condition=Available deployment/cubicle-api -n ${NAMESPACE} --timeout=300s
    
    # Restore original file
    mv k8s/api-deployment.yaml.bak k8s/api-deployment.yaml
    
    success "API deployed and ready"
}

# Function to deploy Frontend
deploy_frontend() {
    log "Deploying Frontend..."
    
    # Update image tag in deployment
    if [[ -z "${DOCKER_REGISTRY}" ]]; then
        # Local deployment
        sed -i.bak "s|image: cubicle-frontend:latest.*|image: cubicle-frontend:${FRONTEND_IMAGE_TAG}|g" k8s/frontend-deployment.yaml
    else
        # Registry deployment
        sed -i.bak "s|image: cubicle-frontend:latest.*|image: ${DOCKER_REGISTRY}/cubicle-frontend:${FRONTEND_IMAGE_TAG}|g" k8s/frontend-deployment.yaml
    fi
    
    kubectl apply -f k8s/frontend-deployment.yaml
    
    # Wait for Frontend to be ready
    log "Waiting for Frontend to be ready..."
    kubectl wait --for=condition=Available deployment/cubicle-frontend -n ${NAMESPACE} --timeout=300s
    
    # Restore original file
    mv k8s/frontend-deployment.yaml.bak k8s/frontend-deployment.yaml
    
    success "Frontend deployed and ready"
}

# Function to deploy backup
deploy_backup() {
    log "Deploying backup..."
    kubectl apply -f k8s/backup.yaml
    success "Backup deployed"
}

# Function to setup automatic local access
setup_local_access() {
    log "Setting up automatic access on localhost:8080..."
    
    # Kill any existing port-forward processes on port 8080
    pkill -f "kubectl.*port-forward.*8080" 2>/dev/null || true
    sleep 2
    
    # Check if port 8080 is available
    if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
        warning "Port 8080 is already in use. Trying port 8081..."
        LOCAL_PORT=8081
    else
        LOCAL_PORT=8080
    fi
    
    # Start port-forwarding in background
    log "Starting port-forward to localhost:${LOCAL_PORT}..."
    kubectl port-forward -n ${NAMESPACE} svc/cubicle-frontend-service ${LOCAL_PORT}:80 > /tmp/kubicle-port-forward.log 2>&1 &
    PORT_FORWARD_PID=$!
    
    # Wait for port-forward to establish
    sleep 5
    
    # Test if port-forward is working with retries
    for i in {1..5}; do
        if curl -s -f http://localhost:${LOCAL_PORT}/health > /dev/null 2>&1; then
            success "✅ Application is accessible at http://localhost:${LOCAL_PORT}"
            
            # Save PID and port for cleanup
            echo "${PORT_FORWARD_PID}" > /tmp/cubicle-port-forward.pid
            echo "${LOCAL_PORT}" > /tmp/cubicle-port-forward.port
            
            # Display success message
            echo
            echo "🎉 IBM Cubicle Management System is ready!"
            echo "===================================================="
            echo "📱 Frontend:     http://localhost:${LOCAL_PORT}"
            echo "🔧 API Health:   http://localhost:${LOCAL_PORT}/api/health"
            echo "📊 Full API:     http://localhost:${LOCAL_PORT}/api"
            echo
            echo "📝 Quick Test Commands:"
            echo "  curl http://localhost:${LOCAL_PORT}/health"
            echo "  curl http://localhost:${LOCAL_PORT}/api/health"
            echo
            echo "🛑 To stop the application:"
            echo "  ./scripts/stop.sh        # Stop localhost access only"
            echo "  ./scripts/stop.sh --all  # Stop entire application"
            echo
            echo "🔄 To restart:"
            echo "  ./scripts/deploy.sh"
            echo
            
            return 0
        else
            log "Waiting for application to be ready... (attempt $i/5)"
            sleep 3
        fi
    done
    
    # If we reach here, something went wrong
    warning "Application might not be ready yet. Check manually:"
    echo "  kubectl get pods -n ${NAMESPACE}"
    echo "  kubectl port-forward -n ${NAMESPACE} svc/cubicle-frontend-service 8080:80"
    
    return 1
}

# Function to display access information
display_access_info() {
    log "Deployment completed successfully!"
    echo
    echo "📋 Resource Status:"
    echo "=================="
    
    # Show pod status
    echo "Pods:"
    kubectl get pods -n ${NAMESPACE} -o wide
    
    echo
    echo "Services:"
    kubectl get services -n ${NAMESPACE}
    
    echo
    echo "🔍 Health Check Results:"
    echo "======================="
    
    # Check API health
    API_POD=$(kubectl get pods -n ${NAMESPACE} -l component=api -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n ${NAMESPACE} ${API_POD} -- curl -s http://localhost:3000/api/health > /dev/null; then
        echo "✅ API: Healthy"
    else
        echo "❌ API: Not responding"
    fi
    
    # Check Frontend health
    FRONTEND_POD=$(kubectl get pods -n ${NAMESPACE} -l component=frontend -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n ${NAMESPACE} ${FRONTEND_POD} -- curl -s http://localhost:80/health > /dev/null; then
        echo "✅ Frontend: Healthy"
    else
        echo "❌ Frontend: Not responding"
    fi
    
    # Check MongoDB
    MONGO_POD=$(kubectl get pods -n ${NAMESPACE} -l component=database -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n ${NAMESPACE} ${MONGO_POD} -- mongosh --quiet --eval "db.runCommand('ping')" > /dev/null 2>&1; then
        echo "✅ MongoDB: Healthy"
    else
        echo "❌ MongoDB: Not responding"
    fi
}

# Function to apply automated deployment fixes
apply_deployment_fixes() {
    log "Applying automated deployment fixes..."
    
    # 1. Enable database seeding for fresh deployments
    log "Configuring database seeding..."
    kubectl patch configmap cubicle-config -n ${NAMESPACE} --type merge -p '{"data":{"SEED":"true"}}' 2>/dev/null || {
        warning "ConfigMap cubicle-config not found yet - seeding will be configured after deployment"
    }
    
    # 2. Verify nginx configuration for service connectivity
    log "Checking nginx configuration..."
    if grep -q "cubicle-api-service" k8s/configmaps.yaml; then
        log "✓ Nginx configuration is correct for Kubernetes services"
    else
        warning "Nginx configuration may need updates for service connectivity"
    fi
    
    # 3. Check if frontend environment variables are properly configured
    log "Verifying frontend environment configuration..."
    if [[ -f "demo/frontend/.env.production" ]]; then
        log "✓ Frontend production environment file found"
        # Verify Firebase config is present
        if grep -q "VITE_FIREBASE" demo/frontend/.env.production; then
            log "✓ Firebase configuration found in environment file"
        else
            warning "Firebase configuration missing from .env.production"
        fi
    else
        error "Frontend .env.production file missing"
        exit 1
    fi
    
    success "Deployment fixes applied"
}

# Function to validate deployment health
validate_deployment() {
    log "Validating deployment health..."
    
    # Check if all pods are running
    log "Checking pod status..."
    kubectl get pods -n ${NAMESPACE}
    
    # Check if services are accessible
    log "Checking service connectivity..."
    kubectl get services -n ${NAMESPACE}
    
    # Test internal API connectivity (if port-forward is available)
    log "Testing API health..."
    kubectl port-forward service/cubicle-api-service 3001:3000 -n ${NAMESPACE} --timeout=5s &>/dev/null &
    local pf_pid=$!
    sleep 2
    if curl -s http://localhost:3001/health &>/dev/null; then
        log "✓ API health check passed"
    else
        warning "API health check failed - may still be starting"
    fi
    kill $pf_pid 2>/dev/null || true
    
    # Check if database is seeded
    log "Verifying database seeding..."
    local api_pod=$(kubectl get pods -n ${NAMESPACE} -l component=api --no-headers -o custom-columns=":metadata.name" | head -1)
    if [[ -n "$api_pod" ]]; then
        local seed_logs=$(kubectl logs $api_pod -n ${NAMESPACE} | grep -i "seeded.*cubicles" || echo "")
        if [[ -n "$seed_logs" ]]; then
            log "✓ Database seeding completed"
        else
            warning "Database seeding may not have completed yet"
        fi
    fi
    
    success "Deployment validation completed"
}

# Function to validate environment configuration
validate_environment() {
    log "Validating environment configuration..."
    
    # Check if required environment files exist
    local env_files=("demo/frontend/.env.production")
    for env_file in "${env_files[@]}"; do
        if [[ ! -f "$env_file" ]]; then
            error "Required environment file missing: $env_file"
            error "Please ensure Firebase configuration is set up properly."
            error "Run: cp demo/frontend/.env.example demo/frontend/.env.production"
            error "Then edit the file with your Firebase configuration."
            exit 1
        fi
        log "✓ Found environment file: $env_file"
    done
    
    # Validate Firebase configuration
    if [[ -f "demo/frontend/.env.production" ]]; then
        local firebase_vars=("VITE_API_KEY" "VITE_AUTH_DOMAIN" "VITE_PROJECT_ID")
        local missing_vars=()
        
        for var in "${firebase_vars[@]}"; do
            if ! grep -q "^${var}=" demo/frontend/.env.production; then
                missing_vars+=("$var")
            fi
        done
        
        if [[ ${#missing_vars[@]} -gt 0 ]]; then
            warning "Missing Firebase configuration variables in .env.production:"
            for var in "${missing_vars[@]}"; do
                error "  - $var"
            done
            echo ""
            error "Please configure these variables in demo/frontend/.env.production"
            echo "You can copy from the example:"
            echo "  cp demo/frontend/.env.example demo/frontend/.env.production"
            echo ""
            echo "Then edit the file with your Firebase configuration:"
            echo "Get these values from: https://console.firebase.google.com/project/YOUR_PROJECT/settings/general/"
            exit 1
        fi
        
        log "✓ Firebase configuration validated"
    fi
    
    success "Environment configuration validated"
}

# Main deployment function
main() {
    echo "🚀 Starting IBM Cubicle Management System Deployment"
    echo "======================================================"
    
    # Core setup
    check_minikube
    check_prerequisites
    validate_environment
    
    # Deploy infrastructure
    create_namespace
    deploy_configmaps
    create_secrets
    deploy_storage
    deploy_mongodb
    
    # Build and deploy applications
    build_images
    deploy_api
    deploy_frontend
    
    # Apply automated configuration fixes
    apply_deployment_fixes
    
    # Skip backup deployment if it causes issues
    log "Skipping backup deployment (optional component)"
    # deploy_backup
    
    # Final health check and access setup
    display_access_info
    setup_local_access
    
    # Apply automated configuration fixes
    apply_deployment_fixes
    
    # Validate deployment health
    validate_deployment
    
    success "🎉 Deployment completed! Application is ready at the URL shown above."
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force-build|--rebuild)
            FORCE_BUILD="true"
            shift
            ;;
        --build-images)
            BUILD_IMAGES="true"
            shift
            ;;
        --registry)
            DOCKER_REGISTRY="$2"
            shift 2
            ;;
        --api-tag)
            API_IMAGE_TAG="$2"
            shift 2
            ;;
        --frontend-tag)
            FRONTEND_IMAGE_TAG="$2"
            shift 2
            ;;
        --port)
            CUSTOM_PORT="$2"
            shift 2
            ;;
        --help)
            echo "🚀 IBM Cubicle Management System - Easy Deployment"
            echo "=================================================="
            echo ""
            echo "This script automatically deploys the complete system to minikube"
            echo "and makes it accessible at http://localhost:8080 (or custom port)"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force-build, --rebuild  Force rebuild of Docker images"
            echo "  --build-images            Build Docker images (auto-detected)"
            echo "  --registry REGISTRY       Docker registry URL (for production)"
            echo "  --api-tag TAG            API image tag (default: latest)"
            echo "  --frontend-tag TAG       Frontend image tag (default: latest)"
            echo "  --port PORT              Custom local port (default: 8080)"
            echo "  --help                   Show this help message"
            echo ""
            echo "🎯 Quick Start (new users):"
            echo "  ./scripts/deploy.sh"
            echo ""
            echo "🔄 Force rebuild:"
            echo "  ./scripts/deploy.sh --force-build"
            echo "  ./scripts/deploy.sh --rebuild      # Same as --force-build"
            echo ""
            echo "🛑 To stop the application:"
            echo "  ./scripts/stop.sh        # Stop localhost access only"
            echo "  ./scripts/stop.sh --all  # Stop entire application"
            echo ""
            echo "📋 Prerequisites:"
            echo "  - Docker installed and running"
            echo "  - minikube installed"
            echo "  - kubectl installed"
            echo ""
            echo "The script will automatically:"
            echo "  ✅ Start minikube if needed"
            echo "  ✅ Build Docker images"
            echo "  ✅ Deploy to Kubernetes"
            echo "  ✅ Set up localhost access"
            echo "  ✅ Run health checks"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
