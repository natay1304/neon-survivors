# CLAUDE.md

## Project Overview

This is a **game development monorepo** for creating and publishing multiple browser games across different genres. Games share a common engine (`@survivors/core`) and platform SDK (`@survivors/sdk`). The architecture is designed to scale to many game projects while keeping shared infrastructure in one place.

## Monorepo Structure

```
├── packages/
│   ├── core/       # @survivors/core — game engine (ECS, rendering, audio, input, networking, AI, collision, health, canvas drawing)
│   ├── sdk/        # @survivors/sdk — ad platform integrations (CrazyGames, Yandex, Telegram)
│   └── server/     # @survivors/server — multiplayer server (socket.io, rooms, state sync)
├── games/
│   ├── neon-survivors/  # Vampire Survivors-style bullet hell game
│   ├── fall-vector/     # Gravity-manipulation platformer (Matter.js + Three.js)
│   └── gravity-swoop/   # Gravity-slingshot puzzle game (Canvas 2D)
├── package.json         # npm workspaces root
└── tsconfig.json        # shared TypeScript config
```

- **npm workspaces** manage dependencies: `packages/*` and `games/*`.
- Each game imports `@survivors/core` and `@survivors/sdk` via path aliases defined in its `vite.config.ts` and `tsconfig.json`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict mode, ES2020 target) |
| Build | Vite |
| 3D/2D Graphics | Three.js + Canvas 2D API |
| Audio | Howler.js |
| Networking | socket.io (client + server) |
| Events | eventemitter3 |
| Server Runtime | Node.js + tsx |
| CI/CD | GitHub Actions → GitHub Pages |

## Commands

```bash
# From repo root:
npm install                # install all workspace dependencies
npm run dev                # dev server for neon-survivors (default)
npm run dev:neon           # dev server for neon-survivors
npm run dev:fall-vector    # dev server for fall-vector
npm run dev:gravity-swoop  # dev server for gravity-swoop
npm run build              # production build for all games
npm run build:neon         # production build for neon-survivors
npm run build:fall-vector  # production build for fall-vector
npm run build:gravity-swoop # production build for gravity-swoop

# Server (packages/server):
npm run dev --workspace=packages/server    # dev server with watch
npm run start --workspace=packages/server  # production server

# To work on a specific game:
npm run dev --workspace=games/<game-name>
npm run build --workspace=games/<game-name>
```

## Architecture Principles

### Core Engine (`packages/core`)

The engine is modular — each system is a standalone module with minimal coupling:

- **ECS** (`ecs.ts`) — Entity-Component-System: `World`, `spawn`, `query`, `add`, `remove`.
- **Game Context** (`game-context.ts`) — `GameContext` central entry point: wires loop, scenes, input, renderer, events, and stats.js panel together. Use `GameContext.create2D`, `GameContext.create3D`, or `GameContext.createCustom`.
- **Game Loop** (`game-loop.ts`) — Fixed timestep with interpolated rendering.
- **Scene Manager** (`scene.ts`) — Stack-based scene transitions.
- **Renderers** (`renderer.ts`) — `IRenderer` interface with `Renderer2D`, `Renderer3D`, `NullRenderer`.
- **Cameras** (`camera-2d.ts`, `camera-3d.ts`) — Follow, shake, screen-to-world transform. (`camera.ts` is deprecated — use `Camera2D` instead.)
- **Input** (`input.ts`) — Unified keyboard + touch with virtual joystick support.
- **Audio** (`audio.ts`) — SFX, music, spatial audio via Howler.js.
- **Synth Audio** (`synth-audio.ts`) — Procedural audio synthesis via Web Audio API. Zero audio files — sounds generated in real-time with ADSR envelopes, oscillator voices, filters, and pitch variation. Designed for retro/neon-style games.
- **Events** (`events.ts`) — `TypedEventEmitter<T>` wrapping eventemitter3 for fully type-safe event handling across systems.
- **AI** (`behavior-tree.ts`) — Behavior trees (sequence, selector, seek, flee, orbit).
- **Networking** (`network.ts`) — Socket.io client with rooms, reconnect, latency tracking.
- **Particles** (`particles.ts`) — Lightweight particle emitter.
- **Spatial Hash** (`spatial-hash.ts`) — Spatial hash grid for O(n) broad-phase.
- **Collision** (`collision.ts`) — Circle-circle, circle-AABB, point-in-shape collision primitives.
- **Health & Damage** (`health.ts`) — `applyDamage`, `applyKnockback`, `createInvulnerabilitySystem`.
- **Common Components** (`components.ts`) — Shared ECS component interfaces: `Pos`, `Vel`, `Health`, `Collider`, `DamageFlash`, `BehaviorTreeData`.
- **Common Systems** (`systems.ts`) — `createMovementSystem`, `createLifetimeSystem`, `computeSeparation`.
- **Canvas Drawing** (`canvas-draw.ts`) — `drawParticles`, `drawFloatingText`, `applyCameraToContext`, `drawJoystick`, `roundRect`, `drawButton`.
- **Gravity** (`gravity.ts`) — Point gravity, tangential release, orbit detection.
- **Math** (`math.ts`) — Vec2 and math utilities.
- **Utilities** (`utils.ts`) — ObjectPool, FloatingTextManager.
- **Cheats** (`cheats.ts`) — Dev-only cheat panel (HTML overlay): toggles, buttons, sliders, selects, and number inputs with pause integration.

