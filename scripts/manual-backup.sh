#!/bin/bash

# Manual Backup Script for Cubicle Management System
# Creates a backup with timestamp naming: YYYYMMDD-HHMMSS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="cubicle-management"
MONGODB_POD_LABEL="app=cubicle-management,component=database"
DATABASE_NAME="space_optimization"
BACKUP_DIR="/tmp/mongodb-backups"

# Generate timestamp-based backup name
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="backup-${TIMESTAMP}"

echo -e "${BLUE}=== Cubicle Management Manual Backup ===${NC}"
echo -e "${YELLOW}Backup Name: ${BACKUP_NAME}${NC}"
echo -e "${YELLOW}Timestamp: $(date)${NC}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo -e "${RED}Error: Namespace '$NAMESPACE' does not exist${NC}"
    exit 1
fi

# Get MongoDB pod name
echo -e "${BLUE}Finding MongoDB pod...${NC}"
MONGODB_POD=$(kubectl get pods -n $NAMESPACE -l $MONGODB_POD_LABEL -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

if [ -z "$MONGODB_POD" ]; then
    echo -e "${RED}Error: MongoDB pod not found with label '$MONGODB_POD_LABEL'${NC}"
    echo -e "${YELLOW}Debugging information:${NC}"
    echo -e "${YELLOW}Available pods in namespace '$NAMESPACE':${NC}"
    kubectl get pods -n $NAMESPACE 2>/dev/null || echo "No pods found or namespace doesn't exist"
    echo ""
    echo -e "${YELLOW}All pods with any labels:${NC}"
    kubectl get pods -n $NAMESPACE --show-labels 2>/dev/null || echo "Cannot retrieve pod labels"
    echo ""
    echo -e "${YELLOW}Expected: A pod with label '$MONGODB_POD_LABEL' in namespace '$NAMESPACE'${NC}"
    echo -e "${YELLOW}To deploy MongoDB, run: kubectl apply -f k8s/mongodb.yaml${NC}"
    exit 1
fi

echo -e "${GREEN}Found MongoDB pod: $MONGODB_POD${NC}"

# Create backup directory in pod
echo -e "${BLUE}Creating backup directory in pod...${NC}"
kubectl exec -n $NAMESPACE $MONGODB_POD -- mkdir -p $BACKUP_DIR

# Check if database has any data before attempting backup
echo -e "${BLUE}Checking database content...${NC}"
COLLECTION_COUNT=$(kubectl exec -n $NAMESPACE $MONGODB_POD -- mongosh \
    --username admin \
    --password "$(kubectl get secret mongodb-secrets -n $NAMESPACE -o jsonpath='{.data.mongodb-root-password}' | base64 -d)" \
    --authenticationDatabase admin \
    --eval "use('$DATABASE_NAME'); db.getCollectionNames().length;" --quiet 2>/dev/null || echo "0")

echo -e "${BLUE}Database '$DATABASE_NAME' has $COLLECTION_COUNT collections${NC}"

if [ "$COLLECTION_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  Database is empty - creating minimal backup for structure${NC}"
    
    # Create a minimal backup even for empty database
    kubectl exec -n $NAMESPACE $MONGODB_POD -- mongodump \
        --username admin \
        --password "$(kubectl get secret mongodb-secrets -n $NAMESPACE -o jsonpath='{.data.mongodb-root-password}' | base64 -d)" \
        --authenticationDatabase admin \
        --db $DATABASE_NAME \
        --out $BACKUP_DIR/$BACKUP_NAME \
        --quiet
    
    # Ensure the backup directory structure exists and create a marker file
    kubectl exec -n $NAMESPACE $MONGODB_POD -- mkdir -p $BACKUP_DIR/$BACKUP_NAME/$DATABASE_NAME
    kubectl exec -n $NAMESPACE $MONGODB_POD -- sh -c "echo 'Empty database backup created on $(date)' > $BACKUP_DIR/$BACKUP_NAME/EMPTY_DATABASE_MARKER"
    
    echo -e "${YELLOW}✓ Empty database backup created (includes database structure)${NC}"
else
    echo -e "${BLUE}Creating MongoDB dump with $COLLECTION_COUNT collections...${NC}"
    # Create the backup
    kubectl exec -n $NAMESPACE $MONGODB_POD -- mongodump \
        --username admin \
        --password "$(kubectl get secret mongodb-secrets -n $NAMESPACE -o jsonpath='{.data.mongodb-root-password}' | base64 -d)" \
        --authenticationDatabase admin \
        --db $DATABASE_NAME \
        --out $BACKUP_DIR/$BACKUP_NAME \
        --quiet
    
    echo -e "${GREEN}✓ MongoDB dump completed successfully${NC}"
fi

# Create archive
echo -e "${BLUE}Creating backup archive...${NC}"

# Check if backup directory was created successfully
if kubectl exec -n $NAMESPACE $MONGODB_POD -- test -d "$BACKUP_DIR/$BACKUP_NAME"; then
    kubectl exec -n $NAMESPACE $MONGODB_POD -- sh -c "cd $BACKUP_DIR && tar -czf ${BACKUP_NAME}.tar.gz $BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup archive created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create backup archive${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Backup directory not found - mongodump may have failed${NC}"
    exit 1
fi

# Copy backup to local machine
echo -e "${BLUE}Copying backup to local machine...${NC}"
LOCAL_BACKUP_DIR="./backups"
mkdir -p $LOCAL_BACKUP_DIR

kubectl cp $NAMESPACE/$MONGODB_POD:$BACKUP_DIR/${BACKUP_NAME}.tar.gz $LOCAL_BACKUP_DIR/${BACKUP_NAME}.tar.gz 2>&1 | grep -v "tar: Removing leading" || true

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup copied to local machine: $LOCAL_BACKUP_DIR/${BACKUP_NAME}.tar.gz${NC}"
else
    echo -e "${RED}✗ Failed to copy backup to local machine${NC}"
    exit 1
fi

# Cleanup pod backup files
echo -e "${BLUE}Cleaning up temporary files in pod...${NC}"
kubectl exec -n $NAMESPACE $MONGODB_POD -- rm -rf $BACKUP_DIR/$BACKUP_NAME
kubectl exec -n $NAMESPACE $MONGODB_POD -- rm -f $BACKUP_DIR/${BACKUP_NAME}.tar.gz

# Get backup size and type
BACKUP_SIZE=$(ls -lh $LOCAL_BACKUP_DIR/${BACKUP_NAME}.tar.gz | awk '{print $5}')

# Determine backup type
if [ "$COLLECTION_COUNT" = "0" ]; then
    BACKUP_TYPE="Empty Database (Structure Only)"
else
    BACKUP_TYPE="Full Database ($COLLECTION_COUNT collections)"
fi

echo ""
echo -e "${GREEN}=== Backup Completed Successfully ===${NC}"
echo -e "${GREEN}Backup Name: ${BACKUP_NAME}${NC}"
echo -e "${GREEN}Type: ${BACKUP_TYPE}${NC}"
echo -e "${GREEN}Location: $LOCAL_BACKUP_DIR/${BACKUP_NAME}.tar.gz${NC}"
echo -e "${GREEN}Size: $BACKUP_SIZE${NC}"
echo -e "${GREEN}Created: $(date)${NC}"
echo ""
if [ "$COLLECTION_COUNT" = "0" ]; then
    echo -e "${YELLOW}ℹ️  This backup contains an empty database structure.${NC}"
    echo -e "${YELLOW}   When restored, it will create a clean database ready for new data.${NC}"
    echo ""
fi
echo -e "${YELLOW}To restore this backup, run:${NC}"
echo -e "${YELLOW}./scripts/manual-restore.sh ${BACKUP_NAME}${NC}"
