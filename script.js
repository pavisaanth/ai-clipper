const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('nav-open', !open);
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menu?.setAttribute('aria-expanded', 'false');
  nav.classList.remove('nav-open');
}));
const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) { entry.target.style.animation = 'rise .7s ease both'; observer.unobserve(entry.target); }
}), { threshold: 0.12 });
document.querySelectorAll('.program-card, .price-card, .coach-card, .stat-grid > div').forEach((item) => observer.observe(item));
