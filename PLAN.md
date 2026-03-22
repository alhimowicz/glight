# GLight — Development Plan

A Spotlight/Raycast-like launcher for GNOME Shell, built with TypeScript.

---

## Phase 1 — Foundation (current)

- [x] Project scaffold (metadata, tsconfig, package.json)
- [x] esbuild pipeline (`build.js` → `dist/`)
- [x] Makefile: `build`, `install`, `uninstall`, `pack`
- [x] GSchema (`toggle-shortcut`, `max-results`)
- [x] `Extension` class — registers keybinding, wires enable/disable lifecycle
- [x] `Launcher` class — overlay UI with St widgets, fade in/out
- [x] `GlightSettings` wrapper — typed access to GSchema keys
- [x] `ExtensionPreferences` — Adwaita prefs window
- [x] `stylesheet.css` — native-feeling dark card UI

---

## Phase 2 — Core UX

- [ ] **Keyboard navigation** — Up/Down arrows cycle through result rows; Enter launches
- [ ] **Frecency sorting** — Track launch counts + recency in GSettings (or a JSON file under `~/.local/share/glight/`); sort by score when query is empty
- [ ] **App description in results** — already partially wired; ensure truncation on narrow screens
- [ ] **Launch animation** — brief scale-up on the row before hiding the overlay
- [ ] **Wayland clipboard** — copy `.desktop` file path to clipboard on Shift+Enter

---

## Phase 3 — Search Providers

- [ ] **Calculator** — detect arithmetic expressions (e.g. `2 + 2`) and show result inline
- [ ] **File search** — use `Tracker` (via `gi://Tracker`) or a simple `find` subprocess for `~/` paths
- [ ] **Web search** — if no apps match, offer "Search DuckDuckGo for …" row
- [ ] **Run command** — prefix `>` to run arbitrary shell commands (spawned detached)

---

## Phase 4 — Preferences Enhancements

- [ ] **Shortcut editor** — replace the static row with an inline `Gtk.ShortcutLabel` + capture widget so users can record a new binding directly in prefs (no need to leave the window)
- [ ] **Theme toggle** — light / dark / follow-system option for the overlay card
- [ ] **Provider toggles** — enable/disable calculator, file search, web search per user preference

---

## Phase 5 — Polish & Release

- [ ] **Accessibility** — `St.Widget` accessible names, keyboard-only flow review
- [ ] **Error boundaries** — graceful fallback if `Shell.AppSystem` returns unexpected data
- [ ] **CI** — GitHub Actions: `tsc --noEmit` typecheck + `make pack` to produce the zip artifact on every push
- [ ] **extensions.gnome.org submission** — metadata review, screenshots, changelog

---

## Architecture Notes

```
src/
  extension.ts   ← Extension lifecycle + keybinding registration
  launcher.ts    ← Overlay widget tree (St / Clutter), search + results
  prefs.ts       ← Adwaita preferences window (GTK4)
  settings.ts    ← Typed wrapper around Gio.Settings / GSchema

schemas/
  *.gschema.xml  ← Compiled by glib-compile-schemas at install time

dist/            ← esbuild output (gitignored)
  extension.js
  prefs.js
  metadata.json
  stylesheet.css
```

### Key API surface

| Need | API |
|---|---|
| Add overlay to shell | `Main.uiGroup.add_child()` |
| Modal keyboard capture | `Main.pushModal()` / `Main.popModal()` |
| Register keybinding | `Main.wm.addKeybinding()` |
| List installed apps | `Shell.AppSystem.get_default().get_installed()` |
| Launch app | `Gio.AppInfo.launch()` |
| Prefs window | `Adw.PreferencesWindow` + `Adw.PreferencesPage` |

---

## Dev Workflow

```bash
npm install          # install TS toolchain + @girs type packages
npm run build        # compile → dist/
make install         # copy dist + schemas to ~/.local/share/gnome-shell/extensions/
gnome-extensions enable glight@glight.dev

# X11: reload shell without logout
# Wayland: log out and back in
```
