# Memory

The existing game is a functioning Next.js 13 pages-router application with Socket.IO initialized from `/api/socket`. Railway can continue to run it through `npm run build` and `npm start`, and `/api/health` should remain the health check path.

The most important performance findings are server-side collision allocation, full-state emission at the simulation rate, client control emission on every animation frame, full-map redraws, and the leaderboard interval being recreated on every render. The rebuild addresses these without changing the basic gameplay contract or requiring a new platform.

The generated art target is `art/reference.png`. Runtime assets are intentionally small and are created from generated originals using deterministic resizing/background cleanup. The game should remain playable if any runtime asset fails to load.

Audio may be blocked until the user interacts with the page. This is expected browser behavior; audio code must always fail softly and never hold up loading or gameplay.


The prepared runtime assets passed a visual spot check: `neon-coin.png` is a readable 44x44 amber ring with transparent background, and `neon-player.png` is a readable 48x48 cyan robot silhouette with transparent background. The platform asset is a small 72x64 RGBA tile intended to be repeated across solid map cells.


Rebuild browser check: the new page title and content rendered, but the screenshot showed unstyled default HTML instead of the neon CSS theme. This indicates a production CSS delivery/build issue that must be fixed before gameplay verification proceeds. The next diagnostic step is to inspect the generated HTML stylesheet links and the local server responses/logs.


After restarting the correct production server, the rebuilt customization page loaded with the intended neon theme. Submitting `NeonTester` entered a live match successfully: the scoreboard, LIVE MATCH pill, control deck, generated platform tiles, and generated coin sprite rendered in the canvas. The initial player starts behind the left scoreboard at the existing spawn coordinates, so the next interaction check should move the player out from under the HUD and verify movement/collision response.


Gameplay interaction check: the rebuilt match stayed connected while keyboard movement actions were sent. The HUD remained responsive and the arena continued rendering with the neon platform and coin assets; coin spawning reached the configured 25-coin cap without errors. The local player remained obscured by the fixed desktop scoreboard at the default spawn, so the visual HUD layout should be adjusted or the spawn/camera framing should be checked before final screenshots.


Fresh-session check after the spawn fix: the production build loaded the customization screen correctly, connected to a new match, cleared loading after the assets were ready, and showed `SpawnTester` visibly in the playfield just outside the scoreboard. The live HUD, generated platform tiles, and coin sprite all rendered together without a visible loading or connection failure.


Continuous movement verification passed. A controlled 900 ms `D` key hold moved the visible `SpawnTester` avatar across the arena, the player remained connected, and one coin pickup changed the authoritative score from 0 to 1. The rendered label, avatar tint, platform collision layout, and coin feedback remained visually stable during the movement test.


Automated production smoke test passed. `/api/health` returned HTTP 200 with status `healthy`; a Socket.IO client connected over WebSocket, received map, block, players, and coins events, received the ready callback, and produced finite player coordinates after a control update. The observed test player moved from the spawn lane to x=544 during the smoke interval.


Final visual smoke setup: a fresh production page load rendered the redesigned customization screen with the expected navy, cyan, violet, and glass-panel styling. The form accepted `FrameTester` normally, confirming the clean server remains usable after the final build and smoke-test changes.


Final canvas performance sample passed: the active game render loop delivered 120 frames over 2.002 seconds, approximately 60 fps, while the live arena, scoreboard, generated sprites, and HUD were visible. No browser-side runtime error appeared during the measurement.
