REGISTRY = ghcr.io
OWNER    = united-virtual
IMAGE    = crewcenter

ifneq (,$(wildcard .env))
include .env
export
endif

TAGGED_IMAGE = $(REGISTRY)/$(OWNER)/$(IMAGE):$(TAG)

.PHONY: check-tag
check-tag:
	@if [ -z "$(TAG)" ]; then \
		echo "❌ TAG not set in .env"; \
		exit 1; \
	fi

# Default target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  make build        Build Docker image"
	@echo "  make login        Login to ghcr.io"
	@echo "  make upload       Upload docker image to ghcr.io"

# Build image locally
.PHONY: build
build: check-tag
	docker buildx build --platform linux/amd64,linux/arm64 -t $(TAGGED_IMAGE) .

login:
	@if [ -z "$(GHCR_USERNAME)" ] || [ -z "$(GHCR_TOKEN)" ]; then \
		echo "❌ GHCR_USERNAME or GHCR_TOKEN not set"; \
		exit 1; \
	fi
	@echo "$(GHCR_TOKEN)" | docker login ghcr.io -u "$(GHCR_USERNAME)" --password-stdin

# Push image to registry
.PHONY: upload
upload: check-tag
	docker push $(TAGGED_IMAGE)
