FROM golang:1.26-alpine AS builder
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -mod=vendor -o /bin/productcatalog .

FROM alpine:3.20 AS probe
RUN apk add --no-cache wget && \
    wget -qO /bin/grpc_health_probe \
      https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.55/grpc_health_probe-linux-amd64 && \
    chmod +x /bin/grpc_health_probe

FROM alpine:3.20
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /bin/productcatalog .
COPY --from=probe /bin/grpc_health_probe /bin/grpc_health_probe
USER app
EXPOSE 50052
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["/bin/grpc_health_probe", "-addr=:50052"]
CMD ["/app/productcatalog"]
