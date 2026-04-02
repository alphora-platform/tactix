#!/bin/sh
set -e

# Check if database is ready
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "⏳ Waiting for database connection..."
  sleep 2
done
echo "✅ Database is ready!"

# Check if database has any tables in public schema
HAS_TABLES="$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1;" 2>/dev/null || true)"
if [ "$HAS_TABLES" != "1" ]; then
  echo "🔄 Database has no tables, running migration..."
  cd /usr/src/app/apps/api && npm run migration:run
  cd /usr/src/app
else
  echo "✅ Database has tables, skipping migration..."
fi

# Check if set17 static data is seeded
CHAMP_COUNT="$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM set17_champions;" 2>/dev/null || true)"
if [ "$CHAMP_COUNT" = "" ] || [ "$CHAMP_COUNT" = "0" ]; then
  echo "🔄 No set17 data found, running seed..."
  cd /usr/src/app/apps/api && npx ts-node --project tsconfig.app.json src/database/seeds/set17-static-data.seed.ts
  cd /usr/src/app
else
  echo "✅ Set17 data already seeded ($CHAMP_COUNT champions), skipping..."
fi

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
