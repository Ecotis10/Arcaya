import './styles/tokens.css';
import './styles/base.css';
import './styles/main.css';

import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHeroLiquid } from './hero-liquid.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const WHATSAPP_NUMBER = '584120000000'; // demo
const WHATSAPP_MSG = encodeURIComponent(
  'Hola Arcaya 👋 Quisiera reservar una mesa. ¿Tienen disponibilidad?'
);

/* ----------------------------------------------------------------
   1. Smooth scroll (Lenis) sincronizado con GSAP ScrollTrigger
---------------------------------------------------------------- */
let lenis;
if (!reduceMotion) {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* anclas internas con scroll suave */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    closeMobileMenu();
    if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.2 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ----------------------------------------------------------------
   2. Nav: fondo al scrollear + ocultar al bajar
---------------------------------------------------------------- */
const nav = document.querySelector('[data-nav]');
let lastY = 0;
ScrollTrigger.create({
  start: 'top -80',
  end: 99999,
  onUpdate: (self) => {
    const y = self.scroll();
    nav.classList.toggle('is-scrolled', y > 60);
    nav.classList.toggle('is-hidden', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
    lastY = y;
  },
});

/* ----------------------------------------------------------------
   3. Menú móvil
---------------------------------------------------------------- */
const burger = document.querySelector('[data-burger]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
function openMobileMenu() {
  document.body.classList.add('menu-open');
  mobileMenu.classList.add('is-open');
  mobileMenu.setAttribute('aria-hidden', 'false');
  burger.setAttribute('aria-expanded', 'true');
  if (lenis) lenis.stop();
}
function closeMobileMenu() {
  if (!mobileMenu.classList.contains('is-open')) return;
  document.body.classList.remove('menu-open');
  mobileMenu.classList.remove('is-open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false');
  if (lenis) lenis.start();
}
burger?.addEventListener('click', () => {
  mobileMenu.classList.contains('is-open') ? closeMobileMenu() : openMobileMenu();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileMenu(); });

/* ----------------------------------------------------------------
   4. Reveals
---------------------------------------------------------------- */
let revealsDone = false;
function setReveals() {
  if (revealsDone) return;
  revealsDone = true;
  if (reduceMotion) {
    // sin animación: revelar TODO de inmediato. Ojo: aquí se usa [data-lines]
    // (el contenedor), no .line-inner — splitToLines no corre en reduce-motion,
    // así que .line-inner no existe y los títulos quedarían invisibles.
    gsap.set('[data-rise], [data-stagger] > *, [data-dish], [data-lines]', { opacity: 1, y: 0 });
    return;
  }

  // Hero title: máscara line-by-line
  document.querySelectorAll('[data-hero-title] .line > span').forEach((el) => {
    gsap.from(el, { yPercent: 110, duration: 1.1, ease: 'power3.out', delay: 0.15 });
  });

  // data-rise: aparece subiendo (fromTo explícito → termina en opacity 1)
  gsap.utils.toArray('[data-rise]').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 28 },
      {
        opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%' },
        clearProps: 'transform',
      });
  });

  // data-lines: títulos revelados línea por línea bajo máscara
  gsap.utils.toArray('[data-lines]').forEach((el) => {
    splitToLines(el);
    const inner = el.querySelectorAll('.line-inner');
    if (!inner.length) { gsap.set(el, { opacity: 1 }); return; }
    gsap.set(el, { opacity: 1 });
    gsap.fromTo(inner,
      { yPercent: 115 },
      {
        yPercent: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
  });

  // data-stagger: hijos en cascada
  gsap.utils.toArray('[data-stagger]').forEach((el) => {
    if (!el.children.length) return;
    gsap.fromTo(el.children,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 85%' },
        clearProps: 'transform',
      });
  });

  // platos del menú
  gsap.utils.toArray('[data-dish]').forEach((el) => {
    gsap.fromTo(el,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 92%' },
        clearProps: 'transform',
      });
  });

  // parallax suave en imágenes marcadas
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { yPercent: -8 }, {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // hero media: parallax + escala al hacer scroll
  const heroMedia = document.querySelector('[data-hero-media]');
  if (heroMedia) {
    gsap.to(heroMedia, {
      yPercent: 18, scale: 1.08, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }
}

/* envuelve cada "línea visual" del texto en un .line / .line-inner */
function splitToLines(el) {
  if (el.dataset.split) return;
  const text = el.textContent.trim();
  const words = text.split(/\s+/);
  el.textContent = '';
  // medimos por palabra para detectar saltos de línea reales
  const probe = words.map((w) => {
    const s = document.createElement('span');
    s.textContent = w + ' ';
    s.style.display = 'inline-block';
    el.appendChild(s);
    return s;
  });
  let lines = [];
  let current = [];
  let lastTop = null;
  probe.forEach((s) => {
    const top = s.offsetTop;
    if (lastTop === null) lastTop = top;
    if (top !== lastTop) { lines.push(current); current = []; lastTop = top; }
    current.push(s.textContent);
  });
  if (current.length) lines.push(current);
  el.textContent = '';
  lines.forEach((lineWords) => {
    const line = document.createElement('span');
    line.className = 'line';
    line.style.cssText = 'display:block;overflow:hidden;';
    const inner = document.createElement('span');
    inner.className = 'line-inner';
    inner.style.display = 'block';
    inner.textContent = lineWords.join('').trim();
    line.appendChild(inner);
    el.appendChild(line);
  });
  el.dataset.split = '1';
}

/* ----------------------------------------------------------------
   5. WhatsApp
---------------------------------------------------------------- */
const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;
document.querySelectorAll('[data-whatsapp]').forEach((el) => {
  el.setAttribute('href', waUrl);
  el.setAttribute('target', '_blank');
  el.setAttribute('rel', 'noopener');
});

/* ----------------------------------------------------------------
   6. Validación del formulario de reservas (sin backend)
---------------------------------------------------------------- */
const form = document.querySelector('[data-form]');
if (form) {
  const successMsg = form.querySelector('[data-success]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('[required]').forEach((input) => {
      const field = input.closest('.field, .field--row > div') || input.parentElement;
      const errEl = field.querySelector('[data-error]');
      const valid = input.value.trim() !== '' && input.checkValidity();
      input.setAttribute('aria-invalid', String(!valid));
      if (errEl) errEl.textContent = valid ? '' : 'Completa este campo';
      if (!valid && ok) { input.focus(); ok = false; }
    });
    if (!ok) return;

    // arma un mensaje de WhatsApp con los datos + muestra confirmación
    const data = new FormData(form);
    const msg = encodeURIComponent(
      `Hola Arcaya 👋 Quiero reservar:\n` +
      `• Nombre: ${data.get('name')}\n` +
      `• Personas: ${data.get('people')}\n` +
      `• Fecha: ${data.get('date')} ${data.get('time')}\n` +
      (data.get('note') ? `• Nota: ${data.get('note')}\n` : '')
    );
    successMsg.hidden = false;
    gsap.fromTo(successMsg, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank', 'noopener');
    form.reset();
  });
}

/* ----------------------------------------------------------------
   7. Init
---------------------------------------------------------------- */
document.documentElement.classList.remove('no-js');
window.addEventListener('load', () => {
  setReveals();
  ScrollTrigger.refresh();
  initHeroLiquid(document.querySelector('.hero__img img'));
});
// fallback si load ya pasó
if (document.readyState === 'complete') setReveals();
