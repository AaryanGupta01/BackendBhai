#!/bin/bash
set -e

echo '=== Initializing BackendBhai databases ==='

# The platform only needs its own telemetry database. A monitored product that
# happens to share this Postgres (the bundled demo does) adds its own schema by
# mounting a directory below; nothing here assumes any particular product exists.
psql -v ON_ERROR_STOP=1 --username \ --dbname postgres <<-EOSQL
    SELECT 'CREATE DATABASE devtools' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'devtools')gexec
    GRANT ALL PRIVILEGES ON DATABASE devtools TO \;
EOSQL

echo 'Applying devtools schema...'
psql -v ON_ERROR_STOP=1 --username \ --dbname devtools -f /docker-entrypoint-initdb.d/devtools/001_initial.sql

if [ -d /docker-entrypoint-initdb.d/ecommerce ]; then
  echo 'Demo product detected - creating its database...'
  psql -v ON_ERROR_STOP=1 --username \ --dbname postgres <<-EOSQL
    SELECT 'CREATE DATABASE ecommerce' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ecommerce')gexec
    GRANT ALL PRIVILEGES ON DATABASE ecommerce TO \;
EOSQL
  psql -v ON_ERROR_STOP=1 --username \ --dbname ecommerce -f /docker-entrypoint-initdb.d/ecommerce/001_initial.sql
fi

echo '=== Database initialization complete ==='
