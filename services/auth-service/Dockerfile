FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/auth-service/package.json ./services/auth-service/
RUN npm install --workspace=@saas-ia/shared --workspace=@saas-ia/auth-service
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY services/auth-service/ ./services/auth-service/
RUN npm run build --workspace=@saas-ia/shared
RUN npm run build --workspace=@saas-ia/auth-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=builder /app/services/auth-service/package.json ./services/auth-service/
COPY --from=builder /app/services/auth-service/dist/ ./services/auth-service/dist/
COPY --from=builder /app/node_modules/ ./node_modules/
ENV NODE_ENV=production
EXPOSE 4002
CMD ["node", "services/auth-service/dist/index.js"]
