#!/bin/bash

# Manual Restore Script for Cubicle Management System
# Restores a backup with timestamp naming: backup-YYYYMMDD-HHMMSS

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
LOCAL_BACKUP_DIR="./backups"

# Check if backup name is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Please provide a backup name${NC}"
    echo -e "${YELLOW}Usage: $0 <backup-name>${NC}"
    echo -e "${YELLOW}Example: $0 backup-20250618-143022${NC}"
    echo ""
    echo -e "${BLUE}Available backups:${NC}"
    if [ -d "$LOCAL_BACKUP_DIR" ]; then
        ls -la $LOCAL_BACKUP_DIR/*.tar.gz 2>/dev/null || echo "No backups found"
    else
        echo "No backup directory found"
    fi
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_FILE="$LOCAL_BACKUP_DIR/${BACKUP_NAME}.tar.gz"

echo -e "${BLUE}=== Cubicle Management Manual Restore ===${NC}"
echo -e "${YELLOW}Backup Name: ${BACKUP_NAME}${NC}"
echo -e "${YELLOW}Restore Time: $(date)${NC}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed or not in PATH${NC}"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    echo -e "${YELLOW}Available backups:${NC}"
    ls -la $LOCAL_BACKUP_DIR/*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

echo -e "${GREEN}Found backup file: $BACKUP_FILE${NC}"

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
    exit 1
fi

echo -e "${GREEN}Found MongoDB pod: $MONGODB_POD${NC}"

# Confirmation prompt
echo -e "${YELLOW}⚠️  WARNING: This will replace the current database content!${NC}"
echo -e "${YELLOW}Database: $DATABASE_NAME${NC}"
echo -e "${YELLOW}Backup: $BACKUP_NAME${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

# Create backup directory in pod
echo -e "${BLUE}Creating restore directory in pod...${NC}"
kubectl exec -n $NAMESPACE $MONGODB_POD -- mkdir -p $BACKUP_DIR

# Copy backup to pod
echo -e "${BLUE}Copying backup to pod...${NC}"
kubectl cp $BACKUP_FILE $NAMESPACE/$MONGODB_POD:$BACKUP_DIR/${BACKUP_NAME}.tar.gz

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to copy backup to pod${NC}"
    exit 1
fi

# Extract backup in pod
echo -e "${BLUE}Extracting backup in pod...${NC}"
kubectl exec -n $NAMESPACE $MONGODB_POD -- tar -xzf $BACKUP_DIR/${BACKUP_NAME}.tar.gz -C $BACKUP_DIR

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to extract backup${NC}"
    exit 1
fi

# Drop existing database (with confirmation)
echo -e "${YELLOW}Dropping existing database: $DATABASE_NAME${NC}"
kubectl exec -n $NAMESPACE $MONGODB_POD -- mongosh \
    --username admin \
    --password "$(kubectl get secret mongodb-secrets -n $NAMESPACE -o jsonpath='{.data.mongodb-root-password}' | base64 -d)" \
    --authenticationDatabase admin \
    --eval "db.getSiblingDB('$DATABASE_NAME').dropDatabase()" --quiet

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to drop existing database${NC}"
    exit 1
fi

# Check if this is an empty database backup
EMPTY_MARKER_EXISTS=$(kubectl exec -n $NAMESPACE $MONGODB_POD -- test -f $BACKUP_DIR/$BACKUP_NAME/EMPTY_DATABASE_MARKER && echo "true" || echo "false")

if [ "$EMPTY_MARKER_EXISTS" = "true" ]; then
    echo -e "${YELLOW}ℹ️  Detected empty database backup${NC}"
fi

# Restore the backup
echo -e "${BLUE}Restoring database from backup...${NC}"
kubectl exec -n $NAMESPACE $MONGODB_POD -- mongorestore \
    --username admin \
    --password "$(kubectl get secret mongodb-secrets -n $NAMESPACE -o jsonpath='{.data.mongodb-root-password}' | base64 -d)" \
    --authenticationDatabase admin \
    --db $DATABASE_NAME \
    $BACKUP_DIR/$BACKUP_NAME/$DATABASE_NAME \
    --quiet

if [ $? -eq 0 ]; then
    if [ "$EMPTY_MARKER_EXISTS" = "true" ]; then
        echo -e "${GREEN}✓ Empty database structure restored successfully${NC}"
    else
        echo -e "${GREEN}✓ Database restored successfully${NC}"
    fi
else
    echo -e "${RED}✗ Database restore failed${NC}"
    exit 1
fi

# Verify restore
echo -e "${BLUE}Verifying restore...${NC}"
COLLECTION_COUNT=$(kubectl exec -n $NAMESPACE $MONGODB_POD -- mongosh \
    --username admin \
    --password "$(kubectl get secret mongodb-secrets -n $NAMESPACE -o jsonpath='{.data.mongodb-root-password}' | base64 -d)" \
    --authenticationDatabase admin \
    --eval "db.getSiblingDB('$DATABASE_NAME').stats().collections" --quiet 2>/dev/null || echo "unknown")

# Cleanup pod files
echo -e "${BLUE}Cleaning up temporary files in pod...${NC}"
kubectl exec -n $NAMESPACE $MONGODB_POD -- rm -rf $BACKUP_DIR/$BACKUP_NAME
kubectl exec -n $NAMESPACE $MONGODB_POD -- rm -f $BACKUP_DIR/${BACKUP_NAME}.tar.gz

echo ""
echo -e "${GREEN}=== Restore Completed Successfully ===${NC}"
echo -e "${GREEN}Backup Name: ${BACKUP_NAME}${NC}"
echo -e "${GREEN}Database: $DATABASE_NAME${NC}"
echo -e "${GREEN}Collections: $COLLECTION_COUNT${NC}"
if [ "$EMPTY_MARKER_EXISTS" = "true" ]; then
    echo -e "${GREEN}Type: Empty Database Structure${NC}"
    echo -e "${YELLOW}ℹ️  An empty database was restored. The system is ready for new data.${NC}"
else
    echo -e "${GREEN}Type: Full Database Restore${NC}"
fi
echo -e "${GREEN}Restored: $(date)${NC}"
echo ""
echo -e "${YELLOW}Note: You may need to restart the application pods to clear any cached data${NC}"
echo -e "${YELLOW}To restart API pods: kubectl rollout restart deployment/cubicle-api -n $NAMESPACE${NC}"
