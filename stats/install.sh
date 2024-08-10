#!/bin/bash

# Define variables
CUSTOM_APPS_DIR="$HOME/.config/spicetify/CustomApps"
STATS_APP_DIR="$CUSTOM_APPS_DIR/stats"
REPO="harbassan/spicetify-apps"
ZIP_FILE="/tmp/spicetify-stats.zip"
TEMP_DIR="/tmp/spicetify-stats"

# Create CustomApps directory if it doesn't exist
mkdir -p "$CUSTOM_APPS_DIR"

# Get the latest release download URL
LATEST_RELEASE_URL=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep "browser_download_url.*spicetify-stats.release.zip" | cut -d '"' -f 4)

# Download the zip file
curl -L -o "$ZIP_FILE" "$LATEST_RELEASE_URL"

# Unzip the file
unzip "$ZIP_FILE" -d "$TEMP_DIR"

# Move the unzipped folder to the correct location
mv "$TEMP_DIR"/* "$STATS_APP_DIR"

# Apply Spicetify configuration
spicetify config custom_apps stats
spicetify apply

# Clean up
rm -rf "$ZIP_FILE" "$TEMP_DIR"

echo "Installation complete. Enjoy your new stats app!"