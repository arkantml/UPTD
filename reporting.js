(() => {
    const config = window.SUPABASE_CONFIG;
    const supabaseLibrary = window.supabase;
    const client = config && supabaseLibrary
        ? supabaseLibrary.createClient(config.url, config.anonKey)
        : null;

    const categoryValues = {
        kdrt: 'kdrt',
        'kekerasan dalam rumah tangga (kdrt)': 'kdrt',
        anak: 'anak',
        'kekerasan anak': 'anak',
        'kekerasan fisik / psikis terhadap anak': 'anak',
        'kekerasan terhadap anak (fisik/psikis)': 'anak',
        seksual: 'seksual',
        violence: 'violence',
        'kekerasan seksual': 'seksual',
        'kekerasan seksual / pelecehan': 'seksual',
        penelantaran: 'penelantaran',
        'penelantaran ekonomi & keluarga': 'penelantaran',
        tppo: 'tppo',
        'tindak pidana perdagangan orang (tppo)': 'tppo',
        cyber: 'cyber',
        kbgo: 'cyber',
        'kekerasan berbasis gender online (kbgo)': 'cyber',
        'kekerasan gender online (kbgo)': 'cyber',
        lainnya: 'lainnya',
        other: 'other'
    };

    const roleValues = {
        korban: 'victim',
        'korban langsung': 'victim',
        keluarga: 'family',
        'keluarga korban': 'family',
        saksi: 'witness',
        'saksi kejadian': 'witness',
        masyarakat: 'community',
        'masyarakat / lembaga': 'community',
        'masyarakat umum / lembaga': 'community'
    };

    function requireClient() {
        if (!client) {
            throw new Error('Layanan pengaduan belum dapat terhubung. Silakan coba kembali atau hubungi hotline 129.');
        }
        return client;
    }

    async function submitReport(report) {
        const categoryKey = String(report.category || '').trim().toLowerCase();
        const roleKey = String(report.role || '').trim().toLowerCase();
        const category = categoryValues[categoryKey];
        const role = roleValues[roleKey];

        if (!category || !role) {
            throw new Error('Kategori atau status pelapor tidak dikenali. Periksa kembali pilihan Anda.');
        }

        const { data, error } = await requireClient().rpc('sapa_aman_submit_report', {
            p_category: category,
            p_narrative: report.narrative,
            p_is_anonymous: Boolean(report.isAnonymous),
            p_reporter_name: report.name || null,
            p_reporter_contact: report.contact,
            p_reporter_role: role,
            p_needs: report.needs || [],
            p_safe_time: report.safeTime || null
        });

        if (error) {
            throw new Error(error.message || 'Laporan belum berhasil dikirim. Periksa koneksi lalu coba lagi.');
        }

        const result = Array.isArray(data) ? data[0] : data;
        if (!result?.tracking_code || !result?.access_pin) {
            throw new Error('Server belum memberikan kode pelacakan. Laporan belum dapat dikonfirmasi.');
        }
        return result;
    }

    async function checkStatus(trackingCode, accessPin) {
        const { data, error } = await requireClient().rpc('sapa_aman_check_report_status', {
            p_tracking_code: trackingCode.trim(),
            p_access_pin: accessPin.trim()
        });

        if (error) {
            throw new Error(error.message || 'Status belum dapat diperiksa. Silakan coba lagi.');
        }

        const result = Array.isArray(data) ? data[0] : data;
        if (!result) {
            throw new Error('Kode tiket atau PIN tidak cocok. Periksa kembali keduanya.');
        }
        return result;
    }

    window.SapaReporting = Object.freeze({
        submitReport,
        checkStatus
    });
})();
