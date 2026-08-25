/* =============================================================================
   utils.js — helpers puros (sin estado de negocio)
   ========================================================================== */
window.U = (function () {
  'use strict';

  /* ---------- DOM ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments, self = this;
      t = setTimeout(() => fn.apply(self, args), ms);
    };
  }

  /* ---------- IDs ---------- */
  function uid() {
    return 'rec_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- Números y moneda (es-AR) ---------- */
  const nfMoney = new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
  });

  function money(n) {
    const v = Number(n) || 0;
    return nfMoney.format(v).replace(/\u00A0/g, '');
  }

  function pct(n, decimals) {
    const v = (Number(n) || 0) * 100;
    return v.toFixed(decimals == null ? 1 : decimals).replace('.', ',') + '%';
  }

  function toNumber(v) {
    if (typeof v === 'number') return v;
    const clean = String(v == null ? '' : v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  /* ---------- Fechas ---------- */
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  /** 'YYYY-MM-DD' → Date local (sin corrimiento por zona horaria). */
  function parseDate(iso) {
    if (!iso) return new Date();
    const m = String(iso).slice(0, 10).split('-');
    return new Date(Number(m[0]), Number(m[1]) - 1, Number(m[2]));
  }

  /** Date → 'YYYY-MM-DD' */
  function toISODate(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /** '2026-08-11' → '11 ago 2026' */
  function dateLong(iso) {
    const d = parseDate(iso);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  /** ISO datetime → '11 ago 2026, 14:32' */
  function dateTime(isoDateTime) {
    const d = new Date(isoDateTime);
    if (isNaN(d)) return '—';
    const p = n => String(n).padStart(2, '0');
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function dayShort(d) { return DAYS[d.getDay()]; }

  function daysAgo(n) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d;
  }

  /* ---------- Archivos e imágenes ---------- */
  function fileSize(bytes) {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Redimensiona y comprime una imagen a dataURL.
   * Necesario: guardar la foto original en localStorage agota la cuota (~5MB) en 2-3 fotos.
   */
  function resizeImage(file, maxDim, quality) {
    maxDim = maxDim || 1100;
    quality = quality == null ? 0.72 : quality;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          try {
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (e) {
            reject(new Error('No se pudo procesar la imagen.'));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- Toasts ---------- */
  const ICON_OK = '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_ERR = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7.5v5.5M12 16.2v.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  function toast(message, type) {
    const root = document.getElementById('toastRoot');
    if (!root) return;
    const isErr = type === 'error';
    const node = el(
      '<div class="toast ' + (isErr ? 'toast-err' : 'toast-ok') + '">' +
      (isErr ? ICON_ERR : ICON_OK) +
      '<span>' + escapeHtml(message) + '</span></div>'
    );
    root.appendChild(node);
    setTimeout(() => {
      node.classList.add('is-out');
      setTimeout(() => node.remove(), 260);
    }, 2600);
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  return {
    $, $$, el, escapeHtml, debounce, uid,
    money, pct, toNumber,
    parseDate, toISODate, dateLong, dateTime, dayShort, daysAgo,
    fileSize, resizeImage, toast, delay
  };
})();
