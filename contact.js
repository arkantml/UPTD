const SUPABASE_URL = 'https://lslbbbcswmkdrlhkfhta.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbGJiYmNzd21rZHJsaGtmaHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDkxOTYsImV4cCI6MjA3NjY4NTE5Nn0.z6jAxH7fP0ZSZmHEdA_szXUQ0iCaHcZOlJZpYhX7res'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('Contact form script loaded and Supabase initialized.');

const contactForm = document.getElementById('contact-form');
const contactSubmitButton = document.getElementById('contact-submit-button');
const contactStatus = document.getElementById('contact-status');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        contactSubmitButton.disabled = true;
        contactSubmitButton.textContent = 'Mengirim...';

        const contactData = {
            name: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            message: document.getElementById('contact-message').value,
        };

        const { error } = await supabaseClient.from('contacts').insert([contactData]);

        if (error) {
            console.error('Error mengirim pesan:', error);
            contactStatus.textContent = 'Gagal mengirim pesan. Coba lagi.';
            contactStatus.classList.remove('text-green-500');
            contactStatus.classList.add('text-red-500');
            
            contactSubmitButton.disabled = false;
            contactSubmitButton.textContent = 'Kirim Pesan';
        } else {
            contactStatus.textContent = 'Pesan Anda berhasil terkirim! Terima kasih.';
            contactStatus.classList.add('text-green-500');
            contactStatus.classList.remove('text-red-500');
            contactForm.reset();

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
