.PHONY: up down build logs seed test reset-db clean

up:
	docker compose up --build -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

seed:
	docker compose exec db-service node dist/seed.js

test:
	npm test --workspaces --if-present

reset-db:
	docker compose down -v
	docker compose up -d postgres
	sleep 3
	docker compose exec db-service npx prisma migrate reset --force
	docker compose up --build -d

clean:
	docker compose down -v --rmi local
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf services/*/node_modules
	rm -rf gateway/node_modules
	rm -rf frontend/node_modules

health:
	@echo "=== Health Checks ==="
	@curl -sf http://localhost:8080/health && echo " [gateway] OK" || echo " [gateway] FAIL"
	@curl -sf http://localhost:8080/api/db/health && echo " [db-service] OK" || echo " [db-service] FAIL"
	@curl -sf http://localhost:8080/api/auth/health && echo " [auth-service] OK" || echo " [auth-service] FAIL"
	@curl -sf http://localhost:8080/api/notify/health && echo " [notification-service] OK" || echo " [notification-service] FAIL"
	@curl -sf http://localhost:8080/api/ai/health && echo " [ai-service] OK" || echo " [ai-service] FAIL"
	@curl -sf http://localhost:8080/api/payment/health && echo " [payment-service] OK" || echo " [payment-service] FAIL"
	@curl -sf http://localhost:8080/api/metrics/health && echo " [metrics-service] OK" || echo " [metrics-service] FAIL"
