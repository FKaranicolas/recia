/* =============================================================================
   ai.js — capa de IA
   Hoy: simulación local. Mañana: fetch a un endpoint real.
   El contrato (entrada: imagen / salida: objeto estructurado) no cambia.
   ========================================================================== */
window.AI = (function () {
  'use strict';

  const STEPS = [
    'Detectando documento',
    'Identificando tipo de comprobante',
    'Extrayendo información',
    'Detectando proveedor',
    'Identificando importes',
    'Validando datos'
  ];

  const POOL = [
    { supplier: 'Distribuidora Central SA', cuit: '30-71234567-8', category: 'Insumos' },
    { supplier: 'Tecnología del Centro SRL', cuit: '30-70998877-4', category: 'Tecnología' },
    { supplier: 'Insumos Córdoba SA', cuit: '33-69874512-9', category: 'Insumos' },
    { supplier: 'Logística Norte SRL', cuit: '30-71455889-2', category: 'Logística' },
    { supplier: 'Servicios Empresariales SA', cuit: '30-70112233-5', category: 'Servicios' },
    { supplier: 'Redes y Cableado SA', cuit: '30-70556677-3', category: 'Tecnología' },
    { supplier: 'Papelera del Sur SRL', cuit: '33-71889900-1', category: 'Insumos' },
    { supplier: 'Consultora Pampa SRL', cuit: '30-71667788-9', category: 'Servicios' }
  ];

  const TYPES = ['Factura A', 'Factura B', 'Factura B', 'Recibo'];
  const PAYMENTS = ['Transferencia', 'Transferencia', 'Tarjeta de crédito', 'Cuenta corriente', 'Efectivo'];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const between = (a, b) => a + Math.random() * (b - a);

  function mockExtraction() {
    const p = pick(POOL);
    const documentType = pick(TYPES);
    const total = Math.round(between(25000, 900000) / 50) * 50;
    const iva = documentType === 'Recibo' ? 0 : Math.round(total - total / 1.21);

    return {
      documentType: documentType,
      cuit: p.cuit,
      supplier: p.supplier,
      date: U.toISODate(new Date()),
      pointOfSale: String(Math.floor(between(1, 20))).padStart(4, '0'),
      invoiceNumber: String(Math.floor(between(1, 99999))).padStart(8, '0'),
      subtotal: total - iva,
      iva: iva,
      total: total,
      paymentMethod: pick(PAYMENTS),
      category: p.category,
      aiConfidence: Math.round(between(0.62, 0.99) * 100) / 100
    };
  }

  /**
   * Procesa un comprobante y devuelve los campos detectados.
   * @param {string} image  dataURL de la imagen (hoy no se usa: la extracción es simulada)
   * @param {{onStep?:function(number,number):void}} options
   * @returns {Promise<Object>}
   */
  async function processDocumentWithAI(image, options) {
    const opts = options || {};
    const onStep = typeof opts.onStep === 'function' ? opts.onStep : function () {};

    for (let i = 0; i < STEPS.length; i++) {
      onStep(i, STEPS.length);              // paso i en curso
      await U.delay(320 + Math.random() * 280);
    }
    onStep(STEPS.length, STEPS.length);     // todos completos
    await U.delay(400);

    return mockExtraction();
  }

  return { STEPS, processDocumentWithAI };
})();

/* -----------------------------------------------------------------------------
   Para conectar una IA real, reemplazar el cuerpo de processDocumentWithAI por:

   const res = await fetch('/api/process-receipt', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ image })          // dataURL o base64
   });
   if (!res.ok) throw new Error('El servicio de IA no respondió.');
   return await res.json();                   // mismo shape que mockExtraction()

   Los pasos de la animación pasan a ser estados reales del backend
   (o simplemente un loader indeterminado mientras dura el fetch).
   La clave: no llamar a la API del modelo desde el navegador, para no exponer la key.
----------------------------------------------------------------------------- */
