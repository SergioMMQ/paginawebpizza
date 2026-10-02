document.addEventListener("DOMContentLoaded", () => {

  /* ==============================
     MENÚ HAMBURGUESA
  =============================== */
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  navToggle.addEventListener("click", () => {
    navToggle.classList.toggle("open");
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navToggle.classList.remove("open");
      navLinks.classList.remove("open");
    });
  });

  /* ==============================
     SCROLL SPY
  =============================== */
  const spySections = ["menuu", "promociones", "ubicacion", "contacto"];
  const navAnchors = navLinks.querySelectorAll("a");

  function updateActiveNav() {
    const navHeight = document.querySelector("nav").offsetHeight;
    let current = "menuu";

    spySections.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= navHeight + 20) {
        current = id;
      }
    });

    navAnchors.forEach(a => {
      a.classList.remove("active");
      if (a.getAttribute("href") === `#${current}`) {
        a.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", updateActiveNav);
  updateActiveNav();

  /* ==============================
     NOMBRE EN NAV AL HACER SCROLL
  =============================== */
  const mainNav = document.getElementById("mainNav");
  const header = document.querySelector("header");

  function updateNavBrand() {
    const headerBottom = header.getBoundingClientRect().bottom;
    if (headerBottom <= 0) {
      mainNav.classList.add("scrolled");
    } else {
      mainNav.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", updateNavBrand);
  updateNavBrand();

  /* ==============================
     ANIMACIONES DE ENTRADA
  =============================== */
  const animEls = document.querySelectorAll(".anim-section");
  if (animEls.length && "IntersectionObserver" in window) {
    const animObs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            animObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    animEls.forEach(el => animObs.observe(el));
  } else {
    animEls.forEach(el => el.classList.add("visible"));
  }

});


function toggleQuetzal() {
  document.getElementById("footerQuetzal").classList.toggle("active");
}

function mpClose() {
  document.getElementById('mpPop').style.display = 'none';
}

// Cierra el popup de tarjetas automáticamente después de 20 segundos
setTimeout(() => {
  const pop = document.getElementById('mpPop');
  if (pop) pop.style.display = 'none';
}, 20000);