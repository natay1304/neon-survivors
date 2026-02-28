/** Dev-only cheat panel system — HTML overlay with pause integration */

export interface CheatToggle {
  type: 'toggle';
  label: string;
  key: string;
  default?: boolean;
}

export interface CheatButton {
  type: 'button';
  label: string;
  action: () => void;
}

export interface CheatSlider {
  type: 'slider';
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  default?: number;
}

export interface CheatSelect {
  type: 'select';
  label: string;
  key: string;
  options: { value: string; label: string }[];
  default?: string;
}

export interface CheatNumber {
  type: 'number';
  label: string;
  key: string;
  min: number;
  max: number;
  default?: number;
}

export interface CheatSection {
  title: string;
  items: CheatItem[];
}

export type CheatItem = CheatToggle | CheatButton | CheatSlider | CheatSelect | CheatNumber;

export interface CheatPanelConfig {
  onPause: () => void;
  onResume: () => void;
}

export class CheatPanel {
  private overlay: HTMLDivElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private sections: CheatSection[] = [];
  private state = new Map<string, unknown>();
  private config: CheatPanelConfig;
  private visible = false;
  private destroyed = false;

  constructor(config: CheatPanelConfig) {
    this.config = config;
    this.createToggleButton();
  }

  /** Register a section of cheats */
  addSection(section: CheatSection): this {
    this.sections.push(section);
    // Set defaults
    for (const item of section.items) {
      if ('key' in item && 'default' in item && item.default !== undefined) {
        if (!this.state.has(item.key)) {
          this.state.set(item.key, item.default);
        }
      }
    }
    return this;
  }

