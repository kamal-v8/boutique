package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net"
	"os"

	commonpb "ecommerce/common"
	promopb "ecommerce/promotion"
	"ecommerce/promotionservice/internal/store"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/status"
)

type server struct {
	promopb.UnimplementedPromotionServiceServer
	commonpb.UnimplementedHealthServer
	st *store.Store
}

type healthServer struct {
	grpc_health_v1.UnimplementedHealthServer
	db *sql.DB
}

func (h *healthServer) Check(ctx context.Context, _ *grpc_health_v1.HealthCheckRequest) (*grpc_health_v1.HealthCheckResponse, error) {
	if err := h.db.PingContext(ctx); err != nil {
		return &grpc_health_v1.HealthCheckResponse{Status: grpc_health_v1.HealthCheckResponse_NOT_SERVING}, nil
	}
	return &grpc_health_v1.HealthCheckResponse{Status: grpc_health_v1.HealthCheckResponse_SERVING}, nil
}

func (s *server) Check(ctx context.Context, _ *commonpb.HealthCheckRequest) (*commonpb.HealthCheckResponse, error) {
	if err := s.st.DB().PingContext(ctx); err != nil {
		return &commonpb.HealthCheckResponse{Status: commonpb.HealthCheckResponse_NOT_SERVING}, nil
	}
	return &commonpb.HealthCheckResponse{Status: commonpb.HealthCheckResponse_SERVING}, nil
}

func (s *server) GetCoupon(_ context.Context, req *promopb.GetCouponRequest) (*promopb.CouponResponse, error) {
	c, err := s.st.GetCoupon(req.Code)
	if errors.Is(err, sql.ErrNoRows) {
		return &promopb.CouponResponse{Valid: false, Reason: "Coupon not found"}, nil
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "get coupon: %v", err)
	}
	return &promopb.CouponResponse{Coupon: c, Valid: true}, nil
}

func (s *server) ValidateCoupon(_ context.Context, req *promopb.ValidateCouponRequest) (*promopb.CouponResponse, error) {
	valid, reason, discount, err := s.st.Validate(req.Code, req.SubtotalUnits)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "validate coupon: %v", err)
	}
	c, perr := s.st.GetCoupon(req.Code)
	if perr != nil && !errors.Is(perr, sql.ErrNoRows) {
		return nil, status.Errorf(codes.Internal, "get coupon: %v", perr)
	}
	return &promopb.CouponResponse{Coupon: c, Valid: valid, Reason: reason, DiscountUnits: discount}, nil
}

func (s *server) ListCoupons(_ context.Context, req *promopb.ListCouponsRequest) (*promopb.CouponListResponse, error) {
	coupons, total, err := s.st.List(int(req.Page), int(req.PageSize))
	if err != nil {
		return nil, status.Errorf(codes.Internal, "list coupons: %v", err)
	}
	return &promopb.CouponListResponse{Coupons: coupons, Total: int32(total)}, nil
}

func (s *server) CreateCoupon(_ context.Context, req *promopb.CreateCouponRequest) (*promopb.Coupon, error) {
	if req.Coupon == nil || req.Coupon.Code == "" {
		return nil, status.Error(codes.InvalidArgument, "coupon code required")
	}
	c, err := s.st.Upsert(req.Coupon)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "create coupon: %v", err)
	}
	return c, nil
}

func (s *server) UpdateCoupon(_ context.Context, req *promopb.UpdateCouponRequest) (*promopb.Coupon, error) {
	if req.Coupon == nil || req.Coupon.Code == "" {
		return nil, status.Error(codes.InvalidArgument, "coupon code required")
	}
	c, err := s.st.Upsert(req.Coupon)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "update coupon: %v", err)
	}
	return c, nil
}

func (s *server) DeleteCoupon(_ context.Context, req *promopb.DeleteCouponRequest) (*commonpb.Empty, error) {
	if err := s.st.Delete(req.Code); err != nil {
		return nil, status.Errorf(codes.Internal, "delete coupon: %v", err)
	}
	return &commonpb.Empty{}, nil
}

func (s *server) IncrementUsed(_ context.Context, req *promopb.IncrementUsedRequest) (*commonpb.Empty, error) {
	if err := s.st.IncrementUsed(req.Code); err != nil {
		return nil, status.Errorf(codes.Internal, "increment used: %v", err)
	}
	return &commonpb.Empty{}, nil
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "50059"
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/products_db"
	}

	st, err := store.New(dsn)
	if err != nil {
		log.Fatalf("[promotionservice] connect db: %v", err)
	}
	defer st.Close()
	if err := st.Seed(); err != nil {
		log.Fatalf("[promotionservice] seed: %v", err)
	}

	lis, err := net.Listen("tcp", "0.0.0.0:"+port)
	if err != nil {
		log.Fatalf("[promotionservice] listen: %v", err)
	}
	srv := &server{st: st}
	gs := grpc.NewServer()
	promopb.RegisterPromotionServiceServer(gs, srv)
	commonpb.RegisterHealthServer(gs, srv)
	grpc_health_v1.RegisterHealthServer(gs, &healthServer{db: st.DB()})
	log.Printf("[promotionservice] listening on 0.0.0.0:%s", port)
	if err := gs.Serve(lis); err != nil {
		log.Fatalf("[promotionservice] serve: %v", err)
	}
}
