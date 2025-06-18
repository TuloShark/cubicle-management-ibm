#!/bin/bash

# ================================================================================
# Database Review Script - IBM Cubicle Management System
# ================================================================================
# This script provides a comprehensive review of the MongoDB database state
# including collection counts, sample data, duplicates, and data integrity checks.
# 
# Usage: ./database-review.sh
# Requirements: kubectl access to cubicle-management namespace
# ================================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="cubicle-management"
MONGODB_POD="mongodb-0"
DB_NAME="space_optimization"
USERNAME="admin"
PASSWORD="rootpass123"
AUTH_DB="admin"

echo -e "${BLUE}================================================================================${NC}"
echo -e "${BLUE}          IBM CUBICLE MANAGEMENT SYSTEM - DATABASE REVIEW${NC}"
echo -e "${BLUE}================================================================================${NC}"
echo ""

# Function to execute MongoDB command
exec_mongo() {
    local cmd="$1"
    kubectl exec -it ${MONGODB_POD} -n ${NAMESPACE} -- mongosh \
        --username ${USERNAME} \
        --password ${PASSWORD} \
        --authenticationDatabase ${AUTH_DB} \
        ${DB_NAME} \
        --eval "$cmd" \
        --quiet
}

# Function to print section header
print_section() {
    echo -e "${CYAN}----------------------------------------${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}----------------------------------------${NC}"
}

# Check if MongoDB pod is running
echo -e "${YELLOW}Checking MongoDB pod status...${NC}"
kubectl get pod ${MONGODB_POD} -n ${NAMESPACE} --no-headers | awk '{print "Pod: " $1 " | Status: " $3 " | Age: " $5}'
echo ""

# 1. DATABASE OVERVIEW
print_section "DATABASE OVERVIEW"
echo -e "${GREEN}Database Name:${NC} ${DB_NAME}"
echo -e "${GREEN}Collections:${NC}"
exec_mongo "db.runCommand('listCollections').cursor.firstBatch.forEach(function(collection) { print('  - ' + collection.name) })"
echo ""

# 2. COLLECTION STATISTICS
print_section "COLLECTION STATISTICS"
echo -e "${GREEN}Collection Document Counts:${NC}"
exec_mongo "
db.runCommand('listCollections').cursor.firstBatch.forEach(function(collection) {
    var count = db[collection.name].countDocuments();
    print('  ' + collection.name + ': ' + count + ' documents');
});
"
echo ""

# 3. CUBICLES ANALYSIS
print_section "CUBICLES ANALYSIS"
echo -e "${GREEN}Total Cubicles:${NC}"
exec_mongo "print('  Count: ' + db.cubicles.countDocuments())"

echo -e "${GREEN}Cubicle Distribution by Section:${NC}"
exec_mongo "
db.cubicles.aggregate([
    {\$group: {_id: '\$section', count: {\$sum: 1}}},
    {\$sort: {_id: 1}}
]).forEach(function(doc) {
    print('  Section ' + doc._id + ': ' + doc.count + ' cubicles');
});
"

echo -e "${GREEN}Sample Cubicles (first 3):${NC}"
exec_mongo "
db.cubicles.find().limit(3).forEach(function(doc) {
    var section = doc.section || '❌ MISSING';
    var status = doc.status || '❌ MISSING';
    var name = doc.name || '❌ MISSING';
    var serial = doc.serial || '❌ MISSING';
    print('  ID: ' + doc._id + ' | Name: ' + name + ' | Section: ' + section + ' | Status: ' + status + ' | Serial: ' + serial);
});
"

echo -e "${GREEN}Cubicle Document Structure (first document):${NC}"
exec_mongo "
var sample = db.cubicles.findOne();
if (sample) {
    print('  Fields present: ' + Object.keys(sample).join(', '));
    print('  Sample document: ' + JSON.stringify(sample, null, 2));
} else {
    print('  No cubicles found');
}
"

echo -e "${GREEN}Checking for Duplicate Cubicles by Name:${NC}"
exec_mongo "
var duplicates = db.cubicles.aggregate([
    {\$group: {_id: '\$name', count: {\$sum: 1}, docs: {\$push: '\$_id'}}},
    {\$match: {count: {\$gt: 1}}}
]).toArray();
if (duplicates.length > 0) {
    duplicates.forEach(function(dup) {
        print('  DUPLICATE: ' + dup._id + ' appears ' + dup.count + ' times');
    });
} else {
    print('  ✓ No duplicate cubicles found');
}
"
echo ""

