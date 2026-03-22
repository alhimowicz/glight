/**
 * Ambient declarations for GJS globals and GNOME Shell resource:// modules.
 * No top-level imports — keeping this file ambient so globals are truly global.
 */

// ── GJS globals ───────────────────────────────────────────────────────────────

declare const global: {
  readonly stage: { readonly width: number; readonly height: number };
};

declare function logError(error: unknown, message?: string): void;

// eslint-disable-next-line no-var
declare var console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
};

// ── GNOME Shell resource modules ──────────────────────────────────────────────

declare module 'resource:///org/gnome/shell/extensions/extension.js' {
  import Gio from 'gi://Gio';

  export class Extension {
    readonly metadata: {
      uuid: string;
      name: string;
      version: number;
      description: string;
      'shell-version': string[];
    };
    getSettings(schemaId?: string): Gio.Settings;
    enable(): void;
    disable(): void;
  }
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
  import Gio from 'gi://Gio';
  import St from 'gi://St';
  import Clutter from 'gi://Clutter';
  import Meta from 'gi://Meta';
  import Shell from 'gi://Shell';

  export const uiGroup: St.Widget;
  export const wm: {
    addKeybinding(
      name: string,
      settings: Gio.Settings,
      flags: Meta.KeyBindingFlags,
      modes: Shell.ActionMode,
      handler: () => void
    ): number;
    removeKeybinding(name: string): void;
  };
  export function pushModal(
    actor: Clutter.Actor,
    params?: { actionMode?: Shell.ActionMode }
  ): boolean;
  export function popModal(actor: Clutter.Actor): void;
}

declare module 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js' {
  import Gio from 'gi://Gio';
  import Adw from 'gi://Adw';

  export class ExtensionPreferences {
    readonly metadata: {
      uuid: string;
      name: string;
      version: number;
      description: string;
    };
    getSettings(schemaId?: string): Gio.Settings;
    fillPreferencesWindow(window: Adw.PreferencesWindow): void;
  }
}
