# Animasi Engine — Master Agent Router

> **WAJIB DIBACA DI AWAL SETIAP SESI:**
> Sebelum menulis, mengedit, merender, atau menambah dependensi apa pun di proyek `animasi`, setiap AI agent **WAJIB membaca dan mematuhi seluruh file aturan modular di dalam folder `docs/rules/`**.

## Daftar Aturan Proyek (`docs/rules/`)

1. **[docs/rules/01-architecture.md](docs/rules/01-architecture.md)**
   100% TypeScript `strict: true`, nol file `.js`, nol `any`, struktur sub-folder modular, determinisme berbasis `frame`, larangan *magic numbers*, dan **hard cap `< 300` baris per file**.
2. **[docs/rules/02-visual-animation.md](docs/rules/02-visual-animation.md)**
   Standar **Hybrid 2.5D**: Karakter 2D *Paper-Cutout* (`512×768`, outline `#111111` `5px`, 2-Bone IK foot-locking, ekspresi & simbol komik, bayangan siluet nyata) di dunia 3D *Low-Poly Toon* 3-tingkat + *3D Cutaway*, kamera 360° + *impulse rig*, subtitle tanpa card, dan *safe zone* 9:16.
3. **[docs/rules/03-rendering-hardware.md](docs/rules/03-rendering-hardware.md)**
   Akselerasi hardware **Intel Core i5-14400 / Intel UHD Graphics 730**: WebGL ANGLE D3D11 (bukan SwiftShader), FFmpeg **`h264_qsv`** (ICQ) + fallback `libx264`, paralelisme **RAM 64GB**, dan WebGL `dispose`.
4. **[docs/rules/04-audio-elevenlabs.md](docs/rules/04-audio-elevenlabs.md)**
   ElevenLabs (`eleven_v4` via `GET /v1/models` & `GET /v1/voices`), *Dynamic Voice Roles*, *disk cache*, SFX berlapis + *auto-ducking*, dan keamanan `.env`.
5. **[docs/rules/05-episode-workflow.md](docs/rules/05-episode-workflow.md)**
   Panduan membuat video Shorts baru di `src/episodes/<slug>/` (`meta.ts`, `narration.ts`, `shots.ts`, `index.ts`), registry `src/episodes/index.ts`, output di `output/episodes/<slug>/`, dan CLI `--episode=<slug>`.
6. **[docs/rules/06-qa-frame-review.md](docs/rules/06-qa-frame-review.md)**
   **Gerbang Verifikasi Wajib:** Ekstrak & inspeksi visual seluruh Grid Contact Sheet berlabel frame (`qa:extract`), perbaiki jika ada cacat, lalu **wajib bersihkan** `.qa-tmp/` (`qa:clean`) agar disk bersih.

## Perintah Verifikasi & Produksi Wajib
- `npm run check` — `tsc --noEmit` + audit seluruh `.ts` & `docs/rules/*.md` (`< 300` baris, 0 `.js`, 0 `any`, + self-check).
- `npm run episode:new -- --slug=<slug>` — buat kerangka folder episode baru & registrasi otomatis.
- `npm run voice:audition` / `npm run audio:generate -- --episode=<slug>` — audisi & generate narasi ElevenLabs.
- `npm run render -- --episode=<slug>` — render `1080 × 1920 @ 60fps` ke `output/episodes/<slug>/final.mp4`.
- `npm run qa:extract -- --episode=<slug>` — ekstrak frame & bangun Grid Contact Sheet berlabel untuk inspeksi visual.
- `npm run qa:clean -- --episode=<slug>` — hapus total `.qa-tmp/` setelah lulus QA & verifikasi `final.mp4` utuh.
