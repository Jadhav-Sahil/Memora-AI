
function copyCompanyCode() {
    const code = document.getElementById('companyCodeText').innerText.trim();
    const btn = document.getElementById('copyCodeBtn');
    const icon = document.getElementById('copyIcon');
    const text = document.getElementById('copyText');
    const toast = document.getElementById('copyToast');

    navigator.clipboard.writeText(code).then(() => {

        // Button feedback
        btn.classList.add('copied');
        icon.className = 'bi bi-clipboard-check';
        text.innerText = 'Copied!';

        // Show toast
        toast.classList.add('show');

        // Reset after 2.5s
        setTimeout(() => {
            btn.classList.remove('copied');
            icon.className = 'bi bi-clipboard';
            text.innerText = 'Copy';
            toast.classList.remove('show');
        }, 2500);

    }).catch(() => {
        // Fallback for older browsers
        const el = document.createElement('textarea');
        el.value = code;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);

        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    });
}

function copyCompanyCode() {
    const text = document.getElementById("companyCode").innerText;

    navigator.clipboard.writeText(text)
        .then(() => {
            alert("Copied: " + text);
        })
        .catch(err => {
            console.log("Copy failed", err);
        });
}


//for the meeting  history js 
document.querySelectorAll(".btn-primary").forEach(btn => {
    btn.addEventListener("click", () => {

        btn.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i> Starting';

        btn.style.pointerEvents = "none";
    });
});

//for the transcript
function copyTranscript() {
    const text = document.getElementById('transcriptText').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
        btn.classList.add('copy-btn--done');
        setTimeout(() => {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
            btn.classList.remove('copy-btn--done');
        }, 2000);
    });
}