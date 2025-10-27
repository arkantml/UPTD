// Import Supabase client
// Pastikan library Supabase sudah dimuat di HTML sebelum script ini
const { createClient } = supabase;

// Inisialisasi Supabase Client
// === MENGGUNAKAN URL DAN ANON KEY YANG DIBERIKAN ===
const SUPABASE_URL = 'https://lslbbbcswmkdrlhkfhta.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbGJiYmNzd21rZHJsaGtmaHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDkxOTYsImV4cCI6MjA3NjY4NTE5Nn0.z6jAxH7fP0ZSZmHEdA_szXUQ0iCaHcZOlJZpYhX7res';
const BUCKET_NAME = 'avatars';
// ===============================================

let db;
let currentUser = null; // Menyimpan data user { id, email, ... }
let currentMemberIdToDelete = null; // number | null
let currentOpenDetailId = null; // number | null
let authListener = null; // Simpan subscription listener

try {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!db) throw new Error('Supabase client failed initialization.');
    console.log('Supabase client initialized.');
} catch (error) {
    console.error('Fatal Error: Failed to initialize Supabase client:', error);
    const authLoading = document.getElementById('auth-loading');
    if(authLoading) authLoading.textContent = 'Koneksi database gagal.';
    // Melemparkan error akan menghentikan eksekusi script lebih lanjut
    throw new Error("Supabase initialization failed.");
}

// === Referensi Elemen DOM (Gunakan getElement untuk keamanan) ===
const getElement = (id) => document.getElementById(id);
const authLoading = getElement('auth-loading');
const userInfoSection = getElement('user-info-section');
const userEmailSpan = getElement('user-email');
const logoutButton = getElement('logout-button');
const listView = getElement('list-view');
const detailView = getElement('detail-view');
const profileGrid = getElement('profile-grid');
const noMembersMessage = getElement('no-members-message');
const listLoading = getElement('list-loading');
const detailLoading = getElement('detail-loading');
const backToListButton = getElement('back-to-list-button');
const addModal = getElement('add-modal');
const addMemberButton = getElement('add-member-button');
const cancelAddButton = getElement('cancel-add-button');
const addMemberForm = getElement('add-member-form');
const addAvatarInput = getElement('add-avatar');
const addAvatarPreview = getElement('add-avatar-preview');
const submitAddButton = getElement('submit-add-button');
const editModal = getElement('edit-modal');
const cancelEditButton = getElement('cancel-edit-button');
const editMemberForm = getElement('edit-member-form');
const editAvatarInput = getElement('edit-avatar');
const editAvatarPreview = getElement('edit-avatar-preview');
const submitEditButton = getElement('submit-edit-button');
const deleteConfirmModal = getElement('delete-confirm-modal');
const cancelDeleteButton = getElement('cancel-delete-button');
const confirmDeleteButton = getElement('confirm-delete-button');
const deleteMemberIdInput = getElement('delete-member-id');
const detailAvatarImg = getElement('detail-avatar-img');
const detailAvatarPlaceholder = getElement('detail-avatar-placeholder');

const placeholderSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-gray-400">
  <path fill-rule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zM12 6a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5zM12 15a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75z" clip-rule="evenodd" />
