/** HUD overlay — rendered as HTML elements over the canvas */

const GRAVITY_LABELS: Record<string, string> = {
  'down': '\u2193 Down',
  'up': '\u2191 Up',
  'left': '\u2190 Left',
  'right': '\u2192 Right',
};

function gravityDirName(gx: number, gy: number): string {
  if (Math.abs(gy) > Math.abs(gx)) {
    return gy > 0 ? 'down' : 'up';
  }
  return gx > 0 ? 'right' : 'left';
}

export class HUD {
  private container: HTMLDivElement;
  private healthBar: HTMLDivElement;
  private healthFill: HTMLDivElement;
  private massBar: HTMLDivElement;
  private massFill: HTMLDivElement;
  private levelName: HTMLDivElement;
  private gravityIndicator: HTMLDivElement;
  private abilities: HTMLDivElement;
  private tutorialHint: HTMLDivElement;

  private hintTimer = 0;
  private hintQueue: string[] = [];
  private shownHints = new Set<string>();

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      pointerEvents: 'none',
      fontFamily: '"Segoe UI", -apple-system, sans-serif',
      color: '#e0e0e0',
      zIndex: '10',
    });

    // Health bar (bigger, clearer)
    this.healthBar = this.createBar('16px', '16px', '220px', '22px', '#ff4444', '#ff666644');
    this.healthFill = this.healthBar.firstChild as HTMLDivElement;

    // Mass storage bar (only shown when mass shift is available)
    this.massBar = this.createBar('16px', '46px', '220px', '22px', '#00ffcc', '#00ffcc44');
    this.massFill = this.massBar.firstChild as HTMLDivElement;
    this.massBar.style.display = 'none';

    // Level name (top center)
    this.levelName = document.createElement('div');
    Object.assign(this.levelName.style, {
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '15px',
      fontWeight: 'bold',
      opacity: '0.7',
      textShadow: '0 1px 4px #000',
      letterSpacing: '2px',
    });
    this.container.appendChild(this.levelName);

    // Gravity direction indicator (top right)
    this.gravityIndicator = document.createElement('div');
    Object.assign(this.gravityIndicator.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      fontSize: '16px',
      padding: '6px 14px',
      background: 'rgba(0,0,0,0.5)',
      border: '1px solid #555',
      borderRadius: '8px',
      textAlign: 'center',
      lineHeight: '1.4',
      color: '#ccddff',
    });
    this.container.appendChild(this.gravityIndicator);

    // Abilities (bottom left — only shown when unlocked)
    this.abilities = document.createElement('div');
    Object.assign(this.abilities.style, {
      position: 'absolute',
      bottom: '16px',
      left: '16px',
      fontSize: '13px',
      lineHeight: '1.8',
      opacity: '0.8',
      background: 'rgba(0,0,0,0.4)',
      padding: '8px 14px',
      borderRadius: '8px',
      display: 'none',
    });
    this.container.appendChild(this.abilities);

    // Tutorial hint (bottom center — animated contextual hints)
    this.tutorialHint = document.createElement('div');
    Object.assign(this.tutorialHint.style, {
      position: 'absolute',
      bottom: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '15px',
      padding: '12px 24px',
      background: 'rgba(0, 200, 180, 0.15)',
      border: '1px solid rgba(0, 255, 204, 0.4)',
      borderRadius: '10px',
      textAlign: 'center',
      color: '#aaffee',
      maxWidth: '500px',
      transition: 'opacity 0.5s',
      opacity: '0',
      textShadow: '0 1px 3px #000',
    });
    this.container.appendChild(this.tutorialHint);

    document.body.appendChild(this.container);
  }

  private createBar(
    left: string, top: string, width: string, height: string,
    color: string, bgColor: string,
  ): HTMLDivElement {
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      position: 'absolute',
      left, top, width, height,
      background: bgColor,
      border: '1px solid #444',
      borderRadius: '6px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    });

    const fill = document.createElement('div');
    Object.assign(fill.style, {
      width: '100%',
      height: '100%',
      background: `linear-gradient(180deg, ${color}, ${color}aa)`,
      transition: 'width 0.15s ease-out',
      borderRadius: '5px',
    });
    bar.appendChild(fill);

    const label = document.createElement('div');
    Object.assign(label.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      textAlign: 'center',
      fontSize: '11px',
      fontWeight: 'bold',
      lineHeight: height,
      color: '#fff',
      textShadow: '0 1px 3px #000',
    });
    bar.appendChild(label);

    this.container.appendChild(bar);
    return bar;
  }

  /** Queue a contextual tutorial hint (shown only once per key) */
  showHint(key: string, text: string): void {
    if (this.shownHints.has(key)) return;
    this.shownHints.add(key);
    this.hintQueue.push(text);
  }

  update(data: {
    hp: number;
    maxHp: number;
    storedMass: number;
    maxMass: number;
    levelName: string;
    wellCooldown: number;
    tetherActive: boolean;
    hasRepulsion: boolean;
    gravityX: number;
    gravityY: number;
    levelId: string;
    dt: number;
  }): void {
    // Health
    const hpPct = Math.max(0, data.hp / data.maxHp) * 100;
    this.healthFill.style.width = `${hpPct}%`;
    const hpLabel = this.healthBar.children[1] as HTMLDivElement;
    hpLabel.textContent = `\u2764 ${Math.ceil(data.hp)}/${data.maxHp}`;

    // Health bar glow when low
    if (hpPct < 30) {
      this.healthBar.style.borderColor = '#ff4444';
      this.healthBar.style.boxShadow = '0 0 12px #ff444466';
    } else {
      this.healthBar.style.borderColor = '#444';
      this.healthBar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
    }

    // Mass bar (hide if level has no mass shift scenarios — level_01)
    const showMass = data.levelId !== 'level_01';
    this.massBar.style.display = showMass ? 'block' : 'none';
    if (showMass) {
      const massPct = (data.storedMass / data.maxMass) * 100;
      this.massFill.style.width = `${massPct}%`;
      const massLabel = this.massBar.children[1] as HTMLDivElement;
      massLabel.textContent = `\u26A1 Mass ${Math.floor(data.storedMass)}/${data.maxMass}`;
    }

    // Level name
    this.levelName.textContent = data.levelName;

    // Gravity direction indicator
    const dir = gravityDirName(data.gravityX, data.gravityY);
    const label = GRAVITY_LABELS[dir] || '\u2193 Down';
    this.gravityIndicator.innerHTML = `<span style="font-size:11px;opacity:0.6;">Gravity</span><br>${label}`;

    // Abilities (only show if player has unlocked any non-basic abilities)
    const hasAbilities = data.levelId !== 'level_01';
    if (hasAbilities) {
      this.abilities.style.display = 'block';
      const lines: string[] = [];
      if (data.wellCooldown > 0) {
        lines.push(`<span style="color:#9966ff">[Q] Well: ${data.wellCooldown.toFixed(1)}s</span>`);
      } else {
        lines.push('<span style="color:#bb99ff">[Q] Well: READY</span>');
      }
      lines.push(data.tetherActive
        ? '<span style="color:#ffcc44">[F] Tether: ON</span>'
        : '<span style="opacity:0.5">[F] Tether: OFF</span>');
      if (data.hasRepulsion) {
        lines.push('<span style="color:#ff66aa">[R] Repulsion: READY</span>');
      }
      this.abilities.innerHTML = lines.join('<br>');
    } else {
      this.abilities.style.display = 'none';
    }

    // Tutorial hints timer
    this.updateHints(data.dt);

    // Contextual hints based on game state
    this.generateContextualHints(data);
  }

  private generateContextualHints(data: {
    hp: number; maxHp: number; levelId: string;
    gravityX: number; gravityY: number;
    storedMass: number; tetherActive: boolean;
  }): void {
    // Level 1 hints
    if (data.levelId === 'level_01') {
      this.showHint('move', '\u2190\u2192 or A D to move, SPACE to jump!');
      const dir = gravityDirName(data.gravityX, data.gravityY);
      if (dir === 'right') {
        this.showHint('gravity_right', 'Gravity pulls right! Controls adapt automatically.');
      }
      if (dir === 'up') {
        this.showHint('gravity_up', 'Gravity is inverted! Jump now goes down.');
      }
    }

    // Level 2 hints
    if (data.levelId === 'level_02') {
      this.showHint('mass_intro', 'Hold E and aim at an object to extract mass. Shift+E to deposit.');
      if (data.storedMass > 0) {
        this.showHint('mass_deposit', 'Nice! Now Shift+E to deposit mass into a heavy object.');
      }
    }

    // Level 3 hints
    if (data.levelId === 'level_03') {
      this.showHint('well_intro', 'Q + click to create a gravity well — it pulls objects toward it!');
    }

    // Low health hint
    if (data.hp < data.maxHp * 0.3 && data.hp > 0) {
      this.showHint('low_hp', 'Health is low! Look for green pickups.');
    }
  }

  private updateHints(dt: number): void {
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0.5) {
        this.tutorialHint.style.opacity = '0';
      }
      if (this.hintTimer <= 0) {
        this.hintTimer = 0;
      }
      return;
    }

    // Show next hint from queue
    if (this.hintQueue.length > 0) {
      const text = this.hintQueue.shift()!;
      this.tutorialHint.textContent = text;
      this.tutorialHint.style.opacity = '1';
      this.hintTimer = 5; // show for 5 seconds
    }
  }

  setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'block' : 'none';
  }

  /** Reset hints for new game */
  resetHints(): void {
    this.shownHints.clear();
    this.hintQueue = [];
    this.hintTimer = 0;
    this.tutorialHint.style.opacity = '0';
  }

  destroy(): void {
    this.container.remove();
  }
}
