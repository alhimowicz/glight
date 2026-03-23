import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { GlightSettings } from './settings.js';

interface SystemAction {
  name: string;
  iconName: string;
  keywords: string[];
  execute: () => void;
}

type ResultItem = { kind: 'action'; action: SystemAction } | { kind: 'app'; info: Gio.AppInfo };

export class Launcher {
  private _settings: GlightSettings;
  private _overlay: St.Widget | null = null;
  private _resultsList: St.BoxLayout | null = null;
  private _searchEntry: St.Entry | null = null;
  private _scrollView: St.ScrollView | null = null;
  private _isVisible = false;
  private _isAnimating = false;
  private _currentResults: ResultItem[] = [];
  private _lastQuery = '';

  private readonly _systemActions: SystemAction[] = [
    {
      name: 'Lock Screen',
      iconName: 'system-lock-screen-symbolic',
      keywords: ['lock', 'lock screen'],
      execute: () => Gio.DBus.session.call(
        'org.gnome.ScreenSaver', '/org/gnome/ScreenSaver',
        'org.gnome.ScreenSaver', 'Lock',
        null, null, Gio.DBusCallFlags.NONE, -1, null, null
      ),
    },
    {
      name: 'Power Off',
      iconName: 'system-shutdown-symbolic',
      keywords: ['power off', 'shutdown', 'shut down', 'poweroff', 'power'],
      execute: () => Gio.DBus.session.call(
        'org.gnome.SessionManager', '/org/gnome/SessionManager',
        'org.gnome.SessionManager', 'Shutdown',
        null, null, Gio.DBusCallFlags.NONE, -1, null, null
      ),
    },
    {
      name: 'Restart',
      iconName: 'system-restart-symbolic',
      keywords: ['restart', 'reboot'],
      execute: () => Gio.DBus.session.call(
        'org.gnome.SessionManager', '/org/gnome/SessionManager',
        'org.gnome.SessionManager', 'Reboot',
        null, null, Gio.DBusCallFlags.NONE, -1, null, null
      ),
    },
    {
      name: 'Log Out',
      iconName: 'system-log-out-symbolic',
      keywords: ['log out', 'logout', 'sign out', 'signout'],
      execute: () => Gio.DBus.session.call(
        'org.gnome.SessionManager', '/org/gnome/SessionManager',
        'org.gnome.SessionManager', 'Logout',
        new GLib.Variant('(u)', [0]), null, Gio.DBusCallFlags.NONE, -1, null, null
      ),
    },
  ];

  constructor(settings: GlightSettings) {
    this._settings = settings;
  }

  toggle(): void {
    this._isVisible ? this.hide() : this.show();
  }

  show(): void {
    if (this._isVisible || this._isAnimating) return;
    this._buildUI();
    this._isVisible = true;
  }

  hide(): void {
    if (!this._isVisible || !this._overlay) return;
    this._lastQuery = this._searchEntry?.clutter_text.get_text() ?? '';
    const overlay = this._overlay;
    this._isVisible = false;
    this._overlay = null;
    this._resultsList = null;
    this._searchEntry = null;
    this._scrollView = null;
    this._settings.launcherVisible = false;

    this._isAnimating = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (overlay as any).ease({
      opacity: 0,
      duration: 120,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
      onComplete: () => {
        this._isAnimating = false;
        Main.uiGroup.remove_child(overlay);
        overlay.destroy();
      },
    });
  }

  destroy(): void {
    if (this._overlay) {
      Main.uiGroup.remove_child(this._overlay);
      this._overlay.destroy();
      this._overlay = null;
    }
    this._isVisible = false;
  }

  private _themeClass(): string {
    try {
      const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
      return settings.get_string('color-scheme') === 'prefer-dark' ? 'glight-dark' : 'glight-light';
    } catch {
      return 'glight-light';
    }
  }

