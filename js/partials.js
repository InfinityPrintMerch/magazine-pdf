async function includeHTML(id, url) {
    const element = document.getElementById(id);
    const response = await fetch(url);
    const html = await response.text();
    element.innerHTML = html;

    if (id === 'nav-placeholder') {
        // Esperar a que se inserte el HTML y luego activar el nav dinámico
        const path = window.location.pathname.split("/").pop();

        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href').split("/").pop(); // solo el nombre del archivo
            if (href === path || (href === "index.html" && path === "")) {
                link.classList.add('active');
            }
        });

    }
}

includeHTML('nav-placeholder', '../partials/nav.html');
includeHTML('footer-placeholder', '../partials/footer.html');