console.log("script.js cargado");

document.addEventListener("DOMContentLoaded", () => {

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

/* ==============================
   FUNCIÓN GLOBAL LOGIN
================================ */
function goToLogin() {
  window.location.href = "login.html";
}


function toggleQuetzal() {
  document.getElementById("footerQuetzal").classList.toggle("active");
}