/** UI screens — menu, pause, game over, victory */

export type Screen = 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';

export class UIManager {
  private overlay: HTMLDivElement;
  private currentScreen: Screen = 'menu';
  private onStart: () => void;
  private onRestart: () => void;
  private onResume: () => void;

  constructor(callbacks: {
    onStart: () => void;
    onRestart: () => void;
    onResume: () => void;
  }) {
    this.onStart = callbacks.onStart;
    this.onRestart = callbacks.onRestart;
    this.onResume = callbacks.onResume;

    this.overlay = document.createElement('div');
    this.overlay.id = 'ui-overlay';
    Object.assign(this.overlay.style, {
      position: 'absolute',
      top: '0', left: '0', right: '0', bottom: '0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      color: '#e0e0e0',
      zIndex: '20',
      background: 'rgba(5, 5, 16, 0.85)',
    });

    document.body.appendChild(this.overlay);
    this.showScreen('menu');
  }

  get screen(): Screen {
    return this.currentScreen;
  }

  showScreen(screen: Screen): void {
    this.currentScreen = screen;

    if (screen === 'playing') {
      this.overlay.style.display = 'none';
      return;
    }

    this.overlay.style.display = 'flex';
    this.overlay.innerHTML = '';

    switch (screen) {
      case 'menu':
        this.renderMenu();
        break;
      case 'paused':
        this.renderPaused();
        break;
      case 'gameover':
        this.renderGameOver(false);
        break;
      case 'victory':
        this.renderGameOver(true);
        break;
    }
  }

  private renderMenu(): void {
    this.overlay.innerHTML = `
      <h1 style="font-size: 48px; color: #00ffcc; text-shadow: 0 0 20px #00ffcc66; margin: 0;">FALL VECTOR</h1>
      <p style="font-size: 16px; opacity: 0.7; margin: 12px 0 32px; color: #aabbcc;">Master gravity. Overcome obstacles.</p>
      <div style="font-size: 14px; line-height: 2.2; opacity: 0.8; text-align: center; margin-bottom: 12px;">
        <div style="color: #88ddff;">&#x2190; &#x2192; or A D &mdash; Move</div>
        <div style="color: #88ddff;">SPACE &mdash; Jump</div>
      </div>
      <p style="font-size: 12px; opacity: 0.4; margin-bottom: 24px;">New abilities unlock as you progress!</p>
      <div id="start-btn" style="margin-top: 16px; padding: 18px 56px; background: linear-gradient(180deg, #1a2a3e 0%, #0a1a2e 100%); border: 2px solid #00ffcc; border-radius: 10px; cursor: pointer; font-size: 20px; color: #00ffcc; pointer-events: all; transition: all 0.2s; text-shadow: 0 0 10px #00ffcc44;">
        &#9654; PLAY
      </div>
    `;

    const btn = this.overlay.querySelector('#start-btn') as HTMLDivElement;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'linear-gradient(180deg, #2a3a4e 0%, #1a2a3e 100%)';
      btn.style.transform = 'translateY(-2px) scale(1.03)';
      btn.style.boxShadow = '0 4px 20px #00ffcc33';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'linear-gradient(180deg, #1a2a3e 0%, #0a1a2e 100%)';
      btn.style.transform = 'translateY(0) scale(1)';
      btn.style.boxShadow = 'none';
    });
    btn.addEventListener('click', () => this.onStart());
  }

  private renderPaused(): void {
    this.overlay.innerHTML = `
      <h2 style="font-size: 36px; color: #fff; margin: 0;">PAUSED</h2>
      <p style="font-size: 14px; opacity: 0.5; margin-top: 16px;">Press ESC to resume</p>
      <div id="resume-btn" style="margin-top: 30px; padding: 14px 40px; background: #1a1a2e; border: 2px solid #00ffcc; border-radius: 8px; cursor: pointer; font-size: 16px; color: #00ffcc; pointer-events: all; transition: all 0.2s;">
        RESUME
      </div>
    `;

    this.overlay.querySelector('#resume-btn')!.addEventListener('click', () => this.onResume());
  }

  private renderGameOver(victory: boolean): void {
    const title = victory ? 'VICTORY!' : 'GAME OVER';
    const titleColor = victory ? '#00ff88' : '#ff4444';
    const message = victory
      ? 'You have mastered the gravity glove!'
      : 'Try again — you can do it!';

    this.overlay.innerHTML = `
      <h2 style="font-size: 36px; color: ${titleColor}; text-shadow: 0 0 20px ${titleColor}66; margin: 0;">${title}</h2>
      <p style="font-size: 14px; opacity: 0.6; margin-top: 12px;">
        ${message}
      </p>
      <div id="restart-btn" style="margin-top: 30px; padding: 14px 40px; background: #1a1a2e; border: 2px solid ${titleColor}; border-radius: 8px; cursor: pointer; font-size: 16px; color: ${titleColor}; pointer-events: all; transition: all 0.2s;">
        PLAY AGAIN
      </div>
    `;

    this.overlay.querySelector('#restart-btn')!.addEventListener('click', () => this.onRestart());
  }

  destroy(): void {
    this.overlay.remove();
  }
}
