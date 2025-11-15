#!/bin/bash

###############################################################################
# Simri Database Import Script
# This script automates the complete database import process
###############################################################################

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="simri-postgres"
REDIS_CONTAINER_NAME="simri-redis"
DB_NAME="simri"
DB_USER="simri_user"
BACKUP_FILE="${1:-/home/ubuntu/simri/client/simri_database_backup.sql}"
TMP_FILE="/tmp/simri_database_backup.sql"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

###############################################################################
# Validation Functions
###############################################################################

validate_docker() {
    print_info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    print_success "Docker is installed"
}

validate_container() {
    print_info "Checking PostgreSQL container..."
    if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_error "PostgreSQL container '${CONTAINER_NAME}' is not running"
        print_info "Available containers:"
        docker ps --format "  - {{.Names}} ({{.Status}})"
        exit 1
    fi
    print_success "Container '${CONTAINER_NAME}' is running"
}

validate_redis() {
    print_info "Checking Redis container..."
    if ! docker ps --format '{{.Names}}' | grep -q "^${REDIS_CONTAINER_NAME}$"; then
        print_warning "Redis container '${REDIS_CONTAINER_NAME}' is not running"
        print_warning "Session cache clearing will be skipped"
        return 1
    fi
    print_success "Container '${REDIS_CONTAINER_NAME}' is running"
    return 0
}

validate_backup_file() {
    print_info "Checking backup file..."
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        print_info "Usage: $0 [path/to/backup.sql]"
        exit 1
    fi

    local file_size=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Backup file found: $BACKUP_FILE ($file_size)"
}

###############################################################################
# Database Operations
###############################################################################

backup_current_database() {
    print_info "Creating safety backup of current database..."
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local safety_backup="/home/ubuntu/simri/db_backup_before_import_${timestamp}.sql"

    if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt" &> /dev/null; then
        docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$safety_backup" 2>/dev/null || true
        if [ -f "$safety_backup" ]; then
            print_success "Safety backup created: $safety_backup"
        else
            print_warning "Could not create safety backup (database might be empty)"
        fi
    else
        print_warning "Database is empty or inaccessible, skipping safety backup"
    fi
}

clean_database() {
    print_info "Cleaning database (dropping all tables and recreating schema)..."

    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO $DB_USER;
        GRANT ALL ON SCHEMA public TO public;
    " &> /dev/null

    print_success "Database cleaned successfully"
}

import_backup() {
    print_info "Copying backup file to container..."
    docker cp "$BACKUP_FILE" "${CONTAINER_NAME}:${TMP_FILE}"
    print_success "Backup file copied to container"

    print_info "Importing database (this may take a moment)..."

    # Capture import output for logging
    local import_output=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f "$TMP_FILE" 2>&1)
    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        print_success "Database import completed successfully"

        # Count successful operations
        local table_count=$(echo "$import_output" | grep -c "CREATE TABLE" || echo "0")
        local copy_count=$(echo "$import_output" | grep "^COPY" | wc -l || echo "0")
        local index_count=$(echo "$import_output" | grep -c "CREATE INDEX" || echo "0")

        print_info "Created $table_count tables, imported $copy_count data sets, created $index_count indexes"
    else
        print_error "Database import failed"
        echo "$import_output" | tail -20
        exit 1
    fi
}

cleanup_temp_files() {
    print_info "Cleaning up temporary files..."
    docker exec "$CONTAINER_NAME" rm -f "$TMP_FILE" 2>/dev/null || true
    print_success "Cleanup completed"
}

