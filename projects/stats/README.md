# Spicetify Stats (Rate-Limit Bypass Version)

This repository contains a modified Stats app based on the original Spicetify project. It focuses on stability fixes and a practical bypass path for Spotify `429` rate-limit issues.

---

## Quick Install

### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/Akshay-86/spicetify-apps/main/projects/stats/install.ps1 | iex
```

### Linux / macOS
```bash
curl -fsSL https://raw.githubusercontent.com/Akshay-86/spicetify-apps/main/projects/stats/install.sh | bash
```

---

## Quick Uninstall

### Windows (PowerShell) single-line
```powershell
spicetify config custom_apps stats-; Remove-Item -Recurse -Force "$env:APPDATA\spicetify\CustomApps\stats","$env:APPDATA\spicetify\Extensions\stats_extension.js" -ErrorAction SilentlyContinue; spicetify apply
```

### Linux / macOS single-line
```bash
spicetify config custom_apps stats- && rm -rf ~/.config/spicetify/CustomApps/stats ~/.config/spicetify/Extensions/stats_extension.js ~/.spicetify/CustomApps/stats ~/.spicetify/Extensions/stats_extension.js && spicetify apply
```

---

## Rate-Limit Login Flow (Current)

When you hit Spotify `429` limits, click **Login with Spotify** and use the built-in paste flow:

1. Click **Login with Spotify**.
2. Sign in and approve in the browser popup.
3. Copy the full callback URL from the browser address bar.
4. Paste it into the app modal.
5. Click **Save & Refresh**.

Important behavior in the current (legacy proxy) flow:

1. This flow is reliable for bypassing limits.
2. Token lifetime is about 1 hour.
3. Automatic long-term refresh is not available in this mode.
4. You may need to repeat the paste step when the token expires.

---

## Authorship and Credits

This section is intentionally explicit so readers immediately understand contribution ownership.

1. **Original project author**: [harbassan](https://github.com/harbassan) for the base Spicetify Stats app and upstream architecture.
2. **OAuth token provider / callback flow basis**: [huangdarren1106](https://github.com/huangdarren1106/huangdarren1106.github.io) and the musicpiechart-auth redirect approach used by the legacy bypass flow.
3. **Gemini CLI credit (kept intentionally)**: contributed implementation attempts and code changes in this fork.
4. **GitHub Copilot (GPT-5.3-Codex) credit**: performed recovery and stabilization work in this branch, including fixing the React `#31` crash path, repairing the UI regression chain, and reworking OAuth behavior to the currently working copy-paste mode.
5. **Repository owner role**: [Akshay-86](https://github.com/Akshay-86) directed the implementation through prompts, testing feedback, and iteration decisions.

### Summary of key changes in this fork

1. Restored broken Stats behavior after regression edits.
2. Fixed React `#31` crash path and startup stability issues.
3. Improved rate-limit UX with login prompts and recovery flow.
4. Added and tuned cross-platform install scripts.
5. Iterated responsive/table/dropdown styling fixes for Stats pages.

---

## License

MIT License. See the upstream repository for full details.
