.PHONY: all build clean install test help

# Build variables
BINARY_NAME=fifi
VERSION?=dev
BUILD_DATE=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS=-ldflags "-s -w -X main.Version=$(VERSION) -X main.BuildDate=$(BUILD_DATE)"

all: build

## build: Build the binary
build: sync-config
	@echo "Building $(BINARY_NAME)..."
	go build $(LDFLAGS) -o $(BINARY_NAME) ./cmd/fifi
	@echo "Build complete: ./$(BINARY_NAME)"

## sync-config: Sync opencode.json from repo root to embedded assets
sync-config:
	@echo "Syncing opencode.json from repo root..."
	@cp ../opencode.json internal/assets/embedded/opencode.json
	@echo "Config synced"

## build-all: Build for all platforms
build-all:
	@echo "Building for all platforms..."
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o dist/$(BINARY_NAME)-linux-amd64 ./cmd/fifi
	GOOS=linux GOARCH=arm64 go build $(LDFLAGS) -o dist/$(BINARY_NAME)-linux-arm64 ./cmd/fifi
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o dist/$(BINARY_NAME)-darwin-amd64 ./cmd/fifi
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o dist/$(BINARY_NAME)-darwin-arm64 ./cmd/fifi
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o dist/$(BINARY_NAME)-windows-amd64.exe ./cmd/fifi
	@echo "Build complete: ./dist/"

## clean: Remove build artifacts
clean:
	@echo "Cleaning..."
	rm -f $(BINARY_NAME)
	rm -rf dist/
	@echo "Clean complete"

## install: Install the binary to /usr/local/bin
install: build
	@echo "Installing to /usr/local/bin/$(BINARY_NAME)..."
	sudo cp $(BINARY_NAME) /usr/local/bin/
	@echo "Install complete"

## install-local: Install the binary to ~/.local/bin
install-local: build
	@echo "Installing to ~/.local/bin/$(BINARY_NAME)..."
	mkdir -p ~/.local/bin
	cp $(BINARY_NAME) ~/.local/bin/
	@echo "Install complete"

## test: Run tests
test:
	@echo "Running tests..."
	go test -v ./...

## tidy: Tidy and download dependencies
tidy:
	@echo "Tidying dependencies..."
	go mod tidy
	go mod download

## release: Create a release build (requires goreleaser)
release:
	@echo "Creating release..."
	goreleaser release --clean

## snapshot: Create a snapshot release (requires goreleaser)
snapshot:
	@echo "Creating snapshot release..."
	goreleaser build --snapshot --clean

## help: Show this help message
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@sed -n 's/^## //p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/  /'
