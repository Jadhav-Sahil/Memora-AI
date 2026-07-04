/* =========================
   ALERT FUNCTION
========================= */
function showAlert(message, type = "danger") {
    const box = document.getElementById("alertBox");

    box.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
        box.innerHTML = "";
    }, 4000);
}

/* =========================
   GLOBAL VARIABLES
========================= */
let otpVerified = false;
let timerInterval;

/* =========================
   TIMER
========================= */
function startTimer() {

    if (timerInterval) clearInterval(timerInterval);

    let seconds = 60;

    const resendBtn = document.getElementById("resendBtn");
    const timerText = document.getElementById("timerText");

    resendBtn.disabled = true;
    timerText.innerText = `(60s)`;

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

/* =========================
   BLOCK FORM SUBMIT
========================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", function (e) {

        if (!otpVerified) {
            e.preventDefault();
            showAlert("Please verify OTP before continuing.");
        }

    });

}

/* =========================
   SEND OTP
========================= */

const sendOtpBtn = document.getElementById("sendOtpBtn");

if (sendOtpBtn) {

    sendOtpBtn.addEventListener("click", async (e) => {

        e.preventDefault();

        const c_name = document.getElementById("c_name").value.trim();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const c_password = document.getElementById("c_password").value;
        const role = document.getElementById("role").value;
        const companyCode = document.getElementById("companyCode").value.trim();

        if (
            !c_name ||
            !name ||
            !email ||
            !password ||
            !c_password ||
            !role ||
            !companyCode
        ) {
            showAlert("Please fill all required fields.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            showAlert("Please enter a valid email address.");
            return;
        }

        if (password.length < 8) {
            showAlert("Password must be at least 8 characters.");
            return;
        }

        if (password !== c_password) {
            showAlert("Passwords do not match.");
            return;
        }

        try {

            sendOtpBtn.disabled = true;
            sendOtpBtn.textContent = "Sending OTP...";

            const res = await fetch("/otp/send-otp-employee", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email
                })

            });

            const data = await res.json();

            if (!data.success) {

                showAlert(data.message);

                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = "Send OTP";

                return;
            }

            document.getElementById("otpSection").style.display = "block";
            document.getElementById("sentEmail").innerText = email;

            showAlert(data.message, "success");

            sendOtpBtn.textContent = "OTP Sent";

            startTimer();

        } catch (err) {

            console.error(err);

            showAlert("Failed to send OTP.");

            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = "Send OTP";

        }

    });

}

/* =========================
   VERIFY OTP
========================= */

const verifyBtn = document.getElementById("verifyOtpBtn");

if (verifyBtn) {

    verifyBtn.addEventListener("click", async () => {

        const otp = document.getElementById("otpInput").value.trim();

        if (!otp) {
            showAlert("Please enter OTP.");
            return;
        }

        try {

            const res = await fetch("/otp/verify-otp-employee", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({ otp })

            });

            const data = await res.json();

            if (!data.success) {
                showAlert(data.message);
                return;
            }

            otpVerified = true;

            document.getElementById("verifiedBox").style.display = "block";
            document.getElementById("loginBtn").style.display = "block";

            showAlert("OTP verified successfully.", "success");

            clearInterval(timerInterval);

        } catch (err) {

            console.error(err);

            showAlert("OTP verification failed.");

        }

    });

}

/* =========================
   RESEND OTP
========================= */

const resendBtn = document.getElementById("resendBtn");

if (resendBtn) {

    resendBtn.addEventListener("click", async () => {

        try {

            const res = await fetch("/otp/resend-otp-employee", {
                method: "POST"
            });

            const data = await res.json();

            if (!data.success) {
                showAlert(data.message);
                return;
            }

            showAlert("OTP resent successfully.", "success");

            startTimer();

        } catch (err) {

            console.error(err);

            showAlert("Failed to resend OTP.");

        }

    });

}