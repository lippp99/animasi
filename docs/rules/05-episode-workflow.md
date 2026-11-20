# 05 — Standar Alur Kerja Pembuatan Episode / Video Shorts Baru

Aturan ini wajib diikuti setiap kali membuat, menyunting, mengisi suara, atau merender episode video Shorts baru di proyek `animasi`.

## 1. Lokasi Wajib Episode Baru (`src/episodes/<slug-episode>/`)
- Setiap video Shorts baru **WAJIB** dibuat dalam sub-folder khusus bernama **`src/episodes/<slug-episode>/`** dengan slug huruf kecil *kebab-case* (contoh: `src/episodes/constantinople-1453/`, `src/episodes/218sm-hannibal-alpen/`).
- **DILARANG** meletakkan naskah, karakter, atau skenario episode ke dalam folder inti engine (`src/core/`, `src/world/`, `src/characters/`, `src/camera/`, `src/overlay/`).
- Seluruh episode wajib didaftarkan pada pusat registry **`src/episodes/index.ts`**.

## 2. Pemecahan File per Episode (Hard Cap < 300 Baris)
Setiap folder `src/episodes/<slug-episode>/` wajib dipisah menjadi modul kecil yang kohesif:
- **`meta.ts`** — metadata episode (`id`, `title`, `fps`, `totalFrames`, `badge`), staging `world`, konfigurasi casting `characters` beserta `voiceRole`, dan `crowds`.
- **`narration.ts`** — naskah suara (`narration` per shot), teks `subtitles`, `callouts` infografis, dan `audioCues`.
- **`shots.ts`** — daftar *micro-shot* kamera, mood, cuaca, dan tautan narasi. Jika episode panjang dan `shots.ts` mendekati **280 baris**, wajib dipecah per babak (`shots-part1.ts`, `shots-part2.ts`, dst.) lalu digabung di `shots.ts`.
- **`index.ts`** — menggabungkan `meta.ts`, `narration.ts`, dan `shots.ts` lalu mengekspor objek `EpisodeSpec` lengkap.

## 3. Lokasi Output Media Terpisah (`output/episodes/<slug-episode>/`)
Seluruh hasil generate media per episode wajib dipisahkan dari kode sumber ke struktur berikut:
- `output/episodes/<slug-episode>/audio/` — klip `.mp3` per shot & `manifest.json` hasil `audio:generate`.
- `output/episodes/<slug-episode>/preview/` — potongan keyframe QA / preview cepat.
- `output/episodes/<slug-episode>/final.mp4` — video vertikal akhir `1080 × 1920 @ 60fps` hasil `render`.

## 4. Perintah CLI Standar Produksi Episode
1. **Buat kerangka episode baru + registrasi otomatis:**
   `npm run episode:new -- --slug=<slug-episode> --title="Judul Episode"`
2. **Generate suara ElevenLabs & sinkronisasi manifest:**
   `npm run audio:generate -- --episode=<slug-episode>`
3. **Render MP4 via Intel iGPU + FFmpeg QSV:**
   `npm run render -- --episode=<slug-episode>`
4. **Verifikasi tipe & batas baris (`< 300` baris):**
   `npm run check`
