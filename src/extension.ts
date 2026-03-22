import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Launcher } from './launcher.js';
import { GlightSettings, SETTINGS_KEY_SHORTCUT, SETTINGS_KEY_LAUNCHER_VISIBLE } from './settings.js';

export default class GlightExtension extends Extension {
  private _launcher: Launcher | null = null;
  private _settings: GlightSettings | null = null;
  private _shortcutChangedId = 0;
  private _visibleChangedId = 0;

  enable(): void {
    this._settings = new GlightSettings(this.getSettings());
    this._launcher = new Launcher(this._settings);
    this._bindShortcut();

    this._shortcutChangedId = this._settings.connectChanged(
      SETTINGS_KEY_SHORTCUT,
      () => {
        this._unbindShortcut();
        this._bindShortcut();
      }
    );

    this._visibleChangedId = this._settings.connectChanged(
      SETTINGS_KEY_LAUNCHER_VISIBLE,
      () => {
        if (this._settings?.launcherVisible) {
          this._launcher?.show();
        } else {
          this._launcher?.hide();
        }
      }
    );
  }

  disable(): void {
    this._unbindShortcut();

    if (this._shortcutChangedId && this._settings) {
      this._settings.disconnect(this._shortcutChangedId);
      this._shortcutChangedId = 0;
    }

    if (this._visibleChangedId && this._settings) {
      this._settings.disconnect(this._visibleChangedId);
      this._visibleChangedId = 0;
    }

    this._launcher?.destroy();
    this._launcher = null;
    this._settings = null;
  }

  private _bindShortcut(): void {
    if (!this._settings) return;
    Main.wm.addKeybinding(
      SETTINGS_KEY_SHORTCUT,
      this._settings.raw,
      Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
      Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
      () => this._launcher?.toggle()
    );
  }

  private _unbindShortcut(): void {
    Main.wm.removeKeybinding(SETTINGS_KEY_SHORTCUT);
  }
}
