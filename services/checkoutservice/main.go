package main

import (
	"log"
	"sync"

	commonpb "ecommerce/common"
	cartpb "ecommerce/cart"
	productpb "ecommerce/product"
	promopb "ecommerce/promotion"
	shippingpb "ecommerce/shipping"
	orderpb "ecommerce/order"
	paymentpb "ecommerce/payment"
	emailpb "ecommerce/email"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// clients holds lazily-dialed gRPC clients.
type clients struct {
	cart      cartpb.CartServiceClient
	product   productpb.ProductServiceClient
	promotion promopb.PromotionServiceClient
	shipping  shippingpb.ShippingServiceClient
	order     orderpb.OrderServiceClient
	payment   paymentpb.PaymentServiceClient
	email     emailpb.EmailServiceClient
	conns     []*grpc.ClientConn
	sync.Mutex
}

func newClients(env map[string]string) (*clients, error) {
	addr := func(key, dflt string) string {
		if v, ok := env[key]; ok && v != "" {
			return v
		}
		return dflt
	}
	c := &clients{}
	dial := func(service string, dflt string) (*grpc.ClientConn, error) {
		conn, err := grpc.NewClient(addr(service, dflt), grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			return nil, err
		}
		c.conns = append(c.conns, conn)
		return conn, nil
	}
	conn, err := dial("CART_SERVICE_ADDR", "localhost:50053")
	if err != nil {
		return nil, err
	}
	c.cart = cartpb.NewCartServiceClient(conn)

	conn, err = dial("PRODUCT_SERVICE_ADDR", "localhost:50052")
	if err != nil {
		return nil, err
	}
	c.product = productpb.NewProductServiceClient(conn)

	conn, err = dial("PROMOTION_SERVICE_ADDR", "localhost:50059")
	if err != nil {
		return nil, err
	}
	c.promotion = promopb.NewPromotionServiceClient(conn)

	conn, err = dial("SHIPPING_SERVICE_ADDR", "localhost:50057")
	if err != nil {
		return nil, err
	}
	c.shipping = shippingpb.NewShippingServiceClient(conn)

	conn, err = dial("ORDER_SERVICE_ADDR", "localhost:50055")
	if err != nil {
		return nil, err
	}
	c.order = orderpb.NewOrderServiceClient(conn)

	conn, err = dial("PAYMENT_SERVICE_ADDR", "localhost:50056")
	if err != nil {
		return nil, err
	}
	c.payment = paymentpb.NewPaymentServiceClient(conn)

	conn, err = dial("EMAIL_SERVICE_ADDR", "localhost:50058")
	if err != nil {
		return nil, err
	}
	c.email = emailpb.NewEmailServiceClient(conn)

	return c, nil
}

func (c *clients) close() {
	c.Lock()
	defer c.Unlock()
	for _, conn := range c.conns {
		_ = conn.Close()
	}
}

// ---- Money helpers (units + nanos) ----

func centsFromMoney(m *commonpb.Money) int64 {
	if m == nil {
		return 0
	}
	return m.Units*100 + int64(m.Nanos)/10000000
}

func moneyFromCents(cents int64, currency string) *commonpb.Money {
	if currency == "" {
		currency = "USD"
	}
	return &commonpb.Money{
		CurrencyCode: currency,
		Units:        cents / 100,
		Nanos:        int32((cents % 100) * 10000000),
	}
}

func mulMoney(m *commonpb.Money, n int32) *commonpb.Money {
	return moneyFromCents(centsFromMoney(m)*int64(n), m.CurrencyCode)
}

func addMoney(a, b *commonpb.Money) *commonpb.Money {
	return moneyFromCents(centsFromMoney(a)+centsFromMoney(b), a.CurrencyCode)
}

func subMoney(a, b *commonpb.Money) *commonpb.Money {
	return moneyFromCents(centsFromMoney(a)-centsFromMoney(b), a.CurrencyCode)
}

func logf(format string, args ...interface{}) {
	log.Printf("[checkoutservice] "+format, args...)
}
