FROM golang:1.26-alpine AS build
WORKDIR /src
# COPY proto/ ./proto
COPY . .
RUN CGO_ENABLED=0 go build -mod=vendor -o /bin/promotionservice .

FROM alpine:3.20
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /bin/promotionservice .
USER app
EXPOSE 50059
CMD ["/app/promotionservice"]
