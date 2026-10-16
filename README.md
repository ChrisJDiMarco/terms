# Terms

A complete offline strategy game for two people sharing a Mac, or one person against a local computer opponent. The Three.js tabletop, enamel counters, brass details, textures, and app icon are original procedural/vector artwork.

Open `release/Terms-darwin-arm64/Terms.app`, or the installed copy in `~/Applications/Terms.app`.

## Play

Every turn, select two available counters. Keep one for your collection and give the other to your opponent's price row. Selecting the same color twice is legal when at least two remain. Review the score preview, then confirm. Placements are permanent after confirmation.

There are seven counters of each of four colors and fourteen moves total. Your score is the sum of collection times price for each color. Highest total wins; equal totals draw. Rematch alternates the opening seat.

Click the physical supply or use the four color buttons. Keys 1–4 select colors. Enter confirms when the button is focused or focus is outside another button. Escape clears a selection. Drag the table to orbit; scroll to zoom. Table and Overhead select views; the arrow resets the camera. How to play includes reduced motion. The note button mutes sound.

The default mode is versus the computer. Use the mode menu for two players. A new game replaces the current table only after selecting a mode in the new-game dialog. The current game and preferences save under `~/Library/Application Support/Terms/table.json`.

## Development

Requires Node.js and npm. `npm ci`, `npm run build`, then `npm start`.

- `npm test`: pure rules, restoration and tactical endgame tests.
- `npm run check`: JavaScript syntax checks.
- `node tests/electron.e2e.mjs`: actual Electron lifecycle and complete-game tests, isolated save directory.
- `TERMS_EXECUTABLE='/absolute/path/Terms.app/Contents/MacOS/Terms' node tests/electron.e2e.mjs`: the same checks against a packaged app.
- `npm run package:mac`: creates the Apple silicon application.
- `codesign --force --deep --sign - release/Terms-darwin-arm64/Terms.app`: local ad-hoc signature.

This build targets Apple silicon macOS. It is locally signed, not notarized for public distribution. The computer searches four turns ahead and solves the final four turns exactly; this is a playable opponent, not a claim that the game has been solved or balanced.

Renderer references: [Three.js materials](https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial) and [Electron security](https://www.electronjs.org/docs/latest/tutorial/security). Runtime uses a sandboxed renderer served only on a random loopback port, with a narrow fixed-file save bridge. No external assets or services are required.
