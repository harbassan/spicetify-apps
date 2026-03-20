# Spicetify Stats Installation Script (Fixed Version)
# Source: https://github.com/Akshay-86/spicetify-apps

$githubUser = "Akshay-86"
$repoName = "spicetify-apps"
$branch = "main"

$spicetifyDir = "$env:APPDATA\spicetify"
# Check if spicetify is using a different directory (e.g. Linux-like on Windows or custom path)
if (!(Test-Path -Path $spicetifyDir)) {
    $spicetifyDir = "$HOME\.spicetify"
}

$customAppsDir = "$spicetifyDir\CustomApps"
$extensionsDir = "$spicetifyDir\Extensions"
$statsDir = "$customAppsDir\stats"

Write-Host "Downloading and Installing Fixed Spicetify Stats..." -ForegroundColor Cyan

# Create folders
If (!(Test-Path -Path $statsDir)) { New-Item -ItemType Directory -Path $statsDir -Force }
If (!(Test-Path -Path $extensionsDir)) { New-Item -ItemType Directory -Path $extensionsDir -Force }

# Download files from GitHub 'dist' folder
$baseUrl = "https://raw.githubusercontent.com/$githubUser/$repoName/$branch/projects/stats/dist"

$files = @("index.js", "style.css", "manifest.json", "cache.js", "debug.js", "extension.js")

foreach ($file in $files) {
    Write-Host "Downloading $file..."
    Invoke-WebRequest -Uri "$baseUrl/$file" -OutFile "$statsDir\$file" -ErrorAction SilentlyContinue
}

# Install extension
Write-Host "Installing extension..."
Copy-Item -Path "$statsDir\extension.js" -Destination "$extensionsDir\stats_extension.js" -Force

# Apply Spicetify config
Write-Host "Applying Spicetify configuration..."
spicetify config custom_apps stats
# Check if extension is already enabled
$exts = spicetify config extensions
if ($exts -notmatch "stats_extension.js") {
    spicetify config extensions stats_extension.js
}

spicetify apply

Write-Host "Success! Stats installed and applied." -ForegroundColor Green
