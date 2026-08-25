/* =============================================================================
   storage.js — capa de datos
   Toda la API es asíncrona a propósito: cuando esto pase a Supabase/PostgreSQL
   solo cambia el cuerpo de estas funciones, la UI no se toca.
   ========================================================================== */
window.DB = (function () {
  'use strict';

  const KEY = 'recia.receipts.v1';
  const SEED_FLAG = 'recia.seeded.v1';

  /* ---------------------------------------------------------------------
     Driver: localStorage cuando está disponible, memoria cuando no.
     Algunos visores embebidos e iOS en modo privado lanzan al acceder a
     localStorage; sin este fallback la demo se rompe al abrirla.
     --------------------------------------------------------------------- */
  const driver = (function () {
    try {
      const probe = '__recia_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return {
        name: 'localStorage',
        get: k => window.localStorage.getItem(k),
        set: (k, v) => window.localStorage.setItem(k, v),
        del: k => window.localStorage.removeItem(k)
      };
    } catch (e) {
      const mem = {};
      return {
        name: 'memoria',
        get: k => (k in mem ? mem[k] : null),
        set: (k, v) => { mem[k] = v; },
        del: k => { delete mem[k]; }
      };
    }
  })();

  function readAll() {
    try {
      const raw = driver.get(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeAll(list) {
    try {
      driver.set(KEY, JSON.stringify(list));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e };
    }
  }

  /* ---------------------------------------------------------------------
     Reglas de negocio mínimas
     --------------------------------------------------------------------- */
  const CATEGORIES = ['Tecnología', 'Insumos', 'Servicios', 'Logística', 'Otros'];
  const DOC_TYPES = ['Factura A', 'Factura B', 'Factura C', 'Recibo', 'Nota de crédito'];
  const PAYMENT_METHODS = ['Transferencia', 'Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Cheque', 'Cuenta corriente'];

  /** El estado se deriva de la confianza de la IA. */
  function statusFromConfidence(conf) {
    if (conf >= 0.85) return 'processed';
    if (conf >= 0.60) return 'review';
    return 'error';
  }

  const STATUS_LABEL = { processed: 'Procesado', review: 'Revisar', error: 'Error' };
  const STATUS_CLASS = { processed: 'badge-ok', review: 'badge-warn', error: 'badge-err' };

  /* ---------------------------------------------------------------------
     CRUD
     --------------------------------------------------------------------- */
  async function getReceipts() {
    return readAll().slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  async function getReceiptById(id) {
    return readAll().find(r => r.id === id) || null;
  }

  async function saveReceipt(data) {
    const list = readAll();
    const conf = Number(data.aiConfidence) || 0;
    const receipt = {
      id: U.uid(),
      createdAt: new Date().toISOString(),
      documentImage: data.documentImage || null,
      documentType: data.documentType || '',
      cuit: data.cuit || '',
      supplier: data.supplier || '',
      date: data.date || U.toISODate(new Date()),
      pointOfSale: data.pointOfSale || '',
      invoiceNumber: data.invoiceNumber || '',
      subtotal: Number(data.subtotal) || 0,
      iva: Number(data.iva) || 0,
      total: Number(data.total) || 0,
      paymentMethod: data.paymentMethod || '',
      category: data.category || 'Otros',
      aiConfidence: conf,
      status: data.status || statusFromConfidence(conf)
    };

    list.push(receipt);
    let res = writeAll(list);

    // La foto en base64 es lo único pesado: si no entra, se guarda sin imagen.
    if (!res.ok && receipt.documentImage) {
      receipt.documentImage = null;
      res = writeAll(list);
      if (res.ok) {
        U.toast('Guardado sin la imagen: no queda espacio en este dispositivo.', 'error');
        return receipt;
      }
    }
    if (!res.ok) throw new Error('No se pudo guardar el comprobante.');
    return receipt;
  }

  async function updateReceipt(id, patch) {
    const list = readAll();
    const i = list.findIndex(r => r.id === id);
    if (i === -1) throw new Error('El comprobante ya no existe.');
    list[i] = Object.assign({}, list[i], patch, { id: list[i].id, createdAt: list[i].createdAt });
    const res = writeAll(list);
    if (!res.ok) throw new Error('No se pudo guardar el comprobante.');
    return list[i];
  }

  async function deleteReceipt(id) {
    const list = readAll().filter(r => r.id !== id);
    const res = writeAll(list);
    if (!res.ok) throw new Error('No se pudo eliminar el comprobante.');
    return true;
  }

  /* ---------------------------------------------------------------------
     Métricas
     --------------------------------------------------------------------- */
  async function calculateMetrics() {
    const list = readAll();

    const total = list.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const suppliers = new Set(list.map(r => (r.cuit || r.supplier || '').trim()).filter(Boolean)).size;
    const confs = list.map(r => Number(r.aiConfidence) || 0).filter(c => c > 0);
    const accuracy = confs.length ? confs.reduce((s, c) => s + c, 0) / confs.length : 0;

    // Últimos 7 días por fecha de procesamiento (createdAt).
    const byDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = U.daysAgo(i);
      const key = U.toISODate(d);
      byDay.push({
        date: key,
        label: U.dayShort(d),
        isToday: i === 0,
        count: list.filter(r => String(r.createdAt).slice(0, 10) === key).length
      });
    }

    // Gastos por categoría, de mayor a menor.
    const catMap = {};
    CATEGORIES.forEach(c => { catMap[c] = 0; });
    list.forEach(r => {
      const c = CATEGORIES.indexOf(r.category) >= 0 ? r.category : 'Otros';
      catMap[c] += Number(r.total) || 0;
    });
    const byCategory = CATEGORIES
      .map(name => ({ name, amount: catMap[name], share: total ? catMap[name] / total : 0 }))
      .sort((a, b) => b.amount - a.amount);

    return { count: list.length, total, suppliers, accuracy, byDay, byCategory, pending: list.filter(r => r.status !== 'processed').length };
  }

  /* ---------------------------------------------------------------------
     Datos demo — ficticios, solo para la demostración
     --------------------------------------------------------------------- */
  const SEED = [
    ['Distribuidora Central SA', '30-71234567-8', 'Factura A', 'Insumos', 'Transferencia', 412000, 0.97, 0, 3],
    ['Tecnología del Centro SRL', '30-70998877-4', 'Factura A', 'Tecnología', 'Tarjeta de crédito', 1284500, 0.94, 0, 5],
    ['Insumos Córdoba SA', '33-69874512-9', 'Factura B', 'Insumos', 'Cuenta corriente', 187300, 0.99, 1, 6],
    ['Logística Norte SRL', '30-71455889-2', 'Factura B', 'Logística', 'Transferencia', 96800, 0.72, 1, 4],
    ['Servicios Empresariales SA', '30-70112233-5', 'Factura A', 'Servicios', 'Transferencia', 655000, 0.96, 2, 8],
    ['Papelera del Sur SRL', '33-71889900-1', 'Recibo', 'Insumos', 'Efectivo', 42150, 0.91, 2, 2],
    ['Energía Litoral SA', '30-68774411-6', 'Factura B', 'Servicios', 'Débito automático', 231400, 0.88, 3, 9],
    ['Transporte Andino SRL', '30-71002244-7', 'Factura B', 'Logística', 'Transferencia', 158900, 0.57, 3, 5],
    ['Redes y Cableado SA', '30-70556677-3', 'Factura A', 'Tecnología', 'Transferencia', 874200, 0.95, 4, 11],
    ['Limpieza Integral SRL', '33-71334455-8', 'Recibo', 'Servicios', 'Efectivo', 73600, 0.93, 5, 7],
    ['Ferretería Industrial SA', '30-69447788-0', 'Factura B', 'Insumos', 'Tarjeta de débito', 119750, 0.98, 5, 12],
    ['Consultora Pampa SRL', '30-71667788-9', 'Factura A', 'Servicios', 'Transferencia', 540000, 0.83, 6, 10],
    ['Depósitos del Oeste SA', '33-70223344-2', 'Factura B', 'Logística', 'Cuenta corriente', 268400, 0.96, 6, 14]
  ];

  function buildSeed() {
    return SEED.map((s, i) => {
      const supplier = s[0], cuit = s[1], type = s[2], category = s[3];
      const payment = s[4], total = s[5], conf = s[6];
      const createdOffset = s[7], dateOffset = s[8];

      const created = U.daysAgo(createdOffset);
      created.setHours(9 + (i % 9), (i * 7) % 60, 0, 0);

      const iva = type === 'Recibo' ? 0 : Math.round(total - total / 1.21);
      const subtotal = total - iva;

      return {
        id: 'seed_' + (i + 1),
        createdAt: created.toISOString(),
        documentImage: null,
        documentType: type,
        cuit: cuit,
        supplier: supplier,
        date: U.toISODate(U.daysAgo(dateOffset)),
        pointOfSale: String(1 + (i % 6)).padStart(4, '0'),
        invoiceNumber: String(1204 + i * 37).padStart(8, '0'),
        subtotal: subtotal,
        iva: iva,
        total: total,
        paymentMethod: payment,
        category: category,
        aiConfidence: conf,
        status: statusFromConfidence(conf)
      };
    });
  }

  /** Carga datos demo solo la primera vez. Si el usuario borra todo, no vuelven. */
  async function seedIfEmpty() {
    if (driver.get(SEED_FLAG)) return false;
    if (readAll().length > 0) { driver.set(SEED_FLAG, '1'); return false; }
    writeAll(buildSeed());
    driver.set(SEED_FLAG, '1');
    return true;
  }

  return {
    driverName: driver.name,
    CATEGORIES, DOC_TYPES, PAYMENT_METHODS,
    STATUS_LABEL, STATUS_CLASS, statusFromConfidence,
    getReceipts, getReceiptById, saveReceipt, updateReceipt, deleteReceipt,
    calculateMetrics, seedIfEmpty
  };
})();
