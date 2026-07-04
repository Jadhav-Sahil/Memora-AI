/* =========================
   ALERT FUNCTION
========================= */
function showAlert(message, type = "danger") {
    const box = document.getElementById("alertBox");

    box.style.display = "block";
    box.className = `alert alert-${type}`;
    box.innerText = message;

    setTimeout(() => {
        box.style.display = "none";
    }, 3000);
}

/* =========================
   GLOBAL STATE
========================= */
let otpVerified = false;
let timerInterval;

/* =========================
   TIMER
========================= */
function startTimer() {

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    let seconds = 60;

    const resendBtn = document.getElementById("resendBtn");
    const timerText = document.getElementById("timerText");

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

/* =========================
   FORM SUBMIT SAFETY
========================= */
const forgotPasswordForm =
    document.getElementById("forgotPasswordForm");

if (forgotPasswordForm) {

    forgotPasswordForm.addEventListener("submit", function (e) {

        if (!otpVerified) {
            e.preventDefault();

            showAlert(
                "Please verify OTP before resetting password",
                "danger"
            );
        }

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("c_password").value;

        if (password !== confirmPassword) {
            e.preventDefault();

            showAlert(
                "Passwords do not match",
                "danger"
            );
        }
    });
}

/* =========================
   SEND OTP
========================= */
document.getElementById("sendOtpBtn")
    .addEventListener("click", async () => {

        const email =
            document.getElementById("email").value.trim();

        if (!email) {
            showAlert(
                "Please enter your email",
                "danger"
            );
            return;
        }

        try {

            const res = await fetch(
                "/forgot/send-otp-forgot",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email })
                }
            );

            const data = await res.json();

            if (data.success) {

                document.getElementById(
                    "otpSection"
                ).style.display = "block";

                document.getElementById(
                    "sentEmail"
                ).innerText = email;

                showAlert(
                    "OTP sent successfully",
                    "success"
                );

                startTimer();

            } else {
                showAlert(
                    data.message,
                    "danger"
                );
            }

        } catch (err) {

            console.error(err);

            showAlert(
                "Failed to send OTP",
                "danger"
            );
        }
    });

/* =========================
   VERIFY OTP
========================= */
document.getElementById("verifyOtpBtn")
    .addEventListener("click", async () => {

        const otp =
            document.getElementById("otpInput").value.trim();

        if (!otp) {
            showAlert(
                "Please enter OTP",
                "danger"
            );
            return;
        }

        try {

            const res = await fetch(
                "/forgot/verify-otp-forgot",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ otp })
                }
            );

            const data = await res.json();

            if (data.success) {

                otpVerified = true;

                clearInterval(timerInterval);

                document.getElementById(
                    "verifiedBox"
                ).style.display = "block";

                document.getElementById(
                    "passwordSection"
                ).style.display = "block";

                document.getElementById(
                    "verifyOtpBtn"
                ).disabled = true;

                document.getElementById(
                    "otpInput"
                ).disabled = true;

                showAlert(
                    "OTP verified successfully",
                    "success"
                );

            } else {

                showAlert(
                    data.message,
                    "danger"
                );
            }

        } catch (err) {

            console.error(err);

            showAlert(
                "OTP verification failed",
                "danger"
            );
        }
    });

/* =========================
   RESEND OTP
========================= */
document.getElementById("resendBtn")
    .addEventListener("click", async () => {

        try {

            const res = await fetch(
                "/forgot/resend-otp-forgot",
                {
                    method: "POST"
                }
            );

            const data = await res.json();

            if (data.success) {

                showAlert(
                    "OTP resent successfully",
                    "success"
                );

                startTimer();

            } else {

                showAlert(
                    data.message,
                    "danger"
                );
            }

        } catch (err) {

            console.error(err);

            showAlert(
                "Failed to resend OTP",
                "danger"
            );
        }
    });

