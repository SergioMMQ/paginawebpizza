document.getElementById('crepa-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevenir que se envíe el formulario tradicionalmente.

    // Obtener el tipo de crepa seleccionado.
    const tipoCrepa = document.getElementById('tipo-crepa').value;

    // Obtener el sabor base seleccionado.
    const saborBase = document.getElementById('sabor-base').value;

    // Obtener los rellenos seleccionados.
    const rellenos = Array.from(document.querySelectorAll('[name="relleno"]:checked'))
    .map(input => input.value);
    
    // Obtener los toppings seleccionados.
    const toppings = Array.from(document.querySelectorAll('[name="topping"]:checked'))
    .map(input => input.value);

    // Construir el mensaje para WhatsApp.
    const mensaje = `
    Hola, me gustaría pedir una crepa personalizada:
    - Tipo de crepa: ${tipoCrepa}
    - Sabor base: ${saborBase}
    - Rellenos: ${rellenos.length > 0 ? rellenos.join(', ') : 'Sin rellenos'}
    - Toppings: ${toppings.length > 0 ? toppings.join(', ') : 'Sin toppings'}
    `.trim();

    // Número de teléfono al que se enviará el mensaje (con el código de país, sin el "+").
    const numeroWhatsApp = '522474710267';

    // Generar el enlace para WhatsApp.
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

    // Abrir el enlace en una nueva pestaña.
    window.open(url, '_blank');
});
