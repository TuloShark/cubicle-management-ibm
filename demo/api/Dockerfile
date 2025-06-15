# ================================================================================
# Cubicle Management System - API Server Docker Configuration
# ================================================================================
#
# @fileoverview Production-ready Docker container configuration for the Cubicle
# Management System API server. Provides optimized Node.js runtime environment
# with security hardening, health monitoring, and enterprise deployment features.
#
# @version 2.0.0
# @author Cubicle Management System - IBM Space Optimization
# @since 1.0.0
#
# Container Specifications:
# - Base Image: node:18-alpine (Minimal, security-focused)
# - Runtime: Node.js 18.x LTS with npm
# - Architecture: Multi-architecture support (amd64, arm64)
# - Security: Non-root user execution, minimal attack surface
# - Monitoring: Health check endpoint and curl utilities
#
# Build Command:
#   docker build -t cubicle-api:latest .
#
# Run Command:
#   docker run -d -p 3000:3000 --env-file .env cubicle-api:latest
#
# Environment Variables Required:
# - PORT: API server port (default: 3000)
# - MONGO_URI: MongoDB connection string
# - FIREBASE_PROJECT_ID: Firebase project identifier
# - ADMIN_UIDS: Comma-separated admin user IDs
# - NODE_ENV: Environment mode (production/development)
#
# Volume Mounts (Optional):
# - /app/logs: Application log persistence
# - /app/config: External configuration files
#
# Health Check:
#   curl -f http://localhost:3000/health || exit 1
#
# Security Features:
# - Alpine Linux base (minimal attack surface)
# - Non-root user execution
# - Production dependencies only
# - Security updates via package manager
#
# Performance Optimizations:
# - Multi-stage build pattern ready
# - Layer caching optimization
# - Minimal runtime footprint
# - Efficient dependency installation
#
# ================================================================================

# Use official Node.js 18 Alpine image for minimal footprint and security
# Alpine Linux provides a security-focused, lightweight base with package management
FROM node:18-alpine

# Set metadata labels for container identification and management
LABEL maintainer="IBM Space Optimization Team" \
      version="2.0.0" \
      description="Cubicle Management System API Server" \
      org.opencontainers.image.title="Cubicle Management API" \
      org.opencontainers.image.description="Enterprise cubicle reservation and management API" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.vendor="IBM" \
      org.opencontainers.image.source="https://github.com/ibm/cubicle-management"

# Set working directory for application files
# Using /app as standard convention for Node.js containers
WORKDIR /app

# Create non-root user for security best practices
# Prevents potential privilege escalation attacks
RUN addgroup -g 1001 -S nodejs && \
    adduser -S apiuser -u 1001 -G nodejs

# Copy package files first for optimal Docker layer caching
# This allows dependency installation to be cached if package.json unchanged
COPY package*.json ./

# Install production dependencies only for minimal container size
# Using npm ci for consistent, reproducible builds in production
# --only=production excludes devDependencies to reduce attack surface
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Install system utilities for health checks and monitoring
# curl: Required for health check endpoints and external API calls
# ca-certificates: Ensures proper SSL/TLS certificate validation
RUN apk add --no-cache curl ca-certificates && \
    apk upgrade --no-cache

# Copy application source code
# Done after dependency installation for optimal layer caching
COPY --chown=apiuser:nodejs . .

# Create logs directory with proper permissions for logging
# Using /tmp/logs to ensure write permissions in container environment
RUN mkdir -p /tmp/logs && \
    chown apiuser:nodejs /tmp/logs && \
    chmod 755 /tmp/logs

# Set Docker environment flag for logger configuration
ENV DOCKER_ENV=true

# Switch to non-root user for security
# All subsequent operations and runtime execution use limited privileges
USER apiuser

# Expose the application port
# Default port 3000, configurable via PORT environment variable
EXPOSE 3000

# Configure health check for container orchestration
# Enables Docker/Kubernetes to monitor application health status
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the application server
# Using explicit node command for better signal handling in containers
CMD ["node", "index.js"]
