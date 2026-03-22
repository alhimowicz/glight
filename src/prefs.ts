import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { SETTINGS_KEY_MAX_RESULTS, SETTINGS_KEY_SHORTCUT, SETTINGS_KEY_LAUNCHER_VISIBLE } from './settings.js';

export default class GlightPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const settings = this.getSettings();

    window.set_title('GLight Settings');
    window.set_default_size(600, 400);

    // ── Launcher toggle page ───────────────────────────────────────────────────
    const launcherPage = new Adw.PreferencesPage({
      title: 'Launcher',
      icon_name: 'system-search-symbolic',
    });
    window.add(launcherPage);

    const toggleGroup = new Adw.PreferencesGroup({
      title: 'Preview',
      description: 'Open the launcher directly from this window',
    });
    launcherPage.add(toggleGroup);

    const toggleRow = new Adw.ActionRow({
      title: 'Toggle Launcher',
      subtitle: 'Show or hide the GLight launcher',
    });

    const toggleBtn = new Gtk.Button({
      label: 'Toggle',
      valign: Gtk.Align.CENTER,
    });
    (toggleBtn as unknown as { add_css_class(cls: string): void }).add_css_class('suggested-action');
    (toggleBtn as unknown as { add_css_class(cls: string): void }).add_css_class('pill');

    toggleBtn.connect('clicked', () => {
      const current = settings.get_boolean(SETTINGS_KEY_LAUNCHER_VISIBLE);
      settings.set_boolean(SETTINGS_KEY_LAUNCHER_VISIBLE, !current);
    });

    settings.connect(`changed::${SETTINGS_KEY_LAUNCHER_VISIBLE}`, () => {
      const visible = settings.get_boolean(SETTINGS_KEY_LAUNCHER_VISIBLE);
      toggleBtn.set_label(visible ? 'Hide' : 'Show');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toggleRow.add_suffix(toggleBtn as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toggleRow.set_activatable_widget(toggleBtn as any);
    toggleGroup.add(toggleRow);

    // ── Keyboard page ─────────────────────────────────────────────────────────
    const keyboardPage = new Adw.PreferencesPage({
      title: 'Keyboard',
      icon_name: 'input-keyboard-symbolic',
    });
    window.add(keyboardPage);

    const shortcutGroup = new Adw.PreferencesGroup({
      title: 'Shortcut',
      description: 'Keyboard shortcut to open the GLight launcher',
    });
    keyboardPage.add(shortcutGroup);

    const shortcutRow = new Adw.ActionRow({
      title: 'Toggle Launcher',
    });

    const shortcutLabel = new Gtk.ShortcutLabel({
      accelerator: settings.get_strv(SETTINGS_KEY_SHORTCUT)[0] ?? '',
      valign: Gtk.Align.CENTER,
    });

    let capturing = false;
    let captureController: Gtk.EventControllerKey | null = null;

    const captureBtn = new Gtk.Button({
      label: 'Set Shortcut',
      valign: Gtk.Align.CENTER,
    });
    (captureBtn as unknown as { add_css_class(cls: string): void }).add_css_class('pill');

    captureBtn.connect('clicked', () => {
      if (capturing) return;
      capturing = true;
      captureBtn.set_label('Press a key combo…');

      captureController = new Gtk.EventControllerKey();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).add_controller(captureController);

      const stopCapture = () => {
        if (!captureController) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).remove_controller(captureController);
        captureController = null;
        capturing = false;
        captureBtn.set_label('Set Shortcut');
      };

      captureController.connect('key-pressed', (_ctrl: Gtk.EventControllerKey, keyval: number, _keycode: number, state: Gdk.ModifierType) => {
        if (keyval === Gdk.KEY_Escape && (state & ~Gdk.ModifierType.LOCK_MASK) === 0) {
          stopCapture();
          return true;
        }
        const mods = state & Gtk.accelerator_get_default_mod_mask();
        if (Gtk.accelerator_valid(keyval, mods)) {
          settings.set_strv(SETTINGS_KEY_SHORTCUT, [Gtk.accelerator_name(keyval, mods)]);
          stopCapture();
        }
        return true;
      });
    });

    const resetBtn = new Gtk.Button({
      label: 'Reset',
      valign: Gtk.Align.CENTER,
    });
    (resetBtn as unknown as { add_css_class(cls: string): void }).add_css_class('pill');

    resetBtn.connect('clicked', () => {
      settings.reset(SETTINGS_KEY_SHORTCUT);
    });

    settings.connect(`changed::${SETTINGS_KEY_SHORTCUT}`, () => {
      shortcutLabel.set_accelerator(settings.get_strv(SETTINGS_KEY_SHORTCUT)[0] ?? '');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shortcutRow.add_suffix(shortcutLabel as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shortcutRow.add_suffix(captureBtn as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shortcutRow.add_suffix(resetBtn as any);
    shortcutGroup.add(shortcutRow);

    // ── General page ──────────────────────────────────────────────────────────
    const generalPage = new Adw.PreferencesPage({
      title: 'General',
      icon_name: 'preferences-system-symbolic',
    });
    window.add(generalPage);

    const resultsGroup = new Adw.PreferencesGroup({
      title: 'Search Results',
    });
    generalPage.add(resultsGroup);

    const maxResultsRow = new Adw.SpinRow({
      title: 'Maximum results',
      subtitle: 'How many applications to display in the launcher list',
      adjustment: new Gtk.Adjustment({
        lower: 5,
        upper: 25,
        step_increment: 1,
        value: settings.get_int(SETTINGS_KEY_MAX_RESULTS),
      }),
    });

    settings.bind(
      SETTINGS_KEY_MAX_RESULTS,
      maxResultsRow,
      'value',
      0 /* Gio.SettingsBindFlags.DEFAULT */
    );

    resultsGroup.add(maxResultsRow);
  }
}
