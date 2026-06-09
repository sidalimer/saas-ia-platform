FROM node:20-alpine
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/db-service/package.json ./services/db-service/
COPY services/auth-service/package.json ./services/auth-service/
COPY services/notification-service/package.json ./services/notification-service/
COPY services/ai-service/package.json ./services/ai-service/
COPY services/payment-service/package.json ./services/payment-service/
COPY services/metrics-service/package.json ./services/metrics-service/
COPY gateway/package.json ./gateway/

RUN npm install --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY services/db-service/ ./services/db-service/

RUN npm run build --workspace=@saas-ia/shared
RUN npm run build --workspace=@saas-ia/db-service

EXPOSE 4001
CMD ["node", "services/db-service/dist/index.js"]
