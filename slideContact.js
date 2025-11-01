 document.addEventListener('DOMContentLoaded', function () {
            const sliderContainer = document.getElementById('slider-container');
            const slides = document.querySelectorAll('.carousel-slide');
            const prevButton = document.getElementById('prev-slide');
            const nextButton = document.getElementById('next-slide');
            const descriptionEl = document.getElementById('contact-description');
            const indicatorsContainer = document.getElementById('slider-indicators');
            
            const slideCount = slides.length;
            let currentIndex = 0;
            let autoSlideInterval; 

            const slideData = [
                {
                    description: "Hubungi kami langsung melalui WhatsApp untuk respon cepat. Klik kartu di atas untuk memulai percakapan."
                },
                {
                    description: "Kirimkan kami email untuk pertanyaan formal atau dokumen. Kami akan membalasnya dalam 1-2 hari kerja."
                },
                {
                    description: "Ikuti kami di Instagram untuk melihat update terbaru, portofolio, dan aktivitas harian kami."
                },
                {
                    description: "Kunjungi kantor kami. Klik kartu di atas untuk melihat lokasi kami di Google Maps dan mendapatkan arahan."
                }
            ];

            function resetAutoSlide() {
                clearInterval(autoSlideInterval); 
                autoSlideInterval = setInterval(() => { 
                    showSlide(currentIndex + 1);
                }, 3000); 
            }

            function showSlide(index) {
                if (index >= slideCount) {
                    currentIndex = 0;
                } else if (index < 0) {
                    currentIndex = slideCount - 1;
                } else {
                    currentIndex = index;
                }

                const offset = -currentIndex * 100; 
                sliderContainer.style.transform = `translateX(${offset}%)`;

                descriptionEl.style.opacity = 0; 
                setTimeout(() => {
                    descriptionEl.textContent = slideData[currentIndex].description;
                    descriptionEl.style.opacity = 1;
                }, 300); 

                Array.from(indicatorsContainer.children).forEach((dot, i) => {
                    dot.classList.toggle('bg-gray-800', i === currentIndex); 
                    dot.classList.toggle('bg-gray-400', i !== currentIndex); 
                });
            }

            nextButton.addEventListener('click', () => {
                showSlide(currentIndex + 1);
                resetAutoSlide();
            });

            prevButton.addEventListener('click', () => {
                showSlide(currentIndex - 1);
                resetAutoSlide();
            });

            for (let i = 0; i < slideCount; i++) {
                const dot = document.createElement('button');
                dot.classList.add('w-3', 'h-3', 'rounded-full', 'transition-colors', 'duration-300');
                dot.setAttribute('aria-label', `Pindah ke slide ${i + 1}`);
                dot.addEventListener('click', () => {
                    showSlide(i);
                    resetAutoSlide(); 
                });
                indicatorsContainer.appendChild(dot);
            }

            showSlide(0);
            resetAutoSlide(); 
        });