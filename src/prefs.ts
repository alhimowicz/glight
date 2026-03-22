import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { SETTINGS_KEY_MAX_RESULTS, SETTINGS_KEY_SHORTCUT } from './settings.js';

export default class GlightPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window: Adw.PreferencesWindow): void {
    const settings = this.getSettings();

    window.set_title('GLight Settings');
    window.set_default_size(600, 400);

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
