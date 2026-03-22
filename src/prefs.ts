import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
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
      subtitle: settings.get_strv(SETTINGS_KEY_SHORTCUT).join(', ') || '(none)',
    });

    const resetBtn = new Gtk.Button({
      label: 'Reset',
      valign: Gtk.Align.CENTER,
    });
    // Gtk.Widget.add_css_class is available in GTK 4.x
    (resetBtn as unknown as { add_css_class(cls: string): void }).add_css_class('pill');

    resetBtn.connect('clicked', () => {
      settings.reset(SETTINGS_KEY_SHORTCUT);
      shortcutRow.set_subtitle(
        settings.get_strv(SETTINGS_KEY_SHORTCUT).join(', ')
      );
    });

    settings.connect(`changed::${SETTINGS_KEY_SHORTCUT}`, () => {
      shortcutRow.set_subtitle(
        settings.get_strv(SETTINGS_KEY_SHORTCUT).join(', ') || '(none)'
      );
    });

    // @girs generic types for Adw.ActionRow helpers need a cast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shortcutRow.add_suffix(resetBtn as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shortcutRow.set_activatable_widget(resetBtn as any);
    shortcutGroup.add(shortcutRow);

    const noteRow = new Adw.ActionRow({
      title: 'Change shortcut',
      subtitle:
        'Open GNOME Settings → Keyboard → Custom Shortcuts to reassign the key.',
    });
    shortcutGroup.add(noteRow);

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