run_migrations() {
    print_info "Running database migrations..."

    # Copy migration files to container
    local migrations_dir="/home/ubuntu/simri/server/database/migrations"
    if [ -d "$migrations_dir" ]; then
        print_info "Found migrations directory, copying to container..."
        docker cp "$migrations_dir" "${CONTAINER_NAME}:/tmp/migrations"
        print_success "Migration files copied to container"

        # Run each migration file
        for migration_file in "$migrations_dir"/*.sql; do
            if [ -f "$migration_file" ]; then
                local filename=$(basename "$migration_file")
                print_info "Running migration: $filename"
                docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -f "/tmp/migrations/$filename"
                print_success "Migration $filename completed"
            fi
        done

        # Clean up migration files from container
        docker exec "$CONTAINER_NAME" rm -rf "/tmp/migrations" 2>/dev/null || true
        print_success "Migration cleanup completed"
    else
        print_warning "No migrations directory found, skipping migrations"
    fi
}

clear_redis_cache() {
    print_info "Clearing Redis cache and sessions..."

    if validate_redis; then
        docker exec "$REDIS_CONTAINER_NAME" redis-cli FLUSHALL &>/dev/null
        print_success "Redis cache cleared successfully"
        print_info "All old sessions have been removed to prevent errors"
    else
        print_warning "Skipping Redis cache clearing"
    fi
}

###############################################################################
# Verification Functions
###############################################################################

verify_import() {
    print_info "Verifying imported data..."

    # Get table count
    local table_count=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    " 2>/dev/null | tr -d ' ')

    if [ "$table_count" -gt 0 ]; then
        print_success "Found $table_count tables"
    else
        print_error "No tables found after import"
        exit 1
    fi

    # Get row counts for main tables
    print_info "Data summary:"
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            'users' as table_name,
            COUNT(*)::text as records
        FROM users
        UNION ALL
        SELECT 'products', COUNT(*)::text FROM products
        UNION ALL
        SELECT 'categories', COUNT(*)::text FROM categories
        UNION ALL
        SELECT 'orders', COUNT(*)::text FROM orders
        UNION ALL
        SELECT 'addresses', COUNT(*)::text FROM addresses
        UNION ALL
        SELECT 'reviews', COUNT(*)::text FROM reviews
        UNION ALL
        SELECT 'wishlists', COUNT(*)::text FROM wishlists
        ORDER BY table_name;
    " 2>/dev/null | sed 's/^/  /'

    print_success "Import verification completed"
}

restart_server() {
    print_info "Checking if simri-server needs restart..."

    if pm2 list 2>/dev/null | grep -q "simri-server"; then
        print_info "Restarting simri-server to apply changes..."
        pm2 restart simri-server &>/dev/null
        print_success "Server restarted successfully"
    else
        print_warning "simri-server not found in PM2, skipping restart"
    fi
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header "SIMRI DATABASE IMPORT SCRIPT"

    echo -e "${YELLOW}This script will:${NC}"
    echo "  1. Validate environment and backup file"
    echo "  2. Create a safety backup of current database"
    echo "  3. Drop all existing tables and data"
    echo "  4. Import data from backup file"
    echo "  5. Clear Redis cache and sessions"
    echo "  6. Verify the import"
    echo "  7. Restart the application server"
    echo ""
    echo -e "${RED}WARNING: This will DELETE all current data and sessions!${NC}"
    echo ""
    read -p "Do you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        print_warning "Import cancelled by user"
        exit 0
    fi

    # Step 1: Validation
    print_header "STEP 1: VALIDATION"
    validate_docker
    validate_container
    validate_backup_file

    # Step 2: Safety Backup
    print_header "STEP 2: SAFETY BACKUP"
    backup_current_database

    # Step 3: Clean Database
    print_header "STEP 3: CLEAN DATABASE"
    clean_database

    # Step 4: Import
    print_header "STEP 4: IMPORT DATA"
    import_backup

    # Step 5: Run Migrations
    print_header "STEP 5: RUN MIGRATIONS"
    run_migrations

    # Step 6: Cleanup
    print_header "STEP 6: CLEANUP"
    cleanup_temp_files

    # Step 7: Clear Redis Cache
    print_header "STEP 7: CLEAR CACHE & SESSIONS"
    clear_redis_cache

    # Step 8: Verify
    print_header "STEP 8: VERIFICATION"
    verify_import

    # Step 9: Restart Server
    print_header "STEP 9: RESTART SERVER"
    restart_server

    # Final Summary
    print_header "IMPORT COMPLETED SUCCESSFULLY"
    print_success "Database has been imported and verified"
    print_success "Redis cache and sessions have been cleared"
    print_info "Backup file: $BACKUP_FILE"
    print_info "You can now use your application with the imported data"
    print_warning "Note: All users will need to log in again due to session clearing"
    echo ""
}

# Run main function
main "$@"
