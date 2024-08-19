#!/bin/bash

# Function to handle errors and exit
handle_error() {
    local status=$1
    local message=$2
    if [ $status -ne 0 ]
    then
        echo
        #   echo -e "$message"
        echo "$(status_prompt "$ERROR" "$message")"
        echo "Exiting..."
        exit 1
    fi
}

# Function to add status
status_prompt() {
    local status="$1"
    local message="$2"
    echo "${status} ${message}$(tput sgr0)"
}

# Function to colorize prompts
colorize_prompt() {
    local color="$1"
    local message="$2"
    echo -e "$(tput setaf ${color})${message}$(tput sgr0)"
}

# Define variables
CUSTOM_APPS_DIR="$HOME/.config/spicetify/CustomApps"
STATS_APP_DIR="$CUSTOM_APPS_DIR/stats"
REPO="harbassan/spicetify-apps"
ZIP_FILE="/tmp/spicetify-stats.zip"
TEMP_DIR="/tmp/spicetify-stats"

# Set some colors for output messages
OK="$(tput setaf 2)[OK]$(tput sgr0)"
ERROR="$(tput setaf 1)[ERROR]$(tput sgr0)"
NOTE="$(tput setaf 3)[NOTE]$(tput sgr0)"
ATT="$(tput setaf 1)[ATTENTION]$(tput sgr0)"
ORANGE=$(tput setaf 166)
 
# Check number of arguments
if [ $# -ne 0 ]
then
    #echo "This script does not take any arguments."
    status_prompt $ERROR "This script does not take any arguments."
    exit 1
fi

# Welcome 
printf "\n%.0s" {1..3}
colorize_prompt 6 "/////////////////////////////////"
colorize_prompt 6 "  __  _     _        _   _   _ "
colorize_prompt 6 "   | |_| _ |_| | | |  / |_| |_|"
colorize_prompt 6 " \_| | |   | \ |_| | /_ | \ | |" 
echo
colorize_prompt 6 "/////////////////////////////////"
printf "\n%.0s" {1..3}

# Welcome message
colorize_prompt 166 "Welcome to Spicetify-apps installation script!"
echo

# Dependencies to install
packages="curl unzip"

echo
status_prompt $NOTE "Installing dependencies ..."

# Install packages
for p in $packages
do
    if dpkg -l | grep -q "$p";
    then
        status_prompt $OK "Package $p already installed"
    else
        echo "Installing package $p ... "
        sudo apt install -y $p
        # Check if package was installed succesfully
        handle_error $? "Package $p failed to install"
        status_prompt $OK "Package $p installed."
    fi
done

# Create CustomApps directory if it doesn't exist
status_prompt $NOTE "Creating CustomApps directory if it doesn't exist"
mkdir -p "$CUSTOM_APPS_DIR"

# Get the latest release download URL
status_prompt $NOTE "Getting the latest release download URL"
LATEST_RELEASE_URL=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep "browser_download_url.*spicetify-stats.release.zip" | cut -d '"' -f 4)
handle_error $? "Failed to get latest spicetify-stats release. Exiting."

# Download the zip file
status_prompt $NOTE "Downloading the zip file"
curl -L -o "$ZIP_FILE" "$LATEST_RELEASE_URL"
handle_error $? "Failed to download the ZIP file."

# Unzip the file
status_prompt $NOTE "Unzipping the zip file"
unzip "$ZIP_FILE" -d "$TEMP_DIR"
handle_error $? "Failed to unzip the ZIP file."

# Move the unzipped folder to the correct location
mv "$TEMP_DIR"/* "$STATS_APP_DIR"
handle_error $? "Failed to Move the unzipped folder from $TEMP_DIR to $STATS_APP_DIR"

# Apply Spicetify configuration
status_prompt $NOTE "Applying Spicetify configuration"
spicetify config custom_apps stats
handle_error $? "Failed to run 'spicetify config custom_apps stats', have you installed spicetify?"
spicetify apply
handle_error $? "Failed to run 'spicetify apply'. Try to do it manually and check the issue."

# Clean up
status_prompt $NOTE "Cleaning up temporary files"
rm -rf "$ZIP_FILE" "$TEMP_DIR"
handle_error $? "Failed to clean up temporary files."

status_prompt $OK "Installation complete. Enjoy your new stats app!"

exit 0
