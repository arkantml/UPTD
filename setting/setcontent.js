// Import Supabase client
// Pastikan library Supabase sudah dimuat di HTML sebelum script ini
const { createClient } = supabase;

// Inisialisasi Supabase Client
// === PASTIKAN URL DAN ANON KEY SUDAH BENAR ===
const SUPABASE_URL = 'https://lslbbbcswmkdrlhkfhta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbGJiYmNzd21rZHJsaGtmaHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDkxOTYsImV4cCI6MjA3NjY4NTE5Nn0.z6jAxH7fP0ZSZmHEdA_szXUQ0iCaHcZOlJZpYhX7res';
// ===============================================

let db;
let currentUser = null;
let authListener = null;

try {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!db) { throw new Error('Supabase client failed initialization.'); }
     console.log('Supabase client initialized.');
} catch (error) {
    console.error('Fatal Error: Failed to initialize Supabase client:', error);
    const notLoggedInDiv = document.getElementById('not-logged-in');
    if(notLoggedInDiv) {
        notLoggedInDiv.innerHTML = '<p class="text-red-600">Koneksi database gagal.</p>';
        notLoggedInDiv.classList.remove('hidden');
    }
    // Hentikan script jika inisialisasi gagal
    throw new Error("Supabase initialization failed.");
}

// === Referensi Elemen DOM ===
const getElement = (id) => document.getElementById(id);
const notLoggedInDiv = getElement('not-logged-in');
const loggedInSettingsDiv = getElement('logged-in-settings');
const settingUserEmail = getElement('setting-user-email');

const changePasswordForm = getElement('change-password-form');
const currentPasswordInput = getElement('current-password'); // Opsional tapi baik untuk UI
const newPasswordInput = getElement('new-password');
const confirmPasswordInput = getElement('confirm-password');
const savePasswordButton = getElement('save-password-button');
const passwordMessage = getElement('password-message');
const settingLogoutButton = getElement('setting-logout-button');


// === Fungsi Ubah Password ===
async function handleChangePassword(event) {
    event.preventDefault();
    if (!db || !currentUser) {
        alert("Sesi tidak valid. Silakan login kembali.");
        return;
    }
    if (!newPasswordInput || !confirmPasswordInput || !passwordMessage) return;

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Reset pesan
    passwordMessage.textContent = '';
    passwordMessage.classList.add('hidden');
    passwordMessage.classList.remove('text-green-600', 'text-red-600');

    // Validasi input
    if (newPassword.length < 6) {
        passwordMessage.textContent = 'Password baru minimal 6 karakter.';
        passwordMessage.classList.remove('hidden');
        passwordMessage.classList.add('text-red-600');
        return;
    }
    if (newPassword !== confirmPassword) {
        passwordMessage.textContent = 'Konfirmasi password baru tidak cocok.';
        passwordMessage.classList.remove('hidden');
        passwordMessage.classList.add('text-red-600');
        return;
    }

    if (savePasswordButton) savePasswordButton.disabled = true; savePasswordButton.textContent = 'Menyimpan...';

    try {
        // Panggil Supabase updateUser untuk mengganti password
        const { data, error } = await db.auth.updateUser({
            password: newPassword
        });

        if (error) {
            console.error("Error updating password:", error);
            passwordMessage.textContent = `Gagal menyimpan: ${error.message}`;
            passwordMessage.classList.remove('hidden');
            passwordMessage.classList.add('text-red-600');
        } else {
            console.log("Password updated successfully:", data);
            passwordMessage.textContent = 'Password berhasil diperbarui!';
            passwordMessage.classList.remove('hidden');
            passwordMessage.classList.add('text-green-600');
            // Kosongkan input password setelah berhasil
            if (currentPasswordInput) currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
        }
    } catch (err) {
        console.error("Unexpected error changing password:", err);
        passwordMessage.textContent = `Terjadi kesalahan tidak terduga: ${err.message}`;
        passwordMessage.classList.remove('hidden');
        passwordMessage.classList.add('text-red-600');
    } finally {
        if (savePasswordButton) { savePasswordButton.disabled = false; savePasswordButton.textContent = 'Simpan Password Baru'; }
    }
}

