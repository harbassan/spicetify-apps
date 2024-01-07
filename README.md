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

### Manual Installation

Download the files in the [dist branch](https://github.com/harbassan/spicetify-stats/archive/refs/heads/dist.zip) and rename the unzipped folder to `stats`, and then place that folder into your `CustomApps` folder in the `spicetify` directory. It should be similair to this:

```
📦spicetify\CustomApps
 ┣ 📂marketplace
 ┣ etc...
 ┗ 📂spicetify-stats
 ┃ ┣ 📜extension.js
 ┃ ┣ 📜index.js
 ┃ ┣ 📜manifest.json
 ┃ ┗ 📜style.css
```

Then run these commands to apply:

```powershell
spicetify config custom_apps spicetify-stats
spicetify apply
```

For more help on installing visit the [Spicetify Docs](https://spicetify.app/docs/advanced-usage/custom-apps#installing).

### Uninstallation

To disable the app run these commands:

```powershell
spicetify config custom_apps spicetify-stats-
spicetify apply
```

If you want to completely remove the app just delete the `spicetify-stats` folder after running the above commands.

---

If you have any questions or issues regarding the app open an issue on this repo. Please specify your spicetify version and installation method if you do so.

If you really like the app i'd be grateful if you liked the repo ❤️.
