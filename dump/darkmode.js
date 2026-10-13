const themeToggles = document.querySelectorAll(".themeToggle");

function updateThemeIcon() {
    const isDark = document.body.classList.contains("dark");
    const icon = isDark ? "🌙" : "☀️";

    themeToggles.forEach((button) => {
        button.textContent = icon;
    });
}

function applyStoredTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    } else {
        document.body.classList.remove("dark");
    }
    updateThemeIcon();
}

applyStoredTheme();

themeToggles.forEach((button) => {
    button.addEventListener("click", () => {
        document.body.classList.toggle("dark");

        if (document.body.classList.contains("dark")) {
            localStorage.setItem("theme", "dark");
        } else {
            localStorage.setItem("theme", "light");
        }

        updateThemeIcon();
    });
});
