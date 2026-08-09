package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"net"
	"os"

	commonpb "ecommerce/common"
	shippingpb "ecommerce/shipping"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type server struct {
	shippingpb.UnimplementedShippingServiceServer
	commonpb.UnimplementedHealthServer
}

func (s *server) Check(ctx context.Context, _ *commonpb.HealthCheckRequest) (*commonpb.HealthCheckResponse, error) {
	return &commonpb.HealthCheckResponse{Status: commonpb.HealthCheckResponse_SERVING}, nil
}

func usd(units int64, nanos int32) *commonpb.Money {
	return &commonpb.Money{CurrencyCode: "USD", Units: units, Nanos: nanos}
}

func (s *server) GetQuote(ctx context.Context, _ *shippingpb.GetQuoteRequest) (*shippingpb.GetQuoteResponse, error) {
	return &shippingpb.GetQuoteResponse{
		Options: []*shippingpb.ShippingOption{
			{Id: "standard", Name: "Standard Shipping", Price: usd(5, 990000000), EstimatedDays: 5},
			{Id: "express", Name: "Express Shipping", Price: usd(12, 990000000), EstimatedDays: 2},
			{Id: "overnight", Name: "Overnight Shipping", Price: usd(24, 990000000), EstimatedDays: 1},
		},
	}, nil
}

func (s *server) ShipOrder(ctx context.Context, req *shippingpb.ShipOrderRequest) (*shippingpb.ShipOrderResponse, error) {
	if req.OrderId == "" {
		return nil, status.Error(codes.InvalidArgument, "order_id required")
	}
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	tracking := "TRK-" + hex.EncodeToString(b)
	return &shippingpb.ShipOrderResponse{TrackingId: tracking, Carrier: "MockWorldWide"}, nil
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "50057"
	}
	lis, err := net.Listen("tcp", "0.0.0.0:"+port)
	if err != nil {
		log.Fatalf("[shippingservice] listen: %v", err)
	}
	srv := &server{}
	gs := grpc.NewServer()
	shippingpb.RegisterShippingServiceServer(gs, srv)
	commonpb.RegisterHealthServer(gs, srv)
	log.Printf("[shippingservice] listening on 0.0.0.0:%s", port)
	if err := gs.Serve(lis); err != nil {
		log.Fatalf("[shippingservice] serve: %v", err)
	}
}
