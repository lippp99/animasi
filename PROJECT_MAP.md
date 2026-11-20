# Project Map — Animasi Engine

> Auto-generated oleh `npm run map` ([generateProjectMap.ts](src/render/generateProjectMap.ts)). Jangan edit manual.

- **Ringkasan:** `14` folder | `79` file (`66` TypeScript)
- **Dikecualikan:** `.cache`, `.env`, `.env.local`, `.git`, `.qa-tmp`, `coverage`, `dist`, `node_modules`, `output`, `package-lock.json`, dan `.env.*.local`

## Struktur Direktori

```text
animasi/
├── docs/
│   └── rules/
│       ├── 01-architecture.md (31 lines)
│       ├── 02-visual-animation.md (28 lines)
│       ├── 03-rendering-hardware.md (30 lines)
│       ├── 04-audio-elevenlabs.md (24 lines)
│       ├── 05-episode-workflow.md (32 lines)
│       └── 06-qa-frame-review.md (24 lines)
├── src/
│   ├── audio/
│   │   ├── auditionVoices.ts (157 lines)
│   │   ├── elevenLabsClient.ts (181 lines)
│   │   ├── generateEpisodeAudio.ts (167 lines)
│   │   ├── sfxMixer.ts (151 lines)
│   │   └── voiceConfig.ts (85 lines)
│   ├── camera/
│   │   ├── cameraJuice.ts (61 lines)
│   │   ├── director.ts (229 lines)
│   │   ├── impulse.ts (74 lines)
│   │   └── presets.ts (61 lines)
│   ├── characters/
│   │   ├── characterBillboard.ts (170 lines)
│   │   ├── characterCostumeDraw.ts (295 lines)
│   │   ├── characterCrowd2D.ts (182 lines)
│   │   ├── characterEmoteDraw.ts (77 lines)
│   │   ├── characterFaceDraw.ts (294 lines)
│   │   ├── characterIKMath.ts (127 lines)
│   │   ├── characterPropsDraw.ts (149 lines)
│   │   ├── characterRig2D.ts (226 lines)
│   │   └── characterVectorDraw.ts (139 lines)
│   ├── core/
│   │   ├── engine.ts (267 lines)
│   │   ├── math.ts (84 lines)
│   │   ├── registry.ts (31 lines)
│   │   ├── timeline.ts (76 lines)
│   │   └── tokens.ts (172 lines)
│   ├── episodes/
│   │   ├── ain-jalut-1260/
│   │   │   ├── cast.ts (246 lines)
│   │   │   ├── index.ts (24 lines)
│   │   │   ├── meta.ts (70 lines)
│   │   │   ├── narration.ts (171 lines)
│   │   │   ├── shots-part1.ts (202 lines)
│   │   │   └── shots-part2.ts (198 lines)
│   │   ├── index.ts (29 lines)
│   │   ├── paths.ts (49 lines)
│   │   └── scaffoldEpisode.ts (255 lines)
│   ├── overlay/
│   │   ├── hud.ts (234 lines)
│   │   └── styles.ts (191 lines)
│   ├── render/
│   │   ├── audit.ts (214 lines)
│   │   ├── browser.ts (118 lines)
│   │   ├── exportMp4.ts (227 lines)
│   │   ├── ffmpeg.ts (135 lines)
│   │   ├── generateProjectMap.ts (116 lines)
│   │   ├── hardware.ts (108 lines)
│   │   ├── qaClean.ts (58 lines)
│   │   ├── qaExtract.ts (210 lines)
│   │   └── qaPlanner.ts (80 lines)
│   ├── types/
│   │   ├── audio.ts (54 lines)
│   │   ├── camera.ts (61 lines)
│   │   ├── character.ts (133 lines)
│   │   ├── common.ts (69 lines)
│   │   ├── episode.ts (80 lines)
│   │   └── world.ts (108 lines)
│   ├── vfx/
│   │   ├── impactVfx.ts (256 lines)
│   │   └── vfxPrimitives.ts (67 lines)
│   ├── world/
│   │   ├── atmosphericSky.ts (296 lines)
│   │   ├── cutawaySystem.ts (49 lines)
│   │   ├── glbPropLoader.ts (101 lines)
│   │   ├── layeredEnvironment.ts (204 lines)
│   │   ├── postProcessing.ts (143 lines)
│   │   ├── presets.ts (140 lines)
│   │   ├── proceduralTextures.ts (261 lines)
│   │   ├── propBuilders.ts (230 lines)
│   │   ├── spatial.ts (162 lines)
│   │   ├── terrainAndSetPieces.ts (204 lines)
│   │   ├── terrainHeight.ts (37 lines)
│   │   ├── toonMaterials.ts (226 lines)
│   │   └── weather.ts (136 lines)
│   └── main.ts (47 lines)
├── .env.example
├── .gitignore
├── AGENTS.md (28 lines)
├── index.html (13 lines)
├── package.json (33 lines)
├── PROJECT_MAP.md (121 lines)
├── tsconfig.json (21 lines)
└── vite.config.ts (14 lines)
```

## Peran Modul Utama

| Folder | Tanggung Jawab |
| --- | --- |
| `docs/rules/` | Aturan permanen proyek (arsitektur, visual Hybrid 2.5D, hardware QSV, audio, episode, QA) |
| `src/types/` | Kontrak tipe TypeScript strict (`common`, `world`, `character`, `camera`, `episode`, `audio`) |
| `src/core/` | Orchestrator engine, timeline 60fps deterministik, token desain, math/PRNG, registry |
| `src/characters/` | Generator Pure 2D Vector Cutout (`512x768`), ekspresi/emote, 2D IK, billboard & crowd |
| `src/world/` | Dunia 3D Low-Poly Toon, `EdgesGeometry` tinta, 3D Cutaway, loader `.glb`, langit & post-processing |
| `src/camera/` | Sutradara kamera 360°, preset sudut, `projectile_pov`, `Camera Impulse Rig`, micro slow-mo |
| `src/vfx/` | Efek aksi deterministik (smear arc, sparks, shockwave, dust puffs, panah, bara api) |
| `src/overlay/` | HUD HTML/CSS/SVG transparan (subtitle tanpa card, ephemeral badge, callout, transisi) |
| `src/audio/` | Integrasi ElevenLabs v4, dynamic voice roles, disk cache, SFX berlapis & auto-ducking |
| `src/episodes/` | Data skenario episode murni (`ain-jalut-1260`), registry, dan scaffolder episode baru |
| `src/render/` | Pipeline render Intel iGPU + FFmpeg QSV, QA frame extract/clean, audit kode, & generator map |
