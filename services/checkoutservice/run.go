package main

import (
	"context"
	"log"
	"net"
	"os"

	checkoutpb "ecommerce/checkout"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health/grpc_health_v1"
)

type healthServer struct {
	grpc_health_v1.UnimplementedHealthServer
}

func (h *healthServer) Check(ctx context.Context, _ *grpc_health_v1.HealthCheckRequest) (*grpc_health_v1.HealthCheckResponse, error) {
	return &grpc_health_v1.HealthCheckResponse{Status: grpc_health_v1.HealthCheckResponse_SERVING}, nil
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "50054"
	}
	env := map[string]string{}
	for _, k := range []string{
		"CART_SERVICE_ADDR", "PRODUCT_SERVICE_ADDR", "PROMOTION_SERVICE_ADDR",
		"SHIPPING_SERVICE_ADDR", "ORDER_SERVICE_ADDR", "PAYMENT_SERVICE_ADDR", "EMAIL_SERVICE_ADDR",
	} {
		if v := os.Getenv(k); v != "" {
			env[k] = v
		}
	}
	cli, err := newClients(env)
	if err != nil {
		log.Fatalf("[checkoutservice] init clients: %v", err)
	}
	defer cli.close()

	lis, err := net.Listen("tcp", "0.0.0.0:"+port)
	if err != nil {
		log.Fatalf("[checkoutservice] listen: %v", err)
	}
	gs := grpc.NewServer()
	checkoutpb.RegisterCheckoutServiceServer(gs, &server{clients: cli})
	grpc_health_v1.RegisterHealthServer(gs, &healthServer{})
	log.Printf("[checkoutservice] listening on 0.0.0.0:%s", port)
	if err := gs.Serve(lis); err != nil {
		log.Fatalf("[checkoutservice] serve: %v", err)
	}
}
