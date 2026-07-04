const forms = document.querySelectorAll(".needs-validation");
Array.from(forms).forEach((form) => {
    form.addEventListener("submit", (event) => {
        if (!form.checkValidity()) {
            event.preventDefault();
            event.stopPropagation();
        }
        form.classList.add("was-validated");
    });
});
const fileInput = document.getElementById("meetingFile");
const fileName = document.getElementById("fileName");
if (fileInput) {
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;
        const allowed = [
            "audio/mpeg",
            "video/mp4"
        ];
        if (!allowed.includes(file.type)) {
            alert("Only MP3 and MP4 files are allowed.");
            fileInput.value = "";
            fileName.textContent = "";
            return;
        }
        fileName.textContent = `Selected: ${file.name}`;
    });
}