// ============================================
// MEMORA AI — LAYOUT JS
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    // ---- Mobile sidebar toggle ----
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.menu-toggle'); // add this button in header

    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        if (
            sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            e.target !== menuToggle
        ) {
            sidebar.classList.remove('open');
        }
    });

    // ---- Profile dropdown (click-based, works on touch) ----
    const profileMenu = document.querySelector('.profile-menu');
    const profileBtn = document.querySelector('.profile-btn');
    const profileDropdown = document.querySelector('.profile-dropdown');

    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', (e) => {
        if (!profileMenu.contains(e.target)) {
            profileDropdown.classList.remove('show');
        }
    });

    // ---- Close mobile sidebar when a nav link is clicked ----
    document.querySelectorAll('.sidebar ul li a').forEach(link => {
        link.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    });

});


document.addEventListener('DOMContentLoaded', () => {

    // Search filter — client-side filter of recent meetings table
    const searchInput = document.querySelector('.search-box input');
    const tableRows = document.querySelectorAll('.plain-table tbody tr');

    if (searchInput && tableRows.length) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();

            tableRows.forEach(row => {
                const title = row.querySelector('td')?.textContent.toLowerCase() || '';
                row.style.display = title.includes(query) ? '' : 'none';
            });
        });
    }

});
document.getElementById('hamburgerBtn').addEventListener('click', function () {
    document.getElementById('navbarCenter').classList.toggle('open');
    this.classList.toggle('active');
});

setInterval(async () => {
    try {
        const res = await fetch("/employee/session-check", {
            method: "GET",
            credentials: "include"
        });

        if (res.status === 401) {
            window.location.href = "/signup-employee";
        }
    } catch (err) {
        console.log("Session check failed");
    }
}, 10000); // every 10 seconds