# Terms for Mac

Authorization: Chris explicitly requested building the previously designed game now as an Electron Mac app, playable in 3D and visually exceptional.

Acceptance: A packaged, locally signed Terms.app opens a beautiful interactive 3D tabletop, supports complete legal games against a local computer or another person, calculates the original scoring, and offers an immediate rematch.

Rules: Four colors, seven counters each. Every turn consume two supply counters, place one in the active player's collection and the other in the opponent's price. All public and permanent. Same color allowed with two available. Fourteen total turns. Score sum(collection[color] * price[color]); ties draw.

Scope: Offline procedural Three.js table and pieces; orbit/zoom/top/reset; animated transfers; accessible HTML equivalents for color selection; move preview and confirmation; clear score breakdown; rules; local two-player and local computer; restart/rematch; session restoration; mute/reduced-motion support. No accounts, network play, external model dependencies, or monetization.

Visual direction: A commissioned game object, midnight blue lacquer and brass with ruby, sapphire, jade and amber enamel counters. Quiet ivory typography, large score numerals, table-centered composition, understated movement. Characterful Georgia display with system sans controls. The material object is the signature, controls remain legible and restrained.

Build: Independent pure rules/tests and 3D scene modules, integrated by a small vanilla JavaScript UI. Secure sandboxed Electron shell serves bundled renderer on random loopback port. Vite bundles Three.js. Apple silicon package, ad-hoc signature, launch and native window inspection.

Verification: Rule invariants, exact worked example, legal same-color exhaustion, complete bot games, end/rematch/persistence, native screenshot of packaged app, actual drag and view/zoom interaction, keyboard and default-size readability.

Risk: Normal local reversible application build. Preserve unrelated projects and existing checkouts. Stop only if an existing Terms installation would be overwritten without a recoverable copy.
