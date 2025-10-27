// Script untuk Halaman Daftar Artikel (artikel.html)

// Import Supabase client
const { createClient } = supabase;

// Inisialisasi Supabase Client
// === PASTIKAN URL DAN ANON KEY SUDAH BENAR ===
const SUPABASE_URL = 'https://lslbbbcswmkdrlhkfhta.supabase.co'; // <- Sesuaikan jika beda
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbGJiYmNzd21rZHJsaGtmaHRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMDkxOTYsImV4cCI6MjA3NjY4NTE5Nn0.z6jAxH7fP0ZSZmHEdA_szXUQ0iCaHcZOlJZpYhX7res'; // <- Sesuaikan jika beda
const ARTICLE_BUCKET = 'articles_images'; // Tentukan nama bucket untuk gambar artikel
// ===============================================

let db;
let currentUser = null; // Menyimpan info user login
let authListener = null;

try {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client initialized for articles.");
} catch (error) {
    console.error("Gagal inisialisasi Supabase:", error);
    const articlesLoading = document.getElementById('articles-loading');
    const noArticlesMessage = document.getElementById('no-articles-message');
    if(articlesLoading) articlesLoading.classList.add('hidden');
    if(noArticlesMessage) {
        noArticlesMessage.textContent = "Koneksi database gagal.";
        noArticlesMessage.classList.remove('hidden');
    }
    // Hentikan script jika init gagal
    throw new Error("Supabase initialization failed.");
}

// === Referensi Elemen DOM ===
const getElement = (id) => document.getElementById(id);
const articlesGrid = getElement('articles-grid');
const articlesLoading = getElement('articles-loading');
const noArticlesMessage = getElement('no-articles-message');
const addArticleButton = getElement('add-article-button');

// Elemen Modal Artikel
const articleModal = getElement('article-modal');
const articleModalTitle = getElement('article-modal-title');
const articleForm = getElement('article-form');
const articleIdInput = getElement('article-id');
const articleTitleInput = getElement('article-title');
const articleContentInput = getElement('article-content');
const articleImageInput = getElement('article-image');
const articleImagePreview = getElement('article-image-preview');
const currentImageUrlInput = getElement('current-image-url');
const articleAuthorInput = getElement('article-author');
const articleFormMessage = getElement('article-form-message');
const cancelArticleButton = getElement('cancel-article-button');
const submitArticleButton = getElement('submit-article-button');


// --- SVG Placeholder Gambar ---
const placeholderImageSvg = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 text-gray-400 dark:text-gray-500">
 <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm16.5-1.5H3.75" />
</svg>`;

// === Fungsi Helper Upload Gambar Artikel ===
async function uploadArticleImage(file, ownerId) {
    if (!file || !db || !ownerId) return null;
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}.${fileExt}`;
    // Simpan di folder user ID di bucket artikel
    const filePath = `${ownerId}/${fileName}`;
    console.log(`Uploading article image to: ${filePath}`);

    const { data, error } = await db.storage.from(ARTICLE_BUCKET).upload(filePath, file, { upsert: true });
    if (error) { console.error('Upload error:', error); throw error; }

    const { data: urlData } = db.storage.from(ARTICLE_BUCKET).getPublicUrl(filePath);
    if (!urlData?.publicUrl) { console.error("Failed get public URL", data); throw new Error("Gagal URL publik."); }
    console.log('Upload success, Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
}

// === Fungsi Helper Hapus Gambar Artikel ===
async function deleteArticleImage(imageUrl) {
    if (!imageUrl || !db) return;
    try {
        const url = new URL(imageUrl);
        const filePathEncoded = url.pathname.split(`/${ARTICLE_BUCKET}/`)[1];
        if (!filePathEncoded) { console.warn("No path in URL:", imageUrl); return; }
        const filePath = decodeURIComponent(filePathEncoded);
        console.log(`Deleting article image path: ${filePath}`);
        const { data, error } = await db.storage.from(ARTICLE_BUCKET).remove([filePath]);
        if (error) console.error('Delete image error:', error);
        else console.log('Image deleted:', data);
    } catch (err) { console.error("Err in deleteArticleImage:", err); }
}

