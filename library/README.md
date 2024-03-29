# Spicetify Library

### A custom app that makes managing your library a better experience.

---

### Album Collections

![preview](previews/albums.png)

---

### Playlist Folder Images

![preview](previews/playlists.png)

---

### Manual Installation

Download the zip file in the [latest release](https://github.com/harbassan/spicetify-apps/releases?q=library&expanded=true), rename the unzipped folder to `library`, then place that folder into your `CustomApps` folder in the `spicetify` directory and you're all done. If everything's correct, the structure should be similar to this:

```
📦spicetify\CustomApps
 ┣ 📂marketplace
 ┣ etc...
 ┗ 📂library
 ┃ ┣ 📜extension.js
 ┃ ┣ 📜index.js
 ┃ ┣ 📜manifest.json
 ┃ ┗ 📜style.css
```

Finally, run these commands to apply:

```powershell
spicetify config custom_apps library
spicetify apply
```

That's it. Enjoy.

For more help on installing visit the [Spicetify Docs](https://spicetify.app/docs/advanced-usage/custom-apps#installing).

### Uninstallation

To uninstall the app, run these commands:

```powershell
spicetify config custom_apps library-
spicetify apply
```

If you want to remove the app completely, just delete the `library` folder after running the above commands.

---

If you have any questions or issues regarding the app, open an issue on this repo. While doing so, please specify your spicetify version and installation method.

If you like the app, I'd be really grateful if you liked the repo ❤️.
