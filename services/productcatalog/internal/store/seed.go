package store

import (
	"strconv"

	productpb "ecommerce/product"
	commonpb "ecommerce/common"
)

// seedProducts returns the initial catalog.
func seedProducts() []*productpb.Product {
	usd := func(units int64, nanos int32) *commonpb.Money {
		return &commonpb.Money{CurrencyCode: "USD", Units: units, Nanos: nanos}
	}
	// Keyword-matched placeholder photos, locked so each product keeps a stable image.
	pic := func(id int, kw string) string {
		return "https://loremflickr.com/900/1200/" + kw + "?lock=" + strconv.Itoa(30+id)
	}
	products := []*struct {
		name, desc, sku, img string
		units                int64
		nanos                int32
		stock                int32
		cats                 []string
	}{
		{"Halo Hoodie", "Heavyweight cotton-blend hoodie with a clean, oversized fit.", "HOOD-001", "hoodie", 68, 0, 42, []string{"Apparel", "Featured"}},
		{"Monolith Tee", "Garment-dyed boxy tee, pre-shrunk, 220gsm.", "TEE-002", "tshirt", 32, 0, 80, []string{"Apparel"}},
		{"Terra Cargo Pants", "Tapered technical cargo with concealed pockets.", "PANT-003", "cargopants", 94, 50, 25, []string{"Apparel"}},
		{"Axis Field Jacket", "Water-resistant shell with matte zips and ripstop lining.", "JACK-004", "jacket", 189, 0, 12, []string{"Apparel"}},
		{"Strata Low Sneaker", "Slip-on court sneaker, recycled knit upper.", "SHOE-010", "sneakers", 118, 0, 36, []string{"Footwear"}},
		{"Peak Trail Runner", "All-terrain trail shoe with lugged outsole.", "SHOE-011", "running-shoes", 144, 0, 18, []string{"Footwear"}},
		{"Summit Boot", "Full-grain leather boot with commando sole.", "SHOE-012", "boots", 268, 0, 9, []string{"Footwear"}},
		{"Arc Sunglasses", "Acetate frame, polarized UV400 lenses.", "ACC-020", "sunglasses", 85, 0, 60, []string{"Accessories"}},
		{"Flux Watch", "Analog-chronograph stainless steel timepiece.", "ACC-021", "watch", 210, 0, 14, []string{"Accessories"}},
		{"Knoll Backpack", "20L weatherized pack with laptop sleeve.", "ACC-022", "backpack", 128, 0, 30, []string{"Accessories"}},
		{"Pulse Earbuds", "True-wireless earbuds, 30h battery, ANC.", "ELEC-030", "earbuds", 149, 99, 52, []string{"Electronics"}},
		{"Volt Power Bank", "10,000mAh fast-charge power bank.", "ELEC-031", "powerbank", 49, 0, 73, []string{"Electronics"}},
	}
	out := make([]*productpb.Product, 0, len(products))
	for i, p := range products {
		out = append(out, &productpb.Product{
			Id:          "prod_" + p.sku,
			Name:        p.name,
			Description: p.desc,
			Price:       usd(p.units, p.nanos),
			Picture:     pic(i, p.img),
			Stock:       p.stock,
			Sku:         p.sku,
			Active:      true,
			Categories:  p.cats,
		})
	}
	return out
}