# 4. RESERVATIONS ANALYSIS
print_section "RESERVATIONS ANALYSIS"
echo -e "${GREEN}Total Reservations:${NC}"
exec_mongo "print('  Count: ' + db.reservations.countDocuments())"

echo -e "${GREEN}Reservations by Status:${NC}"
exec_mongo "
if (db.reservations.countDocuments() > 0) {
    db.reservations.aggregate([
        {\$group: {_id: '\$status', count: {\$sum: 1}}},
        {\$sort: {_id: 1}}
    ]).forEach(function(doc) {
        print('  ' + (doc._id || 'undefined') + ': ' + doc.count + ' reservations');
    });
} else {
    print('  No reservations found');
}
"

echo -e "${GREEN}Recent Reservations (last 5):${NC}"
exec_mongo "
if (db.reservations.countDocuments() > 0) {
    db.reservations.find().sort({createdAt: -1}).limit(5).forEach(function(doc) {
        var date = doc.date ? doc.date.toISOString().split('T')[0] : '❌ MISSING';
        var userEmail = (doc.user && doc.user.email) ? doc.user.email : '❌ MISSING';
        var userId = (doc.user && doc.user.uid) ? doc.user.uid : '❌ MISSING';
        var cubicleId = doc.cubicle || '❌ MISSING';
        var status = doc.status || '❌ MISSING';
        print('  Date: ' + date + ' | User: ' + userEmail + ' | UserID: ' + userId + ' | CubicleID: ' + cubicleId + ' | Status: ' + status);
    });
} else {
    print('  No reservations to display');
}
"

echo -e "${GREEN}Reservation Document Structure (first document):${NC}"
exec_mongo "
if (db.reservations.countDocuments() > 0) {
    var sample = db.reservations.findOne();
    print('  Fields present: ' + Object.keys(sample).join(', '));
    print('  Sample document: ' + JSON.stringify(sample, null, 2));
} else {
    print('  No reservations found');
}
"

echo -e "${GREEN}Reservations by Date Range (last 30 days):${NC}"
exec_mongo "
var thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
var count = db.reservations.countDocuments({date: {\$gte: thirtyDaysAgo}});
print('  Reservations in last 30 days: ' + count);
"
echo ""

# 5. NOTIFICATION SETTINGS
print_section "NOTIFICATION SETTINGS"
echo -e "${GREEN}Notification Settings:${NC}"
exec_mongo "
if (db.notificationsettings && db.notificationsettings.countDocuments() > 0) {
    print('  Count: ' + db.notificationsettings.countDocuments());
    db.notificationsettings.find().limit(3).forEach(function(doc) {
        print('  User: ' + (doc.userId || 'N/A') + ' | Email: ' + (doc.emailEnabled || false) + ' | Slack: ' + (doc.slackEnabled || false));
    });
} else {
    print('  No notification settings found');
}
"
echo ""

# 6. UTILIZATION REPORTS
print_section "UTILIZATION REPORTS"
echo -e "${GREEN}Utilization Reports:${NC}"
exec_mongo "
if (db.utilizationreports && db.utilizationreports.countDocuments() > 0) {
    print('  Count: ' + db.utilizationreports.countDocuments());
    db.utilizationreports.find().sort({date: -1}).limit(3).forEach(function(doc) {
        var date = doc.date ? doc.date.toISOString().split('T')[0] : 'N/A';
        print('  Date: ' + date + ' | Total Reservations: ' + (doc.totalReservations || 0) + ' | Utilization: ' + (doc.utilizationPercentage || 0) + '%');
    });
} else {
    print('  No utilization reports found');
}
"
echo ""

# 7. DATA INTEGRITY CHECKS
print_section "DATA INTEGRITY CHECKS"

