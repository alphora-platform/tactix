###################
# DEVELOPMENT
###################
docker-build-dev:
	docker compose -f docker-compose.yml build --no-cache

docker-build-dev-api:
	docker compose -f docker-compose.yml build api --no-cache

dev-up:
	docker compose -f docker-compose.yml up -d

dev-down:
	docker compose -f docker-compose.yml stop $(filter-out postgres, $(shell docker compose -f docker-compose.yml config --services))
	docker compose -f docker-compose.yml rm -f $(filter-out postgres, $(shell docker compose -f docker-compose.yml config --services))

dev-down-all:
	docker compose -f docker-compose.yml down -v

dev-restart:
	docker compose -f docker-compose.yml restart

dev-logs:
	docker compose -f docker-compose.yml logs -f

###################
# PRODUCTION
###################
prod-up:
	docker compose -f docker/docker-compose.prod.yml up -d

prod-down:
	docker compose -f docker/docker-compose.prod.yml down

prod-pull:
	docker compose -f docker/docker-compose.prod.yml pull

prod-logs:
	docker compose -f docker/docker-compose.prod.yml logs -f

prod-status:
	docker compose -f docker/docker-compose.prod.yml ps

prod-restart-api:
	docker compose -f docker/docker-compose.prod.yml restart api worker

prod-restart-frontend:
	docker compose -f docker/docker-compose.prod.yml restart frontend