  private _buildUI(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const display = (global as any).display;
    const monitorIndex = display.get_current_monitor();
    const monitor = display.get_monitor_geometry(monitorIndex);

    // Full-stage overlay so clicks anywhere (including other monitors) dismiss it
    this._overlay = new St.Widget({
      style_class: `glight-overlay ${this._themeClass()}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layout_manager: new Clutter.FixedLayout() as any,
      reactive: true,
      can_focus: true,
      x: 0,
      y: 0,
      width: global.stage.width,
      height: global.stage.height,
      opacity: 0,
    });

    // Fixed position: horizontally centered on the monitor, 30% from the top.
    // Using explicit coordinates on the FixedLayout overlay avoids BinLayout
    // fighting with y_align and expand flags when the results list grows.

    // Dismiss on click outside the card
    this._overlay.connect('button-press-event', () => {
      this.hide();
      return Clutter.EVENT_STOP;
    });

    // ESC to dismiss (catches events when overlay itself has focus)
    this._overlay.connect(
      'key-press-event',
      (_actor: Clutter.Actor, event: Clutter.Event) => {
        if (event.get_key_symbol() === Clutter.KEY_Escape) {
          this.hide();
          return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
      }
    );

    // Redirect printable keystrokes back to the search entry when a result row has focus
    this._overlay.connect(
      'captured-event',
      (_actor: Clutter.Actor, event: Clutter.Event) => {
        if (event.type() !== Clutter.EventType.KEY_PRESS) return Clutter.EVENT_PROPAGATE;
        if (!this._searchEntry || this._searchEntry.clutter_text.has_key_focus()) return Clutter.EVENT_PROPAGATE;

        const key = event.get_key_symbol();
        if (key === Clutter.KEY_Escape || key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter ||
            key === Clutter.KEY_Up || key === Clutter.KEY_Down || key === Clutter.KEY_Tab) {
          return Clutter.EVENT_PROPAGATE;
        }

        const unicode = event.get_key_unicode();
        if (unicode && unicode.trim().length > 0) {
          this._searchEntry.grab_key_focus();
          return Clutter.EVENT_PROPAGATE;
        }

        return Clutter.EVENT_PROPAGATE;
      }
    );

    const cardWidth = 640; // matches $size-card-width CSS token
    const container = new St.BoxLayout({
      style_class: 'glight-container',
      vertical: true,
      reactive: true,
      x: monitor.x + Math.round((monitor.width - cardWidth) / 2),
      y: monitor.y + Math.round(monitor.height * 0.30),
    });

    container.connect('button-press-event', () => Clutter.EVENT_STOP);

    this._searchEntry = new St.Entry({
      style_class: 'glight-search-entry',
      hint_text: 'Search applications…',
      can_focus: true,
      x_expand: true,
    });

    this._scrollView = new St.ScrollView({
      style_class: 'glight-results-scroll',
      x_expand: true,
      hscrollbar_policy: St.PolicyType.NEVER,
      vscrollbar_policy: St.PolicyType.AUTOMATIC,
    });

    this._resultsList = new St.BoxLayout({
      style_class: 'glight-results-list',
      vertical: true,
      x_expand: true,
    });

    this._scrollView.set_child(this._resultsList);
    container.add_child(this._searchEntry);
    container.add_child(this._scrollView);
    this._overlay.add_child(container);

    Main.uiGroup.add_child(this._overlay);

    // Fade in
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this._overlay as any).ease({
      opacity: 255,
      duration: 140,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    });

    if (this._lastQuery) {
      this._searchEntry.clutter_text.set_text(this._lastQuery);
    }

    this._searchEntry.grab_key_focus();
    this._populateResults(this._lastQuery);

    // Live filter
    this._searchEntry.clutter_text.connect('text-changed', () => {
      const query = (this._searchEntry as St.Entry).clutter_text.get_text();
      this._populateResults(query);
    });

    // ESC → close; Down/Tab → focus first result
    this._searchEntry.clutter_text.connect(
      'key-press-event',
      (_actor: Clutter.Actor, event: Clutter.Event) => {
        const key = event.get_key_symbol();
        if (key === Clutter.KEY_Escape) {
          this.hide();
          return Clutter.EVENT_STOP;
        }
        if (key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) {
          this._launchFirstResult();
          return Clutter.EVENT_STOP;
        }
        if (key === Clutter.KEY_Down || key === Clutter.KEY_Tab) {
          this._focusFirstResult();
          return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
      }
    );
  }

  private _populateResults(query: string): void {
    if (!this._resultsList) return;
    this._resultsList.destroy_all_children();
    this._currentResults = [];

    const q = query.toLowerCase().trim();

    const matchingActions = q.length === 0
      ? []
      : this._systemActions.filter(a => a.keywords.some(kw => kw.includes(q)));

    const matchingApps = q.length > 0 ? this._getFilteredApps(q, this._settings.maxResults) : [];

    if (q.length > 0 && matchingActions.length === 0 && matchingApps.length === 0) {
      this._resultsList.add_child(new St.Label({
        style_class: 'glight-no-results',
        text: 'No results',
        x_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
      }));
      return;
    }

    for (const action of matchingActions) {
      this._currentResults.push({ kind: 'action', action });
      this._resultsList.add_child(this._createActionRow(action));
    }

    for (const app of matchingApps) {
      this._currentResults.push({ kind: 'app', info: app });
      this._resultsList.add_child(this._createAppRow(app));
    }
  }

  private _getFilteredApps(query: string, limit: number): Gio.AppInfo[] {
    const q = query.toLowerCase();
    const results: Gio.AppInfo[] = [];

    for (const app of Gio.AppInfo.get_all()) {
      if (!app.should_show()) continue;
      if (q) {
        const name = app.get_name().toLowerCase();
        const desc = app.get_description()?.toLowerCase() ?? '';
        if (!name.includes(q) && !desc.includes(q)) continue;
      }
      results.push(app);
    }

    results.sort((a, b) => a.get_name().localeCompare(b.get_name()));
    return results.slice(0, limit);
  }

  private _createActionRow(action: SystemAction): St.BoxLayout {
    const row = new St.BoxLayout({
      style_class: 'glight-result-row',
      reactive: true,
      can_focus: true,
      x_expand: true,
    });

    row.add_child(new St.Icon({
      style_class: 'glight-result-icon',
      icon_name: action.iconName,
      icon_size: 32,
      y_align: Clutter.ActorAlign.CENTER,
    }));

    const labelBox = new St.BoxLayout({ vertical: true, y_align: Clutter.ActorAlign.CENTER, x_expand: true });
    labelBox.add_child(new St.Label({ style_class: 'glight-result-name', text: action.name }));
    row.add_child(labelBox);
    row.add_child(this._createTag('System'));

    const execute = () => { action.execute(); this.hide(); };

    row.connect('button-press-event', () => { execute(); return Clutter.EVENT_STOP; });
    row.connect('key-press-event', (_actor: Clutter.Actor, event: Clutter.Event) => {
      const key = event.get_key_symbol();
      if (key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) { execute(); return Clutter.EVENT_STOP; }
      if (key === Clutter.KEY_Escape) { this.hide(); return Clutter.EVENT_STOP; }
      if (key === Clutter.KEY_Down) {
        const next = row.get_next_sibling() as St.BoxLayout | null;
        if (next) { next.grab_key_focus(); this._ensureVisible(next); }
        return Clutter.EVENT_STOP;
      }
      if (key === Clutter.KEY_Up) {
        const prev = row.get_previous_sibling() as St.BoxLayout | null;
        if (prev) { prev.grab_key_focus(); this._ensureVisible(prev); }
        else { this._searchEntry?.grab_key_focus(); }
        return Clutter.EVENT_STOP;
      }
      return Clutter.EVENT_PROPAGATE;
    });

    return row;
  }

  private _createAppRow(appInfo: Gio.AppInfo): St.BoxLayout {
    const row = new St.BoxLayout({
      style_class: 'glight-result-row',
      reactive: true,
      can_focus: true,
      x_expand: true,
    });

    const icon = new St.Icon({
      style_class: 'glight-result-icon',
      icon_size: 32,
      y_align: Clutter.ActorAlign.CENTER,
    });
    const gIcon = appInfo.get_icon();
    if (gIcon) icon.set_gicon(gIcon);

    const labelBox = new St.BoxLayout({
      vertical: true,
      y_align: Clutter.ActorAlign.CENTER,
      x_expand: true,
    });

    labelBox.add_child(
      new St.Label({
        style_class: 'glight-result-name',
        text: appInfo.get_name(),
      })
    );

    const desc = appInfo.get_description();
    if (desc) {
      labelBox.add_child(
        new St.Label({
          style_class: 'glight-result-description',
          text: desc,
        })
      );
    }

    row.add_child(icon);
    row.add_child(labelBox);
    row.add_child(this._createTag('Application'));

    const launch = () => this._launchApp(appInfo);

    row.connect('button-press-event', () => {
      launch();
      return Clutter.EVENT_STOP;
    });

    row.connect('key-press-event', (_actor: Clutter.Actor, event: Clutter.Event) => {
      const key = event.get_key_symbol();
      if (key === Clutter.KEY_Return || key === Clutter.KEY_KP_Enter) {
        launch();
        return Clutter.EVENT_STOP;
      }
      if (key === Clutter.KEY_Escape) {
        this.hide();
        return Clutter.EVENT_STOP;
      }
      if (key === Clutter.KEY_Down) {
        const next = row.get_next_sibling() as St.BoxLayout | null;
        if (next) {
          next.grab_key_focus();
          this._ensureVisible(next);
        }
        return Clutter.EVENT_STOP;
      }
      if (key === Clutter.KEY_Up) {
        const prev = row.get_previous_sibling() as St.BoxLayout | null;
        if (prev) {
          prev.grab_key_focus();
          this._ensureVisible(prev);
        } else {
          this._searchEntry?.grab_key_focus();
        }
        return Clutter.EVENT_STOP;
      }
      return Clutter.EVENT_PROPAGATE;
    });

    return row;
  }

  private _createTag(label: string): St.Label {
    return new St.Label({
      style_class: 'glight-result-tag',
      text: label,
      y_align: Clutter.ActorAlign.CENTER,
    });
  }

  private _focusFirstResult(): void {
    const first = this._resultsList?.get_first_child() as St.Widget | null;
    first?.grab_key_focus();
  }

  private _ensureVisible(row: St.BoxLayout): void {
    if (!this._scrollView) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adjustment = (this._scrollView as any).vadjustment;
    const [, rowY] = row.get_transformed_position();
    const [, scrollY] = this._scrollView.get_transformed_position();
    const relY = rowY - scrollY;
    const rowH = row.height;
    const viewH = this._scrollView.height;

    if (relY < 0) {
      adjustment.value += relY;
    } else if (relY + rowH > viewH) {
      adjustment.value += relY + rowH - viewH;
    }
  }

  private _launchFirstResult(): void {
    const first = this._currentResults[0];
    if (!first) return;
    if (first.kind === 'action') {
      first.action.execute();
      this.hide();
    } else {
      this._launchApp(first.info);
    }
  }

  private _launchApp(appInfo: Gio.AppInfo): void {
    try {
      const shellApp = Shell.AppSystem.get_default().lookup_app(appInfo.get_id() ?? '');
      if (shellApp && shellApp.get_state() === Shell.AppState.RUNNING) {
        shellApp.activate();
      } else {
        appInfo.launch([], null);
      }
      this.hide();
    } catch (e) {
      logError(e instanceof Error ? e : new Error(String(e)), `GLight: failed to launch ${appInfo.get_name()}`);
    }
  }
}