// === Fungsi Helper Preview Gambar ===
function displayImagePreview(fileInput, previewElement) {
    const file = fileInput?.files?.[0];
    if (file && previewElement) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewElement.src = e.target.result;
            previewElement.classList.add('has-image'); // Use class to show
        }
        reader.onerror = () => { console.error("Error reading file"); if (previewElement) { previewElement.src=''; previewElement.classList.remove('has-image');} };
        reader.readAsDataURL(file);
    } else if (previewElement) {
        previewElement.src = '';
        previewElement.classList.remove('has-image'); // Use class to hide
    }
}


// === Fungsi untuk memuat dan menampilkan artikel dari Supabase ===
async function loadArticles() {
    if (!db || !articlesGrid) return; // Pastikan db dan grid ada

    console.log("Memuat artikel dari Supabase...");
    if(articlesLoading) articlesLoading.classList.remove('hidden');
    articlesGrid.innerHTML = ''; // Kosongkan grid
    if(noArticlesMessage) noArticlesMessage.classList.add('hidden');

    try {
        // Ambil data dari tabel 'articles'
        const { data: articles, error } = await db
            .from('articles') // Sesuaikan nama tabel
            .select('*')      // Ambil semua kolom
            .order('created_at', { ascending: false }); // Urutkan berdasarkan terbaru

        if(articlesLoading) articlesLoading.classList.add('hidden');
        if (error) {
            console.error("Error fetching articles:", error);
            throw error; // Lempar error untuk ditangkap catch block
        }

        if (articles && articles.length > 0) {
            console.log("Articles fetched:", articles.length);
            articles.forEach(article => {
                const card = document.createElement('div');
                // PERHATIAN: Tambahkan data-id ke elemen kartu
                card.dataset.id = article.id;
                card.className = 'article-card bg-white rounded-lg shadow-md overflow-hidden flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-200'; // Tambah cursor-pointer

                // Format Tanggal
                const articleDate = article.created_at ? new Date(article.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tanggal tidak diketahui';

                // Ambil ringkasan (excerpt) atau potong dari konten jika perlu
                let excerpt = article.excerpt || (article.content ? article.content.substring(0, 100) + '...' : 'Tidak ada ringkasan.');

                card.innerHTML = `
                    <div class="w-full h-48 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-500 overflow-hidden">
                         ${article.image_url
                            ? `<img src="${article.image_url}" alt="Gambar ${article.title || 'artikel'}" class="w-full h-full object-cover">`
                            : placeholderImageSvg
                         }
                    </div>
                     <div class="p-6 flex-grow flex flex-col justify-between">
                         <div>
                            <h2 class="text-xl font-bold text-gray-800 mb-2 truncate" title="${article.title || ''}">${article.title || 'Tanpa Judul'}</h2>
                            <p class="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">${excerpt}</p>
                         </div>
                         <div class="mt-4 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                             <span>${article.author_name || 'N/A'} | ${articleDate}</span>
                             
                             <span class="text-red-600 dark:text-red-400 hover:underline font-semibold read-more-link">Baca Selengkapnya &rarr;</span>
                         </div>
                    </div>
                `;
                articlesGrid.appendChild(card);
            });
        } else {
            // Jika tidak ada artikel
            console.log("No articles found.");
            if(noArticlesMessage) noArticlesMessage.classList.remove('hidden');
        }

    } catch (err) {
        if(articlesLoading) articlesLoading.classList.add('hidden');
        console.error("Gagal memuat artikel:", err);
        if(noArticlesMessage) {
            noArticlesMessage.textContent = `Gagal memuat artikel: ${err.message}`;
            noArticlesMessage.classList.remove('hidden');
        }
    }
}

// === Fungsi untuk Menangani Submit Form Artikel (Tambah/Edit) ===
async function handleArticleFormSubmit(event) {
    event.preventDefault();
    if (!db || !currentUser || !articleForm) return;

    console.log("Handling article form submit...");
    if (submitArticleButton) { submitArticleButton.disabled = true; submitArticleButton.textContent = 'Menyimpan...'; }
    if (articleFormMessage) { articleFormMessage.textContent = ''; articleFormMessage.classList.add('hidden'); }

    const formData = new FormData(articleForm);
    const articleId = formData.get('id'); // ID ada jika sedang edit
    const imageFile = articleImageInput ? articleImageInput.files[0] : null;
    const currentImageUrl = currentImageUrlInput ? currentImageUrlInput.value : null;

    let imageUrl = currentImageUrl; // Default pakai URL lama (jika edit)
    let uploadedNewFile = false;

    try {
        // 1. Upload gambar baru jika ada
        if (imageFile) {
            console.log("Uploading new article image...");
            imageUrl = await uploadArticleImage(imageFile, currentUser.id); // Kirim user ID
            uploadedNewFile = true;
        }

        // 2. Siapkan data artikel
        const articleData = {
            title: formData.get('title'),
            content: formData.get('content'),
            image_url: imageUrl, // URL baru atau lama/null
            author_name: articleAuthorInput ? articleAuthorInput.value : currentUser.email, // Ambil dari input (readonly)
            // user_id akan ditambahkan/diperiksa oleh RLS
        };

        let resultData, resultError;

        if (articleId) {
            // ----- PROSES EDIT -----
            console.log(`Updating article ID: ${articleId}`);
            // RLS UPDATE harus cek auth.uid() = user_id
            const { data, error } = await db.from('articles').update(articleData).eq('id', articleId).select().single();
            resultData = data; resultError = error;
            // Hapus gambar lama JIKA upload baru berhasil DAN URL lama ada DAN URL beda
            if (!error && uploadedNewFile && currentImageUrl && currentImageUrl !== imageUrl) {
                 deleteArticleImage(currentImageUrl).catch(e => console.warn("Non-critical delete old image error:", e));
            }
        } else {
            // ----- PROSES TAMBAH -----
            // Sertakan user_id saat insert
            articleData.user_id = currentUser.id;
            console.log("Inserting new article:", articleData);
            // RLS INSERT harus cek auth.uid() = user_id di WITH CHECK
            const { data, error } = await db.from('articles').insert(articleData).select().single();
            resultData = data; resultError = error;
        }

        // 3. Tangani hasil
        if (resultError) {
            console.error("Supabase article operation error:", JSON.stringify(resultError, null, 2));
            // Rollback upload jika insert/update gagal DAN kita upload file baru
            if (uploadedNewFile && imageUrl) {
                await deleteArticleImage(imageUrl).catch(e => console.warn("Rollback image delete failed:", e));
            }
            throw resultError; // Lempar error
        }

        console.log(`Article ${articleId ? 'updated' : 'added'} successfully:`, resultData);
        if (articleModal) articleModal.classList.add('hidden'); // Tutup modal
        loadArticles(); // Muat ulang daftar artikel

    } catch (err) {
        console.error("Error saving article:", err);
        let msg = `Gagal menyimpan artikel: ${err.message}`;
        if (err.message?.toLowerCase().includes('rls')) msg = 'Gagal menyimpan: Periksa RLS Policy.';
        else if (err.message?.toLowerCase().includes('storage')) msg = `Gagal upload gambar: ${err.message}`;
        if (articleFormMessage) { articleFormMessage.textContent = msg; articleFormMessage.classList.remove('hidden','text-green-600'); articleFormMessage.classList.add('text-red-600');}
    } finally {
        if (submitArticleButton) { submitArticleButton.disabled = false; submitArticleButton.textContent = 'Simpan Artikel'; }
        // Reset input file setelah submit (baik sukses maupun gagal)
        if (articleImageInput) articleImageInput.value = '';
        if (articleImagePreview) { articleImagePreview.src = ''; articleImagePreview.classList.remove('has-image');}
    }
}

// === Fungsi untuk membuka modal tambah/edit ===
function openArticleModal(article = null) {
    if (!articleModal || !articleForm) return;

    articleForm.reset(); // Reset form
    if(articleImagePreview) { articleImagePreview.src = ''; articleImagePreview.classList.remove('has-image'); } // Reset preview
    if(articleFormMessage) { articleFormMessage.textContent = ''; articleFormMessage.classList.add('hidden'); }
    if(articleImageInput) articleImageInput.value = ''; // Reset input file

    if (article) {
        // Mode Edit
        if(articleModalTitle) articleModalTitle.textContent = "Edit Artikel";
        if(articleIdInput) articleIdInput.value = article.id;
        if(articleTitleInput) articleTitleInput.value = article.title || '';
        if(articleContentInput) articleContentInput.value = article.content || '';
        if(articleAuthorInput) articleAuthorInput.value = article.author_name || '';
        if(currentImageUrlInput) currentImageUrlInput.value = article.image_url || '';
        if (article.image_url && articleImagePreview) {
            articleImagePreview.src = article.image_url;
            articleImagePreview.classList.add('has-image'); // Tampilkan preview
        }
    } else {
        // Mode Tambah
        if(articleModalTitle) articleModalTitle.textContent = "Tambah Artikel Baru";
        if(articleIdInput) articleIdInput.value = ''; // Kosongkan ID
        if(currentImageUrlInput) currentImageUrlInput.value = '';
        // Isi penulis otomatis jika user login
        if (currentUser && articleAuthorInput) {
            // Idealnya ambil nama profil, fallback ke email
            articleAuthorInput.value = currentUser.user_metadata?.full_name || currentUser.email || 'User Login';
        }
    }
    articleModal.classList.remove('hidden');
}

// === Pemeriksaan Auth ===
async function checkAuthStateAndLoad() {
    if (!db) return; // DB harus ada

     // Setup listener auth (sama seperti profil.js)
    if (db.auth && typeof db.auth.onAuthStateChanged === 'function') {
        if (authListener && typeof authListener.unsubscribe === 'function') { authListener.unsubscribe(); }
        const { data } = db.auth.onAuthStateChanged((event, session) => {
            console.log('Auth state changed:', event);
            currentUser = session ? session.user : null;
            // Update UI berdasarkan status login (misal tombol Tambah)
            if (addArticleButton) {
                addArticleButton.style.display = currentUser ? 'inline-block' : 'none';
            }
        });
        authListener = data.subscription;
        console.log("Auth listener attached.");
    }

    // Cek sesi awal
    try {
       const { data: { session }, error: sessionError } = await db.auth.getSession();
       if (sessionError) throw sessionError;
       currentUser = session ? session.user : null;
       console.log('Initial session user:', currentUser ? currentUser.email : 'None');
       if (addArticleButton) { // Update visibilitas tombol tambah
            addArticleButton.style.display = currentUser ? 'inline-block' : 'none';
       }
       loadArticles(); // Muat artikel setelah cek sesi
   } catch (err) {
        console.error('Initial session check error:', err);
        // Tetap muat artikel meskipun cek sesi gagal (jika RLS SELECT mengizinkan anon)
        loadArticles();
   }
}


// === Event Listeners ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("Artikel DOM loaded.");
    checkAuthStateAndLoad(); // Cek login & muat artikel

    // Listener Tombol Tambah
    if (addArticleButton) {
        addArticleButton.addEventListener('click', () => {
            if (!currentUser) {
                alert("Anda harus login untuk menambah artikel.");
                window.location.href = 'login.html'; // Arahkan ke login
                return;
            }
            openArticleModal(); // Buka modal dalam mode tambah
        });
    }

    // Listener Tombol Batal di Modal
    if (cancelArticleButton) {
        cancelArticleButton.addEventListener('click', () => {
            if(articleModal) articleModal.classList.add('hidden');
        });
    }

    // Listener Submit Form Modal
    if (articleForm) {
        articleForm.addEventListener('submit', handleArticleFormSubmit);
    }

    // Listener Preview Gambar
    if (articleImageInput) {
        articleImageInput.addEventListener('change', () => displayImagePreview(articleImageInput, articleImagePreview));
    }


     // Event delegation untuk klik kartu (navigasi ke detail)
     if (articlesGrid) {
         articlesGrid.addEventListener('click', (e) => {
             // Cari elemen kartu terdekat dari elemen yang diklik
             const card = e.target.closest('.article-card');
             if (card) {
                 const articleId = card.dataset.id;
                 // Cek apakah yang diklik BUKAN tombol edit/hapus di dalam kartu (jika ada nanti)
                 // Untuk sekarang, klik di mana saja di kartu akan navigasi
                 if (articleId && !e.target.closest('button')) { // Hindari klik tombol di kartu
                     console.log("Kartu artikel diklik, ID:", articleId);
                     // Arahkan ke halaman detail
                     window.location.href = `artikel-detail.html?id=${articleId}`;
                 }
             }
         });
     }
});

