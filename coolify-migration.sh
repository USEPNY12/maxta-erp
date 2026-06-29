#!/bin/bash
# Max TA Group ERP - Coolify Migration Script
# This script prepares the project for migration to a new Coolify v4 server

set -e

echo "=========================================================="
echo "  Max TA Group ERP - Coolify Migration Prep Script"
echo "=========================================================="

MIGRATION_DIR="/home/ubuntu/maxta-erp-migration"
PROJECT_DIR="/home/ubuntu/maxta-erp"
DB_USER="root"
DB_NAME="maxta_erp"

# Create migration directory
echo "[1/4] Creating migration directory..."
mkdir -p $MIGRATION_DIR

# 1. Backup the database
echo "[2/4] Backing up the database ($DB_NAME)..."
sudo mysqldump -u $DB_USER $DB_NAME > $MIGRATION_DIR/maxta_erp_backup.sql
echo "      Database backup created successfully."

# 2. Copy uploaded files
echo "[3/4] Copying uploaded files..."
if [ -d "$PROJECT_DIR/uploads" ]; then
    cp -r $PROJECT_DIR/uploads $MIGRATION_DIR/
    echo "      Uploads copied successfully."
else
    echo "      No uploads directory found. Skipping."
fi

# 3. Create a zip archive of the migration package
echo "[4/4] Creating migration archive..."
cd /home/ubuntu
tar -czf maxta-erp-migration.tar.gz maxta-erp-migration
echo "      Archive created: /home/ubuntu/maxta-erp-migration.tar.gz"

echo ""
echo "=========================================================="
echo "  Migration Preparation Complete!"
echo "=========================================================="
echo ""
echo "Next steps on the NEW Coolify Server:"
echo "1. Create a new project in Coolify."
echo "2. Add a MySQL database resource."
echo "3. Add a Docker Compose resource and connect it to your GitHub repo:"
echo "   https://github.com/USEPNY12/maxta-erp"
echo "4. Use the docker-compose.coolify.yml file."
echo "5. Transfer the /home/ubuntu/maxta-erp-migration.tar.gz file to the new server."
echo "6. Extract it and import the database backup."
echo "7. Copy the uploads directory to the persistent volume."
echo ""
