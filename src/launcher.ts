import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { GlightSettings } from './settings.js';

export class Launcher {
  private _settings: GlightSettings;
  private _overlay: St.Widget | null = null;
  private _resultsList: St.BoxLayout | null = null;
  private _searchEntry: St.Entry | null = null;
  private _isVisible = false;
  private _isAnimating = false;

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
    const overlay = this._overlay;
    this._isVisible = false;
    this._overlay = null;
    this._resultsList = null;
    this._searchEntry = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Main.popModal(overlay as any);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Main.popModal(this._overlay as any);
      Main.uiGroup.remove_child(this._overlay);
      this._overlay.destroy();
      this._overlay = null;
    }
    this._isVisible = false;
  }

  private _buildUI(): void {
    this._overlay = new St.Widget({
      style_class: 'glight-overlay',
      reactive: true,
      can_focus: true,
      x: 0,
      y: 0,
      width: global.stage.width,
      height: global.stage.height,
      opacity: 0,
    });

    // Dismiss on click outside the card
    this._overlay.connect(
      'button-press-event',
      (_actor: Clutter.Actor, event: Clutter.Event) => {
        if (event.get_source() === (this._overlay as unknown as Clutter.Actor)) {
          this.hide();
        }
        return Clutter.EVENT_PROPAGATE;
      }
    );

    // ESC or Super+Return to dismiss
    this._overlay.connect(
      'key-press-event',
      (_actor: Clutter.Actor, event: Clutter.Event) => {
        const key = event.get_key_symbol();
        const mods = event.get_state();
        if (key === Clutter.KEY_Escape ||
            (key === Clutter.KEY_Return && (mods & Clutter.ModifierType.SUPER_MASK))) {
          this.hide();
          return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
      }
    );

    // Centered card
    const container = new St.BoxLayout({
      style_class: 'popup-menu-content glight-container',
      vertical: true,
      x_align: Clutter.ActorAlign.CENTER,
      y_align: Clutter.ActorAlign.CENTER,
    });

    this._searchEntry = new St.Entry({
      style_class: 'glight-search-entry',
      hint_text: 'Search applications…',
      can_focus: true,
      x_expand: true,
    });

    const scrollView = new St.ScrollView({
      style_class: 'glight-results-scroll',
      x_expand: true,
      y_expand: true,
      hscrollbar_policy: St.PolicyType.NEVER,
      vscrollbar_policy: St.PolicyType.AUTOMATIC,
    });

    this._resultsList = new St.BoxLayout({
      style_class: 'glight-results-list',
      vertical: true,
      x_expand: true,
    });

    scrollView.set_child(this._resultsList);
    container.add_child(this._searchEntry);
    container.add_child(scrollView);
    this._overlay.add_child(container);

    Main.uiGroup.add_child(this._overlay);

    // Fade in
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this._overlay as any).ease({
      opacity: 255,
      duration: 140,
      mode: Clutter.AnimationMode.EASE_OUT_QUAD,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Main.pushModal(this._overlay as any);
    this._searchEntry.grab_key_focus();
    this._populateResults('');

    // Live filter
    this._searchEntry.clutter_text.connect('text-changed', () => {
      const query = (this._searchEntry as St.Entry).clutter_text.get_text();
      this._populateResults(query);
    });

    // Arrow-down / Tab → focus first result
    this._searchEntry.clutter_text.connect(
      'key-press-event',
      (_actor: Clutter.Actor, event: Clutter.Event) => {
        const key = event.get_key_symbol();
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
    if (query.length === 0) return;

    const apps = this._getFilteredApps(query, this._settings.maxResults);

    if (apps.length === 0 && query.length > 0) {
      const empty = new St.Label({
        style_class: 'glight-no-results',
        text: 'No results',
        x_align: Clutter.ActorAlign.CENTER,
        x_expand: true,
      });
      this._resultsList.add_child(empty);
      return;
    }

    for (const app of apps) {
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

  private _createAppRow(appInfo: Gio.AppInfo): St.BoxLayout {
    const row = new St.BoxLayout({
      style_class: 'popup-menu-item glight-result-row',
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

    const launch = () => {
      try {
        appInfo.launch([], null);
        this.hide();
      } catch (e) {
        logError(e instanceof Error ? e : new Error(String(e)), `GLight: failed to launch ${appInfo.get_name()}`);
      }
    };

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
      return Clutter.EVENT_PROPAGATE;
    });

    return row;
  }

  private _focusFirstResult(): void {
    const first = this._resultsList?.get_first_child() as St.Widget | null;
    first?.grab_key_focus();
  }
}
