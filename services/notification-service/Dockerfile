FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/notification-service/package.json ./services/notification-service/
RUN npm install --workspace=@saas-ia/shared --workspace=@saas-ia/notification-service
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY services/notification-service/ ./services/notification-service/
RUN npm run build --workspace=@saas-ia/shared
RUN npm run build --workspace=@saas-ia/notification-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=builder /app/services/notification-service/package.json ./services/notification-service/
COPY --from=builder /app/services/notification-service/dist/ ./services/notification-service/dist/
COPY --from=builder /app/node_modules/ ./node_modules/
ENV NODE_ENV=production
EXPOSE 4003
CMD ["node", "services/notification-service/dist/index.js"]
