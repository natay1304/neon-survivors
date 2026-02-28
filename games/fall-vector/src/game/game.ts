/** FallVectorScene — main game scene */

import * as THREE from 'three';
import type Matter from 'matter-js';
import { World, Camera2D, Renderer2D } from '@survivors/core';
import type { GameContext, Scene } from '@survivors/core';
import type { AdPlatform } from '@survivors/sdk';
import type { GravityZoneDef } from './levels/types';
import { C } from './components';
import type { GraviGlove, Health, Pos, ThreeObj, Collectible, Door, Player } from './components';
import { createPhysicsEngine } from './physics';
import { loadLevel } from './levels/loader';
import { LEVEL_01 } from './levels/level-01';
import { LEVEL_02 } from './levels/level-02';
import { LEVEL_03 } from './levels/level-03';
import { createInputSystem } from './systems/input';
import { createGravityZoneSystem } from './systems/gravity-zones';
import { createMassShiftSystem } from './systems/mass-shift';
import { createGravityWellSystem } from './systems/gravity-well';
import { createSurfaceTetherSystem } from './systems/surface-tether';
import { createPhysicsSyncSystem } from './systems/physics-sync';
import { createGroundCheckSystem } from './systems/ground-check';
import { createEnemyAISystem } from './systems/enemy-ai';
import { createHealthSystem } from './systems/health';
import { createRenderSyncSystem } from './systems/render-sync';
import { createCameraSystem } from './systems/camera';
import { createGravityArrows } from './renderer/effects';
import { HUD } from './renderer/hud';
import { UIManager } from './ui/ui';
import { BG_COLOR } from './config';

type LevelId = 'level_01' | 'level_02' | 'level_03' | 'victory';

const LEVELS = {
  level_01: LEVEL_01,
  level_02: LEVEL_02,
  level_03: LEVEL_03,
} as const;

export class FallVectorScene implements Scene {
  readonly name = 'fall-vector';

  private ctx: GameContext;
  private world!: World;
  private engine!: Matter.Engine;
  private threeScene!: THREE.Scene;
  private camera!: Camera2D;
  private renderer!: Renderer2D;

  private hud!: HUD;
  private ui!: UIManager;

  private gravityZones: GravityZoneDef[] = [];
  private playerEntity = -1;
  private currentLevel: LevelId = 'level_01';
  private paused = false;

  private keys = new Set<string>();
  private mouseScreenX = 0;
  private mouseScreenY = 0;

  constructor(ctx: GameContext, _platform: AdPlatform) {
    this.ctx = ctx;
    this.renderer = ctx.renderer as Renderer2D;
  }

  enter(_ctx: GameContext): void {
    this.camera = this.renderer.camera;
    this.threeScene = this.renderer.threeScene;
    this.threeScene.background = new THREE.Color(BG_COLOR);

    // Key tracking (for ability detection beyond InputManager)
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onResize);

    this.onResize();

    this.hud = new HUD();
    this.hud.setVisible(false);

