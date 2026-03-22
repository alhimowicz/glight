import Gio from 'gi://Gio';

export const SETTINGS_KEY_SHORTCUT = 'toggle-shortcut';
export const SETTINGS_KEY_MAX_RESULTS = 'max-results';
export const SETTINGS_KEY_LAUNCHER_VISIBLE = 'launcher-visible';

/**
 * Thin wrapper around Gio.Settings to provide typed access
 * to GLight's GSchema keys.
 */
export class GlightSettings {
  private _settings: Gio.Settings;

  constructor(settings: Gio.Settings) {
    this._settings = settings;
  }

  get toggleShortcut(): string[] {
    return this._settings.get_strv(SETTINGS_KEY_SHORTCUT);
  }

  get maxResults(): number {
    return this._settings.get_int(SETTINGS_KEY_MAX_RESULTS);
  }

  get launcherVisible(): boolean {
    return this._settings.get_boolean(SETTINGS_KEY_LAUNCHER_VISIBLE);
  }

  set launcherVisible(value: boolean) {
    this._settings.set_boolean(SETTINGS_KEY_LAUNCHER_VISIBLE, value);
  }

  connectChanged(key: string, callback: () => void): number {
    return this._settings.connect(`changed::${key}`, callback);
  }

  disconnect(id: number): void {
    this._settings.disconnect(id);
  }

  get raw(): Gio.Settings {
    return this._settings;
  }
}