### SDK (`packages/sdk`)

Platform abstraction with auto-detection. Each platform implements `AdPlatform` interface. `NoopPlatform` fallback when no platform SDK is loaded. Games call a single API regardless of deployment target.

### Game Structure Pattern

Each game in `games/` follows this layout:

```
games/<name>/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts          # entry point, platform init
    └── game/
        ├── game.ts      # main scene
        ├── components.ts # ECS component definitions
        ├── config.ts     # balance data, tuning constants
        ├── systems.ts    # ECS systems
        ├── renderer.ts   # game-specific rendering
        └── ui.ts         # UI layer
```

## Code Style and Conventions

- **English only in code** — all code, string literals, comments, variable names, UI text, and user-facing strings must be in English only. No other languages allowed anywhere in the source code without exception.
- **TypeScript strict mode** — all code must pass `strict: true`, `noUnusedLocals`, `noUnusedParameters`.
- **ES modules** — `"type": "module"` throughout. Use `import`/`export`, no CommonJS.
- **No default exports** — use named exports for clarity.
- **ECS pattern** — game logic lives in systems that operate on components via queries. Components are plain data objects. Systems are pure functions where possible.
- **Flat module structure** — each core module exports from a single file. No deep nesting.

## Rules for the Agent

### Expertise

You are an expert in game development, 2D and 3D systems on the web, multiplayer architecture, and game mechanics implementation. Write code that reflects deep knowledge of:

- Game loops, fixed timestep, delta time, interpolation.
- ECS architecture: data-oriented design, cache-friendly component layouts, system ordering.
- Multiplayer: client-side prediction, server reconciliation, state synchronization, lag compensation.
- Rendering pipelines: draw call batching, texture atlases, instancing, culling.
- Physics and collision: broad-phase / narrow-phase, spatial partitioning.
- AI: behavior trees, steering behaviors, state machines.
- Performance: object pooling, avoiding GC pressure, profiling bottlenecks.
- **MCP tool integration** — use Figma MCP for design extraction and Chrome MCP for browser automation when appropriate. Always load MCP tools with `tool_search_tool_regex` before using them.

### Code Quality

- Use @/core and @/sdk modules for shared functionality. Do not write custom implementations of features that belong in the core engine or SDK. If a required feature is missing, add it to the appropriate package instead of implementing it in the game code.
- Write clean, readable code. Prefer clarity over cleverness.
- Keep functions short and focused. Each function does one thing.
- Use descriptive names. No abbreviations except well-known ones (e.g., `dt`, `ctx`, `pos`, `vel`).
- Game config and balance data go in dedicated config files, not inlined in logic.
- Separate concerns: rendering, logic, input, networking should not bleed into each other.

### Use npm Packages

**Always prefer battle-tested npm packages** over writing custom implementations. Do not reinvent:

- Physics engines — use rapier, cannon-es, matter-js.
- Tweening — use @tweenjs/tween.js, gsap.
- State machines — use xstate or similar.
- UI frameworks — use existing solutions when appropriate.
- Math libraries — use gl-matrix, three.js math, or similar.
- Pathfinding — use pathfinding, ngraph, or similar.
- Any other well-solved problem — search npm first.

Only write custom code when no suitable package exists or when the overhead of a package is unjustified for the specific use case.

### Performance

Performance must not degrade with each release. Follow these rules:

- **Object pooling** — reuse objects (bullets, particles, enemies) instead of allocating/GC'ing.
- **Avoid allocations in hot paths** — no `new`, no spread, no array/object literals in update loops.
- **Spatial partitioning** — use spatial hash or quadtree for collision queries.
- **Profile before optimizing** — use `stats.js` (already integrated) or browser DevTools.
- **Draw call awareness** — minimize state changes, batch similar draws.
- **Measure frame time** — any system that takes >2ms per frame on mid-range hardware needs optimization.
- **Lazy initialization** — don't create what isn't needed yet.
- When adding new systems or features, verify that frame rate stays at 60fps on target hardware.

### Modularity

