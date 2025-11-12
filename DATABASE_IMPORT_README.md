# Database Import Script - Usage Guide

## Quick Start

### Option 1: Use Default Backup Location
```bash
cd /home/ubuntu/simri
./import-database.sh
```

### Option 2: Specify Custom Backup File
```bash
cd /home/ubuntu/simri
./import-database.sh /path/to/your/backup.sql
```

## What the Script Does

The script automates the complete database import process with the following steps:

### 1. **Validation Phase**
- ✅ Checks if Docker is installed
- ✅ Verifies PostgreSQL container is running
- ✅ Checks if Redis container is available
- ✅ Confirms backup file exists and shows its size

### 2. **Safety Backup**
- 📦 Creates a timestamped backup of your current database
- 📍 Location: `/home/ubuntu/simri/db_backup_before_import_YYYYMMDD_HHMMSS.sql`
- 🔒 Ensures you can restore if something goes wrong

### 3. **Clean Database**
- 🧹 Drops all existing tables, indexes, and constraints
- 🆕 Recreates clean schema
- ⚡ Ensures no conflicts during import

### 4. **Import Data**
- 📥 Copies backup file to Docker container
- 💾 Imports all tables, data, indexes, and triggers
- 📊 Shows progress statistics (tables, data sets, indexes created)

### 5. **Cleanup**
- 🗑️ Removes temporary files from container
- 💨 Keeps your system clean

### 6. **Clear Cache & Sessions** 🆕
- 🔄 Clears all Redis cache and session data
- 🛡️ **Prevents "Failed to deserialize user" errors**
- ⚠️ Users will need to log in again after import
- 💡 **Fixes React errors caused by stale sessions**
- 🐛 Resolves "Objects are not valid as a React child" errors

### 7. **Verification**
- ✅ Counts imported tables
- 📈 Shows data summary for main tables (users, products, orders, etc.)
- 🔍 Confirms successful import

### 8. **Server Restart**
- 🔄 Automatically restarts simri-server if running in PM2
- 🚀 Ensures application picks up new data with clean sessions

## Features

### 🎨 Color-Coded Output
- 🔵 Blue: Information messages
- 🟢 Green: Success messages
- 🟡 Yellow: Warnings
- 🔴 Red: Errors

### 🛡️ Safety Features
- **Confirmation Prompt**: Asks for explicit "yes" before proceeding
- **Safety Backup**: Automatically backs up current database
- **Error Handling**: Stops on any error (set -e)
- **Validation**: Checks all requirements before starting
- **Session Cleanup**: Prevents authentication errors after import
- **Graceful Error Handling**: Server handles missing users without crashing

### 📊 Progress Tracking
- Real-time status updates for each step
- Detailed statistics on imported data
- Clear success/failure indicators

## Configuration

The script uses these default settings:

```bash
CONTAINER_NAME="simri-postgres"
DB_NAME="simri"
DB_USER="simri_user"
BACKUP_FILE="/home/ubuntu/simri/client/simri_database_backup.sql"
```

To modify these, edit the script at `/home/ubuntu/simri/import-database.sh`.

## Example Output

```
========================================
SIMRI DATABASE IMPORT SCRIPT
========================================

This script will:
  1. Validate environment and backup file
  2. Create a safety backup of current database
  3. Drop all existing tables and data
  4. Import data from backup file
  5. Clear Redis cache and sessions
  6. Verify the import
  7. Restart the application server

WARNING: This will DELETE all current data and sessions!

Do you want to continue? (yes/no): yes

========================================
STEP 1: VALIDATION
========================================

ℹ Checking Docker installation...
✓ Docker is installed
ℹ Checking PostgreSQL container...
✓ Container 'simri-postgres' is running
ℹ Checking backup file...
✓ Backup file found: /home/ubuntu/simri/client/simri_database_backup.sql (89K)

========================================
STEP 2: SAFETY BACKUP
========================================

ℹ Creating safety backup of current database...
✓ Safety backup created: /home/ubuntu/simri/db_backup_before_import_20251112_181430.sql

========================================
STEP 3: CLEAN DATABASE
========================================

ℹ Cleaning database (dropping all tables and recreating schema)...
✓ Database cleaned successfully

========================================
STEP 4: IMPORT DATA
========================================

ℹ Copying backup file to container...
✓ Backup file copied to container
ℹ Importing database (this may take a moment)...
✓ Database import completed successfully
ℹ Created 20 tables, imported 72 data sets, created 40 indexes

========================================
STEP 5: CLEANUP
========================================

ℹ Cleaning up temporary files...
✓ Cleanup completed

========================================
STEP 6: CLEAR CACHE & SESSIONS
========================================

ℹ Clearing Redis cache and sessions...
ℹ Checking Redis container...
✓ Container 'simri-redis' is running
✓ Redis cache cleared successfully
ℹ All old sessions have been removed to prevent errors

========================================
STEP 7: VERIFICATION
========================================

ℹ Verifying imported data...
✓ Found 20 tables
ℹ Data summary:
   table_name | records
  ------------+---------
   addresses  | 2
   categories | 5
   orders     | 13
   products   | 5
   reviews    | 0
   users      | 3
   wishlists  | 2

✓ Import verification completed

========================================
STEP 8: RESTART SERVER
========================================

ℹ Checking if simri-server needs restart...
ℹ Restarting simri-server to apply changes...
✓ Server restarted successfully

========================================
IMPORT COMPLETED SUCCESSFULLY
========================================

✓ Database has been imported and verified
✓ Redis cache and sessions have been cleared
ℹ Backup file: /home/ubuntu/simri/client/simri_database_backup.sql
ℹ You can now use your application with the imported data
⚠ Note: All users will need to log in again due to session clearing
```

