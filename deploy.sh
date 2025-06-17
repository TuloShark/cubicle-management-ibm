#!/bin/bash

# ================================================================================
# Kubernetes Deployment Script
# IBM Cubicle Management System - Production Deployment
# ================================================================================

set -e

# Configuration
NAMESPACE="cubicle-management"
DOCKER_REGISTRY="your-registry.com"  # Update with your registry
API_IMAGE_TAG="${API_IMAGE_TAG:-latest}"
FRONTEND_IMAGE_TAG="${FRONTEND_IMAGE_TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    
    # Check if .env file exists
    if [[ ! -f "demo/.env" ]]; then
        warning ".env file not found. Please create secrets manually."
        warning "Example: kubectl create secret generic cubicle-secrets --from-env-file=demo/.env --namespace=${NAMESPACE}"
        return
    fi
    
    # Create secrets from .env file
    kubectl create secret generic cubicle-secrets \
        --from-env-file=demo/.env \
        --namespace=${NAMESPACE} \
        --dry-run=client -o yaml | kubectl apply -f -
    
    success "Secrets created/updated"
}

# Function to build and push Docker images
build_images() {
    log "Building Docker images..."
    
    if ! command -v docker &> /dev/null; then
        warning "Docker not available. Skipping image build."
        return
    fi
    
    # Build API image
    log "Building API image..."
    docker build -t ${DOCKER_REGISTRY}/cubicle-api:${API_IMAGE_TAG} demo/api/
    docker push ${DOCKER_REGISTRY}/cubicle-api:${API_IMAGE_TAG}
    
    # Build Frontend image
    log "Building Frontend image..."
    docker build -t ${DOCKER_REGISTRY}/cubicle-frontend:${FRONTEND_IMAGE_TAG} demo/frontend/
    docker push ${DOCKER_REGISTRY}/cubicle-frontend:${FRONTEND_IMAGE_TAG}
    
    success "Images built and pushed"
}

# Function to deploy storage
deploy_storage() {
    log "Deploying storage..."
    kubectl apply -f k8s/storage.yaml
    
    # Wait for PVCs to be bound
    log "Waiting for PVCs to be bound..."
    kubectl wait --for=condition=Bound pvc --all -n ${NAMESPACE} --timeout=300s
    
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
    sed -i.bak "s|image: cubicle-api:latest|image: ${DOCKER_REGISTRY}/cubicle-api:${API_IMAGE_TAG}|g" k8s/api-deployment.yaml
    
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
    sed -i.bak "s|image: cubicle-frontend:latest|image: ${DOCKER_REGISTRY}/cubicle-frontend:${FRONTEND_IMAGE_TAG}|g" k8s/frontend-deployment.yaml
    
    kubectl apply -f k8s/frontend-deployment.yaml
    
    # Wait for Frontend to be ready
    log "Waiting for Frontend to be ready..."
    kubectl wait --for=condition=Available deployment/cubicle-frontend -n ${NAMESPACE} --timeout=300s
    
    # Restore original file
    mv k8s/frontend-deployment.yaml.bak k8s/frontend-deployment.yaml
    
    success "Frontend deployed and ready"
}

# Function to deploy Ingress
deploy_ingress() {
    log "Deploying Ingress..."
    kubectl apply -f k8s/ingress.yaml
    success "Ingress deployed"
}

# Function to deploy monitoring
deploy_monitoring() {
    log "Deploying monitoring..."
    kubectl apply -f k8s/monitoring.yaml
    success "Monitoring deployed"
}

# Function to deploy backup
deploy_backup() {
    log "Deploying backup..."
    kubectl apply -f k8s/backup.yaml
    success "Backup deployed"
}

# Function to verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check all pods are running
    kubectl get pods -n ${NAMESPACE}
    
    # Check services
    kubectl get services -n ${NAMESPACE}
    
    # Check ingress
    kubectl get ingress -n ${NAMESPACE}
    
    # Check PVCs
    kubectl get pvc -n ${NAMESPACE}
    
    # Run health checks
    log "Running health checks..."
    
    # Check API health
    API_POD=$(kubectl get pods -n ${NAMESPACE} -l component=api -o jsonpath='{.items[0].metadata.name}')
    if kubectl exec -n ${NAMESPACE} ${API_POD} -- curl -f http://localhost:3000/api/health; then
        success "API health check passed"
    else
        error "API health check failed"
    fi
    
    success "Deployment verification completed"
}

# Function to display access information
display_access_info() {
    log "Deployment completed successfully!"
    echo
    echo "Access Information:"
    echo "=================="
    
    # Get ingress information
    INGRESS_IP=$(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
    INGRESS_HOSTNAME=$(kubectl get ingress -n ${NAMESPACE} -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}')
    
    if [[ -n "$INGRESS_IP" ]]; then
        echo "External IP: $INGRESS_IP"
    elif [[ -n "$INGRESS_HOSTNAME" ]]; then
        echo "External Hostname: $INGRESS_HOSTNAME"
    else
        echo "Ingress is being provisioned. Check status with:"
        echo "kubectl get ingress -n ${NAMESPACE}"
    fi
    
    echo
    echo "Application URLs:"
    echo "Frontend: https://cubicle-management.company.com"
    echo "API: https://api.cubicle-management.company.com"
    echo
    echo "Monitoring:"
    echo "kubectl port-forward svc/prometheus-server 9090:80 -n monitoring"
    echo "kubectl port-forward svc/grafana 3000:80 -n monitoring"
    echo
    echo "Logs:"
    echo "kubectl logs -f deployment/cubicle-api -n ${NAMESPACE}"
    echo "kubectl logs -f deployment/cubicle-frontend -n ${NAMESPACE}"
}

# Main deployment function
main() {
    log "Starting IBM Cubicle Management System deployment..."
    
    check_prerequisites
    create_namespace
    deploy_configmaps
    create_secrets
    deploy_storage
    deploy_mongodb
    
    # Build images if requested
    if [[ "${BUILD_IMAGES}" == "true" ]]; then
        build_images
    fi
    
    deploy_api
    deploy_frontend
    deploy_ingress
    deploy_monitoring
    deploy_backup
    
    verify_deployment
    display_access_info
    
    success "Deployment completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
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
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --build-images        Build and push Docker images"
            echo "  --registry REGISTRY   Docker registry URL"
            echo "  --api-tag TAG        API image tag"
            echo "  --frontend-tag TAG   Frontend image tag"
            echo "  --help               Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"