  /** Get a cheat state value */
  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined;
  }

  /** Get boolean cheat state */
  isEnabled(key: string): boolean {
    return this.state.get(key) === true;
  }

  /** Get numeric cheat state */
  getNumber(key: string, fallback = 0): number {
    const v = this.state.get(key);
    return typeof v === 'number' ? v : fallback;
  }

  /** Get string cheat state */
  getString(key: string, fallback = ''): string {
    const v = this.state.get(key);
    return typeof v === 'string' ? v : fallback;
  }

  /** Check if panel is currently open */
  get isOpen(): boolean {
    return this.visible;
  }

  /** Programmatically toggle the panel */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    if (this.visible || this.destroyed) return;
    this.visible = true;
    this.config.onPause();
    this.renderOverlay();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.overlay?.remove();
    this.overlay = null;
    this.config.onResume();
  }

  destroy(): void {
    this.destroyed = true;
    this.hide();
    this.toggleBtn?.remove();
    this.toggleBtn = null;
  }

  private createToggleButton(): void {
    const btn = document.createElement('button');
    btn.textContent = '🛠';
    btn.title = 'Dev Cheats';
    Object.assign(btn.style, {
      position: 'fixed',
      top: '50px',
      right: '8px',
      zIndex: '99999',
      width: '36px',
      height: '36px',
      borderRadius: '6px',
      border: '1px solid #555',
      background: 'rgba(30, 30, 50, 0.85)',
      color: '#ffcc00',
      fontSize: '18px',
      cursor: 'pointer',
      fontFamily: 'monospace',
      lineHeight: '1',
      padding: '0',
      backdropFilter: 'blur(4px)',
      transition: 'transform 0.15s, background 0.15s',
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(60, 60, 100, 0.95)';
      btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(30, 30, 50, 0.85)';
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.toggle();
    });
    document.body.appendChild(btn);
    this.toggleBtn = btn;
  }

  private renderOverlay(): void {
    if (this.overlay) this.overlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cheat-panel-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '99998',
      background: 'rgba(5, 5, 15, 0.88)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '40px',
      backdropFilter: 'blur(6px)',
      fontFamily: 'monospace',
      color: '#ddd',
      overflow: 'auto',
    });

    // Click backdrop to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.hide();
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: 'rgba(15, 15, 30, 0.96)',
      border: '1px solid #444',
      borderRadius: '10px',
      padding: '20px 28px',
      maxWidth: '480px',
      width: '90vw',
      maxHeight: 'calc(100vh - 80px)',
      overflowY: 'auto',
      boxShadow: '0 0 40px rgba(0, 255, 255, 0.1)',
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      borderBottom: '1px solid #333',
      paddingBottom: '12px',
    });

    const title = document.createElement('div');
    title.innerHTML = '🛠 <span style="color:#ffcc00">DEV CHEATS</span>';
    title.style.fontSize = '20px';
    title.style.fontWeight = 'bold';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Resume';
    Object.assign(closeBtn.style, {
      background: 'rgba(0, 255, 200, 0.15)',
      border: '1px solid #00ffc8',
      borderRadius: '6px',
      color: '#00ffc8',
      padding: '6px 14px',
      cursor: 'pointer',
      fontSize: '13px',
      fontFamily: 'monospace',
    });
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Pause indicator
    const pauseNote = document.createElement('div');
    pauseNote.textContent = '⏸ Game paused — cheats apply on resume';
    Object.assign(pauseNote.style, {
      fontSize: '11px',
      color: '#888',
      marginBottom: '14px',
      textAlign: 'center',
    });
    panel.appendChild(pauseNote);

    // Render sections
    for (const section of this.sections) {
      panel.appendChild(this.renderSection(section));
    }

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.overlay = overlay;

    // ESC to close
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        window.removeEventListener('keydown', onKey, true);
      }
    };
    window.addEventListener('keydown', onKey, true);
  }

  private renderSection(section: CheatSection): HTMLElement {
    const container = document.createElement('div');
    container.style.marginBottom = '16px';

    const sectionTitle = document.createElement('div');
    sectionTitle.textContent = section.title;
    Object.assign(sectionTitle.style, {
      fontWeight: 'bold',
      fontSize: '14px',
      color: '#aaa',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '8px',
      borderBottom: '1px solid #222',
      paddingBottom: '4px',
    });
    container.appendChild(sectionTitle);

    for (const item of section.items) {
      container.appendChild(this.renderItem(item));
    }

    return container;
  }

  private renderItem(item: CheatItem): HTMLElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 0',
      gap: '10px',
      minHeight: '32px',
    });

    const label = document.createElement('span');
    label.textContent = item.label;
    label.style.fontSize = '13px';
    label.style.flex = '1';
    label.style.color = '#ccc';
    row.appendChild(label);

    switch (item.type) {
      case 'toggle': {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = this.state.get(item.key) === true;
        cb.style.width = '18px';
        cb.style.height = '18px';
        cb.style.cursor = 'pointer';
        cb.style.accentColor = '#00ffc8';
        cb.addEventListener('change', () => {
          this.state.set(item.key, cb.checked);
        });
        row.appendChild(cb);
        break;
      }
      case 'button': {
        const btn = document.createElement('button');
        btn.textContent = item.label;
        Object.assign(btn.style, {
          background: 'rgba(255, 200, 0, 0.15)',
          border: '1px solid #ffcc00',
          borderRadius: '4px',
          color: '#ffcc00',
          padding: '4px 12px',
          cursor: 'pointer',
          fontSize: '12px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        });
        btn.addEventListener('click', () => {
          item.action();
          // Flash feedback
          btn.style.background = 'rgba(255, 200, 0, 0.4)';
          setTimeout(() => { btn.style.background = 'rgba(255, 200, 0, 0.15)'; }, 200);
        });
        // Replace label text with just the row label
        label.style.display = 'none';
        row.appendChild(btn);
        break;
      }
      case 'slider': {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '8px';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(item.min);
        slider.max = String(item.max);
        slider.step = String(item.step);
        slider.value = String(this.state.get(item.key) ?? item.default ?? item.min);
        slider.style.width = '100px';
        slider.style.accentColor = '#00ffc8';

        const valDisplay = document.createElement('span');
        valDisplay.textContent = slider.value;
        valDisplay.style.fontSize = '12px';
        valDisplay.style.color = '#00ffc8';
        valDisplay.style.minWidth = '36px';
        valDisplay.style.textAlign = 'right';

        slider.addEventListener('input', () => {
          const v = parseFloat(slider.value);
          this.state.set(item.key, v);
          valDisplay.textContent = String(v);
        });

        wrapper.appendChild(slider);
        wrapper.appendChild(valDisplay);
        row.appendChild(wrapper);
        break;
      }
      case 'select': {
        const select = document.createElement('select');
        Object.assign(select.style, {
          background: '#1a1a30',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#ddd',
          padding: '4px 8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          maxWidth: '160px',
        });
        for (const opt of item.options) {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          select.appendChild(option);
        }
        select.value = (this.state.get(item.key) as string) ?? item.default ?? item.options[0]?.value ?? '';
        select.addEventListener('change', () => {
          this.state.set(item.key, select.value);
        });
        row.appendChild(select);
        break;
      }
      case 'number': {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = String(item.min);
        input.max = String(item.max);
        input.value = String(this.state.get(item.key) ?? item.default ?? item.min);
        Object.assign(input.style, {
          background: '#1a1a30',
          border: '1px solid #444',
          borderRadius: '4px',
          color: '#ddd',
          padding: '4px 8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          width: '70px',
          textAlign: 'center',
        });
        input.addEventListener('change', () => {
          const v = Math.min(item.max, Math.max(item.min, parseInt(input.value) || item.min));
          this.state.set(item.key, v);
          input.value = String(v);
        });
        row.appendChild(input);
        break;
      }
    }

    return row;
  }
}

