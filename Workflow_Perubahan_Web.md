# Workflow Perubahan & Pengembangan Web UPTD PPA Kota Binjai

Dokumen panduan operasional alur kerja (workflow) implementasi sistem dan transformasi digital portal **UPTD PPA Kota Binjai (SAPA AMAN)**.

---

## 1. Arsitektur Perubahan & Struktur File

```
d:\arkan\UPTD\
├── index.html                # Portal Utama (Beranda Institusional, 6 Layanan Permen PPPA, Alur Kasus, FAQ)
├── contact.html              # Halaman Pengaduan Online SAPA AMAN
├── contact.js                # Form pengaduan pada halaman khusus
├── reporting.js              # Pengiriman laporan dan pelacakan tiket melalui Supabase RPC
├── menu.js                   # Manajemen Drawer Navigasi Mobile
├── style.css                 # Sistem Desain Terpadu (Tokens, Safety-First UI, Responsive Grid)
├── config.js                 # Konfigurasi Supabase Client
├── sapa_aman_reports.sql     # Skema PostgreSQL Supabase (RLS, Staff, Reports, History, RPC)
├── admin/
│   ├── dashboard.html        # Dashboard Admin Manajemen Kasus Petugas UPTD PPA
│   └── dashboard.js          # Logika Filter, Update Status Kasus, Ekspor CSV
├── log/
│   ├── login.html            # Portal Login Verifikator Petugas & Admin
│   └── login.js              # Verifikasi Kredensial & RBAC Staff UPTD PPA
├── dump/                     # Arsip file dan modul yang tidak terhubung langsung
├── Blueprint_SAPA_AMAN.md    # Blueprint Konseptual SAPA AMAN
└── Workflow_Perubahan_Web.md # Panduan Workflow Teknis & Implementasi Sistem
```

---

## 2. Alur Kerja Implementasi (Phase Execution Workflow)

```
[Fase 1: Audit & Restrukturisasi]
       │
       ▼
[Fase 2: Standarisasi Institusional & Keamanan]
       │ ──> Integrasi Emergency Bar & Quick Exit (ESC)
       │ ──> 6 Standar Pelayanan Minimal Permen PPPA
       │ ──> Workflow 4 Tahap Penanganan Kasus
       │
       ▼
[Fase 3: Rekayasa Modul Pengaduan Online SAPA AMAN]
       │ ──> Mode Anonim vs KTP Terbuka
       │ ──> Tiket SAPA- + 16 karakter acak dan PIN pelacakan acak
       │ ──> Satu RPC Supabase untuk pengiriman dari kedua formulir
       │ ──> Tiket dan PIN acak dibuat server; status dicek dengan keduanya
       │ ──> Dashboard hanya menampilkan laporan server, tanpa data contoh/lokal
       │
       ▼
[Fase 4: Verifikasi & Uji Beban Aksesibilitas]
       │ ──> Pengujian Responsif (Desktop, Tablet, Mobile)
       │ ──> Pengujian Tombol Quick Exit <100ms
       │ ──> Validasi Input & Sanitasi Data Pelapor
       │
       ▼
[Fase 5: Rilis & Operasional Layanan 24 Jam]
```

---

## 3. Rincian Teknis Tiap Fase

### Fase 1: Audit Identitas & UX

- Mengubah persona situs dari tema portofolio umum ke portal resmi kedinasan pemerintah daerah (_Government Organization_).
- Menetapkan skema warna resmi: Forest Green (`#344d3e`), Coral (`#d87660`), Soft Warm Paper (`#f7f4ef`), dan Emergency Red (`#8b1e1e`).

### Fase 2: Standarisasi Protokol Keamanan & Konten

1. **Emergency Top Bar & Quick Exit:**
   - Shortcut keyboard `Escape` atau klik tombol seketika mengganti histori peramban ke halaman netral (`window.location.replace("https://www.google.com")`).
