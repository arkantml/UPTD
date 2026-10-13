// Dashboard Case Management System - SAPA AMAN UPTD PPA Kota Binjai
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = window.SUPABASE_CONFIG;

let supabaseClient = null;
if (window.supabase) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn('Supabase init warning:', e);
    }
}

let allReports = [];
let currentSelectedReport = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (await checkAuth()) {
            await loadReportsData();
        }
    } catch (error) {
        console.error('Gagal memverifikasi sesi petugas:', error);
        const tbody = document.getElementById('reports-table-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-red-700">
                        Sesi petugas belum dapat diverifikasi. Muat ulang halaman atau masuk kembali.
                    </td>
                </tr>
            `;
        }
    }
});

async function checkAuth() {
    if (!supabaseClient) {
        window.location.replace('../log/login.html');
        return false;
    }

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) {
        window.location.replace('../log/login.html');
        return false;
    }

    const { data: staff, error: staffError } = await supabaseClient
        .from('sapa_aman_staff')
        .select('display_name, role')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

    if (staffError) throw staffError;
    if (!staff) {
        await supabaseClient.auth.signOut();
        window.location.replace('../log/login.html');
        return false;
    }

    const email = data.session.user.email || '';
    const name = staff.display_name || email.split('@')[0] || 'Petugas';
    document.getElementById('staff-name').textContent = name;
    document.getElementById('avatar-initial').textContent = name[0].toUpperCase();
    document.getElementById('staff-role').textContent = staff.role === 'admin'
        ? 'Administrator UPTD'
        : 'Verifikator Kasus';
    return true;
}

async function loadReportsData() {
    const tbody = document.getElementById('reports-table-body');
    try {
        const { data, error } = await supabaseClient
            .from('sapa_aman_reports')
            .select('tracking_code, category, narrative, is_anonymous, reporter_name, reporter_contact, reporter_role, needs, safe_time, created_at, status')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allReports = data.map(item => ({
            ticket: item.tracking_code,
            isAnon: item.is_anonymous,
            name: item.reporter_name || (item.is_anonymous ? 'Anonim' : '-'),
            contact: item.reporter_contact || '-',
            role: mapDbRole(item.reporter_role),
            category: mapDbCategory(item.category),
            needs: item.needs || [],
            chronology: item.narrative,
            safeTime: item.safe_time || '-',
            createdAt: item.created_at,
            status: item.status
        }));

        updateKPIStats();
        renderReportsTable(allReports);
    } catch (error) {
        console.error('Gagal memuat laporan dari Supabase:', error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-red-700">
                        Data laporan gagal dimuat. Periksa koneksi atau akses petugas, lalu muat ulang halaman.
                    </td>
                </tr>
            `;
        }
    }
}

function mapDbCategory(raw) {
    const map = {
        'violence': 'Kekerasan Fisik',
        'domestic_violence': 'KDRT',
        'child_protection': 'Kekerasan Anak',
        'other': 'Lainnya',
        kdrt: 'KDRT',
        anak: 'Kekerasan Terhadap Anak',
        seksual: 'Kekerasan Seksual',
        penelantaran: 'Penelantaran',
        tppo: 'TPPO',
        cyber: 'Kekerasan Gender Online',
        lainnya: 'Lainnya'
    };
    return map[raw] || raw;
}

function mapDbRole(raw) {
    const map = {
        victim: 'Korban Langsung',
        family: 'Keluarga / Kerabat Korban',
        witness: 'Saksi / Tetangga',
        community: 'Masyarakat / Lembaga'
    };
    return map[raw] || raw || '-';
}

// Update Metrik KPI Cepat
function updateKPIStats() {
    const total = allReports.length;
    const received = allReports.filter(r => r.status === 'received').length;
    const inProgress = allReports.filter(r => r.status === 'in_progress' || r.status === 'reviewing').length;
    const closed = allReports.filter(r => r.status === 'closed').length;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-received').textContent = received;
    document.getElementById('stat-in-progress').textContent = inProgress;
    document.getElementById('stat-closed').textContent = closed;
}

