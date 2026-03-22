# GLight

A Spotlight/Raycast-like launcher for GNOME Shell, built with TypeScript.

Press **Super+Return** to open the overlay, type to search installed apps, and hit **Enter** to launch.

## Requirements

- GNOME Shell 45+
- Node.js (for building)
- `glib-compile-schemas` (part of `glib2-devel` / `libglib2.0-dev`)

## Build & Install

```bash
npm install        # install TypeScript toolchain and @girs type packages
make install       # build, compile schemas, and install to ~/.local/share/gnome-shell/extensions/
gnome-extensions enable glight@glight.dev
```

Reload GNOME Shell after installing:
- **X11:** Alt+F2 → type `r` → Enter
- **Wayland:** log out and back in

## Uninstall

```bash
make uninstall
```

## Development

```bash
npm run build      # compile TypeScript → dist/
make dev           # install + enable in one step
make enable        # enable the extension
make disable       # disable the extension
make reload        # disable then re-enable (useful after changes)
make pack          # produce releases/glight@glight.dev.zip for distribution
make clean         # remove dist/ and releases/
```

## Settings

| Key | Default | Description |
|---|---|---|
| `toggle-shortcut` | `<Super>Return` | Keyboard shortcut to open/close the launcher |
| `max-results` | `10` | Number of search results shown (5–25) |

Open **GNOME Extensions** or run `gnome-extensions prefs glight@glight.dev` to change settings.

## Project Structure

```
src/
  extension.ts   — Extension lifecycle + keybinding registration
  launcher.ts    — Overlay widget tree (St / Clutter), search + results
  prefs.ts       — Adwaita preferences window (GTK4)
  settings.ts    — Typed wrapper around Gio.Settings / GSchema

schemas/
  *.gschema.xml  — Compiled by glib-compile-schemas at install time

dist/            — esbuild output (gitignored)
```
