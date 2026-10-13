const contactForm = document.getElementById('contact-form');
const contactSubmitButton = document.getElementById('contact-submit-button');
const contactStatus = document.getElementById('contact-status');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!contactSubmitButton || !contactStatus) return;

        contactSubmitButton.disabled = true;
        contactSubmitButton.textContent = 'Mengirim...';

        try {
            const isAnonymous = document.querySelector('input[name="anon_mode"]:checked')?.value === 'anon';
            const needs = Array.from(document.querySelectorAll('input[name="needs"]:checked')).map(input => input.value);
            const result = await window.SapaReporting.submitReport({
                isAnonymous,
                name: document.getElementById('contact-name')?.value.trim(),
                contact: document.getElementById('contact-email')?.value.trim(),
                role: document.getElementById('contact-role')?.value,
                category: document.getElementById('contact-category')?.value,
                needs,
                narrative: document.getElementById('contact-message')?.value.trim(),
                safeTime: document.getElementById('contact-safe-time')?.value.trim()
            });

            contactStatus.replaceChildren();
            const heading = document.createElement('strong');
            heading.textContent = 'Pengaduan berhasil diterima.';
            const guidance = document.createElement('p');
            guidance.textContent = 'Simpan kode tiket dan PIN ini. Buka halaman utama untuk memeriksa status; PIN hanya ditampilkan sekarang.';
            const credentials = document.createElement('p');
            credentials.append('Kode tiket: ');
            const ticket = document.createElement('code');
            ticket.textContent = result.tracking_code;
            credentials.append(ticket, document.createElement('br'), 'PIN: ');
            const pin = document.createElement('code');
            pin.textContent = result.access_pin;
            credentials.append(pin);
            const trackingLink = document.createElement('a');
            trackingLink.href = 'index.html#pengaduan-online';
            trackingLink.textContent = 'Lacak status laporan';
            contactStatus.append(heading, guidance, credentials, trackingLink);
            contactStatus.style.backgroundColor = '';
            contactStatus.style.borderColor = '';
            contactStatus.className = 'report-ticket-alert visible';
            contactForm.reset();
            toggleContactAnon(true);
        } catch (error) {
            console.error('Gagal mengirim pengaduan:', error);
            contactStatus.textContent = `${error.message} Laporan belum tersimpan; data formulir tetap tersedia agar Anda dapat mencoba lagi.`;
            contactStatus.style.backgroundColor = '#ffebee';
            contactStatus.style.borderColor = '#ef9a9a';
            contactStatus.className = 'report-ticket-alert visible';
        } finally {
            contactSubmitButton.disabled = false;
            contactSubmitButton.textContent = 'Kirim Pengaduan Sekarang';
        }
    });
}
