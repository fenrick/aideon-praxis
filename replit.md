# Aideon Praxis

## Overview
Aideon Praxis is a desktop application built with Tauri (Rust backend + React/TypeScript frontend). It provides a "Praxis Canvas" workspace for visualizing and managing scenarios, projects, and templates with graph-based, catalogue, matrix, and chart views.

## Project Structure
```
/
├── app/
│   └── AideonDesktop/       # React frontend application
│       ├── src/
│       │   ├── adapters/    # IPC and platform adapters
│       │   ├── canvas/      # Main canvas app components and logic
│       │   ├── design-system/ # UI components (shadcn/ui based)
│       │   ├── dtos/        # Data transfer objects/types
│       │   ├── hooks/       # Custom React hooks
│       │   ├── types/       # TypeScript types
│       │   ├── main.tsx     # Application entry point
│       │   ├── root.tsx     # Root component
│       │   └── styles.css   # Global styles
│       ├── package.json
│       └── vite.config.ts
├── crates/                   # Rust backend crates (Tauri)
│   ├── aideon_praxis_facade/
│   ├── desktop/
│   ├── engine/
│   ├── chrona/
│   ├── metis/
│   ├── continuum/
│   └── mneme/
├── aideon_xtask/            # Build task runner (Rust)
├── tests/                   # Integration tests
└── tools/                   # Build and development tools
```

## Development Setup

### Requirements
- Node.js 24+
- pnpm (package manager)
- Rust toolchain (for Tauri backend, not needed for frontend-only development)

### Running the Frontend
The frontend runs on port 5000 with Vite:
```bash
cd app/AideonDesktop
npm run dev
```

### Key Scripts
- `npm run dev` - Start development server (port 5000)
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript checks

## Architecture

### Frontend Stack
- React 19 with TypeScript
- Vite 7 for build tooling
- Tailwind CSS 4 for styling
- shadcn/ui components
- @xyflow/react for graph visualization
- Recharts for charts

### Tauri Integration
When running as a desktop app, the frontend communicates with the Rust backend via Tauri's IPC. In browser mode (Replit preview), the app uses mock data providers for all backend calls.

The `isTauri()` function in `canvas/platform.ts` detects the runtime environment and falls back to mock data when not in Tauri.

## User Preferences
- Uses light color scheme by default
- Space Grotesk / Inter font family

## Recent Changes
- Dec 17, 2025: Initial import to Replit environment
  - Configured Vite to run on port 5000 with 0.0.0.0 host
  - Enabled allowedHosts for Replit proxy support
  - Upgraded to Node.js 24 to meet project requirements
