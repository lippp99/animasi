# 03 — Standar Rendering Hardware (Intel UHD 730 QSV & RAM 64GB)

## 1. Spesifikasi Workstation & Referensi Teknis Terverifikasi
Hasil inspeksi sistem lokal dan verifikasi dokumentasi resmi:
- **CPU:** Intel® Core™ i5-14400 (10 core / 16 thread, base 2.5 GHz).
- **iGPU Terintegrasi:** Intel® UHD Graphics 730 (Driver `32.0.101.7092`, 24 Execution Units, max dynamic frequency 1.55 GHz, DirectX 12, ANGLE D3D11).
- **Media Engine (Intel Quick Sync Video):** Hardware fixed-function **Encode & Decode** untuk H.264/AVC (`h264_qsv`) dan HEVC (`hevc_qsv`), serta hardware Decode untuk AV1.
- **Memori & OS:** 64 GB RAM (`63.7 GB` usable), Windows 11 Pro Build 26300.
- **FFmpeg:** FFmpeg `9.0.2-full_build` dengan dukungan terverifikasi `h264_qsv`, `hevc_qsv`, `qsv`, `d3d11va`, `d3d12va`.
- **Rujukan Resmi:**
  - Spesifikasi Intel® Core™ i5-14400 & Intel® UHD Graphics 730 (`intel.com` / `intel.co.id`).
  - Dokumentasi resmi FFmpeg QSV (`ffmpeg.org` — mode ICQ via `-global_quality`, `-preset`, `-pix_fmt nv12`).

## 2. Akselerasi WebGL Hardware pada Headless Browser (`src/render/browser.ts`)
- **WAJIB** menggunakan mode headless modern (`--headless=new`) dengan flag GPU ANGLE Direct3D 11 pada Windows:
  - `--enable-gpu`, `--use-gl=angle`, `--use-angle=d3d11`, `--ignore-gpu-blocklist`, `--enable-webgl`, `--enable-accelerated-2d-canvas`.
- **DILARANG** memaksa fallback software *SwiftShader* pada workstation ber-iGPU Intel.
- Setiap sesi render wajib membaca `WEBGL_debug_renderer_info` (`UNMASKED_RENDERER_WEBGL`) dari konteks WebGL Three.js aktif dan mencetaknya ke log; jika `SwiftShader` atau software renderer terdeteksi, pipeline wajib mencetak peringatan keras.

## 3. Hardware Encoding FFmpeg via `h264_qsv` (`src/render/ffmpeg.ts`, `src/render/hardware.ts`)
- Prioritas utama encoder video adalah **`h264_qsv`** menggunakan mode **ICQ (Intelligent Constant Quality)**:
  - `-c:v h264_qsv -preset fast -global_quality 20 -pix_fmt nv12 -movflags +faststart`.
- Sebelum render dimulai, `src/render/hardware.ts` wajib melakukan *smoke probe* nyata terhadap `h264_qsv`.
- **Graceful Fallback:** Jika pipeline dijalankan di mesin tanpa QSV (misalnya CI cloud/non-Intel) atau probe gagal, otomatis beralih ke `libx264` (`-preset medium -crf 18 -pix_fmt yuv420p`) tanpa crash.

## 4. Optimasi RAM 64GB, Paralelisme, & Pembersihan Memori WebGL
- Karena tiap frame bersifat 100% deterministik (`seekFrame(frame)`), pipeline render dapat menjalankan beberapa worker page paralel secara terukur (default `4` worker pada mesin ≥ 16 GB RAM & ≥ 8 thread; turun otomatis ke `1–2` worker pada mesin RAM kecil).
- Gunakan antrean buffer frame terurut di memori (`inMemoryFrameBufferLimit: 256` pada RAM 64GB) agar FFmpeg QSV menerima urutan frame `0..N-1` secara kontinu tanpa bottleneck disk sementara.
- **Anti-Memory Leak:** `AnimationEngine.dispose()` wajib membersihkan seluruh geometri, material, tekstur, `EffectComposer`, dan konteks WebGL setiap kali worker selesai atau berganti episode.
