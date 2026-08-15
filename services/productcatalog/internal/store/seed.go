package store

import (
	productpb "ecommerce/product"
	commonpb "ecommerce/common"
)

// seedProducts returns the initial catalog.
func seedProducts() []*productpb.Product {
	usd := func(units int64, nanos int32) *commonpb.Money {
		return &commonpb.Money{CurrencyCode: "USD", Units: units, Nanos: nanos}
	}
	// Curated Unsplash photos, chosen and alt-text-verified to match each product.
	unsplash := func(id string) string {
		return "https://images.unsplash.com/photo-" + id + "?q=80&w=1200&auto=format&fit=crop"
	}
	products := []*struct {
		name, desc, sku, pic string
		units                int64
		nanos                int32
		stock                int32
		cats                 []string
	}{
		{"Halo Hoodie", "Heavyweight cotton-blend hoodie with a clean, oversized fit.", "HOOD-001", unsplash("1611817757591-c3f345024273"), 68, 0, 42, []string{"Apparel", "Featured"}},
		{"Monolith Tee", "Garment-dyed boxy tee, pre-shrunk, 220gsm.", "TEE-002", unsplash("1618354691373-d851c5c3a990"), 32, 0, 80, []string{"Apparel"}},
		{"Terra Cargo Pants", "Tapered technical cargo with concealed pockets.", "PANT-003", unsplash("1511794322962-129ddbd0af38"), 94, 50, 25, []string{"Apparel"}},
		{"Axis Field Jacket", "Water-resistant shell with matte zips and ripstop lining.", "JACK-004", unsplash("1618342904964-d67eb25cc7ce"), 189, 0, 12, []string{"Apparel"}},
		{"Strata Low Sneaker", "Slip-on court sneaker, recycled knit upper.", "SHOE-010", unsplash("1608229751021-ed4bd8677753"), 118, 0, 36, []string{"Footwear"}},
		{"Peak Trail Runner", "All-terrain trail shoe with lugged outsole.", "SHOE-011", unsplash("1582898967731-b5834427fd66"), 144, 0, 18, []string{"Footwear"}},
		{"Summit Boot", "Full-grain leather boot with commando sole.", "SHOE-012", unsplash("1605812860427-4024433a70fd"), 268, 0, 9, []string{"Footwear"}},
		{"Arc Sunglasses", "Acetate frame, polarized UV400 lenses.", "ACC-020", unsplash("1584036553516-bf83210aa16c"), 85, 0, 60, []string{"Accessories"}},
		{"Flux Watch", "Analog-chronograph stainless steel timepiece.", "ACC-021", unsplash("1524805444758-089113d48a6d"), 210, 0, 14, []string{"Accessories"}},
		{"Knoll Backpack", "20L weatherized pack with laptop sleeve.", "ACC-022", unsplash("1553062407-98eeb64c6a62"), 128, 0, 30, []string{"Accessories"}},
		{"Pulse Earbuds", "True-wireless earbuds, 30h battery, ANC.", "ELEC-030", unsplash("1606220588913-b3aacb4d2f46"), 149, 99, 52, []string{"Electronics"}},
		{"Volt Power Bank", "10,000mAh fast-charge power bank.", "ELEC-031", unsplash("1566554738544-d962991c3fee"), 49, 0, 73, []string{"Electronics"}},
	}
	out := make([]*productpb.Product, 0, len(products))
	for _, p := range products {
		out = append(out, &productpb.Product{
			Id:          "prod_" + p.sku,
			Name:        p.name,
			Description: p.desc,
			Price:       usd(p.units, p.nanos),
			Picture:     p.pic,
			Stock:       p.stock,
			Sku:         p.sku,
			Active:      true,
			Categories:  p.cats,
		})
	}
	return out
}
