#!/bin/bash
set -euo pipefail

# ─── Arguments (passed via env or positional) ──────────────────────────────
GITHUB_OWNER="${GITHUB_OWNER:?GITHUB_OWNER env var required}"
GITHUB_REPO="${GITHUB_REPO:?GITHUB_REPO env var required}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

REGISTRY="ghcr.io"
COMPOSE_FILE="docker/docker-compose.prod.yml"
API_IMAGE="${REGISTRY}/${GITHUB_OWNER}/${GITHUB_REPO}/api:${IMAGE_TAG}"
FRONTEND_IMAGE="${REGISTRY}/${GITHUB_OWNER}/${GITHUB_REPO}/frontend:${IMAGE_TAG}"

echo "======================================================"
echo " Tactix Deploy — Tag: ${IMAGE_TAG}"
echo "======================================================"

# ─── Helper: wait for a container to become healthy ────────────────────────
wait_healthy() {
  local container="$1"
  local retries=15
  echo "Waiting for ${container} to be healthy..."
  for i in $(seq 1 $retries); do
    status=$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null || echo "missing")
    if [ "${status}" = "healthy" ]; then
      echo "  ${container} is healthy."
      return 0
    fi
    echo "  Attempt ${i}/${retries}: status=${status}"
    sleep 6
  done
  echo "ERROR: ${container} did not become healthy."
  return 1
}

# ─── Rollback helper ───────────────────────────────────────────────────────
PREV_API_TAG=""
PREV_FRONTEND_TAG=""

save_current_tags() {
  PREV_API_TAG=$(docker inspect tactix-api --format='{{index .Config.Image}}' 2>/dev/null | awk -F: '{print $2}' || echo "")
  PREV_FRONTEND_TAG=$(docker inspect tactix-frontend --format='{{index .Config.Image}}' 2>/dev/null | awk -F: '{print $2}' || echo "")
}

rollback() {
  echo ""
  echo "!!! DEPLOY FAILED — Rolling back !!!"
  if [ -n "${PREV_API_TAG}" ]; then
    IMAGE_TAG="${PREV_API_TAG}" GITHUB_OWNER="${GITHUB_OWNER}" GITHUB_REPO="${GITHUB_REPO}" \
      docker compose -f "${COMPOSE_FILE}" up -d --no-deps --no-build api worker
    echo "API rolled back to: ${PREV_API_TAG}"
  fi
  if [ -n "${PREV_FRONTEND_TAG}" ]; then
    IMAGE_TAG="${PREV_FRONTEND_TAG}" GITHUB_OWNER="${GITHUB_OWNER}" GITHUB_REPO="${GITHUB_REPO}" \
      docker compose -f "${COMPOSE_FILE}" up -d --no-deps --no-build frontend
    echo "Frontend rolled back to: ${PREV_FRONTEND_TAG}"
  fi
  echo "Rollback complete."
  exit 1
}

# ─── [1] Save current tags for rollback ────────────────────────────────────
echo ""
echo "[1/7] Saving current image tags..."
save_current_tags

# ─── [2] Pull new images ───────────────────────────────────────────────────
echo ""
echo "[2/7] Pulling images: ${IMAGE_TAG}"
IMAGE_TAG="${IMAGE_TAG}" GITHUB_OWNER="${GITHUB_OWNER}" GITHUB_REPO="${GITHUB_REPO}" \
  docker compose -f "${COMPOSE_FILE}" pull api worker frontend

# Activate rollback on any error from here
trap rollback ERR

# ─── [3] Run database migrations ───────────────────────────────────────────
echo ""
echo "[3/7] Running database migrations..."
make prod-migrate
echo "Migrations complete."

# ─── [4] Update API ────────────────────────────────────────────────────────
echo ""
echo "[4/7] Updating API container..."
IMAGE_TAG="${IMAGE_TAG}" GITHUB_OWNER="${GITHUB_OWNER}" GITHUB_REPO="${GITHUB_REPO}" \
  docker compose -f "${COMPOSE_FILE}" up -d --no-deps --no-build api
wait_healthy "tactix-api"

# ─── [5] Update Worker ─────────────────────────────────────────────────────
echo ""
echo "[5/7] Updating Worker container..."
IMAGE_TAG="${IMAGE_TAG}" GITHUB_OWNER="${GITHUB_OWNER}" GITHUB_REPO="${GITHUB_REPO}" \
  docker compose -f "${COMPOSE_FILE}" up -d --no-deps --no-build worker

# ─── [6] Update Frontend ───────────────────────────────────────────────────
echo ""
echo "[6/7] Updating Frontend container..."
IMAGE_TAG="${IMAGE_TAG}" GITHUB_OWNER="${GITHUB_OWNER}" GITHUB_REPO="${GITHUB_REPO}" \
  docker compose -f "${COMPOSE_FILE}" up -d --no-deps --no-build frontend
wait_healthy "tactix-frontend"

# ─── [7] Reload nginx ──────────────────────────────────────────────────────
echo ""
echo "[7/7] Reloading nginx..."
sudo systemctl reload nginx

# ─── Final verification ────────────────────────────────────────────────────
echo ""
echo "Running final health check..."
sleep 5
HTTP_CODE=$(wget -qO- --server-response http://localhost/api/health 2>&1 \
  | grep "HTTP/" | awk '{print $2}' | tail -1 || echo "000")

if [ "${HTTP_CODE}" = "200" ]; then
  echo ""
  echo "======================================================"
  echo " Deploy successful! Tag: ${IMAGE_TAG}"
  echo "======================================================"
else
  echo "Final health check returned HTTP ${HTTP_CODE} — rolling back"
  rollback
fi

# ─── Cleanup dangling images ───────────────────────────────────────────────
docker image prune -f --filter "until=24h" 2>/dev/null || true
