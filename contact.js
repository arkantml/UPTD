const SUPABASE_URL = 'https://rylytlvqxcsrjnmvqnkq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bHl0bHZxeGNzcmpubXZxbmtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MjUyMDAsImV4cCI6MjA3NTQwMTIwMH0.dJAm0Irq_d67Sw52HR-779gl4BFyHM7k8v7_-MetVRo';

// Inisialisasi Supabase Client
// Perhatikan: kita menggunakan "supabase.createClient" langsung dari library global
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Contact form script loaded and Supabase initialized.');

// ===== 2. PENGATURAN ELEMEN FORM KONTAK =====
const contactForm = document.getElementById('contact-form');
const contactSubmitButton = document.getElementById('contact-submit-button');
const contactStatus = document.getElementById('contact-status');

// ===== 3. EVENT LISTENER UNTUK FORM KONTAK =====
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        // Mencegah halaman me-refresh
        e.preventDefault();
        
        // Nonaktifkan tombol untuk mencegah pengiriman ganda
        contactSubmitButton.disabled = true;
        contactSubmitButton.textContent = 'Mengirim...';

        // Ambil data dari form
        const contactData = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            message: document.getElementById('contact-message').value,
        };

        // Kirim data ke tabel 'contacts' di Supabase
        const { error } = await supabaseClient.from('contacts').insert([contactData]);

        if (error) {
            console.error('Error mengirim pesan:', error);
            contactStatus.textContent = 'Gagal mengirim pesan. Coba lagi.';
            contactStatus.classList.remove('text-green-500');
            contactStatus.classList.add('text-red-500');
            
            // Aktifkan kembali tombol jika gagal
            contactSubmitButton.disabled = false;
            contactSubmitButton.textContent = 'Kirim Pesan';
        } else {
            contactStatus.textContent = 'Pesan Anda berhasil terkirim! Terima kasih.';
            contactStatus.classList.add('text-green-500');
            contactStatus.classList.remove('text-red-500');
            contactForm.reset();

            // Beri jeda sebelum mengaktifkan tombol kembali
            setTimeout(() => {
                contactStatus.textContent = '';
                contactSubmitButton.disabled = false;
                contactSubmitButton.textContent = 'Kirim Pesan';
            }, 5000); // Pesan akan hilang setelah 5 detik
        }
    });
} else {
    console.warn('Elemen form kontak tidak ditemukan.');
}