/** Create a CheatPanel only in dev mode. Returns null in production. */
export function createDevCheatPanel(config: CheatPanelConfig): CheatPanel | null {
  // Check multiple dev indicators
  const isDev =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'development') ||
    (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1'));

  if (!isDev) return null;
  return new CheatPanel(config);
}

// ─── Common cheat section presets ────────────────────────────────────

/** Game speed cheat section — slider + apply button */
export function createGameSpeedSection(opts?: {
  maxSpeed?: number;
  onApplyTime?: () => void;
  gameDuration?: number;
}): CheatSection {
  const items: CheatItem[] = [
    { type: 'slider', label: '⏩ Game Speed', key: 'gameSpeed', min: 0.1, max: opts?.maxSpeed ?? 5, step: 0.1, default: 1 },
  ];
  if (opts?.gameDuration !== undefined) {
    items.push(
      { type: 'slider', label: '🕐 Set Game Time (sec)', key: 'setGameTime', min: 0, max: opts.gameDuration, step: 10, default: 0 },
    );
    if (opts.onApplyTime) {
      items.push({ type: 'button', label: '🕐 Apply Game Time', action: opts.onApplyTime });
    }
  }
  return { title: '🕐 Game Speed', items };
}

/** Player cheat section — god mode toggle + heal button */
export function createPlayerCheatsSection(opts: {
  onHeal?: () => void;
  onLevelUp?: () => void;
  onGiveXP?: () => void;
  defaultSpeed?: number;
  maxSpeed?: number;
}): CheatSection {
  const items: CheatItem[] = [
    { type: 'toggle', label: '🛡️ God Mode (invincible)', key: 'godMode', default: false },
  ];
  if (opts.onHeal) items.push({ type: 'button', label: '❤️ Heal to Full', action: opts.onHeal });
  if (opts.onLevelUp) items.push({ type: 'button', label: '⬆️ Level Up (+1)', action: opts.onLevelUp });
  if (opts.onGiveXP) items.push({ type: 'button', label: '✨ Give 500 XP', action: opts.onGiveXP });
  items.push(
    { type: 'slider', label: '💨 Player Speed', key: 'playerSpeed', min: 100, max: opts.maxSpeed ?? 2000, step: 50, default: opts.defaultSpeed ?? 200 },
    { type: 'slider', label: '🛡️ Armor', key: 'playerArmor', min: 0, max: 100, step: 1, default: 0 },
  );
  return { title: '🎮 Player', items };
}

/** Weapon cheat section — unlock all, max level, damage/cooldown sliders */
export function createWeaponCheatsSection(opts: {
  onUnlockAll?: () => void;
  onMaxAll?: () => void;
}): CheatSection {
  const items: CheatItem[] = [];
  if (opts.onUnlockAll) items.push({ type: 'button', label: '🔓 Unlock All Weapons', action: opts.onUnlockAll });
  if (opts.onMaxAll) items.push({ type: 'button', label: '⬆️ Max All Weapon Levels', action: opts.onMaxAll });
  items.push(
    { type: 'slider', label: '💥 Damage Multiplier', key: 'damageMult', min: 1, max: 50, step: 1, default: 1 },
    { type: 'slider', label: '⏱️ Cooldown Reduction %', key: 'cooldownPct', min: 0, max: 95, step: 5, default: 0 },
  );
  return { title: '⚔️ Weapons', items };
}
