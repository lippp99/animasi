# 06 — Standar Visual Frame-by-Frame QA Review & Auto-Cleanup

Aturan ini menjadi **gerbang verifikasi wajib** sebelum setiap episode video Shorts dinyatakan selesai.

## 1. Wajib Inspeksi Visual Menyeluruh (Dilarang Skip)
- Setelah `npm run render -- --episode=<slug>` menghasilkan `output/episodes/<slug>/final.mp4`, agent **DILARANG** langsung mengklaim selesai tanpa memeriksa visual frame hasil render.
- Agent wajib menjalankan `npm run qa:extract -- --episode=<slug>` (mode `dense` mencakup pemindaian rapat seluruh durasi + titik awal/transisi/tengah/akhir setiap shot, subtitle, masa tampil & hilangnya badge, serta momen SFX; atau `--mode=all` untuk seluruh frame berurutan).
- Agent wajib membuka dan menginspeksi **seluruh** lembar **Grid Contact Sheet** (`output/episodes/<slug>/.qa-tmp/sheets/sheet-*.png`) yang berlabel `F:<nomor_frame> | <detik>s`.

## 2. Kriteria Lulus Audit (Zero-Defect Checklist)
Video hanya boleh dinyatakan **LULUS** jika seluruh lembar grid memenuhi keempat syarat berikut:
1. **Zero Clipping & Zero Floating:** Tidak ada karakter *Bean*, pasukan *crowd*, atau properti 3D yang saling menembus maupun melayang dari kontur tanah.
2. **Subtitle Minimalis & Kontras:** Subtitle tampil bersih tanpa kotak card/border gelap di belakangnya dan selalu terbaca tajam di segala pencahayaan.
3. **Ephemeral Badge Disiplin:** Badge tanggal/lokasi hanya muncul sementara sesuai jadwal dan benar-benar hilang bersih setelah durasinya berakhir.
4. **Integritas Visual & Kamera:** Tidak ada frame hitam/blank, *glitch* WebGL, teks terpotong di luar *safe zone* 9:16, lompatan kamera kasar, atau sudut kamera flat yang tidak wajar.

## 3. Siklus Perbaikan Wajib
- Jika ditemukan cacat pada label `F:<nomor_frame>` mana pun, agent wajib melacak frame tersebut, memperbaiki penyebabnya di skenario/engine, merender ulang `final.mp4`, mengekstrak ulang grid QA, dan menginspeksi ulang hingga 100% lulus.

## 4. Wajib Auto-Purge Frame Mentah (`Zero Disk Bloat`)
- Segera setelah seluruh lembar inspeksi dinyatakan **LULUS**, agent **WAJIB** menjalankan:
  `npm run qa:clean -- --episode=<slug>`
- Perintah ini menghapus total folder `.qa-tmp/` (seluruh frame mentah `.png` dan *contact sheet* sementara) serta memverifikasi `final.mp4` tetap utuh agar disk tidak pernah menumpuk ribuan gambar sementara.