// === Fungsi Logout ===
async function handleLogout() {
    if (!db || !settingLogoutButton) return;
    console.log("Logging out...");
    settingLogoutButton.disabled = true;
    try {
        const { error } = await db.auth.signOut();
        if (error) throw error;
        console.log("Logout successful.");
        window.location.href = 'login.html'; // Redirect ke login
    } catch (error) {
        console.error('Logout error:', error);
        alert(`Gagal logout: ${error.message}`);
        settingLogoutButton.disabled = false;
    }
}

// === Pemeriksaan Auth & Inisialisasi Halaman ===
async function checkAuthStateAndInit() {
    if (!db) return; // Pastikan db terinisialisasi

    // Pasang listener onAuthStateChanged
    if (db.auth && typeof db.auth.onAuthStateChanged === 'function') {
        if (authListener && typeof authListener.unsubscribe === 'function') { authListener.unsubscribe(); }

        const { data } = db.auth.onAuthStateChanged((event, session) => {
            console.log('Auth state changed event:', event);
            currentUser = session ? session.user : null; // Update currentUser global
            updateUIBasedOnAuthState(); // Panggil fungsi untuk update UI
        });
        authListener = data.subscription;
        console.log("Auth state change listener attached.");
    } else {
        console.warn('auth.onAuthStateChanged not available');
    }

    // Cek sesi awal
    try {
       console.log("Performing initial session check...");
       const { data: { session }, error: sessionError } = await db.auth.getSession();
       if (sessionError) throw sessionError; // Lempar error jika gagal cek sesi

       currentUser = session ? session.user : null; // Set currentUser dari hasil getSession
       updateUIBasedOnAuthState(); // Update UI berdasarkan sesi awal

   } catch (err) {
        console.error('checkAuth getSession critical err:', err);
        if(notLoggedInDiv) {
            notLoggedInDiv.innerHTML = `<p class="text-red-600">Gagal memeriksa sesi: ${err.message}</p>`;
            notLoggedInDiv.classList.remove('hidden');
        }
        if(loggedInSettingsDiv) loggedInSettingsDiv.classList.add('hidden'); // Sembunyikan setting jika error
   }
}

// === Fungsi untuk Update UI Berdasarkan Status Login ===
function updateUIBasedOnAuthState() {
    const isLoggedIn = !!currentUser;
    const isOnLoginPage = window.location.pathname.includes('/login.html'); // Asumsi

    if (isLoggedIn) {
        console.log('User logged in, updating settings UI:', currentUser);
        if (notLoggedInDiv) notLoggedInDiv.classList.add('hidden');
        if (loggedInSettingsDiv) loggedInSettingsDiv.classList.remove('hidden');
        if (settingUserEmail) settingUserEmail.textContent = currentUser.email || 'N/A';
        // Listener logout hanya perlu ditambahkan sekali
        if (settingLogoutButton && !settingLogoutButton.dataset.listenerAttached) {
            settingLogoutButton.addEventListener('click', handleLogout);
            settingLogoutButton.dataset.listenerAttached = 'true';
        }
    } else {
        console.log('User not logged in.');
        if (loggedInSettingsDiv) loggedInSettingsDiv.classList.add('hidden');
        if (notLoggedInDiv) notLoggedInDiv.classList.remove('hidden');
        // Jika tidak login tapi tidak di halaman login, redirect
        if (!isOnLoginPage) {
            console.log("Redirecting to login from settings page.");
            window.location.href = 'login.html';
        }
    }
}


// === Event Listeners ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded.");


    // Listener untuk form ubah password
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    // Panggil checkAuthStateAndInit setelah semua listener UI dasar terpasang
    checkAuthStateAndInit();

    // Listener logout sudah dipasang di dalam checkAuthStateAndInit/updateUI
});
