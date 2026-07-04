// Employee Login Validation

const loginForm = document.querySelector('form[action="/employee-login"]');

if (loginForm) {

    // Create alert box dynamically
    const alertBox = document.createElement("div");
    alertBox.style.display = "none";
    alertBox.style.marginBottom = "15px";

    loginForm.parentNode.insertBefore(alertBox, loginForm);

    function showAlert(message, type = "danger") {
        alertBox.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        alertBox.style.display = "block";

        setTimeout(() => {
            alertBox.style.display = "none";
            alertBox.innerHTML = "";
        }, 4000);
    }

    loginForm.addEventListener("submit", function (e) {

        const email = document.querySelector('input[name="email"]').value.trim();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            e.preventDefault();
            showAlert("Please fill all required fields.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            e.preventDefault();
            showAlert("Please enter a valid email address.");
            return;
        }

        if (password.length < 8) {
            e.preventDefault();
            showAlert("Password must be at least 8 characters long.");
            return;
        }
    });

}