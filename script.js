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
     SLIDERS
  =============================== */
  document.querySelectorAll(".slider").forEach(slider => {
    const slides = slider.querySelectorAll(".slide");
    if (slides.length <= 1) return;

    let index = 0;

    setInterval(() => {
      slides[index].classList.remove("active");
      index = (index + 1) % slides.length;
      slides[index].classList.add("active");
    }, 3000);
  });

  /* ==============================
     FORMULARIO CREPAS → WHATSAPP
  =============================== */
  const crepaForm = document.getElementById("crepa-form");

  // ⚠️ SOLO si el formulario existe
  if (crepaForm) {
    crepaForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const tipoCrepa = document.getElementById("tipo-crepa")?.value || "No especificado";

      const saborBase = Array.from(
        document.querySelectorAll('[name="sabor-base"]:checked')
      ).map(input => input.value);

      const rellenos = Array.from(
        document.querySelectorAll('[name="relleno"]:checked')
      ).map(input => input.value);

      const toppings = Array.from(
        document.querySelectorAll('[name="topping"]:checked')
      ).map(input => input.value);

      const mensaje = `
Hola, me gustaría pedir una crepa personalizada:

- Tipo de crepa: ${tipoCrepa}
- Sabor base: ${saborBase.length ? saborBase.join(", ") : "Sin sabor base"}
- Rellenos: ${rellenos.length ? rellenos.join(", ") : "Sin rellenos"}
- Toppings: ${toppings.length ? toppings.join(", ") : "Sin toppings"}
      `.trim();

      const numeroWhatsApp = "522472574026";
      const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

      window.open(url, "_blank");
    });
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