    this.ui = new UIManager({
      onStart: () => this.startGame(),
      onRestart: () => this.restartGame(),
      onResume: () => this.togglePause(),
    });
  }

  exit(_ctx: GameContext): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onResize);
    this.hud.destroy();
    this.ui.destroy();
  }

  private startGame(): void {
    this.currentLevel = 'level_01';
    this.initLevel(this.currentLevel);
    this.ui.showScreen('playing');
    this.hud.setVisible(true);
    this.hud.resetHints();
    this.paused = false;
  }

  private restartGame(): void {
    this.startGame();
  }

  private initLevel(levelId: LevelId): void {
    if (levelId === 'victory') {
      this.ui.showScreen('victory');
      this.hud.setVisible(false);
      return;
    }

    const levelData = LEVELS[levelId];
    if (!levelData) return;

    // Clear existing
    this.clearLevel();

    // Fresh world and physics
    this.world = new World();
    this.engine = createPhysicsEngine();

    // Load level
    const loaded = loadLevel(levelData, this.world, this.engine, this.threeScene);
    this.gravityZones = loaded.gravityZones;
    this.playerEntity = loaded.playerEntity;

    // Create gravity direction indicators
    for (const zone of this.gravityZones) {
      createGravityArrows(zone.gravity.x, zone.gravity.y, zone.bounds, this.threeScene);
    }

    const getKeys = () => this.keys;
    const getMouseWorld = () => this.screenToWorld(this.mouseScreenX, this.mouseScreenY);

    // Register systems in order
    this.world.addSystem(createInputSystem(this.ctx.input, getKeys));
    this.world.addSystem(createMassShiftSystem(this.ctx.input, this.engine, getKeys, getMouseWorld));
    this.world.addSystem(createGravityWellSystem(this.ctx.input, this.engine, this.threeScene, getKeys, getMouseWorld));
    this.world.addSystem(createSurfaceTetherSystem(this.ctx.input, this.engine, getKeys, getMouseWorld));
    this.world.addSystem(createGravityZoneSystem(() => this.gravityZones));
    this.world.addSystem(createPhysicsSyncSystem(this.engine));
    this.world.addSystem(createGroundCheckSystem(this.engine));
    this.world.addSystem(createEnemyAISystem());
    this.world.addSystem(createHealthSystem(this.engine));
    this.world.addSystem(createRenderSyncSystem());
    this.world.addSystem(createCameraSystem(this.camera));

    // Door/collectible check system (inline for simplicity)
    this.world.addSystem(this.createDoorCollectibleSystem());
  }

  private clearLevel(): void {
    // Remove all Three.js objects from scene
    while (this.threeScene.children.length > 0) {
      const child = this.threeScene.children[0];
      this.threeScene.remove(child);
    }

    // Engine will be replaced
    this.engine = undefined!;
    this.world = undefined!;
    this.gravityZones = [];
    this.camera.threeCamera.rotation.z = 0;
  }

  private createDoorCollectibleSystem() {
    return (world: World, _dt: number) => {
      const players = world.query(C.Player, C.Pos);
      if (players.length === 0) return;
      const playerPos = world.get<Pos>(players[0], C.Pos);

      // Check doors
      for (const de of world.query(C.Door, C.Pos)) {
        const doorPos = world.get<Pos>(de, C.Pos);
        const door = world.get<Door>(de, C.Door);
        const dx = playerPos.x - doorPos.x;
        const dy = playerPos.y - doorPos.y;
        if (dx * dx + dy * dy < 40 * 40) {
          this.currentLevel = door.targetLevel as LevelId;
          // Schedule level load for next frame to avoid iterator issues
          setTimeout(() => this.initLevel(this.currentLevel), 0);
          return;
        }
      }

      // Check collectibles
      for (const ce of world.query(C.Collectible, C.Pos)) {
        const cPos = world.get<Pos>(ce, C.Pos);
        const dx = playerPos.x - cPos.x;
        const dy = playerPos.y - cPos.y;
        if (dx * dx + dy * dy < 30 * 30) {
          const collectible = world.get<Collectible>(ce, C.Collectible);
          this.applyCollectible(collectible);

          const obj = world.maybe<ThreeObj>(ce, C.ThreeObj);
          if (obj) obj.object.removeFromParent();
          world.destroy(ce);
        }
      }
    };
  }

  private applyCollectible(collectible: Collectible): void {
    if (collectible.type === 'upgrade' && collectible.upgradeId === 'repulsion') {
      const glove = this.world.maybe<GraviGlove>(this.playerEntity, C.GraviGlove);
      if (glove) glove.hasRepulsion = true;
    }
    if (collectible.type === 'health') {
      const health = this.world.maybe<Health>(this.playerEntity, C.Health);
      if (health) health.current = Math.min(health.current + 30, health.max);
    }
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.ui.showScreen('paused');
      this.hud.setVisible(false);
    } else {
      this.ui.showScreen('playing');
      this.hud.setVisible(true);
    }
  }

  update(_ctx: GameContext, dt: number): void {
    if (this.ui.screen === 'menu' || this.ui.screen === 'gameover' || this.ui.screen === 'victory') return;
    if (this.paused) return;
    if (!this.world) return;

    // Pause on escape
    if (this.keys.has('Escape')) {
      this.keys.delete('Escape');
      this.togglePause();
      return;
    }

    this.world.update(dt);

    // Check player death
    if (this.playerEntity >= 0 && this.world.isAlive(this.playerEntity)) {
      const health = this.world.get<Health>(this.playerEntity, C.Health);
      if (health.current <= 0) {
        this.ui.showScreen('gameover');
        this.hud.setVisible(false);
      }
    }

    // Update HUD
    this.updateHUD(dt);
  }

  private updateHUD(dt: number): void {
    if (!this.world || this.playerEntity < 0 || !this.world.isAlive(this.playerEntity)) return;

    const health = this.world.get<Health>(this.playerEntity, C.Health);
    const glove = this.world.get<GraviGlove>(this.playerEntity, C.GraviGlove);
    const player = this.world.get<Player>(this.playerEntity, C.Player);

    this.hud.update({
      hp: health.current,
      maxHp: health.max,
      storedMass: glove.storedMass,
      maxMass: glove.maxStoredMass,
      levelName: LEVELS[this.currentLevel as keyof typeof LEVELS]?.name ?? '',
      wellCooldown: Math.max(0, glove.wellTimer),
      tetherActive: glove.tetherActive,
      hasRepulsion: glove.hasRepulsion,
      gravityX: player.personalGravity.x,
      gravityY: player.personalGravity.y,
      levelId: this.currentLevel,
      dt,
    });
  }

  render(_ctx: GameContext, _alpha: number): void {
    // Three.js rendering is handled by Renderer2D.endFrame()
    // Nothing manual needed here
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return this.camera.screenToWorld(sx, sy);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseScreenX = e.clientX;
    this.mouseScreenY = e.clientY;
  };

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera?.resize(w, h);
  };
}
