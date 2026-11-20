# 04 — Standar Audio ElevenLabs, SFX Terukur, & Auto-Ducking (`src/audio/`)

## 1. Verifikasi Model & Suara Resmi ElevenLabs (Larangan Menebak)
- **DILARANG** mengarang `model_id` atau `voice_id`.
- Target default adalah **`eleven_v4`** (terverifikasi dari dokumentasi resmi ElevenLabs & `GET /v1/models`, 90+ bahasa termasuk `language_code: "id"`).
- Verifikasi model dilakukan live lewat `GET /v1/models` (preferensi: `eleven_v4` → `eleven_v3` → `eleven_multilingual_v2`) dan daftar suara lewat `GET /v1/voices`.

## 2. Dynamic Voice Roles & Sinkronisasi
- Peran suara standar di `src/types/audio.ts`: `narrator`, `commander`, `npc_reactive`, `npc_secondary`.
- Setiap `ShotSpec` mendukung properti opsional `narration` (`voiceRole`, `narrationText`, `speakerCharacterId`, `audioPath`, `autoSyncDuration`, `languageCode`).
- Durasi klip `.mp3` diukur lewat `ffprobe` untuk menyinkronkan `durationFrames` dan status `isSpeaking` karakter.

## 3. SFX Terukur, Auto-Ducking, & Sinkronisasi Camera Impulse (`src/audio/sfxMixer.ts`)
- **Pemisahan Lapisan Audio:**
  1. *Voice Layer* (ElevenLabs narasi/dialog) sebagai prioritas utama kejelasan suara.
  2. *Ambient Bed* bervolume rendah sesuai suasana (`night_wind`, `ocean_waves`, `campfire_crackle`, `dawn_breeze`).
  3. *Accent SFX* selektif (`heavy_thud`, `war_drum`, `wood_creak`, `metal_clang`, `whoosh`) hanya pada momen aksi penting (tidak ramai berlebihan, tidak kosong).
- **Auto-Ducking:** Volume lapisan *ambient* dan *SFX* wajib diturunkan otomatis saat trek narasi/dialog berbicara (`sidechaincompress` / envelope ducking di FFmpeg).
- **Camera Impulse Sync:** Setiap event `SfxAccentEvent` pada skenario dapat memicu `cameraImpulse` (`drop_thud`, `impact_punch`, `rumble_surge`) sehingga hentakan kamera dan bunyi SFX selalu terkunci pada frame yang sama.

## 4. Caching Kuota & Secret Hygiene
- Seluruh sintesis TTS di-cache berbasis hash SHA-256 di `output/audio-cache/`.
- API key disimpan hanya di `.env` (via `dotenv`); `.env` dan folder audio sementara wajib terdaftar di `.gitignore`.
