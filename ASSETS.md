# Assets

**Art direction:** A crisp 2D neon arcade arena with a deep navy starfield, indigo stone platforms edged with cyan light, amber-gold coin pickups, compact colorized square robot avatars, and restrained violet/cyan glow. HUD panels use dark translucent glass with white typography and small green/cyan status accents. Shapes remain bold and readable at practical gameplay scale.

## Generated reference

| Name | Description | Size | Image | Runtime |
|---|---|---:|---|---|
| reference | In-game screenshot target showing arena composition, HUD placement, player scale, and palette | 2560x1440 review image | `art/reference.png` | Review only |

## Runtime sprites and textures

| Name | Description | Size | Image | Runtime |
|---|---|---:|---|---|
| platform-tile | Seamless indigo stone platform tile with cyan top edge and violet seams | 64x64 px tile | `public/img/neon-platform.png` | Cached canvas image |
| coin-sprite | Amber-gold ring coin with bright highlight and restrained accent glow | 36x36 px | `public/img/neon-coin.png` | Cached canvas image |
| player-sprite | Cyan square robot avatar with bright outline and dark visor | 42x42 px | `public/img/neon-player.png` | Cached canvas image, tinted procedurally per player |

## Existing audio

The existing `/coin.wav`, `/victory.wav`, `/defeat.wav`, and `/SonicIceCapRemixLoopable.mp3` files remain optional enhancements. Playback is unlocked after the first user gesture and every `play()` call is guarded for browsers that reject autoplay.

## Asset rules

The large generated originals remain under `art/` for review and are not loaded at runtime. Runtime images are resized and optimized for the canvas display sizes. The renderer supplies a procedural fallback for every visual asset so a single failed image request cannot block gameplay.
