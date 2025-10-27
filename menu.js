// mobile-menu.js
class MobileMenu {
    constructor() {
        this.burgerToggle = document.getElementById('burger-toggle');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.navLinks = this.mobileMenu ? this.mobileMenu.querySelectorAll('a[href]') : [];
        
        this.init();
    }

    init() {
        // Event listener untuk burger toggle
        this.burgerToggle?.addEventListener('click', () => this.toggleMenu());
        
        // Event listener untuk semua link di mobile menu
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => this.closeMenu());
        });

        // Close menu ketika klik di luar (optional)
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
        
        // Close menu ketika resize window ke desktop size
        window.addEventListener('resize', () => this.handleResize());
    }

    toggleMenu() {
        this.mobileMenu.classList.toggle('hidden');
        
        // Update aria-expanded untuk accessibility
        const isExpanded = !this.mobileMenu.classList.contains('hidden');
        this.burgerToggle.setAttribute('aria-expanded', isExpanded);
    }

    closeMenu() {
        this.mobileMenu.classList.add('hidden');
        this.burgerToggle.setAttribute('aria-expanded', 'false');
    }

    openMenu() {
        this.mobileMenu.classList.remove('hidden');
        this.burgerToggle.setAttribute('aria-expanded', 'true');
    }

    handleOutsideClick(e) {
        // Close menu jika klik di luar mobile menu dan burger toggle
        if (this.mobileMenu && !this.mobileMenu.classList.contains('hidden')) {
            const isClickInsideMenu = this.mobileMenu.contains(e.target);
            const isClickOnBurger = this.burgerToggle.contains(e.target);
            
            if (!isClickInsideMenu && !isClickOnBurger) {
                this.closeMenu();
            }
        }
    }

    handleResize() {
        // Auto close menu ketika window di-resize ke desktop size
        if (window.innerWidth >= 768) { // md breakpoint
            this.closeMenu();
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new MobileMenu();
});