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

if ! command -v pm2 > /dev/null 2>&1; then
  echo "🚀 Installing PM2 globally..."
  npm install -g pm2
else
  echo "✅ PM2 already installed, skipping..."
fi

echo "🚀 Building backend..."
npx nx run api:build

echo "🚀 Creating PM2 log directory..."
mkdir -p /root/.pm2/logs

echo "🚀 Starting PM2 processes..."
pm2 start ecosystem.config.js

echo "🚀 Streaming PM2 logs to stdout..."
pm2 logs &

echo "🚀 Starting webpack watcher (triggers pm2 restart on successful rebuild)..."
npx nx run api:build-watch 2>&1 | while IFS= read -r line; do
  echo "$line"
  if echo "$line" | grep -qE "webpack compiled successfully|compiled successfully"; then
    echo "🔄 Webpack compiled — restarting PM2 processes..."
    pm2 restart all --update-env 2>/dev/null || true
  fi
done
