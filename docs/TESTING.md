# SIMBA — Panduan uji dari awal (step-by-step test guide)

This guide takes the project from a clean checkout to a full functional pass of **every feature**, in the order a
real user meets them. Each step says **what to do** and **what you should see**. Steps marked 🔍 are optional API
checks in Swagger (`http://127.0.0.1:8000/docs`).

SIMBA has three parts, tested in this order:

| Part | What | Who uses it | Section |
|---|---|---|---|
| **Backend** | FastAPI + PostgreSQL API, seeding, WHO/AKG/KPSP/immunization logic | everything else | 0–1 |
| **Mobile app** (`mobile/`) | Expo / React Native app for parents, **Bahasa Indonesia** | parents | 2–9 |
| **Health Manager portal** (`frontend/`, `/hm/*`) | Desktop website for health workers | Posyandu / Puskesmas staff | 10 |
| **Parent website** (`frontend/`, `/`) | Same parent experience as the app, in the browser | parents on a laptop / shared PC | Appendix |

Full pass: about 45 minutes.

---

## 0. Setup (once)

### 0.1 Prerequisites
- PostgreSQL running locally with an empty database named `simba_db`.
- Python 3.12+, Node 20+ (Node 22/24 fine).
- For the phone: **Expo Go** installed (Android / iOS) and the phone on the **same Wi-Fi** as your PC — or an
  Android emulator / iOS simulator.

### 0.2 Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate        # Windows Git Bash — venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env                # edit DATABASE_URL / SECRET_KEY / FIRST_ADMIN_* if you like
python seed_db.py
```
**Expect:**
```
superadmin         seeded 1 rows
foods              seeded 1651 rows
akg_targets        seeded 4 rows
growth_standards   seeded 366 rows
milestones         seeded 20 rows
articles           seeded 4 rows
superadmin login: admin@simba.id / (FIRST_ADMIN_PASSWORD from .env)
```
Run it again: every line says `skipped (already populated)`.

Start the API **on all interfaces** so a phone can reach it:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
**Expect:** `http://127.0.0.1:8000/health` → `{"status":"ok"}`; `/docs` shows Swagger with tag groups
*User Authentication … Admin System*.

Windows only, once, in an **admin** PowerShell (lets the phone reach port 8000):
```powershell
netsh advfirewall firewall add rule name="SIMBA API 8000" dir=in action=allow protocol=TCP localport=8000
```

### 0.3 Automated checks (no Postgres needed)
```bash
cd backend && pytest -q                 # expect: 82 passed
cd backend && alembic check             # expect: "No new upgrade operations detected."
cd frontend && npm install && npm run typecheck && npm run build   # expect: clean, "✓ built"
cd mobile   && npm install && npm run typecheck                    # expect: no output, exit 0
```

### 0.4 Health Manager portal
```bash
cd frontend
npm run dev                         # http://localhost:5173
```
**Expect:** `http://localhost:5173/hm/login` shows the portal sign-in page.

