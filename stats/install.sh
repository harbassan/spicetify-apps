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

# Detailed Welcome message
colorize_prompt 166 "Welcome to the Spicetify Apps Installer!"
colorize_prompt 166 "This script will install Spotify, set up Spicetify, and add custom apps."
echo

# Dependencies to install
packages="curl unzip"

echo
status_prompt $NOTE "Checking for necessary dependencies..."

# Install packages
for p in $packages
do
    if dpkg -l | grep -q "$p";
    then
        status_prompt $OK "Package $p is already installed."
    else
        echo "Installing package $p ... "
        sudo apt install -y $p
        # Check if package was installed succesfully
        handle_error $? "Failed to install package $p."
        status_prompt $OK "Package $p installed successfully."
    fi
done

# Spotify Installation
status_prompt $NOTE "Removing any existing Spotify Snap installation..."
sudo snap remove spotify
handle_error $? "Failed to remove the Snap version of Spotify."
status_prompt $OK "Spotify Snap removed successfully."

status_prompt $NOTE "Adding Spotify's GPG key..."
curl -sS https://download.spotify.com/debian/pubkey_6224F9941A8AA6D1.gpg | sudo gpg --dearmor --yes -o /etc/apt/trusted.gpg.d/spotify.gpg
handle_error $? "Failed to add Spotify GPG key."
status_prompt $OK "Spotify GPG key added successfully."

status_prompt $NOTE "Adding Spotify's official repository..."
echo "deb http://repository.spotify.com stable non-free" | sudo tee /etc/apt/sources.list.d/spotify.list > /dev/null
handle_error $? "Failed to add Spotify repository."
status_prompt $OK "Spotify repository added successfully."

status_prompt $NOTE "Updating package list and installing Spotify client..."
sudo apt update -y
handle_error $? "Failed to update package list."
status_prompt $OK "Package list updated successfully."

sudo apt install -y spotify-client
handle_error $? "Failed to install Spotify client."
status_prompt $OK "Spotify client installed successfully."

status_prompt $NOTE "Setting up necessary permissions for Spotify..."
sudo chmod a+wr /usr/share/spotify
handle_error $? "Failed to set permissions for /usr/share/spotify."
sudo chmod a+wr /usr/share/spotify/Apps -R
handle_error $? "Failed to set permissions for /usr/share/spotify/Apps."
status_prompt $OK "Permissions for Spotify set successfully."

# Spicetify Installation
status_prompt $NOTE "Installing Spicetify CLI..."
curl -fsSL https://raw.githubusercontent.com/spicetify/spicetify-cli/master/install.sh | sh
handle_error $? "Failed to install Spicetify CLI."
status_prompt $OK "Spicetify CLI installed successfully."

status_prompt $NOTE "Applying Spicetify for the first time..."
spicetify apply
handle_error $? "Failed to apply Spicetify configuration."
status_prompt $OK "Spicetify configuration applied successfully."

# Create CustomApps directory if it doesn't exist
status_prompt $NOTE "Ensuring CustomApps directory exists..."
mkdir -p "$CUSTOM_APPS_DIR"
status_prompt $OK "CustomApps directory is ready."

# Get the latest release download URL
status_prompt $NOTE "Fetching the latest release of the custom stats app..."
LATEST_RELEASE_URL=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep "browser_download_url.*spicetify-stats.release.zip" | cut -d '"' -f 4)
handle_error $? "Failed to get the latest spicetify-stats release URL."
status_prompt $OK "Latest spicetify-stats release URL fetched successfully."

# Download the zip file
status_prompt $NOTE "Downloading the custom stats app..."
curl -L -o "$ZIP_FILE" "$LATEST_RELEASE_URL"
handle_error $? "Failed to download the ZIP file."
status_prompt $OK "Custom stats app downloaded successfully."

# Unzip the file
status_prompt $NOTE "Unzipping the stats app..."
unzip "$ZIP_FILE" -d "$TEMP_DIR"
handle_error $? "Failed to unzip the ZIP file."
status_prompt $OK "Stats app unzipped successfully."

# Move the unzipped folder to the correct location
status_prompt $NOTE "Moving the stats app to the CustomApps directory..."
mv "$TEMP_DIR"/* "$STATS_APP_DIR"
handle_error $? "Failed to move the unzipped folder to $STATS_APP_DIR."
status_prompt $OK "Stats app moved to CustomApps directory successfully."

# Apply Spicetify configuration
status_prompt $NOTE "Configuring Spicetify with the new custom app..."
spicetify config custom_apps stats
handle_error $? "Failed to configure Spicetify with the custom stats app."
status_prompt $OK "Spicetify configured with custom stats app successfully."

spicetify apply
handle_error $? "Failed to apply Spicetify. You may need to try this manually."
status_prompt $OK "Spicetify applied successfully."

# Clean up
status_prompt $NOTE "Cleaning up temporary files..."
rm -rf "$ZIP_FILE" "$TEMP_DIR"
handle_error $? "Failed to clean up temporary files."
status_prompt $OK "Temporary files cleaned up successfully."

status_prompt $OK "Installation and configuration complete!"
colorize_prompt 2 "Enjoy your customized Spotify experience with Spicetify!"
exit 0
