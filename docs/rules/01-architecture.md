# 01 — Arsitektur & Standar Kode TypeScript

Aturan ini bersifat permanen untuk seluruh pengembangan di proyek `animasi`.

## 1. 100% TypeScript Strict (Nol JavaScript Polos)
- Seluruh kode sumber, skrip tooling, konfigurasi (`vite.config.ts`), dan pipeline render **WAJIB** ditulis dalam `.ts` dengan `"strict": true` di `tsconfig.json`.
- **DILARANG** membuat atau menyimpan file `.js`, `.mjs`, atau `.cjs` di dalam proyek.
- **DILARANG** menggunakan tipe `any` (baik implisit, eksplisit `: any`, `as any`, maupun `<any>`). Semua kontrak data wajib didefinisikan secara eksplisit di `src/types/`.

## 2. Struktur Sub-Folder Modular (Anti-Menumpuk)
Setiap domain tanggung jawab wajib menempati sub-folder masing-masing:
- `src/types/` — kontrak data murni (`common.ts`, `world.ts`, `character.ts`, `camera.ts`, `episode.ts`, `audio.ts`).
- `src/core/` — timeline deterministik (`60 fps`), token desain (`tokens.ts`), utilitas matematika/noise deterministik (`math.ts`), registry episode, dan orchestrator engine (`engine.ts`).
- `src/world/` — preset atmosfer (`presets.ts`), tekstur prosedural, langit & pencahayaan, medan/air/properti, partikel cuaca, dan post-processing.
- `src/characters/` — geometri *Bean/Pill*, ekspresi wajah, aksesori modular, fisika gerak, dan sistem *crowd* (`InstancedMesh`).
- `src/camera/` — preset sudut sinematik dan sutradara kamera (`director.ts`).
- `src/overlay/` — lapisan HUD HTML/CSS/SVG transparan (subtitle, lencana waktu/lokasi, kartu infografis).
- `src/audio/` — integrasi ElevenLabs TTS, *Dynamic Voice Roles*, *disk cache*, generator audio episode, dan skrip audisi suara.
- `src/episodes/` — data skenario episode murni, terpisah total dari logika engine.
- `src/render/` — otomasi headless browser GPU, FFmpeg hardware exporter, orkestrator paralel, dan skrip audit kode.
- `docs/rules/` — dokumentasi aturan arsitektur modular yang dirujuk oleh `AGENTS.md`.

## 3. Hard Cap < 300 Baris per File
- **Setiap file `.ts` dan setiap file `.md` di `docs/rules/` WAJIB di bawah 300 baris.**
- Jika sebuah modul mulai mendekati batas 300 baris, segera pecah menjadi sub-modul kecil yang kohesif dengan satu tanggung jawab jelas.
- Selalu jalankan `npm run check` (`tsc --noEmit` + `npm run audit`) sebelum menyelesaikan perubahan apa pun.

## 4. Determinisme Frame & Tanpa Magic Numbers
- Seluruh animasi wajib digerakkan murni dari nomor `frame` (`60 fps`), bukan `Date.now()`, `performance.now()`, atau `Math.random()`.
- Dilarang menyebar *magic numbers* (koordinat, warna, proporsi, jarak kamera, durasi) di dalam logika render — gunakan token di `src/core/tokens.ts`, preset di `src/world/presets.ts` & `src/camera/presets.ts`, serta data skenario di `src/episodes/`.
