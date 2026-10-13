// Import Supabase client
const { createClient } = supabase;
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = window.SUPABASE_CONFIG;

let db;
try {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client initialized for login.');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
        errorMessage.textContent = 'Gagal menginisialisasi koneksi database. Periksa konfigurasi.';
        errorMessage.classList.remove('hidden');
    }
}

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.classList.add('hidden');
        errorMessage.textContent = '';
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!db) {
            errorMessage.textContent = 'Koneksi database belum siap.';
            errorMessage.classList.remove('hidden');
            return;
        }

        loginButton.disabled = true;
        loginButton.innerHTML = `
            <svg class="animate-spin h-4 w-4 text-white inline-block mr-2" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Memverifikasi Hak Akses...
        `;

        try {
            // 1. Autentikasi Pengguna
            const { data, error } = await db.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                console.error('Login error:', error);
                if (error.message.includes('Invalid login credentials')) {
                    errorMessage.textContent = 'Email atau kata sandi petugas tidak valid.';
                } else {
                    errorMessage.textContent = error.message || 'Terjadi kesalahan saat otentikasi.';
                }
                errorMessage.classList.remove('hidden');
                return;
            }

            // 2. Verifikasi Peran Petugas (Staff Verificator Check)
            const userId = data.user.id;
            const { data: staffData, error: staffError } = await db
                .from('sapa_aman_staff')
                .select('user_id, display_name, role')
                .eq('user_id', userId)
                .maybeSingle();

            if (staffError) {
                throw new Error('Akses petugas belum dapat diverifikasi. Coba kembali.');
            }

            if (!staffData) {
                await db.auth.signOut();
                throw new Error('Akun ini belum terdaftar sebagai petugas UPTD PPA.');
            }

            // 3. Alihkan ke Dashboard Admin Kasus
            window.location.href = '../admin/dashboard.html';

        } catch (error) {
            console.error('Unexpected login error:', error);
            errorMessage.textContent = error.message || 'Terjadi kesalahan verifikasi. Silakan coba kembali.';
            errorMessage.classList.remove('hidden');
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = `
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                Verifikasi & Masuk Dashboard
            `;
        }
    });
}