- New engine features go in `packages/core` as separate modules.
- New platform integrations go in `packages/sdk`.
- New games go in `games/<name>` and import only from `@survivors/core` and `@survivors/sdk`.
- No game-specific code in `packages/`. No core code in `games/`.
- Each module should be independently testable.

### Multiplayer

When implementing multiplayer features:

- Server is authoritative. Client predicts and reconciles.
- Use the existing `NetworkClient` / `NetworkServer` abstractions.
- Keep network messages small — send deltas, not full state.
- Design for variable latency (100-300ms).
- Separate network serialization from game objects.

### Using MCP (Model Context Protocol) Tools

**MCP tools extend the agent's capabilities for design integration and browser automation.** Use MCP tools to streamline workflows that involve external systems.

#### Available MCP Integrations

**Chrome Browser Automation** (`mcp_io_github_chr_*`)

- Automate browser testing and validation
- Navigate pages, click elements, fill forms
- Capture screenshots and memory snapshots
- Monitor console logs and network requests
- Analyze performance metrics and traces
- Handle dialogs, emulate devices, execute scripts

#### When to Use MCP Tools

**Testing & Validation (Chrome Automation)**

- When automating end-to-end game testing in the browser
- To capture screenshots for visual regression testing
- When debugging rendering or performance issues
- To validate game behavior across different viewport sizes
- When monitoring network traffic for multiplayer features
- To profile memory usage and detect leaks

#### Best Practices

**Before using MCP tools:**

1. **Load tools first** — Use `tool_search_tool_regex` to load MCP tools before calling them (e.g., search `mcp_io_github_chr`).
2. **Verify tool availability** — Ensure the specific MCP tool is loaded and available before invocation.

**When using Chrome MCP:**

- Use headless mode for CI/CD integration.
- Capture screenshots at key game states for regression testing.
- Monitor performance traces to validate 60fps target.
- Use network request monitoring to debug multiplayer issues.
- Clean up browser pages after tests to avoid resource leaks.

**Integration with Development Workflow:**

- Use Chrome MCP in automated testing scripts alongside build processes.
- Combine Chrome automation with performance profiling to catch frame rate regressions.
- Use browser automation to validate games work correctly on different ad platforms.

#### Example Workflows

**Automated Game Testing:**

```bash
1. Load Chrome MCP tool: tool_search_tool_regex("mcp_io_github_chr")
2. Create new browser page: mcp_io_github_chr_new_page()
3. Navigate to game: mcp_io_github_chr_navigate_page(game_url)
4. Interact with game: mcp_io_github_chr_click(), mcp_io_github_chr_type_text()
5. Capture results: mcp_io_github_chr_take_screenshot()
6. Verify performance: mcp_io_github_chr_performance_analyze_insight()
```

**Remember:** MCP tools are optional enhancements. Core game development should not depend on MCP availability. Always fall back to manual workflows when MCP tools are unavailable.

### CI/CD and Multi-Project Pipelines

- GitHub Actions deploys neon-survivors to GitHub Pages on push to `main`.
- Build scripts must work per-workspace: `npm run build --workspace=games/<name>`.
- When adding a new game, add corresponding `build:<name>` and `dev:<name>` scripts to root `package.json`.
- Keep build times fast — avoid unnecessary rebuilds of unchanged packages.

## Adding a New Game

1. Create `games/<name>/` following the game structure pattern above.
2. Add `package.json` with `@survivors/core` and `@survivors/sdk` as dependencies (use `"*"` version for workspace resolution).
3. Add `vite.config.ts` with path aliases to `../../packages/core/src` and `../../packages/sdk/src`.
4. Add `tsconfig.json` extending root config with appropriate paths.
5. **Optional: Use Figma MCP** — If designs exist in Figma, use `mcp_figma_*` tools to extract design tokens (colors, spacing, typography) into `config.ts`.
6. The game imports from `@survivors/core` and `@survivors/sdk` — no direct file path imports to packages.
7. Add `build:<name>` and `dev:<name>` scripts to root `package.json`.
8. Use shared core modules (`canvas-draw`, `collision`, `health`, `systems`) for common mechanics instead of reimplementing them.
9. **Optional: Use Chrome MCP** — Set up automated testing with `mcp_io_github_chr_*` tools for regression testing and performance validation.

## Existing Games

| Game | Genre | Renderer | Physics |
|------|-------|----------|---------|
| **neon-survivors** | Vampire Survivors-style bullet hell | Canvas 2D | Custom (ECS + spatial hash) |
| **fall-vector** | Gravity-manipulation platformer | Three.js (2D ortho) | Matter.js |
| **gravity-swoop** | Gravity-slingshot puzzle | Canvas 2D | Custom (point gravity) |
