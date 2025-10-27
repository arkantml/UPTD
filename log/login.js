// Import Supabase client
// Pastikan library Supabase sudah dimuat di HTML sebelum script ini
const { createClient } = supabase;

// Inisialisasi Supabase Client
// === GANTI DENGAN URL DAN ANON KEY SUPABASE ANDA ===
const SUPABASE_URL = 'https://lslbbbcswmkdrlhkfhta.supabase.co'; // <- URL INI MUNGKIN PERLU DIGANTI
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbGJiYmNzd21rZHJsaGtmaHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDkxOTYsImV4cCI6MjA3NjY4NTE5Nn0.z6jAxH7fP0ZSZmHEdA_szXUQ0iCaHcZOlJZpYhX7res'; // <- ANON KEY INI MUNGKIN PERLU DIGANTI
// ===============================================

let db;
try {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized for login.');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
    // Tampilkan pesan error di UI jika init gagal
    const errorMessage = document.getElementById('error-message');
     if (errorMessage) {
        errorMessage.textContent = 'Gagal menginisialisasi koneksi. Coba lagi nanti.';
        errorMessage.classList.remove('hidden');
    }
}
const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const registerLink = document.getElementById('register-link');
const loginButton = document.getElementById('login-button');

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.classList.add('hidden'); // Sembunyikan error lama
        errorMessage.textContent = ''; // Kosongkan teks error
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!db) {
             errorMessage.textContent = 'Koneksi database belum siap.';
             errorMessage.classList.remove('hidden');
             return;
        }

        loginButton.disabled = true;
        loginButton.textContent = 'Memproses...';

        try {
            // Panggil fungsi login Supabase
            const { data, error } = await db.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                // Tangani error login dari Supabase
                console.error('Login error:', error);
                 if (error.message.includes('Invalid login credentials')) {
                      errorMessage.textContent = 'Email atau password salah.';
                 } else {
                      errorMessage.textContent = error.message || 'Terjadi kesalahan saat login.';
                 }
                errorMessage.classList.remove('hidden');
            } else {
                // Login berhasil
                console.log('Login successful:', data);
                // Redirect ke halaman setelah login (misalnya profil.html)
                 // alert('Login berhasil! Mengarahkan ke halaman profil...'); // Placeholder sebelum redirect
                 window.location.href = '../index.html'; // Ganti dengan halaman tujuan Anda
            }

        } catch (error) {
            // Tangani error tak terduga
            console.error('Unexpected login error:', error);
            errorMessage.textContent = 'Terjadi kesalahan tidak terduga. Silakan coba lagi.';
            errorMessage.classList.remove('hidden');
        } finally {
             // Selalu aktifkan kembali tombol setelah selesai
             loginButton.disabled = false;
             loginButton.textContent = 'Masuk';
        }
    });
} else {
    console.error("Login form not found!");
}

if (registerLink) {
    registerLink.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = 'daftar.html'; // Ganti dengan halaman register Anda
    });
}