## Troubleshooting

### Error: "PostgreSQL container is not running"
**Solution:** Start the container first:
```bash
cd /home/ubuntu/simri/server
docker-compose up -d
```

### Error: "Backup file not found"
**Solution:** Verify the file path:
```bash
ls -lh /home/ubuntu/simri/client/simri_database_backup.sql
```
Or specify the correct path:
```bash
./import-database.sh /correct/path/to/backup.sql
```

### Error: "Docker is not installed"
**Solution:** Install Docker:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Error: "Objects are not valid as a React child"
**This error occurs when:**
- Old sessions reference users that no longer exist after database import
- The server returns error objects that React can't render

**Solution:** The script now automatically fixes this by:
1. Clearing Redis cache/sessions (Step 6)
2. The passport fix already prevents session errors

**Manual fix if needed:**
```bash
# Clear Redis cache manually
docker exec simri-redis redis-cli FLUSHALL

# Restart server
pm2 restart simri-server

# Clear browser cookies for your domain
```

### Want to Cancel?
- Type anything other than "yes" at the confirmation prompt
- Or press Ctrl+C at any time before typing "yes"

## Safety Restore

If you need to restore the backup created before import:

```bash
# Find your safety backup
ls -lh /home/ubuntu/simri/db_backup_before_import_*.sql

# Restore it using the same script
./import-database.sh /home/ubuntu/simri/db_backup_before_import_YYYYMMDD_HHMMSS.sql
```

## Advanced Usage

### Silent Mode (No Confirmation)
If you want to run without confirmation prompt (for automation):

```bash
# Edit the script and remove or comment out the confirmation section
# Or pipe 'yes' to it
echo "yes" | ./import-database.sh
```

### Check Without Importing
To see what would happen without actually importing:

```bash
# Run validation steps manually
docker ps --filter "name=simri-postgres"
ls -lh /home/ubuntu/simri/client/simri_database_backup.sql
```

## Requirements

- ✅ Docker installed and running
- ✅ PostgreSQL container named `simri-postgres` running
- ✅ Valid SQL backup file
- ✅ PM2 (optional, for auto-restart feature)
- ✅ Bash shell

## File Locations

| Item | Location |
|------|----------|
| Import Script | `/home/ubuntu/simri/import-database.sh` |
| Default Backup | `/home/ubuntu/simri/client/simri_database_backup.sql` |
| Safety Backups | `/home/ubuntu/simri/db_backup_before_import_*.sql` |
| Server Code | `/home/ubuntu/simri/server/` |

## Support

For issues or questions:
1. Check the colored error messages for specific problems
2. Review the troubleshooting section above
3. Check Docker container logs: `docker logs simri-postgres`
4. Check application logs: `pm2 logs simri-server`

---

**Last Updated:** 2025-11-12
**Version:** 2.0.0

## Changelog

### Version 2.0.0 (2025-11-12)
- ✨ **NEW:** Automatic Redis cache and session clearing
- 🐛 **FIX:** Prevents "Failed to deserialize user" errors
- 🐛 **FIX:** Resolves "Objects are not valid as a React child" errors
- 🛡️ **IMPROVED:** Passport configuration handles missing users gracefully
- 📚 **UPDATED:** Documentation with troubleshooting for session errors
- 🔄 Added Step 6: Clear Cache & Sessions

### Version 1.0.0 (2025-11-12)
- Initial release with database import automation
