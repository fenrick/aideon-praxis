# [0.1.0](https://github.com/fenrick/aideon-praxis/compare/v0.0.0...v0.1.0) (2025-10-18)

### Bug Fixes

- **app:** rename catch binding; export AideonApi from global types to avoid bare export ([b981a7a](https://github.com/fenrick/aideon-praxis/commit/b981a7a782382e847e24eb5f187b621929a335d0))
- **app:** resolve ESLint issues (prefer globalThis, typed bridge, event-based ready, remove unnecessary conditions) ([0598ea2](https://github.com/fenrick/aideon-praxis/commit/0598ea21755d9cfc912729e9e2acc8a5cd395b3e))
- **app:** solidify global typings with module augmentation; use typed bridge access; update tests for require-await ([31b2de1](https://github.com/fenrick/aideon-praxis/commit/31b2de17e93c38d727104e74c5fc66ff538b407f))
- **dev:** wait for renderer index.html before launching Electron; add wait-on to coordinate dev watch builds ([b61392d](https://github.com/fenrick/aideon-praxis/commit/b61392db961421f8a17740dddc0fe77d8cacc249))
- **ipc:** register worker IPC handlers before readiness; await READY internally to avoid 'No handler registered' race ([51c1709](https://github.com/fenrick/aideon-praxis/commit/51c1709a752dc1d5e5411bad3fbe291708493748))
- **lint:** reduce main() complexity, remove fs loop, use helper for spawn; rename variables to satisfy rules; add vite/client types ([239ea8b](https://github.com/fenrick/aideon-praxis/commit/239ea8b866e729c8afa644ed5372a7ef3c8bc615))
- **renderer:** set Vite base='./' so built assets load via file:// in Electron ([2ae8828](https://github.com/fenrick/aideon-praxis/commit/2ae882836eb515327b8ce5fa787add86db98be17))

### Features

- **adapters:** add adapter interfaces and unit test ([2a4a814](https://github.com/fenrick/aideon-praxis/commit/2a4a8146bce8357fba130f2b5c980f6edafb2e78))
- **app:** expose typed stateAt on preload; add IPC handler; render worker result in UI; update global typings and tests ([ebc9948](https://github.com/fenrick/aideon-praxis/commit/ebc994838d6674c1b753eead7204142091890efe))
- **app:** scaffold secure Electron host + React renderer with packaging ([fec07a4](https://github.com/fenrick/aideon-praxis/commit/fec07a442af9c4888b8090e71eaf48c2e7687410))
- **e2e:** wire renderer↔preload↔main↔worker roundtrip; expose stateAt via IPC and display worker JSON on load ([1ce514e](https://github.com/fenrick/aideon-praxis/commit/1ce514e19cfd183a67966f862ca2bbef337b0c94))
- **worker:** add Python sidecar with Temporal.StateAt and CLI ([1facad5](https://github.com/fenrick/aideon-praxis/commit/1facad5388ad795257fa65a21340b39f60288074))
