// Import Supabase client
const { createClient } = supabase;

// Inisialisasi Supabase Client
// === GANTI DENGAN URL DAN ANON KEY SUPABASE ANDA ===
const SUPABASE_URL = 'https://lslbbbcswmkdrlhkfhta.supabase.co'; // <- PASTIKAN INI BENAR
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbGJiYmNzd21rZHJsaGtmaHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDkxOTYsImV4cCI6MjA3NjY4NTE5Nn0.z6jAxH7fP0ZSZmHEdA_szXUQ0iCaHcZOlJZpYhX7res'; // <- GANTI INI JIKA PERLU
// ===============================================

let db;
try {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized for registration.');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
    // Tampilkan pesan di UI jika init gagal
    const messageP = document.getElementById('message');
    if (messageP) {
        messageP.textContent = 'Gagal menginisialisasi koneksi. Coba lagi nanti.';
        messageP.className = 'text-red-600 text-sm mb-4'; // Tampilkan sebagai error
        messageP.classList.remove('hidden');
    }
}

const registerForm = document.getElementById('register-form');
const messageP = document.getElementById('message');
const registerButton = document.getElementById('register-button');

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageP.classList.add('hidden'); // Sembunyikan pesan lama
    messageP.textContent = '';
    messageP.className = 'text-sm mb-4 hidden'; // Reset kelas

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!db) {
         messageP.textContent = 'Koneksi database belum siap.';
         messageP.className = 'text-red-600 text-sm mb-4';
         messageP.classList.remove('hidden');
         return;
    }

    // Validasi password
    if (password !== confirmPassword) {
        messageP.textContent = 'Konfirmasi password tidak cocok.';
        messageP.className = 'text-red-600 text-sm mb-4';
        messageP.classList.remove('hidden');
        return;
    }

    // Validasi panjang password (Supabase default minimal 6)
    if (password.length < 6) {
        messageP.textContent = 'Password harus minimal 6 karakter.';
        messageP.className = 'text-red-600 text-sm mb-4';
        messageP.classList.remove('hidden');
        return;
    }


    registerButton.disabled = true;
    registerButton.textContent = 'Memproses...';

    try {
        // Panggil fungsi signUp Supabase
        const { data, error } = await db.auth.signUp({
            email: email,
            password: password,
            // Anda bisa menambahkan 'options' di sini jika perlu,
            // misalnya data tambahan untuk profil user:
            // options: {
            //   data: { full_name: 'Nama Awal', role: 'member' }
            // }
        });

        if (error) {
            // Tangani error pendaftaran dari Supabase
            console.error('Registration error:', error);
            messageP.textContent = error.message || 'Terjadi kesalahan saat pendaftaran.';
            messageP.className = 'text-red-600 text-sm mb-4'; // Tampilkan sebagai error
            messageP.classList.remove('hidden');
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
             // Kasus khusus: User sudah ada tapi belum konfirmasi email (jika konfirmasi diaktifkan)
             console.log('User exists but is unconfirmed:', data);
             messageP.textContent = 'Email sudah terdaftar. Silakan cek email Anda untuk konfirmasi atau coba login.';
             messageP.className = 'text-yellow-600 text-sm mb-4'; // Tampilkan sebagai warning
             messageP.classList.remove('hidden');
             // Mungkin arahkan ke login atau biarkan di halaman ini
        }
         else if (data.session === null && data.user) {
            // Pendaftaran berhasil, TAPI konfirmasi email diperlukan (default Supabase)
            console.log('Registration successful, email confirmation needed:', data);
            messageP.textContent = 'Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi.';
            messageP.className = 'text-green-600 text-sm mb-4'; // Tampilkan sebagai sukses
            messageP.classList.remove('hidden');
            registerForm.reset(); // Kosongkan form
            // Anda mungkin ingin menonaktifkan tombol atau mengarahkan ke halaman lain
        }
        else if (data.session && data.user) {
             // Pendaftaran berhasil DAN langsung login (jika konfirmasi email dinonaktifkan)
             console.log('Registration and login successful:', data);
             messageP.textContent = 'Pendaftaran berhasil! Anda akan diarahkan...';
             messageP.className = 'text-green-600 text-sm mb-4';
             messageP.classList.remove('hidden');
             // Redirect ke halaman setelah login (misalnya profil.html) setelah beberapa saat
             setTimeout(() => {
                 window.location.href = 'profil.html'; // Ganti dengan halaman tujuan Anda
             }, 2000); // Tunggu 2 detik
        } else {
             // Kasus tak terduga
             console.warn('Unexpected registration result:', data);
             messageP.textContent = 'Terjadi sesuatu yang tidak terduga.';
             messageP.className = 'text-yellow-600 text-sm mb-4';
             messageP.classList.remove('hidden');
        }


    } catch (error) {
        // Tangani error tak terduga
        console.error('Unexpected registration error:', error);
        messageP.textContent = 'Terjadi kesalahan tidak terduga. Silakan coba lagi.';
        messageP.className = 'text-red-600 text-sm mb-4';
        messageP.classList.remove('hidden');
    } finally {
         // Aktifkan kembali tombol jika tidak redirect
         if (!(messageP.textContent.includes('Anda akan diarahkan'))) {
            registerButton.disabled = false;
            registerButton.textContent = 'Daftar';
         }
    }
});
