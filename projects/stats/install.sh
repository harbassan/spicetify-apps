#!/bin/bash

# Spicetify Stats Installation Script (Fixed Version)
# Source: https://github.com/Akshay-86/spicetify-apps

GITHUB_USER="Akshay-86"
REPO_NAME="spicetify-apps"
BRANCH="main"

SPICETIFY_DIR="$HOME/.config/spicetify"
CUSTOM_APPS_DIR="$SPICETIFY_DIR/CustomApps"
EXTENSIONS_DIR="$SPICETIFY_DIR/Extensions"
STATS_DIR="$CUSTOM_APPS_DIR/stats"

echo "Downloading and Installing Fixed Spicetify Stats..."

# Create folders
mkdir -p "$STATS_DIR"
mkdir -p "$EXTENSIONS_DIR"

# Download files from GitHub 'dist' folder
BASE_URL="https://raw.githubusercontent.com/$GITHUB_USER/$REPO_NAME/$BRANCH/projects/stats/dist"

# Download core files
for file in index.js style.css manifest.json cache.js debug.js extension.js; do
    echo "Downloading $file..."
    curl -fsSL "$BASE_URL/$file" -o "$STATS_DIR/$file" || echo "Warning: Could not download $file"
done

# Install extension
echo "Installing extension..."
cp "$STATS_DIR/extension.js" "$EXTENSIONS_DIR/stats_extension.js"

# Apply Spicetify config
echo "Applying Spicetify configuration..."
spicetify config custom_apps stats
# Make sure it's in the extensions list
if ! spicetify config extensions | grep -q "stats_extension.js"; then
    spicetify config extensions stats_extension.js
fi

spicetify apply

echo "Success! Stats installed and applied."
