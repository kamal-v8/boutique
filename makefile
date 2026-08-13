.PHONY: build vet lint frontend-build proto-guard ci ci-local act-clean

ci: build vet lint proto-guard frontend-build

# act uses /tmp (a small RAM-backed tmpfs) for checkout staging; redirect it
# to disk-backed space so parallel matrix jobs can't fill it up.
ACT_TMPDIR := $(CURDIR)/.build/act-tmp

act-clean:
	@docker rm -f $$(docker ps -aq --filter name=^act-) 2>/dev/null; \
	echo "act containers cleaned"

ci-local:
	@mkdir -p $(ACT_TMPDIR)
	@TMPDIR=$(ACT_TMPDIR) act -W .github/workflows/ci.yaml

# Go services
build:
	@for svc in productcatalog checkoutservice shippingservice promotionservice; do \
		echo "== building $$svc =="; \
		(cd services/$$svc && GOWORK=off go build -mod=vendor ./...); \
	done

vet:
	@for svc in productcatalog checkoutservice shippingservice promotionservice; do \
		echo "== vet $$svc =="; \
		(cd services/$$svc && go vet ./...); \
	done

# Node services
lint:
	@for svc in authservice cartservice orderservice paymentservice emailservice; do \
		echo "== lint $$svc =="; \
		(cd services/$$svc && npm run lint); \
	done

# Frontend
frontend-build:
	cd frontend && npm ci && npm run build

# Proto guard (cart-killer)
proto-guard:
	@for f in services/*/index.js; do \
		if grep -q "proto-loader" "$$f" && ! grep -q "keepCase: true" "$$f"; then \
			echo "::error::missing 'keepCase: true' in $$f"; \
			exit 1; \
		fi; \
	done
	@echo "keepCase: true present in all proto-loading services"
