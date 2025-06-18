#!/bin/bash

# ================================================================================
# Stop Script for IBM Cubicle Management System
# ================================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
STOP_ALL=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            STOP_ALL=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            echo "🛑 IBM Cubicle Management System - Stop Script"
            echo "=============================================="
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --all      Stop the entire application (delete Kubernetes deployment)"
            echo "  --force    Skip confirmation prompts"
            echo "  --help     Show this help message"
            echo ""
            echo "Default behavior (no options):"
            echo "  - Stops port-forwarding (localhost access)"
            echo "  - Keeps Kubernetes deployment running"
            echo ""
            echo "Examples:"
            echo "  ./stop.sh           # Stop localhost access only"
            echo "  ./stop.sh --all     # Stop everything (with confirmation)"
            echo "  ./stop.sh --all --force  # Stop everything (no confirmation)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "🛑 Stopping IBM Cubicle Management System..."
echo "=============================================="

# Always stop port-forwarding first
echo "📡 Stopping local access..."

# Kill port-forward process
if [[ -f /tmp/cubicle-port-forward.pid ]]; then
    PID=$(cat /tmp/cubicle-port-forward.pid)
    PORT=$(cat /tmp/cubicle-port-forward.port 2>/dev/null || echo "8080")
    
    if kill $PID 2>/dev/null; then
        echo -e "${GREEN}✅ Port-forwarding stopped (PID: $PID, Port: $PORT)${NC}"
    else
        echo -e "${YELLOW}⚠️  Port-forward process already stopped (PID: $PID)${NC}"
    fi
    
    rm -f /tmp/cubicle-port-forward.pid
    rm -f /tmp/cubicle-port-forward.port
else
    echo -e "${BLUE}ℹ️  No saved port-forward PID found${NC}"
fi

# Try to kill any kubectl port-forward processes on common ports
for port in 8080 8081 8082; do
    if pkill -f "kubectl.*port-forward.*${port}" 2>/dev/null; then
        echo -e "${GREEN}✅ Stopped port-forwarding on port $port${NC}"
    fi
done

if [[ "$STOP_ALL" == "true" ]]; then
    echo ""
    echo "🗑️  Stopping entire application..."
    
    # Check if deployment exists
    if ! kubectl get namespace cubicle-management &>/dev/null; then
        echo -e "${YELLOW}⚠️  No deployment found (namespace 'cubicle-management' doesn't exist)${NC}"
        exit 0
    fi
    
    # Show what will be deleted
    echo "📋 Current deployment status:"
    kubectl get pods,svc,pvc -n cubicle-management 2>/dev/null || echo "No resources found"
    
    if [[ "$FORCE" != "true" ]]; then
        echo ""
        echo -e "${RED}⚠️  WARNING: This will DELETE the application deployment!${NC}"
        echo "   - All pods will be terminated"
        echo "   - All services will be removed"
        echo "   - Persistent data will be PRESERVED (PVCs and volumes)"
        echo "   - Database data will persist across restarts"
        echo "   - To wipe data: manually run 'kubectl delete pvc -n cubicle-management --all'"
        echo "   - You'll need to run ./deploy.sh to restart"
        echo ""
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}ℹ️  Operation cancelled${NC}"
            exit 0
        fi
    fi
    
    # Delete the deployment resources but preserve PVCs and namespace
    echo "🗑️  Deleting Kubernetes deployment (preserving data)..."
    
    # Delete deployments and statefulsets first
    echo "   Deleting application deployments..."
    kubectl delete deployment --all -n cubicle-management --timeout=60s 2>/dev/null || true
    kubectl delete statefulset --all -n cubicle-management --timeout=60s 2>/dev/null || true
    
    # Delete services
    echo "   Deleting services..."
    kubectl delete service --all -n cubicle-management --timeout=30s 2>/dev/null || true
    
    # Delete other resources but keep PVCs and secrets
    echo "   Deleting other resources..."
    kubectl delete configmap --all -n cubicle-management --timeout=30s 2>/dev/null || true
    kubectl delete serviceaccount --all -n cubicle-management --timeout=30s 2>/dev/null || true
    kubectl delete poddisruptionbudget --all -n cubicle-management --timeout=30s 2>/dev/null || true
    kubectl delete hpa --all -n cubicle-management --timeout=30s 2>/dev/null || true
    kubectl delete networkpolicy --all -n cubicle-management --timeout=30s 2>/dev/null || true
    kubectl delete resourcequota --all -n cubicle-management --timeout=30s 2>/dev/null || true
    
    # Keep secrets and PVCs for data persistence
    echo "   Preserving PVCs and secrets for data persistence..."
    
    if kubectl get namespace cubicle-management >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Application deployment removed (data preserved)${NC}"
        echo ""
        echo "📋 Persistent data status:"
        echo "   Namespace: cubicle-management (preserved)"
        kubectl get pvc -n cubicle-management 2>/dev/null || echo "   No PVCs found"
        kubectl get secrets -n cubicle-management 2>/dev/null || echo "   No secrets found"
        echo ""
        echo "📋 To restart the application:"
        echo "   ./scripts/deploy.sh"
        echo ""
        echo "🗑️  To completely wipe data:"
        echo "   kubectl delete pvc -n cubicle-management --all"
        echo "   kubectl delete secrets -n cubicle-management --all"
        echo "   kubectl delete namespace cubicle-management"
    else
        echo -e "${RED}❌ Failed to preserve namespace${NC}"
    fi
else
    echo ""
    echo -e "${GREEN}🏁 Local access stopped${NC}"
    echo "   (Kubernetes deployment is still running in minikube)"
    echo ""
    echo "📋 To check deployment status:"
    echo "   kubectl get pods -n cubicle-management"
    echo ""
    echo "🗑️  To completely remove the deployment:"
    echo "   ./scripts/stop.sh --all"
    echo ""
    echo "🔄 To restart local access:"
    echo "   ./scripts/deploy.sh"
fi
