
    // Dapatkan elemen video
    const video = document.getElementById('video-background');

    // Tambahkan event listener untuk mendeteksi saat video selesai diputar
    video.addEventListener('ended', function() {
        // 1. Ubah kecepatan pemutaran menjadi negatif (misalnya, -1)
        // Nilai -1 akan memutar video dengan kecepatan normal, tetapi mundur.
        video.playbackRate = -1;
        
        // 2. Mulai putar video lagi dari posisi terakhir (yang kini menjadi posisi awal)
        video.play();
    });

    // Tambahkan event listener untuk mendeteksi saat video 'mundur' sudah selesai
    video.addEventListener('timeupdate', function() {
        // Cek jika video sedang mundur (playbackRate < 0) DAN waktu saat ini (currentTime) sangat dekat dengan 0
        if (video.playbackRate < 0 && video.currentTime <= 0.1) {
            // Hentikan video sebentar
            video.pause();
            
            // 1. Ubah kecepatan pemutaran kembali menjadi positif (maju normal)
            video.playbackRate = 1;
            
            // 2. Mulai putar video lagi dari awal (maju)
            video.play();
        }
    });

    // Opsional: Atur kecepatan putaran awal (jika Anda ingin video selalu mulai dari awal)
    video.onloadedmetadata = function() {
        video.playbackRate = 1;
    };
