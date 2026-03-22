UUID        = glight@glight.dev
SCHEMA_ID   = org.gnome.shell.extensions.glight
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

.PHONY: all build install uninstall schemas clean pack dev dev-reload enable disable reload

all: build

build:
	npm run build

schemas:
	glib-compile-schemas schemas/

install: build schemas
	rm -rf $(INSTALL_DIR)
	mkdir -p $(INSTALL_DIR)/schemas
	cp dist/extension.js dist/prefs.js dist/metadata.json dist/stylesheet.css $(INSTALL_DIR)/
	cp schemas/$(SCHEMA_ID).gschema.xml $(INSTALL_DIR)/schemas/
	glib-compile-schemas $(INSTALL_DIR)/schemas/
	@echo "✓ Installed to $(INSTALL_DIR)"
	@echo "  Reload GNOME Shell (X11): Alt+F2 → r → Enter"
	@echo "  Reload (Wayland): log out and back in"
	@echo "  Then enable: gnome-extensions enable $(UUID)"

uninstall:
	rm -rf $(INSTALL_DIR)
	@echo "✓ Uninstalled"

pack: build schemas
	mkdir -p releases
	cd dist && zip -r ../releases/$(UUID).zip . && cd ..
	cp schemas/$(SCHEMA_ID).gschema.xml releases/ 2>/dev/null || true
	@echo "✓ Packed → releases/$(UUID).zip"

dev: install
	gnome-extensions enable $(UUID) 2>/dev/null || true

dev-reload: install
	gnome-extensions disable $(UUID) 2>/dev/null || true
	gnome-extensions enable $(UUID) 2>/dev/null || true
	@echo "✓ Extension reloaded (no logout needed)"

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

reload: disable enable

clean:
	rm -rf dist releases
