FROM golang:1.26-alpine AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -mod=vendor -o /bin/checkoutservice .

FROM alpine:3.20
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /bin/checkoutservice .
USER app
EXPOSE 50054
ENTRYPOINT ["/app/checkoutservice"]