</svg>`;

// === Fungsi Helper ===
function displayImagePreview(fileInput, previewElement) {
    const file = fileInput?.files?.[0]; // Lebih aman
    if (file && previewElement) {
        const reader = new FileReader();
        reader.onload = (e) => { previewElement.src = e.target.result; previewElement.classList.remove('hidden'); };
        reader.onerror = () => { console.error("Error reading file"); if (previewElement) { previewElement.src=''; previewElement.classList.add('hidden');} }; // Handle error
        reader.readAsDataURL(file);
    } else if (previewElement) {
        previewElement.src = ''; previewElement.classList.add('hidden');
    }
}

// PERUBAHAN: Upload avatar ke folder user_id
async function uploadAvatar(file, ownerId) {
    if (!file || !db || !ownerId) {
        console.warn("Upload cancelled: Missing file, db, or ownerId");
        return null;
    }
    const fileExt = file.name.split('.').pop() || 'png'; // Default ext
    const fileName = `${Date.now()}.${fileExt}`;
    // Simpan di folder dengan nama user ID
    const filePath = `${ownerId}/${fileName}`;
    console.log('Uploading avatar to user folder:', filePath);

    const { data, error } = await db.storage.from(BUCKET_NAME).upload(filePath, file, {
        cacheControl: '3600', upsert: true // Upsert true berguna saat edit
    });

    if (error) { console.error('Upload error:', error); throw error; }

    const { data: urlData } = db.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    if (!urlData?.publicUrl) { // Cek null atau undefined
        console.error("Failed to get public URL after upload:", data);
        throw new Error("Gagal mendapatkan URL publik.");
    }
    console.log('Upload success, Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
}

// Hapus avatar (lebih robust)
async function deleteAvatar(avatarUrl) {
    if (!avatarUrl || !db) return;
    try {
        const url = new URL(avatarUrl);
        const filePathEncoded = url.pathname.split(`/${BUCKET_NAME}/`)[1];
        if (!filePathEncoded) { console.warn('Could not extract file path from URL:', avatarUrl); return; }
        const filePath = decodeURIComponent(filePathEncoded); // Decode
        console.log(`Attempting to remove avatar path: ${filePath}`);
        const { data, error } = await db.storage.from(BUCKET_NAME).remove([filePath]);
        if (error) console.error('Delete avatar storage error:', error); // Log error tapi jangan stop script
        else console.log('Avatar removed from storage:', data);
    } catch (err) { console.error('deleteAvatar unexpected error:', err); }
}

// === Fungsi Render UI ===
async function renderCards() {
    if (!db || !profileGrid) return;
    console.log('renderCards called');
    if (listLoading) listLoading.classList.remove('hidden');
    // Simpan scroll position sebelum clear
    const scrollPosition = profileGrid.scrollLeft;
    profileGrid.innerHTML = ''; // Hapus semua kartu
    if (noMembersMessage) noMembersMessage.classList.add('hidden');

    try {
        // Fetch data
        const { data: members, error } = await db.from('members')
            .select('*') // Pilih semua kolom
            .order('created_at', { ascending: true }); // Urutkan

        if (listLoading) listLoading.classList.add('hidden');
        if (error) throw error; // Lempar error jika fetch gagal

        if (members && members.length) {
            members.forEach(member => { // Render setiap kartu
                const card = document.createElement('div'); card.dataset.id = member.id;
                card.className = 'member-card flex-none w-80 bg-white border border-gray-200 p-6 rounded-lg shadow-md text-center snap-center relative group';
                card.innerHTML = `
                  <div class="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-gray-400 overflow-hidden border">
                    ${member.avatar_url ? `<img src="${member.avatar_url}" alt="Foto ${member.name || ''}" class="w-full h-full object-cover">` : placeholderSvg}
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 truncate">${member.name || 'N/A'}</h3>
                  <p class="text-red-600 font-semibold text-sm truncate">${member.position || 'N/A'}</p>
                  <p class="text-gray-500 text-sm mt-1 truncate">@${member.username || 'N/A'}</p>
                  <div class="mt-4 flex justify-center space-x-2">
                    <button data-member-id="${member.id}" class=" view-detail-button bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-bold py-1 px-3 rounded transition duration-300">Lihat Profil</button>
                    <button data-member-id="${member.id}" data-member-name="${member.name || 'Anggota Ini'}" class="delete-button bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold py-1 px-3 rounded transition duration-300">
                      <svg class="w-4 h-4 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.342.052.682.107 1.022.166m0 0a48.11 48.11 0 013.478-.397m7.5 0a48.11 48.11 0 00-3.478-.397m-12.56 0a48.108 48.108 0 013.478-.397m14.456 0L13.1 21H10.9z" /></svg>
                    </button>
                  </div>`;
                profileGrid.appendChild(card);
            });
            // Kembalikan scroll position setelah render
            profileGrid.scrollLeft = scrollPosition;
        } else {
            if (noMembersMessage) { noMembersMessage.classList.remove('hidden'); noMembersMessage.textContent = 'Belum ada anggota.'; }
        }
    } catch (err) {
        if (listLoading) listLoading.classList.add('hidden');
        console.error('renderCards error:', err);
        if (noMembersMessage) { noMembersMessage.classList.remove('hidden'); noMembersMessage.textContent = `Gagal memuat data: ${err.message}`; }
    }
}

// Show detail (logic tetap sama, tapi dengan getElement)
async function showDetailView(memberId) {
    if (!db || !listView || !detailView) return;
    const idToShow = parseInt(memberId, 10); if (isNaN(idToShow)) return;
    currentOpenDetailId = idToShow; listView.classList.add('hidden'); detailView.classList.remove('hidden'); if (detailLoading) detailLoading.classList.remove('hidden');
    try {
        const { data: member, error } = await db.from('members').select('*').eq('id', idToShow).single();
        if (detailLoading) detailLoading.classList.add('hidden');
        if (error && error.code !== 'PGRST116') throw error;
        if (!member) { alert(`Anggota ${idToShow} tidak ditemukan.`); showListView(); return; }

        if (member.avatar_url && detailAvatarImg && detailAvatarPlaceholder) { detailAvatarImg.src = member.avatar_url; detailAvatarImg.classList.remove('hidden'); detailAvatarPlaceholder.classList.add('hidden'); }
        else if (detailAvatarImg && detailAvatarPlaceholder) { detailAvatarImg.classList.add('hidden'); detailAvatarPlaceholder.classList.remove('hidden'); detailAvatarImg.src = ''; }
        const nameEl = getElement('detail-name'); if (nameEl) nameEl.textContent = member.name || 'N/A';
        const userEl = getElement('detail-username'); if (userEl) userEl.textContent = `@${member.username || 'N/A'}`;
        const posEl = getElement('detail-position'); if (posEl) posEl.textContent = member.position || 'N/A';
        const bioEl = getElement('detail-bio'); if (bioEl) bioEl.textContent = member.bio || 'Bio tidak tersedia.';
        const locEl = getElement('detail-location'); if (locEl) locEl.textContent = member.location || 'Lokasi tidak diketahui';
        const joinedEl = getElement('detail-joined'); if (joinedEl) joinedEl.textContent = member.joined ? new Date(member.joined).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
        const editBtn = getElement('edit-member-button'); if (editBtn) editBtn.dataset.memberId = member.id;
        const delBtn = getElement('delete-member-detail-button'); if (delBtn) { delBtn.dataset.memberId = member.id; delBtn.dataset.memberName = member.name || 'Anggota Ini'; }

    } catch (err) { if (detailLoading) detailLoading.classList.add('hidden'); console.error('showDetailView error:', err); alert(`Gagal memuat detail: ${err.message}`); showListView(); }
}

function showListView() { if (detailView) detailView.classList.add('hidden'); if (listView) listView.classList.remove('hidden'); currentOpenDetailId = null; renderCards(); }

// ====== Handler Aksi CRUD (Menggunakan currentUser.id) ======
async function handleAddMember(event) {
    console.log('handleAddMember called');
    if (!db || !addMemberForm) return; event.preventDefault();
    // PERUBAHAN: Dapatkan currentUser dari sesi jika belum ada
    if (!currentUser) {
        const { data: { session } } = await db.auth.getSession();
        currentUser = session?.user ?? null; // Gunakan optional chaining
    }
    if (!currentUser) { alert('Sesi tidak valid. Silakan login kembali.'); window.location.href = '../log/login.html'; return; }

    const formData = new FormData(addMemberForm); const avatarFile = addAvatarInput ? addAvatarInput.files[0] : null;
    if (submitAddButton) { submitAddButton.disabled = true; submitAddButton.textContent = 'Menyimpan...'; }
    let avatarUrl = null;
    try {
        if (avatarFile) { avatarUrl = await uploadAvatar(avatarFile, currentUser.id); } // Kirim user ID
        const newMemberData = {
             user_id: currentUser.id, // <-- PENTING: Sertakan user_id
             name: formData.get('name'), username: formData.get('username'), position: formData.get('position'),
             bio: formData.get('bio'), location: formData.get('location'), joined: new Date().toISOString(), avatar_url: avatarUrl
        };
        console.log('Inserting member:', newMemberData);
        const { data, error } = await db.from('members').insert(newMemberData).select().single(); // Pakai array jika insert > 1
        if (error) { console.error('Insert error details:', JSON.stringify(error, null, 2)); throw error; }
        console.log('Insert success:', data);
        if (addModal) addModal.classList.add('hidden'); addMemberForm.reset(); if (addAvatarPreview) { addAvatarPreview.src = ''; addAvatarPreview.classList.add('hidden'); }
        // renderCards() dipanggil oleh real-time
    } catch (err) {
        console.error('handleAddMember error:', err);
        let msg = `Gagal menambah: ${err.message}`; if (err.message?.toLowerCase().includes('rls')) msg = 'Gagal menambah: Periksa RLS Policy.'; else if (err.message?.toLowerCase().includes('storage')) msg = `Gagal upload foto: ${err.message}`;
        alert(msg); if (avatarUrl) await deleteAvatar(avatarUrl).catch(e => console.warn("Rollback avatar failed:", e));
    } finally { if (submitAddButton) { submitAddButton.disabled = false; submitAddButton.textContent = 'Simpan Anggota'; } if (addAvatarInput) addAvatarInput.value = ''; }
}

async function handleOpenEditModal(eventOrMemberId) {
    if (!db || !editMemberForm) return; const memberId = typeof eventOrMemberId === 'object' ? eventOrMemberId.currentTarget.dataset.memberId : eventOrMemberId; const idToEdit = parseInt(memberId, 10); if (isNaN(idToEdit)) return;
    console.log(`Opening edit modal for ID: ${idToEdit}`); if (editModal) editModal.classList.remove('hidden'); const formElements = editMemberForm.elements; for (let el of formElements) el.disabled = true;
    editMemberForm.reset(); if(editAvatarPreview) { editAvatarPreview.src = ''; editAvatarPreview.classList.add('hidden'); }
    try {
        const { data: member, error } = await db.from('members').select('*').eq('id', idToEdit).single(); if (error) throw error;
        if (!member) { alert('Data tidak ditemukan.'); if(editModal) editModal.classList.add('hidden'); return; }
        // Populate form
        const idInput=getElement('edit-member-id'); if(idInput) idInput.value = member.id; const nameInput=getElement('edit-name'); if(nameInput) nameInput.value = member.name || ''; const userInput=getElement('edit-username'); if(userInput) userInput.value = member.username || ''; const posInput=getElement('edit-position'); if(posInput) posInput.value = member.position || ''; const bioInput=getElement('edit-bio'); if(bioInput) bioInput.value = member.bio || ''; const locInput=getElement('edit-location'); if(locInput) locInput.value = member.location || '';
        if (member.avatar_url && editAvatarPreview) { editAvatarPreview.src = member.avatar_url; editAvatarPreview.classList.remove('hidden'); }
        editMemberForm.dataset.currentAvatarUrl = member.avatar_url || '';
        for (let el of formElements) el.disabled = false;
    } catch (err) { console.error("Error opening edit:", err); alert(`Gagal membuka edit: ${err.message}`); if(editModal) editModal.classList.add('hidden'); }
}

async function handleSaveEdit(event) {
    console.log('handleSaveEdit called'); if (!db || !editMemberForm) return; event.preventDefault();
    // PERUBAHAN: Dapatkan currentUser jika belum ada
    if (!currentUser) {
        const { data: { session } } = await db.auth.getSession();
        currentUser = session?.user ?? null;
    }
    if (!currentUser) { alert('Sesi berakhir. Login lagi.'); window.location.href = '../log/login.html'; return; }

    const formData = new FormData(editMemberForm); const memberId = formData.get('id'); const idToUpdate = parseInt(memberId, 10); if (isNaN(idToUpdate)) return;
    const newAvatarFile = editAvatarInput ? editAvatarInput.files[0] : null; const currentAvatarUrl = editMemberForm.dataset.currentAvatarUrl || null;
    if (submitEditButton) { submitEditButton.disabled = true; submitEditButton.textContent = 'Menyimpan...'; }
    let newAvatarUrl = currentAvatarUrl; let uploadedNewFile = false;
    try {
        if (newAvatarFile) { newAvatarUrl = await uploadAvatar(newAvatarFile, currentUser.id); uploadedNewFile = true; } // Kirim user ID
        const updatedData = {
            // JANGAN sertakan user_id saat update, RLS akan cek user_id yang sudah ada di baris data
            name: formData.get('name'), username: formData.get('username'), position: formData.get('position'),
            bio: formData.get('bio'), location: formData.get('location'), avatar_url: newAvatarUrl
        };
        console.log(`Updating ID ${idToUpdate} with:`, updatedData);
        // RLS UPDATE harusnya memeriksa `auth.uid() = user_id` di USING clause
        const { data, error } = await db.from('members').update(updatedData).eq('id', idToUpdate).select().single();
        if (error) { console.error('Update error details:', JSON.stringify(error, null, 2)); throw error; }
        console.log('Update success:', data);
        if (uploadedNewFile && currentAvatarUrl && currentAvatarUrl !== newAvatarUrl) { deleteAvatar(currentAvatarUrl).catch(e => console.warn("Non-critical delete old avatar error:", e)); }
        if (editModal) editModal.classList.add('hidden');
        // renderCards(); // Let realtime handle
    } catch (err) {
        console.error('handleSaveEdit error:', err);
        let msg = `Gagal menyimpan: ${err.message}`; if (err.message?.toLowerCase().includes('rls')) msg = 'Gagal menyimpan: Periksa RLS Policy.'; else if (err.message?.toLowerCase().includes('storage')) msg = `Gagal upload foto: ${err.message}`;
        alert(msg); if (uploadedNewFile && newAvatarUrl && newAvatarUrl !== currentAvatarUrl) { deleteAvatar(newAvatarUrl).catch(e => console.warn("Rollback avatar failed:", e)); }
    } finally { if (submitEditButton) { submitEditButton.disabled = false; submitEditButton.textContent = 'Simpan Perubahan'; } if (editAvatarInput) editAvatarInput.value = ''; if (editAvatarPreview) { editAvatarPreview.src = ''; editAvatarPreview.classList.add('hidden'); } if (editMemberForm) editMemberForm.dataset.currentAvatarUrl = ''; }
}

function handleOpenDeleteModal(memberId, memberName) {
    const idToDelete = parseInt(memberId, 10); if (isNaN(idToDelete) || !deleteConfirmModal) return;
    console.log(`Opening delete confirm for ID: ${idToDelete}`); currentMemberIdToDelete = idToDelete; if(deleteMemberIdInput) deleteMemberIdInput.value = idToDelete;
    const confirmMessage = deleteConfirmModal.querySelector('p'); if(confirmMessage) confirmMessage.textContent = `Hapus profil ${memberName || 'ini'}?`;
    deleteConfirmModal.classList.remove('hidden');
}

async function handleDeleteMember() {
    console.log('handleDeleteMember called'); if (!db || currentMemberIdToDelete === null || !deleteConfirmModal) { if(deleteConfirmModal) deleteConfirmModal.classList.add('hidden'); return; }
    // PERUBAHAN: Dapatkan currentUser jika belum ada
    if (!currentUser) {
        const { data: { session } } = await db.auth.getSession();
        currentUser = session?.user ?? null;
    }
    if (!currentUser) { alert('Sesi berakhir. Login lagi.'); window.location.href = '../log/login.html'; return; }

    const memberIdToDelete = currentMemberIdToDelete; console.log(`Deleting ID: ${memberIdToDelete}`);
    if(confirmDeleteButton) { confirmDeleteButton.disabled = true; confirmDeleteButton.textContent = 'Menghapus...'; } if(cancelDeleteButton) cancelDeleteButton.disabled = true;
    let avatarUrlToDelete = null;
    try {
        // Cek avatar URL sebelum hapus
        const { data: memberData, error: fetchError } = await db.from('members').select('avatar_url, user_id').eq('id', memberIdToDelete).single();
        if (fetchError && fetchError.code !== 'PGRST116') console.warn("Fetch before delete err:", fetchError);
        else if (memberData) {
            avatarUrlToDelete = memberData.avatar_url;
            // Optional: Client-side check (RLS adalah yang utama)
            // if (memberData.user_id !== currentUser.id) { throw new Error("Anda tidak punya izin."); }
        }

        // Hapus baris data (RLS DELETE harusnya cek `auth.uid() = user_id` di USING clause)
        const { error: deleteDbError } = await db.from('members').delete().eq('id', memberIdToDelete);
        if (deleteDbError) { console.error('Delete error details:', JSON.stringify(deleteDbError, null, 2)); throw deleteDbError; }

        console.log(`DB record ${memberIdToDelete} deleted.`); if (avatarUrlToDelete) { deleteAvatar(avatarUrlToDelete).catch(e => console.warn("Non-critical delete avatar error:", e)); }

        // Update UI manual
        const cardToRemove = profileGrid ? profileGrid.querySelector(`.member-card[data-id="${memberIdToDelete}"]`) : null;
        if (cardToRemove) { cardToRemove.remove(); console.log(`Card ${memberIdToDelete} removed.`); if (profileGrid && !profileGrid.querySelector('.member-card') && noMembersMessage) { noMembersMessage.classList.remove('hidden'); noMembersMessage.textContent = 'Belum ada anggota.'; } }
        else { console.warn(`Card ${memberIdToDelete} not found.`); renderCards(); } // Fallback
        if (currentOpenDetailId === memberIdToDelete) { showListView(); }
    } catch (err) {
        console.error('handleDeleteMember error:', err);
        let msg = `Gagal menghapus: ${err.message}`; if (err.message?.toLowerCase().includes('rls')) msg = 'Gagal menghapus: Periksa RLS Policy.';
        alert(msg);
    } finally { currentMemberIdToDelete = null; if(deleteMemberIdInput) deleteMemberIdInput.value = ''; if(confirmDeleteButton) { confirmDeleteButton.disabled = false; confirmDeleteButton.textContent = 'Ya, Hapus'; } if(cancelDeleteButton) cancelDeleteButton.disabled = false; if(deleteConfirmModal) deleteConfirmModal.classList.add('hidden'); }
}


// Real-time setup
function setupRealtime() {
    if (!db) return;
    console.log('Setting up realtime...');
    try {
        // Dengarkan perubahan pada tabel members
        const channel = db.channel('public:members')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, payload => {
            console.log('Realtime change received:', payload);
            renderCards(); // Render ulang daftar kartu saat ada perubahan
            const changedId = parseInt(payload.eventType === 'DELETE' ? payload.old.id : payload.new.id, 10);
            if (currentOpenDetailId === changedId) { // Jika detail sedang terbuka
              if (payload.eventType === 'UPDATE') showDetailView(currentOpenDetailId); // Refresh detail
              if (payload.eventType === 'DELETE') { alert('Data ini baru saja dihapus.'); showListView(); } // Kembali ke daftar
            }
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') { console.log('Realtime subscribed'); renderCards(); } // Muat data awal
            else { console.error('Realtime subscribe status:', status, err); if (profileGrid && !profileGrid.querySelector('.member-card')) renderCards(); } // Coba muat awal jika gagal
          });
    } catch (err) { console.error('setupRealtime err:', err); renderCards(); } // Coba muat awal
}

// Logout
async function handleLogout() { if (!db || !logoutButton) return; try { logoutButton.disabled = true; const { error } = await db.auth.signOut(); if (error) throw error; window.location.href = '../log/login.html'; } catch (err) { console.error('Logout err:', err); alert(`Gagal logout: ${err.message}`); logoutButton.disabled = false; } }

// Auth & init: Cek sesi awal, lalu pasang listener
async function checkAuthStateAndInit() {
    if (!db) { if (authLoading) authLoading.textContent = 'Koneksi gagal.'; return; }

    let initialCheckDone = false;

    // Pasang listener onAuthStateChanged DULU
    if (db.auth && typeof db.auth.onAuthStateChanged === 'function') {
        if (authListener && typeof authListener.unsubscribe === 'function') { authListener.unsubscribe(); }

        const { data } = db.auth.onAuthStateChanged((event, session) => {
            console.log('Auth state changed event:', event); // Kurangi detail log session
            const userBefore = currentUser; // Simpan state sebelumnya
            currentUser = session ? session.user : null;
            const isLoggedIn = !!currentUser;
            const isOnLoginPage = window.location.pathname.includes('../log/login.html');

            if (!isLoggedIn && !isOnLoginPage) {
                console.log('Redirecting to login (listener)'); window.location.href = '../log/login.html';
            } else if (isLoggedIn) {
                if (userEmailSpan) userEmailSpan.textContent = currentUser.email || 'User';
                // Jika event = SIGNED_IN atau INITIAL_SESSION, dan UI belum tampil
                 if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && initialCheckDone && userInfoSection && userInfoSection.classList.contains('hidden')) {
                     console.log('User confirmed logged in, showing UI (listener)');
                    if (authLoading) authLoading.classList.add('hidden');
                    userInfoSection.classList.remove('hidden');
                    if (listView) listView.classList.remove('hidden');
                    if (logoutButton && !logoutButton.dataset.listenerAttached) {
                         logoutButton.addEventListener('click', handleLogout);
                         logoutButton.dataset.listenerAttached = 'true';
                    }
                    setupRealtime(); // Setup realtime setelah UI ditampilkan
                 } else if (event === 'USER_UPDATED') {
                     // Handle jika info user (misal email) berubah
                     console.log("User data updated:", currentUser);
                 }
            }
        });
        authListener = data.subscription;
        console.log("Auth state change listener attached.");
    } else {
        console.warn('auth.onAuthStateChanged not available');
    }

   // Lakukan cek sesi awal SETELAH listener terpasang
   try {
       console.log("Performing initial session check...");
       const { data: { session }, error: sessionError } = await db.auth.getSession();
       initialCheckDone = true; // Tandai cek awal selesai
       if (sessionError) { console.error("Initial getSession error:", sessionError); if(authLoading) authLoading.textContent = 'Gagal periksa sesi.'; return; }

       currentUser = session ? session.user : null; // Set currentUser dari hasil getSession

       if (currentUser) {
            console.log('Initial session user found:', currentUser);
            // Tampilkan UI berdasarkan sesi awal
            if (authLoading) authLoading.classList.add('hidden');
            if (userEmailSpan) userEmailSpan.textContent = currentUser.email || 'User';
            if (userInfoSection) userInfoSection.classList.remove('hidden');
            if (listView) listView.classList.remove('hidden');
            if (logoutButton && !logoutButton.dataset.listenerAttached) { // Attach listener jika belum
                logoutButton.addEventListener('click', handleLogout);
                logoutButton.dataset.listenerAttached = 'true';
            }
            setupRealtime(); // Setup realtime segera
       } else {
            // Jika tidak ada sesi DAN tidak di halaman login, redirect
            if (!window.location.pathname.includes('../log/login.html')) {
                 console.log('Initial check: No session, redirecting to login.');
                 if(authLoading) authLoading.textContent = 'Mengarahkan ke login...';
                 window.location.href = '../log/login.html';
            } else {
                 // Di halaman login tanpa sesi, sembunyikan loading
                 if(authLoading) authLoading.classList.add('hidden');
            }
       }
   } catch (err) {
        console.error('checkAuth getSession critical err:', err);
        if(authLoading) authLoading.textContent = 'Error memeriksa sesi.';
   }
}


// DOM listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready');
    // Pastikan elemen ada sebelum menambah listener
    if (addAvatarInput) addAvatarInput.addEventListener('change', () => displayImagePreview(addAvatarInput, addAvatarPreview));
    if (editAvatarInput) editAvatarInput.addEventListener('change', () => displayImagePreview(editAvatarInput, editAvatarPreview));

    if (profileGrid) profileGrid.addEventListener('click', (e) => {
        const viewButton = e.target.closest('.view-detail-button');
        const deleteButton = e.target.closest('.delete-button');
        if (viewButton) { const id = viewButton.dataset.memberId; if (id) showDetailView(id); }
        else if (deleteButton) { const id = deleteButton.dataset.memberId; const name = deleteButton.dataset.memberName; if (id) handleOpenDeleteModal(id, name); }
    });

    if (backToListButton) backToListButton.addEventListener('click', showListView);
    if (addMemberButton) addMemberButton.addEventListener('click', () => {
        if (addMemberForm) addMemberForm.reset();
        if (addAvatarPreview) { addAvatarPreview.src=''; addAvatarPreview.classList.add('hidden'); }
        if (addModal) addModal.classList.remove('hidden');
    });
    if (cancelAddButton) cancelAddButton.addEventListener('click', () => { if (addModal) addModal.classList.add('hidden'); });
    if (addMemberForm) addMemberForm.addEventListener('submit', handleAddMember);
    if (cancelEditButton) cancelEditButton.addEventListener('click', () => { if (editModal) editModal.classList.add('hidden'); });
    if (editMemberForm) editMemberForm.addEventListener('submit', handleSaveEdit);
    if (cancelDeleteButton) cancelDeleteButton.addEventListener('click', () => { if (deleteConfirmModal) deleteConfirmModal.classList.add('hidden'); currentMemberIdToDelete = null; if (deleteMemberIdInput) deleteMemberIdInput.value = ''; });
    if (confirmDeleteButton) confirmDeleteButton.addEventListener('click', handleDeleteMember);

    if (detailView) detailView.addEventListener('click', (e) => {
        const editButton = e.target.closest('#edit-member-button');
        const deleteButton = e.target.closest('#delete-member-detail-button');
        if (editButton) { const id = editButton.dataset.memberId; if (id) handleOpenEditModal(id); }
        else if (deleteButton) { const id = deleteButton.dataset.memberId; const name = deleteButton.dataset.memberName; if (id) handleOpenDeleteModal(id, name); }
    });

    // Panggil checkAuthStateAndInit setelah semua listener terpasang
    checkAuthStateAndInit();
});



