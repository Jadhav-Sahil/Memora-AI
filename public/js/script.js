// ===============================
// MOBILE MENU
// ===============================

function toggleMenu() {
    const menu = document.getElementById("mobileMenu");
    if (menu) {
        menu.classList.toggle("show");
    }
}

//hamburger Option
document.addEventListener("DOMContentLoaded", () => {
    const menuBtn = document.getElementById("menuBtn");
    const menu = document.getElementById("mobileMenu");

    if (menuBtn && menu) {
        menuBtn.addEventListener("click", () => {
            menu.classList.toggle("active");
        });

        // close menu when clicking outside
        document.addEventListener("click", (e) => {
            if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
                menu.classList.remove("active");
            }
        });
    }
});

// ===============================
// BOOTSTRAP VALIDATION
// ===============================

(() => {
    'use strict';

    const forms = document.querySelectorAll('.needs-validation');

    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {

            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        });
    });

})();

// ===============================
// SIGNUP + OTP
// ===============================

const alertBox = document.getElementById("alertBox");

const sendOtpBtn = document.getElementById("sendOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const resendBtn = document.getElementById("resendBtn");

const otpSection = document.getElementById("otpSection");
const verifiedBox = document.getElementById("verifiedBox");
const registerBtn = document.getElementById("registerBtn");

const emailInput = document.getElementById("email");

let otpVerified = false;
let timerInterval = null;

// ===============================
// ALERT
// ===============================

function showAlert(message, type = "success") {

    if (!alertBox) {
        console.log(message);
        return;
    }

    alertBox.style.display = "block";

    alertBox.className =
        type === "success"
            ? "alert alert-success"
            : "alert alert-danger";

    alertBox.innerHTML = `
        <span>${message}</span>

        <button
            type="button"
            onclick="this.parentElement.style.display='none'"
            style="
                position:absolute;
                top:50%;
                right:10px;
                transform:translateY(-50%);
                background:none;
                border:none;
                font-size:18px;
                cursor:pointer;
            "
        >
            &times;
        </button>
    `;
}

// ===============================
// TIMER
// ===============================

function startTimer() {

    if (!resendBtn) return;

    const timerText = document.getElementById("timerText");

    if (!timerText) return;

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    let seconds = 60;

    resendBtn.disabled = true;

    timerText.innerText = "(60s)";

    timerInterval = setInterval(() => {

        seconds--;

        timerText.innerText = `(${seconds}s)`;

        if (seconds <= 0) {

            clearInterval(timerInterval);

            resendBtn.disabled = false;

            timerText.innerText = "";
        }

    }, 1000);
}

// ===============================
// SEND OTP
// ===============================

if (sendOtpBtn) {

    sendOtpBtn.addEventListener("click", async () => {

        const companyNameEl = document.getElementById("companyName");
        const emailEl = document.getElementById("email");
        const passwordEl = document.getElementById("password");
        const cPasswordEl = document.getElementById("c_password");

        const companyName = companyNameEl ? companyNameEl.value : "";
        const email = emailEl ? emailEl.value : "";
        const password = passwordEl ? passwordEl.value : "";
        const cPassword = cPasswordEl ? cPasswordEl.value : "";

        if (
            !companyName ||
            !email ||
            !password ||
            !cPassword
        ) {
            return showAlert(
                "Please fill all fields",
                "error"
            );
        }

        if (password !== cPassword) {
            return showAlert(
                "Passwords do not match",
                "error"
            );
        }

        try {

            const response = await fetch(
                "/otp/send-otp",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email
                    })
                }
            );

            const data =
                await response.json();

            if (data.success) {

                showAlert(data.message);

                if (otpSection) {
                    otpSection.style.display = "block";
                }

                const sentEmail = document.getElementById("sentEmail");
                if (sentEmail) {
                    sentEmail.innerText = email;
                }

                startTimer();

            } else {

                showAlert(
                    data.message,
                    "error"
                );
            }

        } catch (err) {

            showAlert(
                "Failed to send OTP",
                "error"
            );

            console.error(err);
        }
    });
}

// ===============================
// VERIFY OTP
// ===============================

if (verifyOtpBtn) {

    verifyOtpBtn.addEventListener("click", async () => {

        const otpInputEl = document.getElementById("otpInput");
        const otp = otpInputEl ? otpInputEl.value.trim() : "";

        if (!otp) {
            return showAlert(
                "Please enter OTP",
                "error"
            );
        }

        try {

            const response = await fetch(
                "/otp/verify-otp",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        otp
                    })
                }
            );

            const data =
                await response.json();

            if (data.success) {

                otpVerified = true;

                showAlert(
                    "OTP Verified Successfully"
                );

                if (verifiedBox) {
                    verifiedBox.style.display = "block";
                }

                if (registerBtn) {
                    registerBtn.style.display = "block";
                }

                verifyOtpBtn.disabled = true;

                if (otpInputEl) {
                    otpInputEl.disabled = true;
                }

                if (resendBtn) {
                    resendBtn.disabled = true;
                }

            } else {

                showAlert(
                    data.message,
                    "error"
                );
            }

        } catch (err) {

            showAlert(
                "OTP verification failed",
                "error"
            );

            console.error(err);
        }
    });
}

// ===============================
// RESEND OTP
// ===============================

if (resendBtn) {

    resendBtn.addEventListener("click", async () => {

        try {

            const response = await fetch(
                "/otp/resend-otp",
                {
                    method: "POST"
                }
            );

            const data =
                await response.json();

            if (data.success) {

                showAlert(data.message);

                startTimer();

            } else {

                showAlert(
                    data.message,
                    "error"
                );
            }

        } catch (err) {

            showAlert(
                "Failed to resend OTP",
                "error"
            );

            console.error(err);
        }
    });
}

// ===============================
// BLOCK FORM SUBMIT
// ===============================

const signupForm =
    document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener(
        "submit",
        function (e) {

            if (!otpVerified) {

                e.preventDefault();

                showAlert(
                    "Please verify OTP before registering",
                    "error"
                );

                return false;
            }
        }
    );

    signupForm.addEventListener(
        "keydown",
        function (e) {

            if (
                e.key === "Enter" &&
                !otpVerified
            ) {
                e.preventDefault();
            }
        }
    );
}

document.addEventListener("DOMContentLoaded", function () {
    const closeButtons = document.querySelectorAll(".btn-close");

    closeButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            const alert = btn.closest(".alert");
            if (alert) alert.remove();
        });
    });
});