echo -e "${GREEN}Checking for Missing Required Fields:${NC}"
exec_mongo "
// Check cubicles for missing required fields
var cubilesWithoutSection = db.cubicles.countDocuments({
    \$or: [
        {section: null},
        {section: {\$exists: false}}
    ]
});
var cubilesWithoutStatus = db.cubicles.countDocuments({
    \$or: [
        {status: null},
        {status: {\$exists: false}}
    ]
});
print('  Cubicles missing section: ' + cubilesWithoutSection + ' / ' + db.cubicles.countDocuments());
print('  Cubicles missing status: ' + cubilesWithoutStatus + ' / ' + db.cubicles.countDocuments());

// Check reservations for missing required fields
if (db.reservations.countDocuments() > 0) {
    var reservationsWithoutUser = db.reservations.countDocuments({
        \$or: [
            {user: null},
            {user: {\$exists: false}},
            {'user.uid': null},
            {'user.uid': {\$exists: false}}
        ]
    });
    var reservationsWithoutCubicle = db.reservations.countDocuments({
        \$or: [
            {cubicle: null},
            {cubicle: {\$exists: false}}
        ]
    });
    print('  Reservations missing user data: ' + reservationsWithoutUser + ' / ' + db.reservations.countDocuments());
    print('  Reservations missing cubicle reference: ' + reservationsWithoutCubicle + ' / ' + db.reservations.countDocuments());
}
"

echo -e "${GREEN}Checking for Orphaned Reservations:${NC}"
exec_mongo "
if (db.reservations.countDocuments() > 0) {
    var orphanedCount = 0;
    db.reservations.find().forEach(function(reservation) {
        // Check if the referenced cubicle exists
        var cubicleExists = db.cubicles.findOne({_id: ObjectId(reservation.cubicle)});
        if (!cubicleExists) {
            orphanedCount++;
        }
    });
    if (orphanedCount > 0) {
        print('  ⚠️  Found ' + orphanedCount + ' reservations with invalid cubicle references');
    } else {
        print('  ✓ All reservations have valid cubicle references');
    }
} else {
    print('  ✓ No reservations to check');
}
"

echo -e "${GREEN}Checking for Invalid Dates:${NC}"
exec_mongo "
if (db.reservations.countDocuments() > 0) {
    var invalidDates = db.reservations.countDocuments({date: {\$exists: false}});
    var futureDates = db.reservations.countDocuments({date: {\$gt: new Date(Date.now() + 365*24*60*60*1000)}});
    if (invalidDates > 0) {
        print('  ⚠️  Found ' + invalidDates + ' reservations with missing dates');
    }
    if (futureDates > 0) {
        print('  ⚠️  Found ' + futureDates + ' reservations more than 1 year in the future');
    }
    if (invalidDates === 0 && futureDates === 0) {
        print('  ✓ All reservation dates are valid');
    }
} else {
    print('  ✓ No reservations to check');
}
"
echo ""

# 8. STORAGE STATISTICS
print_section "STORAGE STATISTICS"
echo -e "${GREEN}Database Storage Info:${NC}"
exec_mongo "
var stats = db.stats();
print('  Database Size: ' + Math.round(stats.dataSize / 1024 / 1024 * 100) / 100 + ' MB');
print('  Storage Size: ' + Math.round(stats.storageSize / 1024 / 1024 * 100) / 100 + ' MB');
print('  Index Size: ' + Math.round(stats.indexSize / 1024 / 1024 * 100) / 100 + ' MB');
print('  Collections: ' + stats.collections);
print('  Indexes: ' + stats.indexes);
"
echo ""

# 9. INDEX ANALYSIS
print_section "INDEX ANALYSIS"
echo -e "${GREEN}Indexes per Collection:${NC}"
exec_mongo "
db.runCommand('listCollections').cursor.firstBatch.forEach(function(collection) {
    var indexes = db[collection.name].getIndexes();
    print('  ' + collection.name + ': ' + indexes.length + ' indexes');
    indexes.forEach(function(index) {
        var keys = Object.keys(index.key).join(', ');
        print('    - ' + index.name + ' (' + keys + ')');
    });
});
"
echo ""

print_section "REVIEW COMPLETE"
echo -e "${GREEN}Database review completed successfully!${NC}"
echo -e "${YELLOW}For detailed analysis of specific issues, run individual MongoDB queries.${NC}"
echo ""
echo -e "${BLUE}================================================================================${NC}"
