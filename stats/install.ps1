# Define variables
$customAppsDir = "$env:USERPROFILE\.config\spicetify\CustomApps"
$statsAppDir = "$customAppsDir\stats"
$repo = "harbassan/spicetify-apps"
$zipFile = "$env:TEMP\spicetify-stats.zip"
$tempDir = "$env:TEMP\spicetify-stats"

# Create CustomApps directory if it doesn't exist
If (!(Test-Path -Path $customAppsDir)) {
  New-Item -ItemType Directory -Path $customAppsDir
}

# Get the latest release download URL
$latestReleaseUrl = (Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest").assets.browser_download_url

# Download the zip file
Invoke-WebRequest -Uri $latestReleaseUrl -OutFile $zipFile

# Unzip the file
Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force

# Move the unzipped folder to the correct location
if (Test-Path -Path "$statsAppDir\*")
{
  Remove-Item -Path "$statsAppDir\*" -Recurse -Force
  Write-Host "warning " -ForegroundColor DarkYellow -NoNewline
  Write-Host "`"$statsAppDir`" Pre-existing file/s were found and deleted."
}

Move-Item -Path "$tempDir\*" -Destination $statsAppDir -Force

# Apply Spicetify configuration
spicetify config custom_apps stats
spicetify apply

# Clean up
Remove-Item -Path $zipFile, $tempDir -Recurse -Force

Write-Host "success " -ForegroundColor DarkGreen -NoNewline
Write-Host "Installation complete. Enjoy your new stats app!"
