// Navbar scroll effect
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('shadow-sm');
        navbar.style.backgroundColor = 'rgba(5, 10, 20, 0.95)';
    } else {
        navbar.classList.remove('shadow-sm');
        navbar.style.backgroundColor = 'rgba(5, 10, 20, 0.85)';
    }
});

// Close mobile menu on click
const navLinks = document.querySelectorAll('.nav-link');
const menuToggle = document.getElementById('navbarNav');
const bsCollapse = new bootstrap.Collapse(menuToggle, {toggle: false});

navLinks.forEach((l) => {
    l.addEventListener('click', () => {
        if (menuToggle.classList.contains('show')) {
            bsCollapse.toggle();
        }
    });
});
