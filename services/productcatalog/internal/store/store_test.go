package store

import (
	"database/sql"
	"testing"
)

func TestSeedProducts(t *testing.T) {
	products := seedProducts()
	if len(products) == 0 {
		t.Fatal("seedProducts returned no products")
	}

	seenIDs := map[string]bool{}
	seenSKUs := map[string]bool{}
	for _, p := range products {
		if p.Id == "" {
			t.Errorf("product %q has empty id", p.Name)
		}
		if seenIDs[p.Id] {
			t.Errorf("duplicate product id %q", p.Id)
		}
		seenIDs[p.Id] = true

		if p.Name == "" {
			t.Errorf("product %q has empty name", p.Id)
		}
		if p.Sku == "" {
			t.Errorf("product %q has empty sku", p.Id)
		}
		if seenSKUs[p.Sku] {
			t.Errorf("duplicate sku %q", p.Sku)
		}
		seenSKUs[p.Sku] = true

		if p.Price == nil {
			t.Errorf("product %q has nil price", p.Id)
			continue
		}
		if p.Price.Units < 0 || p.Price.Nanos < 0 {
			t.Errorf("product %q has negative price %d.%09d", p.Id, p.Price.Units, p.Price.Nanos)
		}
		if p.Price.CurrencyCode != "USD" {
			t.Errorf("product %q currency = %q, want USD", p.Id, p.Price.CurrencyCode)
		}

		if p.Picture == "" {
			t.Errorf("product %q has empty picture", p.Id)
		}
		if p.Stock < 0 {
			t.Errorf("product %q has negative stock %d", p.Id, p.Stock)
		}
		if !p.Active {
			t.Errorf("product %q should default to active", p.Id)
		}
		if len(p.Categories) == 0 {
			t.Errorf("product %q has no categories", p.Id)
		}
	}
}

func TestSeedProductsUniqueIDs(t *testing.T) {
	products := seedProducts()
	count := map[string]int{}
	for _, p := range products {
		count[p.Id]++
	}
	for id, n := range count {
		if n != 1 {
			t.Errorf("id %q appears %d times", id, n)
		}
	}
}

func TestToProto(t *testing.T) {
	row := ProductRow{
		ID:           "prod_X",
		Name:         "Test Product",
		Description:  "A product used in tests",
		PriceUnits:   10,
		PriceNanos:   50,
		CurrencyCode: "USD",
		Picture:      "http://example.com/p.png",
		Stock:        7,
		SKU:          sql.NullString{String: "SKU-1", Valid: true},
		Active:       true,
		CreatedAt:    1234567890,
	}

	got := toProto(row, []string{"Apparel", "Sale"})

	if got.Id != row.ID {
		t.Errorf("Id = %q, want %q", got.Id, row.ID)
	}
	if got.Name != row.Name || got.Description != row.Description {
		t.Errorf("got name=%q desc=%q, want name=%q desc=%q",
			got.Name, got.Description, row.Name, row.Description)
	}
	if got.Price == nil {
		t.Fatal("Price is nil")
	}
	if got.Price.Units != row.PriceUnits || got.Price.Nanos != row.PriceNanos {
		t.Errorf("price = %d.%09d, want %d.%09d",
			got.Price.Units, got.Price.Nanos, row.PriceUnits, row.PriceNanos)
	}
	if got.Price.CurrencyCode != row.CurrencyCode {
		t.Errorf("currency = %q, want %q", got.Price.CurrencyCode, row.CurrencyCode)
	}
	if got.Picture != row.Picture || got.Stock != row.Stock || got.Active != row.Active {
		t.Errorf("got picture=%q stock=%d active=%t, want picture=%q stock=%d active=%t",
			got.Picture, got.Stock, got.Active, row.Picture, row.Stock, row.Active)
	}
	if got.Sku != row.SKU.String {
		t.Errorf("sku = %q, want %q", got.Sku, row.SKU.String)
	}
	if len(got.Categories) != 2 || got.Categories[0] != "Apparel" || got.Categories[1] != "Sale" {
		t.Errorf("categories = %v, want [Apparel Sale]", got.Categories)
	}
}

func TestToProtoNilCategories(t *testing.T) {
	got := toProto(ProductRow{
		ID:   "prod_Y",
		Name: "No Cats",
	}, nil)
	if got.Categories != nil {
		t.Errorf("Categories = %v, want nil when source is nil", got.Categories)
	}
}

func TestToProtoAlwaysSetsPrice(t *testing.T) {
	got := toProto(ProductRow{ID: "prod_Z", Name: "Default Price"}, nil)
	if got.Price == nil {
		t.Fatal("Price is nil, want money struct")
	}
	if got.Price.CurrencyCode != "" {
		t.Errorf("Price.CurrencyCode = %q, want empty (copied from row)", got.Price.CurrencyCode)
	}
}