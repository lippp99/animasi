# 02 — Standar Visual: Hybrid 2.5D (Pure 2D Vector Cutout + Dunia 3D Low-Poly Toon)

Standar estetika resmi dan permanen proyek `animasi` adalah arsitektur **Hybrid 2.5D**: karakter **100% Pure 2D Vector Canvas Cutout** bergaya *Ricks Clips* yang dipasang pada satu bidang datar (`THREE.PlaneGeometry`) di dalam dunia 3D *Low-Poly Toon* ber-garis tepi tinta gelap.

## 1. Karakter 100% Pure 2D Vector Canvas Cutout (`src/characters/`)
- **Larangan Total Primitif 3D:** DILARANG keras menggunakan `SphereGeometry`, `CylinderGeometry`, `CapsuleGeometry`, `TorusGeometry`, atau `BoxGeometry` di dalam `src/characters/`. Satu-satunya mesh Three.js untuk setiap karakter adalah **satu `THREE.PlaneGeometry`** yang menampilkan tekstur dari Offscreen HTML5 `<canvas>` 2D (`512 × 768 px`).
- **Proporsi & Gaya Gambar *Ricks Clips* (`characterVectorDraw.ts`, `characterCostumeDraw.ts`):**
  - **Outline Tinta Gelap Pekat:** Seluruh siluet tubuh, kepala, sorban/helm, dan properti digambar dengan garis tepi `#231D1A` (`6px–8px`, `lineJoin = 'round'`, `lineCap = 'round'`).
  - **Badan Kapsul/Telur Gemuk (Tanpa Leher):** Torso lebar membulat (~35% tinggi karakter) dengan detail pakaian 2D rapi (V-kerah, kancing, sabuk/gesper, lipatan jubah, jahitan `////`, dan **kilau highlight putih di tepi kiri atas**).
  - **Kepala Oval Putih Besar:** Kepala oval putih-gading (`#FAF7F2`, tinggi ~42% karakter, lebar hampir selebar torso) menempel/sedikit menumpuk langsung di atas bahu torso **tanpa leher**, lengkap dengan kilau highlight putih di sisi kiri atas.
  - **Lengan & Kaki Garis Tipis Lentur (*Noodle Limbs*):** Kurva Bezier tipis `#231D1A` berujung bulat dengan telapak tangan bulat kecil dan telapak kaki pipih menapak lantai.
- **Ekspresi Kartun & Emote Komik (`characterFaceDraw.ts`):**
  - Mata oval putih besar berdekatan dengan pupil hitam melirik target, mata menyipit, garis tertutup `- -`, atau berkacamata ber-kilau.
  - Alis tebal ekspresif, mulut kartun terbuka (lidah merah muda + gigi atas putih), seringai gigi rapat, atau mulut bulat terkejut (`O`) sinkron amplitudo suara ElevenLabs.
  - Simbol komik mengilap: tetesan keringat biru-putih di dahi, urat marah berdenyut, dan `!` / `?` membal.
- **Kinematika 2D IK & Billboard 3D (`characterRig2D.ts`, `characterBillboard.ts`):**
  - Solver 2-Bone IK 2D untuk kaki (terkunci mati di garis lantai, nol meluncur) dan tangan (prop sockets presisi).
  - Y-locked cylindrical billboard (`transparent: true`, `alphaTest: 0.1`, `side: THREE.DoubleSide`), flip horizontal berpégas (`scale.x`), bayangan siluet nyata via `customDepthMaterial`, dan bayangan kontak lembut di tanah.

## 2. Dunia 3D Low-Poly Toon Ber-Garis Tinta & Cutaway (`src/world/`)
- **Material Toon 3-Tingkat + `THREE.EdgesGeometry` (`toonMaterials.ts`, `propBuilders.ts`):** Gunakan `MeshToonMaterial` 3-langkah dengan bayangan dingin kebiruan/ungu, garis tepi tinta tipis `THREE.EdgesGeometry` + `LineSegments` (`#231D1A`) pada properti/arsitektur utama, serta bayangan kontak lembut di tanah.
- **3D Cutaway & Loader `.glb` (`cutawaySystem.ts`, `glbPropLoader.ts`):** WebGL `clippingPlanes` dengan tepi irisan bercahaya untuk membelah bukit/dinding benteng; loader `.glb` otomatis mengonversi material ke `MeshToonMaterial` seragam.
- **Atmosfer & Pencahayaan (`atmosphericSky.ts`):** Gradien langit fajar/siang/senja/malam berbintang, awan bergerak, bulan ber-bloom, kabut jarak jauh, dan cahaya hangat obor.

## 3. Sinematografi 360°, VFX Aksi, & UI Safe Zone 9:16 (`src/camera/`, `src/vfx/`, `src/overlay/`)
- Variasi sudut kamera 360° (*spline dolly*, *close-up*, *bird's-eye*, *low-angle*, *projectile POV*) + transisi *whip pan*, *occlusion wipe*, *cutaway dive*, **Camera Impulse Rig**, *micro slow-mo* `0.25×`, dan VFX aksi (*dust puffs*, *smear arcs*, *sparks*, *shockwaves*).
- **Subtitle Tanpa Card:** Teks putih tebal ber-stroke hitam pekat di bawah layar tanpa kotak card; **Ephemeral Badge** tanggal/lokasi tampil 3–4 detik lalu hilang otomatis; **Safe Zone 9:16** (`top >= 150`, `right >= 160`, `bottom >= 340`, `left >= 64`).
