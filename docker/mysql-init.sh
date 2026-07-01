#!/bin/bash
set -e

# Start MySQL in the background
docker-entrypoint.sh mysqld &
MYSQL_PID=$!

# Wait for MySQL to be ready
echo "Waiting for MySQL to start..."
for i in $(seq 1 60); do
    if mysqladmin ping -h localhost --silent 2>/dev/null; then
        echo "MySQL is ready!"
        break
    fi
    sleep 2
done

# Check if the users table exists
TABLE_EXISTS=$(mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${MYSQL_DATABASE}' AND table_name='users';" -N 2>/dev/null || echo "0")

if [ "$TABLE_EXISTS" = "0" ]; then
    echo "Tables not found. Importing SQL dump..."
    mysql -u root -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < /docker-entrypoint-initdb.d/init.sql
    echo "SQL dump imported successfully!"
else
    echo "Tables already exist. Skipping import."
fi

# Wait for MySQL process
wait $MYSQL_PID
