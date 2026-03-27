#!/bin/sh
set -e

# # Check if database is ready
# until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
#   echo "⏳ Waiting for database connection..."
#   sleep 2
# done
# echo "✅ Database is ready!"

# # Check if database has any tables in public schema
# HAS_TABLES="$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1;" 2>/dev/null || true)"
# if [ "$HAS_TABLES" != "1" ]; then
#   echo "🔄 Database has no tables, running migration..."
#   npx nx run api:migration
# else
#   echo "✅ Database has tables, skipping migration..."
# fi

# # Check if database has data (users table)
# USERS_COUNT="$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null || true)"
# if [ "$USERS_COUNT" = "" ] || [ "$USERS_COUNT" = "0" ]; then
#   echo "🔄 Database has no data, running seed..."
#   npx nx run api:seed
# else
#   echo "✅ Database has data, skipping seed..."
# fi

echo "🚀 Installing PM2 globally..."
npm install -g pm2

echo "🚀 Building backend..."
npx nx run api:build

echo "🚀 Starting file watcher for hot reload (background)..."
npx nx run api:build-watch &

echo "🚀 Creating PM2 log directory for pm2 monit..."
mkdir -p /root/.pm2/logs

echo "🚀 Starting PM2 runtime (foreground — streams logs to Docker)..."
exec pm2-runtime ecosystem.config.js
