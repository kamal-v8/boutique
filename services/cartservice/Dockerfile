FROM  node:22-alpine AS builder
WORKDIR /usr/src/app
COPY proto/ ./proto
COPY services/cartservice/package*.json ./
RUN npm ci --omit=dev
COPY services/cartservice/ ./

FROM alpine:3.20 AS probe
RUN apk add --no-cache wget && \
    wget -qO /bin/grpc_health_probe \
      https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.55/grpc_health_probe-linux-amd64 && \
    chmod +x /bin/grpc_health_probe

FROM node:22-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PROTO_DIR=/usr/src/app/proto
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app ./
COPY --from=probe /bin/grpc_health_probe /bin/grpc_health_probe
EXPOSE 50053
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["/bin/grpc_health_probe", "-addr=:50053"]
CMD ["node", "index.js"]