2. **Struktur Konten Standar Nasional:**
   - Penerapan 6 layanan inti UPTD PPA (Pengaduan, Psikologis, Bantuan Hukum, Medis & Visum, Safe House/Shelter, Reintegrasi).
   - Diagram tahapan alur pelaporan transparan (Lapor ➔ Asesmen ➔ Intervensi ➔ Pemulihan).
   - Accordion interaktif FAQ hukum & jaminan kerahasiaan identitas saksi/korban (UU TPKS No. 12/2022).

### Fase 3: Modul Pengaduan Online (SAPA AMAN)

1. **Selektor Mode Privasi:**
   - _Opsi Anonim:_ Tidak meminta nama asli; kontak aman tetap disimpan agar petugas dapat menindaklanjuti laporan.
   - _Opsi Terbuka:_ Nama lengkap pelapor/pendamping.
2. **Kategori Kasus & Kebutuhan Mendesak:**
   - Klasifikasi: KDRT, Kekerasan Anak, Pelecehan/Kekerasan Seksual, Penelantaran, TPPO, KBGO.
   - Checklist kebutuhan: Bantuan medis/visum, konseling trauma, pendampingan hukum, penjemputan shelter.
3. **Mekanisme Anonymous Ticket Tracking:**
   - Kode tiket dan PIN acak dibuat oleh RPC `sapa_aman_submit_report` di Supabase.
   - Status hanya dapat dilihat dengan kode tiket dan PIN melalui RPC `sapa_aman_check_report_status`.
4. **Pengiriman dan Penyimpanan:**
   - Kedua formulir mengirim data ke `sapa_aman_reports` melalui RPC yang sama.
   - PIN hanya ditampilkan setelah laporan berhasil disimpan dan hash PIN yang disimpan di basis data.
   - Jika layanan tidak tersedia, laporan tidak diklaim berhasil dan isian tetap tersedia untuk dicoba kembali.
   - Pengiriman offline dan antrean sinkronisasi belum tersedia; pelaporan memerlukan koneksi internet.

---

## 4. Alur Pemrosesan Laporan Masuk (Data Lifecycle)

```
[Warga/Korban Mengisi Form]
       │
       ├─► [Tombol Kirim Ditekan]
       │         │
       │         ├─► RPC sapa_aman_submit_report menyimpan laporan di PostgreSQL
       │         └─► Tampilkan kode tiket + PIN setelah RPC sukses
       │
       ▼
[Petugas UPTD Menerima Notifikasi]
       │
       ├─► Asesmen Tingkat Ancaman (<24 Jam)
       ├─► Hubungi Kontak Pelapor Sesuai Catatan Jam Aman
       └─► Status diperbarui melalui RPC petugas; pelapor mengecek status dengan tiket + PIN
```

---

## 5. Prosedur Uji Mutu & Quality Assurance (QA Checklist)

| No  | Komponen Uji          | Prosedur Validasi                              | Kriteria Keberhasilan                                         |
| --- | --------------------- | ---------------------------------------------- | ------------------------------------------------------------- |
| 1   | **Quick Exit**        | Tekan tombol `Esc` di sembarang posisi halaman | Halaman berpindah ke Google tanpa jejak tombol kembali        |
| 2   | **Form Validation**   | Kirim form tanpa mengisi kontak aman           | Form menolak pengiriman dan menandai input wajib              |
| 3   | **Anonymous Mode**    | Aktifkan radio button "Anonim / Samaran"       | Placeholder dan label input berganti ke nama samaran opsional |
| 4   | **Ticket Generation** | Kirim laporan dengan koneksi aktif             | Kode tiket dan PIN server muncul hanya setelah RPC berhasil   |
| 5   | **Tracking Status**    | Masukkan kode tiket dan PIN                    | Status server muncul; kredensial salah menampilkan pesan     |
| 6   | **Gagal Kirim**        | Putus koneksi atau RPC gagal                   | Tidak ada konfirmasi sukses; isian tetap untuk dicoba ulang  |
| 7   | **Akses Petugas**      | Buka dashboard tanpa akun staf terdaftar       | Dialihkan ke login dan tidak dapat melihat data kasus         |
| 8   | **Mobile Nav**         | Buka menu pada resolusi < 680px                | Drawer navigasi toggle terbuka/tertutup mulus via `menu.js`   |
