# Survivors Monorepo

A **game development monorepo** for creating and publishing multiple browser games across different genres. Games share a common engine (`@survivors/core`) and platform SDK (`@survivors/sdk`), enabling rapid development and consistent infrastructure.

## 🎮 Games

| Game | Genre | Status | Renderer | Physics |
|------|-------|--------|----------|---------|
| **Neon Survivors** | Vampire Survivors-style bullet hell | ✅ Live | Canvas 2D | Custom (ECS + spatial hash) |
| **Neon Strike** | Top-down action shooter | 🚧 In Development | Canvas 2D | Custom (ECS + spatial hash) |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/natay1304/neon-survivors.git
cd neon-survivors

# Install all workspace dependencies
npm install
```

### Development

```bash
# Run neon-survivors (default game)
npm run dev

# Run a specific game
npm run dev:neon           # Neon Survivors
npm run dev:neon-strike    # Neon Strike
```

### Build

```bash
# Build all games
npm run build

# Build a specific game
npm run build:neon
npm run build:neon-strike
```

### Preview Production Build

```bash
# Preview a specific game
npm run preview:neon
npm run preview:neon-strike
```

## 📁 Project Structure

```
├── packages/
│   ├── core/       # @survivors/core — game engine
│   ├── sdk/        # @survivors/sdk — ad platform integrations
│   └── server/     # @survivors/server — multiplayer server
├── games/
│   ├── neon-survivors/  # Vampire Survivors-style bullet hell
│   └──  neon-strike/    # Top-down action shooter
├── package.json         # npm workspaces root
└── tsconfig.json        # shared TypeScript config
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | TypeScript (strict mode, ES2020 target) |
| **Build Tool** | Vite |
| **Graphics** | Three.js + Canvas 2D API |
| **Audio** | Howler.js |
| **Networking** | socket.io (client + server) |
| **Events** | eventemitter3 |
| **Physics** | Matter.js (for Fall Vector) |
| **Server Runtime** | Node.js + tsx |
| **CI/CD** | GitHub Actions → GitHub Pages |

## 🏗️ Architecture

### Core Engine (`packages/core`)

The engine provides modular, reusable systems:

- **ECS** — Entity-Component-System architecture
- **Game Loop** — Fixed timestep with interpolated rendering
- **Scene Manager** — Stack-based scene transitions
- **Renderers** — 2D, 3D, and headless rendering
- **Cameras** — 2D and 3D camera systems with follow and shake
- **Input** — Unified keyboard + touch with virtual joystick
- **Audio** — SFX, music, and spatial audio
- **AI** — Behavior trees (seek, flee, orbit, etc.)
- **Networking** — Socket.io client with rooms and reconnect
- **Particles** — Lightweight particle system
- **Spatial Hash** — O(n) broad-phase collision detection
- **Collision** — Circle-circle, circle-AABB, point-in-shape
- **Health & Damage** — Damage, knockback, invulnerability
- **Canvas Drawing** — Particle rendering, floating text, UI helpers
- **Gravity** — Point gravity, tangential release, orbit detection
- **Math** — Vec2 and utility functions
- **Utilities** — Object pooling, floating text manager

### Platform SDK (`packages/sdk`)

Platform abstraction layer with auto-detection for:

- **CrazyGames** — Ad integration
- **Yandex** — Ad integration
- **Telegram** — Bot integration
- **Noop Platform** — Fallback for local development

### Multiplayer Server (`packages/server`)

Optional multiplayer server with:

- Room management
- State synchronization
- Client prediction and reconciliation
- Lag compensation

## 🎯 Game Development Workflow

Each game follows this structure:

```
games/<name>/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts          # Entry point, platform init
    └── game/
        ├── game.ts      # Main scene
        ├── components.ts # ECS component definitions
        ├── config.ts     # Balance data, tuning constants
        ├── systems.ts    # ECS systems
        ├── renderer.ts   # Game-specific rendering
        └── ui.ts         # UI layer
```

## ➕ Adding a New Game

1. **Create game directory** in `games/<name>/`
2. **Add package.json** with dependencies:

   ```json
   {
     "name": "@games/<name>",
     "dependencies": {
       "@survivors/core": "*",
       "@survivors/sdk": "*"
     }
   }
   ```

3. **Add vite.config.ts** with path aliases to core and sdk
4. **Add tsconfig.json** extending root config
5. **Implement game** following the game structure pattern
6. **Add scripts** to root `package.json`:
   - `dev:<name>`
   - `build:<name>`
   - `preview:<name>`
7. **Use shared core modules** instead of reimplementing common mechanics

## 🧪 Development Philosophy

### Code Quality

- **TypeScript strict mode** — all code passes strict checks
- **ECS pattern** — game logic in systems, components are plain data
- **Modularity** — engine features in `packages/core`, platform code in `packages/sdk`
- **No game-specific code** in packages
- **Use npm packages** — prefer battle-tested libraries over custom code

### Performance

- **Object pooling** — reuse objects to avoid GC pressure
- **Spatial partitioning** — spatial hash for collision queries
- **No allocations in hot paths** — avoid `new`, spread, array/object literals in update loops
- **Target 60 FPS** — verify frame rate on mid-range hardware

### Conventions

- **English only** — all code, comments, and strings in English
- **Named exports** — no default exports
- **ES modules** — `import`/`export` throughout
- **Flat structure** — each core module exports from a single file

## 🚢 Deployment

The project uses GitHub Actions for CI/CD:

- Automatic builds on push to `main`
- Deployment to GitHub Pages
- Per-workspace build scripts

## 📚 Documentation

For detailed architecture, conventions, and best practices, see [CLAUDE.md](./CLAUDE.md).
