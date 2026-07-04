document.querySelectorAll(".deactivate-form").forEach(form => {
    form.addEventListener("submit", function (e) {
        if (!confirm("Are you sure you want to deactivate this employee?")) {
            e.preventDefault();
        }
    });
});