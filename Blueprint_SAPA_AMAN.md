# Blueprint Inovasi UPTD PPA: SAPA AMAN

**Brand:** SAPA AMAN (Sistem Aplikasi Pengaduan & Advokasi Masyarakat Anti-Kekerasan)
**Tagline:** "Bersuara Tanpa Jeda, Terlindungi Di Mana Saja."
**Fokus Target:** Masyarakat daerah 3T (Tertinggal, Terdepan, Terluar) dan kelompok rentan.

> **Status implementasi:** Pengiriman laporan saat ini memerlukan koneksi internet. Fitur PWA, antrean offline/sinkronisasi, dan voice-to-text di bawah ini adalah arah pengembangan, belum tersedia pada portal.

---

## 1. Terobosan Infrastruktur Fisik & IoT (Public Infrastructure)

Solusi untuk mengatasi kendala geografis, *blank spot* internet, dan kondisi darurat tanpa perangkat pintar.

*   **Pilar Sapa (IoT Panic Kiosk):**
    *   **Deskripsi:** Tiang/kotak darurat bertenaga surya di titik kumpul desa (balai desa, puskesmas).
    *   **Teknologi:** Menggunakan mikrokontroler (ESP32) dengan modul LoRa atau SMS Gateway.
    *   **Fungsi:** Satu tombol merah fisik untuk memicu sinyal darurat dan mengirimkan koordinat GPS ke UPTD kabupaten/kota, tanpa butuh internet 4G.
*   **Armada Taktis SapaKeliling:**
    *   **Deskripsi:** Unit UPTD *mobile* menggunakan kendaraan 4x4.
    *   **Fasilitas:** Dilengkapi internet satelit (Starlink), ruang konseling mini kedap suara, dan sinkronisasi database lokal.
    *   **Fungsi:** Jemput bola untuk menerima laporan, visum awal, dan trauma healing di desa-desa terpencil.
*   **Gelang Sapa (Discreet Wearable):**
    *   **Deskripsi:** Gelang sederhana yang dibagikan khusus bagi korban KDRT berisiko tinggi.
    *   **Teknologi:** Terdapat tombol tersembunyi yang terhubung ke jaringan mesh lokal atau *smartphone*.
    *   **Fungsi:** Memicu sinyal SOS senyap (silent alarm) untuk penjemputan darurat tanpa diketahui pelaku.

---

## 2. Desain Web Dinamis & Aksesibilitas 3T (Digital Infrastructure)

Platform pengaduan yang berpusat pada keamanan korban, minim literasi, dan koneksi tidak stabil.

### Konsep Antarmuka (UI)
*   **Offline-First & Ultra Ringan:** Dibangun sebagai Progressive Web App (PWA) menggunakan *utility-classes* (Tailwind CSS) agar *load time* sangat cepat di jaringan 2G/3G.
*   **Ikonografi Dominan:** Mengganti formulir teks panjang dengan tombol visual/ikon besar yang universal (ramah untuk pengguna dengan tingkat literasi rendah).

### Fitur UX Kunci
*   **Voice-to-Text Reporting:** 
    *   Korban tidak perlu mengetik. Cukup tekan tombol "Rekam Suara" dan ceritakan kronologi.
    *   Sistem AI di server akan otomatis mengubah audio menjadi transkrip laporan terstruktur.
*   **Offline Data Sync:**
    *   Laporan (termasuk rekaman audio) bisa dibuat meski *offline*. 
    *   Data disimpan di *local cache* perangkat dan akan terkirim otomatis ke server (via Supabase) begitu *smartphone* mendeteksi sinyal internet.
*   **Quick Exit (Tombol Penyamaran):**
    *   Tombol darurat yang selalu *floating* di layar.
    *   Jika ditekan (saat pelaku tiba-tiba datang), layar akan langsung berubah menjadi halaman berita umum atau resep masakan, dan riwayat *browser* dibersihkan secara instan.
*   **Anonymous Tracking (Tanpa Akun Email):**
    *   Meniadakan kewajiban mendaftar menggunakan email/password untuk mencegah pelacakan oleh pihak keluarga.
    *   Pelapor diberikan kode unik (PIN/Token) untuk melacak status penanganan kasus. Menggunakan Row Level Security (RLS) agar data terisolasi dan rahasia.