### 0.5 Mobile app
```bash
cd mobile
cp .env.example .env                # leave EXPO_PUBLIC_API_URL empty = auto-detect
npx expo start
```
Then press **`a`** (Android emulator), **`i`** (iOS simulator), **`w`** (web preview at http://localhost:8081)
or scan the QR code with **Expo Go**.

**Expect:** yellow splash with the SIMBA lion in a white rounded box, then the **Masuk** (sign-in) screen.

> The app finds the backend by itself: on a phone/emulator it uses the PC that serves the Expo bundle, port 8000;
> on web it uses the browser host. If a screen shows **"Tidak bisa menghubungi server SIMBA di http://…:8000"**,
> the URL in that message tells you what it tried — check the backend is running with `--host 0.0.0.0`, the
> firewall rule above, and that phone and PC share a Wi-Fi.
> `.env` values are baked in at bundle time: after changing `.env`, restart `expo start`.

> Native-only features (not on web `w`): the **date picker**, **haptic taps**, and the **share sheet** for PDFs.
> Test those on a phone or emulator.

---

## 1. Backend & security (Swagger)

Open `http://127.0.0.1:8000/docs`.

| # | Do | Expect |
|---|----|--------|
| 1.1 | `POST /api/v1/user/auth/register` body `{"email":"ortu1@test.com","password":"rahasia123"}` | `201`, `{id, email, message}`. |
| 1.2 | Same email again | `400` *Email already registered*. |
| 1.3 | Password `123` | `422` mentioning `password`. |
| 1.4 | `POST /api/v1/user/auth/login` (form: username = email) with a wrong password | `401` *Incorrect email or password*. |
| 1.5 | Log in correctly, **Authorize** Swagger with the token, `GET /api/v1/user/children/` | `200 []`. |
| 1.6 | `GET /api/v1/admin/foods` with the **parent** token | `401` — parent tokens never open admin routes. |
| 1.7 | `POST /api/v1/admin/auth/register` with a parent token | `401`/`403` — only a superadmin creates admins. |
| 1.8 | `GET /api/v1/user/children/999999` | `404` (never `403`, so ids can't be enumerated). |
| 1.9 | `GET /api/v1/user/growth-standards?metric=wfa&gender=female` | 61 rows (months 0–60) with `p3 … p97`; P50 at month 12 ≈ 8.9 kg. |

Tokens last 7 days; an expired token makes the apps sign the user out automatically.

---

## 2. Mobile · Masuk & daftar (sign in & register)

| # | Do | Expect |
|---|----|--------|
| 2.1 | Open the app. | Splash → **Masuk** screen: yellow header with the lion, "SIMBA — Pantau tumbuh kembang si kecil dengan tenang", fields **Email** and **Kata sandi**, coral **Masuk** button, link **Daftar di sini**. |
| 2.2 | Tap **Masuk** with both fields empty. | Red box *Isi email dan kata sandi dulu, ya.* |
| 2.3 | Enter a wrong password. | Red box *Tidak bisa masuk. Periksa email dan kata sandi.* |
| 2.4 | Tap **Daftar di sini**. Email `ortu2@test.com`, kata sandi `rahasia123`, ulangi `rahasia124` → **Buat akun**. | *Kata sandi yang diulang belum sama.* |
| 2.5 | Fix the repeat, kata sandi `123`. | *Kata sandi minimal 6 huruf atau angka.* |
| 2.6 | Correct everything → **Buat akun**. | You are signed in and land on **Ceritakan tentang anak Anda** (add first child, no back button). |
| 2.7 | Kill and reopen the app. | Straight to the app, still signed in (token in SecureStore). |

---

## 3. Mobile · Anak (children)

| # | Do | Expect |
|---|----|--------|
| 3.1 | On **Ceritakan tentang anak Anda**: Nama `Sari`, tap the **Perempuan** card. | Card turns coral with white text and an offset shadow. |
| 3.2 | Tap **Simpan** without a date. | *Pilih tanggal lahir dulu, ya.* |
| 3.3 | Tap **Tanggal lahir** → native date picker → pick **exactly 12 months ago** → (iOS: **Selesai**). | Field shows the date in Indonesian, e.g. *17 September 2025*. |
| 3.4 | Tap the ✏️ pencil next to the date, type `2025-09-17` instead. | Typed date accepted (hint *Contoh: 2025-03-14*). Try a future date → *Tanggal lahir tidak boleh di masa depan.* |
| 3.5 | Kecamatan `Depok` → **Simpan**. | **Beranda**: header *Bagaimana Sari hari ini?*, child card **Sari · 12 bulan**. |
| 3.6 | **Lainnya** → **Tambah anak**: `Budi`, Laki-laki, 24 months ago → Simpan. | Back on Beranda, Budi is active; child card shows **Ganti anak ˅**. |
| 3.7 | Tap the child card. | Bottom sheet *Anak siapa yang ingin dilihat?* with Sari, Budi (✓ on the active one) and **Tambah anak**. Pick **Sari**. |
| 3.8 | Kill and reopen the app. | Sari is still the active child (stored). |
| 3.9 | **Lainnya** → Keluarga → tap **Sari**. | Edit form pre-filled; change Kecamatan → **Simpan perubahan** → back; **Lihat data Sari** switches to her and opens Beranda. |

---

## 4. Mobile · Ukur & Tumbuh (growth)

Use **Sari, 12 months, perempuan**. WHO medians for that age: **8,9 kg / 74 cm**.

| # | Do | Expect |
|---|----|--------|
| 4.1 | Beranda → **Ukur** tile (or Tumbuh → **Ukur sekarang**). | Screen **Ukur Sari**: two cards *Berat badan* and *Tinggi badan*, each with **−** / big number / **+** and a slider; label *kilogram · ketuk untuk ketik*. Card *Kapan diukur?* with chips **Hari ini · Kemarin · Tanggal lain**. |
| 4.2 | Tap **+** on weight 3 times. | Number rises by 0,1 each tap (Indonesian decimal comma). |
| 4.3 | **Tap the big weight number**, type `8,9` (or `8.9`), tap away. | Number becomes **8,9**; slider thumb moves. Same on height: type `74`. |
| 4.4 | Drag the height slider. | Number follows in 0,5 steps. |
| 4.5 | Leave **Hari ini** selected → **Simpan**. | Celebration: star badge, **Tersimpan!**, *Sari · 8,9 kg · 74 cm*, green card **Sari tumbuh dengan baik!**, then *Dibanding anak seusianya*: Berat badan *sesuai rata-rata* **Normal**, Tinggi badan *sesuai rata-rata* **Normal**. Tap **Selesai**. |
| 4.6 | Beranda. | Header tiles **8,9 kg · 74 cm · 17 Sep**; green verdict card *Sari tumbuh dengan baik!* with *Lihat grafik pertumbuhan ›*. |
| 4.7 | **Tumbuh** tab. | Verdict card, two tiles *Berat badan 8,9 kg* / *Tinggi badan 74 cm*, chart with green **Rentang sehat** band, green *Rata-rata anak* line and Sari's coral dot (latest dot yellow), chips **Berat / Tinggi**. Hint *Area hijau = rentang sehat…* |
| 4.8 | Ukur again: **Tanggal lain** → pick a date **6 months ago** (or ✏️ type it) → berat `7,3`, tinggi `65,7` → Simpan → Selesai. | Tumbuh shows two dots joined by a coral line; **Riwayat pengukuran** lists both, newest first, with a **Normal** pill each; tiles now show *▲ naik 1,6 kg* / *▲ naik 8,3 cm*. |
| 4.9 | Ukur again today: tinggi `66`, berat `8,9`. | Result: **Sari sedikit lebih pendek dari seusianya** (yellow) or **jauh lebih pendek** (red) with *Pendek / Sangat Pendek* pill; Beranda verdict turns yellow/red. |
| 4.10 | Tumbuh → **Lihat angka rinci**. | Three rows (Berat menurut usia, Tinggi menurut usia, Berat menurut tinggi) with z-scores like *−2,35*, a plain-language line (*di bawah rata-rata*) and status pills; note about −2…+2. **Sembunyikan angka rinci** hides them. |
| 4.11 | Pull down on Tumbuh. | Refresh spinner; data reloads. |

---

## 5. Mobile · Makan (nutrition)

| # | Do | Expect |
|---|----|--------|
| 5.1 | **Makan** tab. | Date pill **Hari ini** with ‹ › buttons (› disabled today), grey card *Apa yang dimakan hari ini?*, rings **0% ENERGI / 0% PROTEIN**, bars *Energi 0 dari 1.350 kkal*, *Protein 0 dari 20 g*, footnote *Kebutuhan harian usia 1-3 tahun (AKG 2019)*, coral **Tambah makanan**, section *Sudah dicatat* → *Belum ada catatan*. |
| 5.2 | **Tambah makanan**. | Screen **Apa yang dimakan?** with a search pill and suggestion chips *Bubur, Nasi, Telur, Ayam, Ikan, Tempe, Tahu, Pisang, Susu, Sayur*. Before typing: *Ketik nama makanan atau ketuk pilihan di atas.* |
| 5.3 | Tap chip **Telur**. | List of foods containing "telur" with kcal per porsi; toddler-safe items have a teal bowl icon, others a yellow ⚠. |
| 5.4 | Type `bubur ayam` instead. | Matches contain both words in any order (e.g. *super bubur rasa ayam*). Type `zzz` → *Tidak ditemukan. Coba kata yang lebih sederhana.* |
| 5.5 | Pick a food. | Detail: name, pill **Aman untuk balita** / **Cek usia**, *1 porsi = … kkal dan … g protein*; chips **Sarapan · Makan siang · Makan malam · Camilan** (one pre-selected by time of day); stepper **porsi · ketuk untuk ketik**. |
| 5.6 | Tap **+** to 1,5 porsi, or tap the number and type `2`. | Line *= … kkal · … g protein* rescales. |
| 5.7 | Pick **Makan siang** → **Catat**. | Celebration *Tercatat!* then back to Makan: rings and bars move, verdict becomes *Masih perlu makan lagi* (yellow), section *Sudah dicatat* shows **Makan siang** with the item *2 porsi · … kkal*. |
| 5.8 | Add a **Camilan** (search `pisang`). | Second group *Camilan*; totals increase. |
| 5.9 | Tap ✕ on the camilan → **Hapus**. | Removed, totals decrease. |
| 5.10 | Tap **‹**. | Pill says **Kemarin**, empty diary; **Tambah makanan** here logs to yesterday. Tap the pill → back to *Hari ini*. |
| 5.11 | Beranda. | *Makan hari ini* card rings show the same percentages with the verdict sentence. |

---

## 6. Mobile · Kembang (KPSP milestones)

| # | Do | Expect |
|---|----|--------|
| 6.1 | **Kembang** tab (Sari, 12 months). | Card **Usia 12 - 24 bulan · 0 dari 5 dijawab** with a violet bar; violet question card: domain label (e.g. **GERAK TUBUH**), question *Apakah Sari bisa …?*, two big buttons **Ya, bisa** (green) and **Belum** (yellow). |
| 6.2 | Tap **Ya, bisa**. | Next question appears; bar → 1 dari 5. Continue: 4 × Ya, 1 × Belum. |
| 6.3 | After the 5th answer. | Verdict card **Beberapa kemampuan masih berkembang** (yellow, *Meragukan*) — *Latih sambil bermain dan cek lagi dua minggu ke depan.* The full list appears grouped by domain (*Gerak tubuh, Gerak tangan, Bicara & bahasa, Bergaul & mandiri*) with **Ya, bisa / Belum** pills showing your answers. |
| 6.4 | Change the **Belum** to **Ya, bisa**. | Verdict → **Perkembangan sesuai usia** (green, *Sesuai*). |
| 6.5 | Tap **Lihat semua pertanyaan** / **Kembali ke satu per satu**. | Toggles between the list and the one-at-a-time card. |
| 6.6 | Beranda. | *Perlu diperhatikan* section shows the KPSP verdict card; tapping opens Kembang. |

---

## 7. Mobile · Imunisasi & Kalender

| # | Do | Expect |
|---|----|--------|
| 7.1 | Beranda → **Imunisasi** tile. | Screen **Imunisasi — Ketuk kotak jika sudah diberikan**. Red verdict **17 imunisasi terlambat** (for a 12-month-old with nothing recorded). Card *0 dari 20 dosis selesai · 0%*. Groups **Saat lahir, Usia 1 bulan, Usia 2 bulan …** with doses like *Hepatitis B (dosis 0)*, *Polio tetes (OPV) (dosis 1)*, *Campak-Rubela (MR) (dosis 1)*; pills **Terlambat / Saatnya / Nanti**. |
| 7.2 | Tap the box next to **Hepatitis B (dosis 0)**. | Haptic tick; box turns green ✓, pill **Selesai**, *Diberikan 17 Sep 2026*; card → *1 dari 20 dosis selesai · 5%*; verdict now says **16 imunisasi terlambat**. |
| 7.3 | Tap the green box again → **Ya, batalkan**. | Back to 0 dari 20. |
| 7.4 | **Lainnya → Kalender**. | Screen **Kalender — Posyandu, dokter, imunisasi** with a white **Tambah** button; *Akan datang* → *Belum ada jadwal*. |
| 7.5 | **Tambah**: Kegiatan `Penimbangan Posyandu`, jenis **Pemeriksaan**, tanggal next week (picker or ✏️), jam `08.00`, catatan `Bawa buku KIA` → **Simpan**. | Card with a yellow date box (day + month), title, *Sabtu, 26 Sep · 08.00 · Bawa buku KIA*, pill **Pemeriksaan**. |
| 7.6 | Jam `8` (invalid) → Simpan. | *Jam ditulis seperti 08.00.* |
| 7.7 | Tap the **date box** of the event. | Box turns green ✓, title struck through, moves to **Selesai & lampau**. Tap again to undo. |
| 7.8 | Tap ✕ on it → **Hapus**. | Removed. Mark a vaccine dose given (7.2) and try ✕ on its calendar entry → *Terhubung ke imunisasi — Batalkan dosis ini dari halaman Imunisasi.* |

---

## 8. Mobile · Pengingat, Laporan, Tips (alerts, report, articles)

| # | Do | Expect |
|---|----|--------|
| 8.1 | Beranda bell (badge = number of reminders) or **Lainnya → Pengingat**. | List, highest priority first, with pills **Penting / Perlu dilihat / Tips**, e.g. **17 imunisasi terlambat**, **Makan masih kurang** (*Rata-rata … kkal per hari … baru 19% dari kebutuhan …*), **Perkembangan: Meragukan**, **Saatnya mengukur lagi** (if the last measurement is >45 days old). Tapping a card opens the matching tab. |
| 8.2 | With everything healthy and logged. | *Semua aman! — Tidak ada yang perlu diperhatikan saat ini.* |
| 8.3 | Beranda → **Laporan** tile. | Violet card *Bawa saat ke Posyandu atau dokter* with ink **Bagikan PDF**; sections **Pertumbuhan** (verdict + Berat/Tinggi lines with *sesuai rata-rata* and pills), **Makan minggu ini** (*Tercatat n dari 7 hari*, Energi/Protein %), **Perkembangan & imunisasi**. |
| 8.4 | Tap **Bagikan PDF** (phone). | Native share sheet with `SIMBA-Sari-<date>.pdf`; save/open it: WHO assessment table, history, 7-day nutrition, KPSP & immunization line, attention points. On web the PDF opens in a new tab. |
| 8.5 | **Lainnya → Tips & artikel**. | Search pill, chips **Semua · Pertumbuhan · Makan · Perkembangan · Imunisasi**, article cards with *n menit baca* and **Baca ›**. Only **published** articles appear (see 10.10). |
| 8.6 | Open an article. | Title, author · menit baca · date, summary, body paragraphs. Back arrow returns. |

---

## 9. Mobile · Lainnya & keluar

| # | Do | Expect |
|---|----|--------|
| 9.1 | **Lainnya**. | Sections **Kesehatan** (Imunisasi, Kalender, Pengingat, Laporan), **Belajar** (Tips & artikel), **Keluarga** (each child + *Tambah anak*), white **Keluar** button, footer with the lion and the server address. |
| 9.2 | **Keluar** → **Keluar**. | Back to **Masuk**; reopening the app stays on Masuk. |
| 9.3 | Stop the backend, try to sign in. | After ≤15 s: *Tidak bisa menghubungi server SIMBA di http://…:8000. Pastikan server berjalan dan HP terhubung ke Wi-Fi yang sama.* (no endless spinner). |
| 9.4 | Sign in as `ortu1@test.com` (from 1.1, no children). | Lands on **Ceritakan tentang anak Anda**. |

---

## 10. Health Manager web portal

Desktop website at `http://localhost:5173/hm/login`; use a window ≥ 1024 px wide (below that the sidebar becomes a ☰ drawer).

### 10.1 Sign in & shell
| Do | Expect |
|----|--------|
| Open `/hm/login`. | Split page: animated brand panel (gradient, floating orbs, bobbing lion) left, sign-in form right, button **Sign In**. |
| Wrong password. | *Incorrect admin email or password*. |
| Sign in as `admin@simba.id` / `admin1234` (from `backend/.env`). | **Dashboard**. Sidebar groups Monitor / Reference / Content / Admin; big lion logo top-left; your name + role at the bottom; top bar with **API docs** and **Log out**. |
| Open `/hm/dashboard` in a private window. | Redirect to `/hm/login`. |
| Shrink below 1024 px. | Sidebar hides behind ☰. |

### 10.2 Dashboard
| Do | Expect |
|----|--------|
| Land on **Dashboard**. | Greeting hero (*Selamat pagi/siang/sore/malam, <name> · date*, "N children monitored across R regions", CTA buttons, three glass tiles *Last 30 days / Stunting rate / Immunization*, lion in rings). Four KPI cards, **Nutritional status** donut, **Stunting rate by region** bars, **Needs attention** list (ranked wasted › stunted › underweight › overweight › stale › no data), **Recent measurements** table, quick links. |
| Click a child in Needs attention / Recent measurements. | Child detail page. |

### 10.3 Children registry
| Do | Expect |
|----|--------|
| **Children**. | Table: age, region, masked parent email (`o***@test.com`), last measured, weight/height, HFA/WFA/WFH chips, status badges. |
| Search `Sari`; pick a region; click **Stunted**. | Filters combine; URL updates (`?q=…`); **Clear filters** when empty. |

### 10.4 Child detail
| Do | Expect |
|----|--------|
| Open **Sari**. | Header (sex, age, region, masked parent), four status cards, WHO growth chart (Weight/Height/BMI), **Attention points** (same alerts the parent sees, now in Indonesian), measurement history, 7-day nutrition, KPSP, **Download PDF report**. |

### 10.5 Regions
| **Regions**. | Summary cards, bar chart coloured by WHO threshold, table; **View children** opens the registry pre-filtered. |
|---|---|

### 10.6 WHO Standards
| **WHO Standards**, toggle Boys/Girls, Weight / Length-height / BMI. | P3–P97 curves and table. Boys weight P50 at 12 mo ≈ 9,6 kg; girls ≈ 8,9 kg. |
|---|---|

### 10.7 AKG Targets
| Edit protein for `1-3 tahun` to 21 → **Save changes**. | *Saved at …*; the mobile Makan screen now shows *dari 21 g*. |
|---|---|

### 10.8 Food Database
| Search `bubur ayam`, filter category / **Toddler-safe only**; **Add food**; edit; delete. | Server-side search (1,651 foods, paged 50). Deleting a food a parent already logged keeps the meal in the app (name and nutrients are snapshotted). |
|---|---|

### 10.9 KPSP Milestones
| Toggle a question inactive (eye icon). | It disappears from the mobile **Kembang** list; bracket labels read `12 - 24 bulan`. |
|---|---|

### 10.10 Education
| Select an article → edit → **Save**; **Publish / Unpublish**; **New article**. | **Preview** renders as parents see it. Published articles appear in the mobile **Tips & artikel**; drafts do not. |
|---|---|

### 10.11 System
| **System**. | Database, reference data completeness, counts, **Load missing** and **Add account** (superadmin only). Add `hm2@simba.id`, sign in as it → those two buttons are hidden. |
|---|---|

---

## 11. Database migrations & maintenance

```bash
cd backend
alembic upgrade head      # apply migrations to the DB in .env
alembic check             # "No new upgrade operations detected." = models and DB match
```
A DB created earlier by `create_all`/`sync_schema`: `alembic stamp head` once.

Clean prototype/test data (prints a plan first, only applies with `--yes`):
```bash
python scripts/cleanup_legacy.py --parents ortu1@test.com ortu2@test.com --purge-impossible --drop-orphans --dry-run
python scripts/cleanup_legacy.py --parents ortu1@test.com ortu2@test.com --yes
```

---

## Quick regression checklist

```
Automated
[ ] backend: pytest → 82 passed · alembic check clean
[ ] frontend: npm run typecheck · npm run build
[ ] mobile: npm run typecheck

Mobile (Bahasa Indonesia)
[ ] daftar → tambah anak (date picker + ✏️ type) → Beranda
[ ] ukur 8,9 kg / 74 cm (tap-to-type + slider + chips) → "Sari tumbuh dengan baik!" → Tumbuh chart + riwayat
[ ] tinggi 66 → verdict kuning/merah; "Lihat angka rinci" shows z-scores
[ ] makan: chip Telur → 2 porsi → Catat → rings/bars update; hapus; kemarin
[ ] kembang: 4 Ya + 1 Belum → Meragukan; 5 Ya → Sesuai
[ ] imunisasi: tandai dosis → 1 dari 20; batalkan
[ ] kalender: tambah (tanggal + jam 08.00) → tandai selesai → hapus
[ ] pengingat: Indonesian alerts, tap navigates; laporan → Bagikan PDF (share sheet)
[ ] tips & artikel: only published; keluar → Masuk; server-down error names the URL
[ ] website (localhost:5173): masuk → beranda → ukur → makan/tambah → kembang → laporan Unduh PDF; side nav at ≥768 px

Portal
[ ] /hm/login guard · dashboard hero/KPIs/attention · registry filters · child detail + PDF · regions
[ ] WHO tables · AKG save reflected in app · food CRUD/search · KPSP toggle hides in app · article publish shows in app · system add admin
```

---

## Appendix — Parent website (`http://localhost:5173`)

The parent website is the mobile app's twin for browsers: same Indonesian copy, same Storybook design, same API.
Run through sections 2–9 above on `http://localhost:5173` instead of the phone; the differences are:

| Mobile | Website |
|---|---|
| Bottom tabs | Bottom tabs under 768 px; yellow side navigation on wider screens |
| Native date picker + ✏️ | Browser date field (`<input type="date">`) |
| Share sheet for the PDF | **Unduh PDF** downloads `SIMBA-<nama>-<tanggal>.pdf` |
| Haptics | Press animation only |
| Routes | `/masuk` `/daftar` `/tambah-anak` `/beranda` `/tumbuh` `/ukur` `/makan` `/makan/tambah` `/kembang` `/lainnya` `/imunisasi` `/kalender` `/pengingat` `/laporan` `/artikel` `/anak/:id` |

Data is shared: log a meal on the phone and it appears on the website after a refresh, and vice versa.
Signing in as a parent on `/masuk` never opens `/hm/*`; the sign-in page links health workers to `/hm/login`.
