# Terms delivery receipt

Verified September 5, 2026 on this Apple silicon Mac.

- Installed app: `/Users/chrisdimarco/Applications/Terms.app`
- Packaged original: `release/Terms-darwin-arm64/Terms.app`
- Source: `/Users/chrisdimarco/Projects/Terms`
- Runtime: Electron 44.2.0, Three.js 0.185.1; local assets, no network service dependency.
- Architecture: arm64. Local ad-hoc signing; `codesign --verify --deep --strict` passed on the installed copy.
- App icon: packaged icon SHA-256 matches original `assets/Terms.icns`.

## Checks completed

1. Six pure engine tests pass: legal setup, immutable transitions, same-color scarcity, full conservation, complete games from both starters, restoration rejection, and the original 12–13 versus 13–11 ending.
2. Real Electron end-to-end flow passed against both development and packaged binaries: local turns, keyboard input, clear/reselect, availability, rules dialog, reduced motion, camera view, orbit and zoom, ending, save/relaunch, alternating starter, and complete computer game. No renderer JavaScript exceptions observed.
3. Independent code review found a quit/persistence race; fixed by waiting for queued writes. Reviewer reproduced the corrected behavior with a deliberately delayed write. Save-and-relaunch E2E separately passes.
4. Native window captured by CoreGraphics window ID 6748 and inspected at `evidence/packaged-native.png`. Default camera shows the dimensional tabletop and complete silhouette. Final lighting removes the earlier flat gray background. UI and source symbols match.
5. At minimum 1080×760 window size, document width is 1080, dock right edge 1060 and bottom edge 745; no horizontal overflow. Screenshot inspected at `evidence/packaged-minimum.png`.
6. Actual pointer clicks on the physical red supply selected Red for collection and Red for opponent price, enabling a legal same-color move. Evidence `evidence/pick-before.png` and `evidence/pick-after.png`.
7. The user's installed-app game was observed underway; subsequent verification used separate temporary save directories and did not replace that game.

## Fingerprints

`main.cjs`: `6e19b5869a2d312c8e971f4167c0f61a3e160cd95f10e7fb90a8c8563f13fcca`

`src/game.js`: `d44b2e3ce9cbe9103f8c12e48b07a854a39aa3b7d5bdac6442cd313212038c61`

`src/scene.js`: `811e366c699654661b27564fc5cdeec421d0c3d9cbdcfd1f27fc136351099f88`

Renderer bundle: `6da5320f68d3c9e136c30370d4ddbbc4d8a613ff1e52225a46f5ec4a49340971`

## Limits

Local two-player mode shares one Mac; there is no online multiplayer. The computer searches four turns, with exact final-four-turn evaluation. This receipt establishes working software and inspected visuals, not game-theoretic balance or long-term replayability. Public distribution would require notarization. The initial visual revision failed its appearance check and is retained only as development evidence.
