package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net"
	"os"

	commonpb "ecommerce/common"
	productpb "ecommerce/product"
	"ecommerce/productcatalog/internal/store"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type server struct {
	productpb.UnimplementedProductServiceServer
	commonpb.UnimplementedHealthServer
	st *store.Store
}

func (s *server) Check(ctx context.Context, _ *commonpb.HealthCheckRequest) (*commonpb.HealthCheckResponse, error) {
	if err := s.st.DB().PingContext(ctx); err != nil {
		return &commonpb.HealthCheckResponse{Status: commonpb.HealthCheckResponse_NOT_SERVING}, nil
	}
	return &commonpb.HealthCheckResponse{Status: commonpb.HealthCheckResponse_SERVING}, nil
}

func (s *server) ListProducts(_ context.Context, req *productpb.ListProductsRequest) (*productpb.ListProductsResponse, error) {
	products, total, err := s.st.ListProducts(req.Category, req.Query, int(req.Page), int(req.PageSize), req.Sort)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "list products: %v", err)
	}
	pageSize := int(req.PageSize)
	if pageSize < 1 {
		pageSize = 12
	}
	pages := (total + pageSize - 1) / pageSize
	if pages < 1 {
		pages = 1
	}
	return &productpb.ListProductsResponse{
		Products: products,
		Total:    int32(total),
		Page:     req.Page,
		Pages:    int32(pages),
	}, nil
}

func (s *server) GetProduct(_ context.Context, req *productpb.GetProductRequest) (*productpb.Product, error) {
	p, err := s.st.GetProduct(req.Id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, status.Error(codes.NotFound, "product not found")
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "get product: %v", err)
	}
	return p, nil
}

func (s *server) ListCategories(ctx context.Context, _ *commonpb.Empty) (*productpb.ListCategoriesResponse, error) {
	cats, err := s.st.ListCategories()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "list categories: %v", err)
	}
	return &productpb.ListCategoriesResponse{Categories: cats}, nil
}

func (s *server) CreateProduct(_ context.Context, req *productpb.CreateProductRequest) (*productpb.Product, error) {
	p, err := s.st.CreateProduct(req.Product)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "create product: %v", err)
	}
	return p, nil
}

func (s *server) UpdateProduct(_ context.Context, req *productpb.UpdateProductRequest) (*productpb.Product, error) {
	if req.Product == nil || req.Product.Id == "" {
		return nil, status.Error(codes.InvalidArgument, "product id required")
	}
	p, err := s.st.UpdateProduct(req.Product)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "update product: %v", err)
	}
	return p, nil
}

func (s *server) DeleteProduct(_ context.Context, req *productpb.DeleteProductRequest) (*commonpb.Empty, error) {
	if err := s.st.DeleteProduct(req.Id); err != nil {
		return nil, status.Errorf(codes.Internal, "delete product: %v", err)
	}
	return &commonpb.Empty{}, nil
}

func (s *server) CheckStock(_ context.Context, req *productpb.GetStockRequest) (*productpb.StockResponse, error) {
	available, count, err := s.st.CheckStock(req.Id, req.Quantity)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "check stock: %v", err)
	}
	return &productpb.StockResponse{Available: available, AvailableCount: count}, nil
}

func (s *server) UpdateStock(_ context.Context, req *productpb.UpdateStockRequest) (*productpb.StockResponse, error) {
	count, err := s.st.UpdateStock(req.Id, req.Delta)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "update stock: %v", err)
	}
	return &productpb.StockResponse{Available: true, AvailableCount: count}, nil
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "50052"
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/products_db"
	}

	st, err := store.New(dsn)
	if err != nil {
		log.Fatalf("[productcatalog] connect db: %v", err)
	}
	defer st.Close()
	if err := st.Seed(); err != nil {
		log.Fatalf("[productcatalog] seed: %v", err)
	}

	lis, err := net.Listen("tcp", "0.0.0.0:"+port)
	if err != nil {
		log.Fatalf("[productcatalog] listen: %v", err)
	}
	srv := &server{st: st}
	gs := grpc.NewServer()
	productpb.RegisterProductServiceServer(gs, srv)
	commonpb.RegisterHealthServer(gs, srv)
	log.Printf("[productcatalog] listening on 0.0.0.0:%s", port)
	if err := gs.Serve(lis); err != nil {
		log.Fatalf("[productcatalog] serve: %v", err)
	}
}
