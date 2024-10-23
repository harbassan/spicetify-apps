# Spicetify Stats

### A custom app that shows you your top artists, tracks, genres and an analysis of your whole library, including individual playlists.

---

### Top Artists

![preview](previews/top_artists.png)

---

### Top Tracks

![preview](previews/top_tracks.png)

---

### Top Genres

![preview](previews/top_genres.png)

---

### Library Analysis

![preview](previews/library_analysis.png)

---

### Playlist Analysis

![preview](previews/playlist_analysis.png)

---

### Top Albums (works with Last.fm Sync only)

![preview](previews/top_albums.png)

---

### Last.fm Daily Charts

![preview](previews/top_charts.png)

---
### Automatic Installation (Linux)

```sh
sh <(curl -s https://raw.githubusercontent.com/harbassan/spicetify-apps/main/stats/install.sh)
```

### Automatic Installation (Windows, Powershell)

```ps1
iwr -useb "https://raw.githubusercontent.com/harbassan/spicetify-apps/main/stats/install.ps1" | iex
```

### Manual Installation

Download the zip file in the [latest release](https://github.com/harbassan/spicetify-apps/releases?q=stats&expanded=true), rename the unzipped folder to `stats`, then place that folder into your `CustomApps` folder in the `spicetify` directory and you're all done. If everything's correct, the structure should be similar to this:

```
📦spicetify\CustomApps
 ┣ 📂marketplace
 ┣ etc...
 ┗ 📂stats
 ┃ ┣ 📜extension.js
 ┃ ┣ 📜index.js
 ┃ ┣ 📜manifest.json
 ┃ ┗ 📜style.css
```

Finally, run these commands to apply:

```powershell
spicetify config custom_apps stats
spicetify apply
```

That's it. Enjoy.

For more help on installing visit the [Spicetify Docs](https://spicetify.app/docs/advanced-usage/custom-apps#installing).

### Uninstallation

To uninstall the app, run these commands:

```powershell
spicetify config custom_apps stats-
spicetify apply
```

If you want to remove the app completely, just delete the `stats` folder after running the above commands.

---

If you have any questions or issues regarding the app, open an issue on this repo. While doing so, please specify your spicetify version and installation method.

If you like the app, I'd be really grateful if you liked the repo ❤️.