// Render Tabel Kasus
function renderReportsTable(reports) {
    const tbody = document.getElementById('reports-table-body');
    if (!tbody) return;

    if (reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center text-slate-400">
                    Tidak ditemukan data laporan pengaduan yang sesuai filter.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = reports.map(report => {
        const dateStr = new Date(report.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        const statusBadge = getStatusBadge(report.status);

        const needsBadges = (report.needs && Array.isArray(report.needs))
            ? report.needs.map(n => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 mr-1">${escapeHtml(n)}</span>`).join('')
            : '<span class="text-slate-400">-</span>';

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-4 font-mono font-bold text-emerald-800">
                    ${escapeHtml(report.ticket)}
                </td>
                <td class="p-4">
                    <div class="font-bold text-slate-900">${escapeHtml(report.name || 'Anonim')}</div>
                    <div class="text-[11px] text-slate-500">${escapeHtml(report.contact || '-')}</div>
                </td>
                <td class="p-4">
                    <span class="font-semibold text-slate-700">${escapeHtml(report.category || 'Umum')}</span>
                    <div class="text-[10px] text-slate-400">${escapeHtml(report.role || '-')}</div>
                </td>
                <td class="p-4">
                    <div class="max-w-xs flex flex-wrap gap-1">
                        ${needsBadges}
                    </div>
                </td>
                <td class="p-4 text-slate-500 whitespace-nowrap">
                    ${dateStr}
                </td>
                <td class="p-4 whitespace-nowrap">
                    ${statusBadge}
                </td>
                <td class="p-4 text-right whitespace-nowrap">
                    <button onclick="openCaseModal('${escapeHtml(report.ticket)}')" class="px-3 py-1.5 rounded-lg bg-[#344d3e] text-white hover:bg-[#273b30] font-bold text-xs transition">
                        Kelola
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Komponen Badge Status
function getStatusBadge(status) {
    switch (status) {
        case 'received':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">Laporan Masuk</span>`;
        case 'reviewing':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">Penelaahan</span>`;
        case 'in_progress':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Pendampingan</span>`;
        case 'referred':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">Dirujuk</span>`;
        case 'closed':
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Selesai</span>`;
        default:
            return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">${escapeHtml(status || 'Baru')}</span>`;
    }
}

// Filter Tabel Kasus
function filterReportsTable() {
    const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const statusVal = document.getElementById('filter-status')?.value || 'all';
    const categoryVal = document.getElementById('filter-category')?.value || 'all';

    const filtered = allReports.filter(r => {
        const matchesSearch = 
            (r.ticket && r.ticket.toLowerCase().includes(searchVal)) ||
            (r.name && r.name.toLowerCase().includes(searchVal)) ||
            (r.chronology && r.chronology.toLowerCase().includes(searchVal)) ||
            (r.contact && r.contact.toLowerCase().includes(searchVal));

        const matchesStatus = (statusVal === 'all') || (r.status === statusVal);
        const matchesCategory = (categoryVal === 'all') || (r.category && r.category.toLowerCase().includes(categoryVal.toLowerCase()));

        return matchesSearch && matchesStatus && matchesCategory;
    });

    renderReportsTable(filtered);
}

// Buka Modal Rincian Kasus
function openCaseModal(ticketCode) {
    const report = allReports.find(r => r.ticket === ticketCode);
    if (!report) return;

    currentSelectedReport = report;

    document.getElementById('modal-ticket-title').textContent = `Kasus #${report.ticket} (${report.category || 'Kekerasan'})`;
    document.getElementById('modal-date-subtitle').textContent = `Diterima: ${new Date(report.createdAt).toLocaleString('id-ID')}`;

    document.getElementById('modal-reporter-name').textContent = report.name || 'Anonim';
    document.getElementById('modal-reporter-role').textContent = `Status Pelapor: ${report.role || '-'}`;

    document.getElementById('modal-reporter-contact').textContent = report.contact || '-';
    document.getElementById('modal-safe-time').textContent = `Waktu Aman: ${report.safeTime || '-'}`;

    document.getElementById('modal-narrative').textContent = report.chronology || '-';
    document.getElementById('modal-status-select').value = report.status || 'received';
    document.getElementById('modal-progress-note').value = '';

    const needsContainer = document.getElementById('modal-needs-badges');
    if (needsContainer) {
        if (report.needs && Array.isArray(report.needs) && report.needs.length > 0) {
            needsContainer.innerHTML = report.needs.map(n => 
                `<span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">${escapeHtml(n)}</span>`
            ).join('');
        } else {
            needsContainer.innerHTML = '<span class="text-slate-400">Tidak ada rincian spesifik</span>';
        }
    }

    document.getElementById('case-modal').classList.remove('hidden');
}

function closeCaseModal() {
    document.getElementById('case-modal').classList.add('hidden');
    currentSelectedReport = null;
}

// Simpan Pembaruan Status Kasus
async function saveCaseStatusUpdate() {
    if (!currentSelectedReport) return;

    const newStatus = document.getElementById('modal-status-select').value;
    const note = document.getElementById('modal-progress-note').value.trim();
    const saveBtn = document.getElementById('save-status-btn');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    try {
        const { error } = await supabaseClient.rpc('sapa_aman_update_report_status', {
            p_tracking_code: currentSelectedReport.ticket,
            p_new_status: newStatus,
            p_note: note || null
        });

        if (error) throw error;
        currentSelectedReport.status = newStatus;
        updateKPIStats();
        filterReportsTable();
        closeCaseModal();
    } catch (error) {
        console.error('Gagal memperbarui status laporan:', error);
        alert('Perubahan belum tersimpan. Periksa koneksi dan hak akses petugas, lalu coba kembali.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan Perubahan Kasus';
    }
}

// Ekspor Laporan ke CSV
function exportReportsToCSV() {
    if (allReports.length === 0) {
        alert('Tidak ada data laporan untuk diekspor.');
        return;
    }

    const headers = ['Kode Tiket', 'Tanggal', 'Kategori', 'Status', 'Pelapor', 'Kontak', 'Kebutuhan', 'Kronologi'];
    const rows = allReports.map(r => [
        `"${r.ticket}"`,
        `"${new Date(r.createdAt).toISOString()}"`,
        `"${r.category || '-'}"`,
        `"${r.status || '-'}"`,
        `"${r.name || 'Anonim'}"`,
        `"${r.contact || '-'}"`,
        `"${(r.needs || []).join(', ')}"`,
        `"${(r.chronology || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekapitulasi_Kasus_UPTD_PPA_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Logout Petugas
async function handleLogout() {
    if (supabaseClient) {
        try {
            await supabaseClient.auth.signOut();
        } catch (e) {
            console.warn('Signout warning:', e);
        }
    }
    window.location.href = '../log/login.html';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
