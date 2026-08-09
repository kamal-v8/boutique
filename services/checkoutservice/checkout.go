package main

import (
	"context"

	commonpb "ecommerce/common"
	cartpb "ecommerce/cart"
	checkoutpb "ecommerce/checkout"
	orderpb "ecommerce/order"
	promopb "ecommerce/promotion"
	paymentpb "ecommerce/payment"
	shippingpb "ecommerce/shipping"
	emailpb "ecommerce/email"
	productpb "ecommerce/product"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type server struct {
	checkoutpb.UnimplementedCheckoutServiceServer
	clients *clients
}

func (s *server) PlaceOrder(ctx context.Context, req *checkoutpb.PlaceOrderRequest) (*checkoutpb.PlaceOrderResponse, error) {
	if req.CartId == "" {
		req.CartId = req.UserId
	}
	// 1) Fetch cart
	cart, err := s.clients.cart.GetCart(ctx, &cartpb.GetCartRequest{CartId: req.CartId, UserId: req.UserId})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "get cart: %v", err)
	}
	if len(cart.Items) == 0 {
		return nil, status.Error(codes.FailedPrecondition, "cart is empty")
	}

	// 2) Resolve products, verify stock, compute subtotal
	currency := "USD"
	orderItems := make([]*orderpb.OrderItem, 0, len(cart.Items))
	subtotal := &commonpb.Money{CurrencyCode: currency}
	for _, item := range cart.Items {
		product, err := s.clients.product.GetProduct(ctx, &productpb.GetProductRequest{Id: item.ProductId})
		if err != nil {
			return nil, status.Errorf(codes.NotFound, "product %s: %v", item.ProductId, err)
		}
		stock, err := s.clients.product.CheckStock(ctx, &productpb.GetStockRequest{Id: product.Id, Quantity: item.Quantity})
		if err != nil {
			return nil, status.Errorf(codes.Internal, "check stock %s: %v", product.Id, err)
		}
		if !stock.Available {
			return nil, status.Errorf(codes.FailedPrecondition, "insufficient stock for %s", product.Name)
		}
		currency = product.Price.CurrencyCode
		orderItems = append(orderItems, &orderpb.OrderItem{
			ProductId:   product.Id,
			ProductName: product.Name,
			Quantity:    item.Quantity,
			UnitPrice:   product.Price,
		})
		subtotal = addMoney(subtotal, mulMoney(product.Price, item.Quantity))
	}
	subtotal.CurrencyCode = currency

	// 3) Coupon
	var discount = &commonpb.Money{CurrencyCode: currency}
	if req.CouponCode != "" {
		v, err := s.clients.promotion.ValidateCoupon(ctx, &promopb.ValidateCouponRequest{
			Code:          req.CouponCode,
			SubtotalUnits: centsFromMoney(subtotal),
		})
		if err != nil {
			logf("coupon validation error: %v", err)
		} else if v.Valid {
			discount = moneyFromCents(v.DiscountUnits, currency)
			if _, err := s.clients.promotion.IncrementUsed(ctx, &promopb.IncrementUsedRequest{Code: req.CouponCode}); err != nil {
				logf("increment used error: %v", err)
			}
		} else {
			logf("coupon %s rejected: %s", req.CouponCode, v.Reason)
		}
	}

	// 4) Shipping quote
	quote, err := s.clients.shipping.GetQuote(ctx, &shippingpb.GetQuoteRequest{Address: req.ShippingAddress})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "shipping quote: %v", err)
	}
	optionID := req.ShippingOptionId
	if optionID == "" {
		optionID = "standard"
	}
	shippingOpt := quote.Options[0]
	shipping := shippingOpt.Price
	for _, o := range quote.Options {
		if o.Id == optionID {
			shipping = o.Price
			shippingOpt = o
			break
		}
	}

	// 5) Total = subtotal - discount + shipping
	total := addMoney(subMoney(subtotal, discount), shipping)

	// 6) Persist order (CREATED)
	order, err := s.clients.order.CreateOrder(ctx, &orderpb.CreateOrderRequest{
		Order: &orderpb.Order{
			UserId:          req.UserId,
			Items:           orderItems,
			Subtotal:        subtotal,
			Discount:        discount,
			Shipping:        shipping,
			Total:           total,
			CouponCode:      req.CouponCode,
			ShippingAddress: req.ShippingAddress,
			Status:          "CREATED",
		},
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "create order: %v", err)
	}

	// 7) Charge payment
	charge, err := s.clients.payment.Charge(ctx, &paymentpb.ChargeRequest{
		OrderId:       order.Id,
		UserId:        req.UserId,
		Amount:        total,
		PaymentMethod: req.PaymentMethod,
		CardToken:     req.CardToken,
	})
	if err != nil || !charge.Approved {
		logf("payment failed for order %s: %v", order.Id, err)
		if _, cerr := s.clients.order.UpdateOrderStatus(ctx, &orderpb.UpdateOrderStatusRequest{Id: order.Id, Status: "CANCELLED"}); cerr != nil {
			logf("cancel order failed: %v", cerr)
		}
		msg := "payment declined"
		if err != nil {
			msg = err.Error()
		}
		return nil, status.Error(codes.Aborted, msg)
	}
	logf("order %s paid (txn %s)", order.Id, charge.TransactionId)

	// 8) Mark paid, ship, complete
	_, _ = s.clients.order.UpdateOrderStatus(ctx, &orderpb.UpdateOrderStatusRequest{Id: order.Id, Status: "PAID"})

	var trackingID string
	shipRes, err := s.clients.shipping.ShipOrder(ctx, &shippingpb.ShipOrderRequest{
		OrderId:  order.Id,
		Address:  req.ShippingAddress,
		OptionId: optionID,
	})
	if err == nil {
		trackingID = shipRes.TrackingId
		logf("shipment for %s: carrier=%s tracking=%s", order.Id, shipRes.Carrier, trackingID)
	}
	_, _ = s.clients.order.UpdateOrderStatus(ctx, &orderpb.UpdateOrderStatusRequest{
		Id:         order.Id,
		Status:     "SHIPPED",
		TrackingId: trackingID,
	})

	// 9) Email confirmation (best-effort)
	if _, err := s.clients.email.SendOrderConfirmation(ctx, &emailpb.SendOrderConfirmationRequest{
		UserId:  req.UserId,
		OrderId: order.Id,
	}); err != nil {
		logf("email send failed: %v", err)
	}

	// 10) Decrement stock + empty cart (best-effort)
	for _, item := range cart.Items {
		if _, err := s.clients.product.UpdateStock(ctx, &productpb.UpdateStockRequest{Id: item.ProductId, Delta: -int64(item.Quantity)}); err != nil {
			logf("stock update failed for %s: %v", item.ProductId, err)
		}
	}
	if _, err := s.clients.cart.EmptyCart(ctx, &cartpb.EmptyCartRequest{CartId: req.CartId, UserId: req.UserId}); err != nil {
		logf("empty cart failed: %v", err)
	}

	return &checkoutpb.PlaceOrderResponse{
		OrderId:    order.Id,
		TrackingId: trackingID,
		Total:      total,
		Status:     "SHIPPED",
	}, nil
}
