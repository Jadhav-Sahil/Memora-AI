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
const forgotPasswordForm = document.getElementById("forgotPasswordForm");

if (forgotPasswordForm) {

    forgotPasswordForm.addEventListener("submit", function (e) {

        if (!otpVerified) {
            e.preventDefault();
            showAlert(
                "Please verify OTP before resetting password",
                "danger"
            );
            return;
        }

        const password = document.getElementById("password").value.trim();
        const confirmPassword = document.getElementById("c_password").value.trim();

        if (!password || !confirmPassword) {
            e.preventDefault();
            showAlert(
                "Please enter both password fields",
                "danger"
            );
            return;
        }

        if (password.length < 8) {
            e.preventDefault();
            showAlert(
                "Password must be at least 8 characters",
                "danger"
            );
            return;
        }

        if (password !== confirmPassword) {
            e.preventDefault();
            showAlert(
                "Passwords do not match",
                "danger"
            );
            return;
        }
    });
}

/* =========================
   SEND OTP
========================= */
const sendOtpBtn = document.getElementById("sendOtpBtn");

if (sendOtpBtn) {

    sendOtpBtn.addEventListener("click", async () => {

        const email = document.getElementById("email").value.trim();

        if (!email) {
            showAlert("Please enter your registered email", "danger");
            return;
        }

        try {

            sendOtpBtn.disabled = true;
            sendOtpBtn.innerText = "Sending...";

            const res = await fetch("/employee/send-otp-forgot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (data.success) {

                document.getElementById("otpSection").style.display = "block";
                document.getElementById("sentEmail").innerText = email;

                showAlert(
                    "Verification code sent successfully.",
                    "success"
                );

                startTimer();

            } else {

                showAlert(data.message || "Failed to send OTP");

                sendOtpBtn.disabled = false;
            }

        } catch (err) {

            console.error(err);

            showAlert(
                "Server error while sending OTP",
                "danger"
            );

            sendOtpBtn.disabled = false;

        } finally {

            sendOtpBtn.innerText = "Send Verification Code";

        }

    });

}

/* =========================
   VERIFY OTP
========================= */
const verifyOtpBtn = document.getElementById("verifyOtpBtn");

if (verifyOtpBtn) {

    verifyOtpBtn.addEventListener("click", async () => {

        const email = document.getElementById("email").value.trim();
        const otp = document.getElementById("otpInput").value.trim();

        if (!otp) {
            showAlert("Please enter OTP");
            return;
        }

        try {

            verifyOtpBtn.disabled = true;
            verifyOtpBtn.innerText = "Verifying...";

            const res = await fetch("/employee/verify-otp-forgot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    otp
                })
            });

            const data = await res.json();

            if (data.success) {

                otpVerified = true;

                document.getElementById("otpVerifiedField").value = "true";

                clearInterval(timerInterval);

                document.getElementById("verifiedBox").style.display = "block";

                document.getElementById("passwordSection").style.display = "block";

                document.getElementById("otpInput").disabled = true;

                document.getElementById("resendBtn").disabled = true;

                showAlert(
                    "OTP verified successfully.",
                    "success"
                );

            } else {

                verifyOtpBtn.disabled = false;
                verifyOtpBtn.innerText = "Verify OTP";

                showAlert(
                    data.message || "Invalid OTP",
                    "danger"
                );
            }

        } catch (err) {

            console.error(err);

            verifyOtpBtn.disabled = false;
            verifyOtpBtn.innerText = "Verify OTP";

            showAlert(
                "OTP verification failed",
                "danger"
            );

        }

    });

}

/* =========================
   RESEND OTP
========================= */
const resendBtn = document.getElementById("resendBtn");

if (resendBtn) {

    resendBtn.addEventListener("click", async () => {

        const email = document.getElementById("email").value.trim();

        if (!email) {
            showAlert("Please enter your email first");
            return;
        }

        try {

            const res = await fetch("/employee/resend-otp-forgot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (data.success) {

                showAlert(
                    "OTP resent successfully",
                    "success"
                );

                startTimer();

            } else {

                showAlert(
                    data.message || "Failed to resend OTP",
                    "danger"
                );

            }

        } catch (err) {

            console.error(err);

            showAlert(
                "Server error while resending OTP",
                "danger"
            );

        }

    });

}