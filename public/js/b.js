
const password = document.getElementById("password");
const toggleBtn = document.getElementById("togglePassword");

if (password && toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        if (password.type === "password") {
            password.type = "text";
            toggleBtn.textContent = "Hide";
        } else {
            password.type = "password";
            toggleBtn.textContent = "Show";
        }
    });
}