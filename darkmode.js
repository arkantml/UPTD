//const themeToggle = document.querySelectorAll("themeToggle");
//function updateThemeIcon() {
//    themeToggle.textContent = document.documentElement.classList.contains("dark") ? "🌙" : "☀️";
//}
//updateThemeIcon();
//themeToggle.addEventListener("click", () => {
//    document.documentElement.classList.toggle("dark");
//    if (document.documentElement.classList.contains("dark")) {
//        localStorage.setItem("theme", "dark");
//    } else {
//        localStorage.setItem("theme", "light");
//    }
//    updateThemeIcon();
//});

// Menggunakan querySelectorAll dan menambahkan titik (.) untuk memilih berdasarkan CLASS
const themeToggles = document.querySelectorAll(".themeToggle");

// Fungsi untuk memperbarui ikon pada SEMUA tombol toggle
function updateThemeIcon() {
    themeToggles.textContent = document.documentElement.classList.contains("dark") ? "🌙" : "☀️";
    const isDark = document.body.classList.contains("dark");
    const icon = isDark ? "🌙" : "☀️";
    
    // Ulangi SEMUA tombol dan perbarui textContent masing-masing
    themeToggles.forEach(button => {
        button.textContent = icon;
    });
}

// Panggil sekali saat dimuat untuk mengatur ikon awal
updateThemeIcon();

// Tambahkan event listener ke setiap tombol toggle
themeToggles.forEach(button => {
    button.addEventListener("click", () => {
        // Logika untuk mengubah tema pada <body>
        document.body.classList.toggle("dark");

        // Logika untuk menyimpan tema di Local Storage
        if (document.body.classList.contains("dark")) {
            localStorage.setItem("theme", "dark");
        } else {
            localStorage.setItem("theme", "light");
        }
        
        // Panggil fungsi untuk memperbarui ikon pada SEMUA tombol
        updateThemeIcon();
    });
});