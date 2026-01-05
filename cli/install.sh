#!/usr/bin/env bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO="dscv103/fionacode"
BINARY_NAME="fifi"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

# Detect OS and architecture
detect_platform() {
    local os arch

    case "$(uname -s)" in
        Linux*)     os="linux" ;;
        Darwin*)    os="macOS" ;;
        MINGW*|MSYS*|CYGWIN*) os="windows" ;;
        *)
            echo -e "${RED}Unsupported operating system: $(uname -s)${NC}"
            exit 1
            ;;
    esac

    case "$(uname -m)" in
        x86_64)     arch="amd64" ;;
        aarch64|arm64) arch="arm64" ;;
        *)
            echo -e "${RED}Unsupported architecture: $(uname -m)${NC}"
            exit 1
            ;;
    esac

    echo "${os}_${arch}"
}

# Get latest release version
get_latest_version() {
    local version
    version=$(curl -sSf "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    
    if [ -z "$version" ]; then
        echo -e "${RED}Failed to get latest version${NC}"
        exit 1
    fi
    
    echo "$version"
}

# Download and install binary
install_binary() {
    local platform version download_url archive_name
    
    platform=$(detect_platform)
    version=$(get_latest_version)
    
    echo -e "${GREEN}Installing ${BINARY_NAME} ${version} for ${platform}...${NC}"
    
    # Construct download URL
    if [[ "$platform" == "windows_"* ]]; then
        archive_name="${BINARY_NAME}_${version}_${platform}.zip"
    else
        archive_name="${BINARY_NAME}_${version}_${platform}.tar.gz"
    fi
    
    download_url="https://github.com/${REPO}/releases/download/${version}/${archive_name}"
    
    # Create temporary directory
    local tmp_dir
    tmp_dir=$(mktemp -d)
    trap "rm -rf ${tmp_dir}" EXIT
    
    # Download archive
    echo "Downloading from ${download_url}..."
    if ! curl -sSfL "$download_url" -o "${tmp_dir}/${archive_name}"; then
        echo -e "${RED}Failed to download ${archive_name}${NC}"
        exit 1
    fi
    
    # Extract archive
    echo "Extracting archive..."
    if [[ "$platform" == "windows_"* ]]; then
        unzip -q "${tmp_dir}/${archive_name}" -d "${tmp_dir}"
        binary_path="${tmp_dir}/${BINARY_NAME}.exe"
    else
        tar -xzf "${tmp_dir}/${archive_name}" -C "${tmp_dir}"
        binary_path="${tmp_dir}/${BINARY_NAME}"
    fi
    
    # Create install directory if it doesn't exist
    mkdir -p "$INSTALL_DIR"
    
    # Install binary
    echo "Installing to ${INSTALL_DIR}/${BINARY_NAME}..."
    if [[ "$platform" == "windows_"* ]]; then
        mv "$binary_path" "${INSTALL_DIR}/${BINARY_NAME}.exe"
        chmod +x "${INSTALL_DIR}/${BINARY_NAME}.exe"
    else
        mv "$binary_path" "${INSTALL_DIR}/${BINARY_NAME}"
        chmod +x "${INSTALL_DIR}/${BINARY_NAME}"
    fi
    
    echo -e "${GREEN}✓ Successfully installed ${BINARY_NAME} ${version}!${NC}"
    echo ""
    echo "Make sure ${INSTALL_DIR} is in your PATH."
    echo "You can add it to your shell profile:"
    echo ""
    echo "  export PATH=\"\$PATH:${INSTALL_DIR}\""
    echo ""
    echo "Run '${BINARY_NAME} --help' to get started."
}

# Check if required commands are available
check_dependencies() {
    local missing_deps=()
    
    for cmd in curl tar; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}Missing required dependencies: ${missing_deps[*]}${NC}"
        exit 1
    fi
}

# Main
main() {
    echo "FionaCode CLI Installer"
    echo "======================="
    echo ""
    
    check_dependencies
    install_binary
}

main "$@"

