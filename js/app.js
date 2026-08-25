/* =============================================================================
   app.js — router, modal y flujo de captura (foto → IA → datos → guardado)
   ========================================================================== */
window.App = (function () {
  'use strict';

  const esc = U.escapeHtml;
  const VIEWS = ['dashboard', 'nuevo', 'comprobantes'];
  let current = 'dashboard';

  /* ================================ Modal ================================= */
  let lastFocused = null;

  function openModal(title, bodyHTML) {
    closeModal();
    lastFocused = document.activeElement;

    const backdrop = U.el(
      '<div class="modal-backdrop">' +
        '<div class="modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
          '<div class="modal-grab"></div>' +
          '<div class="modal-head"><h2 class="modal-title">' + esc(title) + '</h2>' +
            '<button class="modal-close" aria-label="Cerrar">' +
              '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            '</button></div>' +
          '<div class="modal-body"></div>' +
        '</div></div>'
    );
    U.$('.modal-body', backdrop).innerHTML = bodyHTML;

    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
    U.$('.modal-close', backdrop).addEventListener('click', closeModal);

    document.getElementById('modalRoot').appendChild(backdrop);
    document.body.style.overflow = 'hidden';
    U.$('.modal-close', backdrop).focus();
    return U.$('.modal', backdrop);
  }

  function closeModal() {
    const open = U.$('#modalRoot .modal-backdrop');
    if (!open) return;
    open.remove();
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.isConnected) lastFocused.focus();
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ============================ Captura + IA ============================== */
  let capture = null;

  function resetCapture() {
    capture = { stage: 'idle', image: null, name: '', size: 0, extracted: null };
  }

  const ICON_CAM = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8.5h3.2L9 6h6l1.8 2.5H20V19H4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.2" stroke="currentColor" stroke-width="1.7"/></svg>';
  const ICON_UP = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 16V5m0 0L8 9m4-4l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 18.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function headNuevo(sub) {
    return '<header class="page-head"><div>' +
      '<p class="eyebrow">Captura</p><h1 class="page-title">Nuevo comprobante</h1>' +
      '<p class="page-sub">' + esc(sub) + '</p></div></header>';
  }

  function stageIdleHTML() {
    return headNuevo('Sacale una foto a tu factura o recibo y la IA se encarga de extraer la información.') +
      '<div class="capture-zone" id="dropZone">' +
        '<div class="capture-icon">' + ICON_CAM + '</div>' +
        '<h2 class="capture-title">Poné el comprobante frente a la cámara</h2>' +
        '<p class="capture-text">Funciona con facturas A, B y C, y con recibos. No hace falta recortar la imagen.</p>' +
        '<div class="capture-actions">' +
          '<button class="btn btn-primary btn-lg" id="btnCamera">' + ICON_CAM + 'Sacar foto</button>' +
          '<button class="btn btn-lg" id="btnUpload">' + ICON_UP + 'Subir imagen</button>' +
        '</div>' +
        '<p class="capture-hint">También podés arrastrar una imagen hasta acá.</p>' +
      '</div>' +
      '<input type="file" id="camInput" accept="image/*" capture="environment">' +
      '<input type="file" id="fileInput" accept="image/*">';
  }

  function stagePreviewHTML() {
    return headNuevo('Revisá que se lea el comprobante y procesalo.') +
      '<div class="doc-card">' +
        '<div class="doc-frame"><img src="' + capture.image + '" alt="Comprobante capturado"></div>' +
        '<div class="doc-info"><div style="min-width:0;flex:1">' +
          '<div class="doc-name">' + esc(capture.name) + '</div>' +
          '<div class="doc-size">' + U.fileSize(capture.size) + '</div></div></div>' +
        '<div class="doc-actions">' +
          '<button class="btn btn-primary" id="btnProcess">Procesar con IA</button>' +
          '<button class="btn btn-danger" id="btnDiscard">Eliminar</button>' +
        '</div>' +
      '</div>';
  }

  function stageProcessingHTML() {
    const steps = AI.STEPS.map((s, i) =>
      '<div class="step" data-step="' + i + '">' +
        '<span class="step-mark">' + ICON_CHECK + '</span><span>' + esc(s) + '</span></div>'
    ).join('');

    return headNuevo('Analizando comprobante. Esto tarda unos segundos.') +
      '<div class="result-grid">' +
        '<div class="doc-card"><div class="doc-frame">' +
          '<img src="' + capture.image + '" alt="Comprobante en proceso">' +
          '<div class="scanline"></div>' +
        '</div></div>' +
        '<div class="card card-pad">' +
          '<div class="card-head"><h2 class="card-title" id="procTitle">Analizando comprobante</h2></div>' +
          '<div class="steps" id="procSteps">' + steps + '</div>' +
          '<div class="progress"><div class="progress-fill" id="procBar" style="width:0%"></div></div>' +
        '</div>' +
      '</div>';
  }

  function stageResultHTML() {
    const d = capture.extracted;
    return headNuevo('Revisá los datos detectados. Podés corregir cualquier campo antes de guardar.') +
      '<div class="result-grid">' +
        '<div class="doc-card"><div class="doc-frame">' +
          '<img src="' + capture.image + '" alt="Comprobante procesado"></div></div>' +
        '<div class="card card-pad">' +
          '<div class="card-head"><h2 class="card-title">Resultado del procesamiento</h2></div>' +
          Receipts.confidenceBlock(d.aiConfidence) +
          '<form id="resultForm" novalidate style="margin-top:16px">' +
            Receipts.formHTML(d) +
            '<div class="form-actions">' +
              '<button class="btn btn-primary" type="submit">Guardar comprobante</button>' +
              '<button class="btn btn-ghost" type="button" id="btnDiscard">Descartar</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>';
  }

  function renderNuevo(container) {
    let html;
    if (capture.stage === 'preview') html = stagePreviewHTML();
    else if (capture.stage === 'processing') html = stageProcessingHTML();
    else if (capture.stage === 'result') html = stageResultHTML();
    else html = stageIdleHTML();

    container.innerHTML = '<div class="wrap anim-in">' + html + '</div>';
    wireNuevo(container);
  }

  async function acceptFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      U.toast('Ese archivo no es una imagen. Subí una foto del comprobante.', 'error');
      return;
    }
    try {
      capture.image = await U.resizeImage(file);
      capture.name = file.name || 'comprobante.jpg';
      capture.size = file.size;
      capture.stage = 'preview';
      renderNuevo(U.$('[data-view=nuevo]'));
    } catch (err) {
      U.toast(err.message, 'error');
    }
  }

  async function runAI(container) {
    capture.stage = 'processing';
    renderNuevo(container);

    const stepNodes = U.$$('#procSteps .step', container);
    const bar = U.$('#procBar', container);
    const title = U.$('#procTitle', container);

    const extracted = await AI.processDocumentWithAI(capture.image, {
      onStep: (i, total) => {
        stepNodes.forEach((n, idx) => {
          n.classList.toggle('is-done', idx < i);
          n.classList.toggle('is-active', idx === i);
        });
        if (bar) bar.style.width = Math.round((i / total) * 100) + '%';
        if (i >= total && title) title.textContent = 'Comprobante procesado';
      }
    });

    capture.extracted = extracted;
    capture.stage = 'result';
    renderNuevo(container);
  }

  function wireNuevo(container) {
    const cam = U.$('#camInput', container);
    const file = U.$('#fileInput', container);
    const zone = U.$('#dropZone', container);

    if (cam) {
      U.$('#btnCamera', container).addEventListener('click', () => cam.click());
      cam.addEventListener('change', e => acceptFile(e.target.files[0]));
    }
    if (file) {
      U.$('#btnUpload', container).addEventListener('click', () => file.click());
      file.addEventListener('change', e => acceptFile(e.target.files[0]));
    }
    if (zone) {
      ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => {
        e.preventDefault(); zone.classList.add('is-over');
      }));
      ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => {
        e.preventDefault(); zone.classList.remove('is-over');
      }));
      zone.addEventListener('drop', e => acceptFile(e.dataTransfer.files[0]));
    }

    const process = U.$('#btnProcess', container);
    if (process) process.addEventListener('click', () => runAI(container));

    const discard = U.$('#btnDiscard', container);
    if (discard) discard.addEventListener('click', () => {
      resetCapture();
      renderNuevo(container);
    });

    const form = U.$('#resultForm', container);
    if (form) {
      Receipts.wireForm(form);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const read = Receipts.readForm(form);
        if (Object.keys(read.errors).length) {
          Receipts.showErrors(form, read.errors);
          U.toast('Revisá los campos marcados.', 'error');
          return;
        }
        try {
          await DB.saveReceipt(Object.assign({}, read.data, {
            documentImage: capture.image,
            aiConfidence: capture.extracted.aiConfidence
          }));
          U.toast('Comprobante guardado correctamente');
          resetCapture();
          location.hash = '#/dashboard';
        } catch (err) {
          U.toast(err.message, 'error');
        }
      });
    }
  }

  /* ================================ Router ================================ */
  function viewFromHash() {
    const name = (location.hash || '').replace('#/', '').trim();
    return VIEWS.indexOf(name) >= 0 ? name : 'dashboard';
  }

  async function renderView(name) {
    current = name;
    U.$$('.view').forEach(v => { v.hidden = v.dataset.view !== name; });
    U.$$('[data-nav]').forEach(a => {
      if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const container = U.$('.view[data-view=' + name + ']');
    if (name === 'dashboard') await Dashboard.render(container);
    if (name === 'comprobantes') await Receipts.renderList(container);
    if (name === 'nuevo') renderNuevo(container);

    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }

  async function onRoute() {
    const name = viewFromHash();
    if (name === 'nuevo' && current !== 'nuevo') resetCapture();
    closeModal();
    await renderView(name);
  }

  /** Vuelve a dibujar la vista actual (después de guardar, editar o eliminar). */
  function refresh() {
    return renderView(current);
  }

  /* ================================ Init ================================== */
  async function init() {
    resetCapture();
    await DB.seedIfEmpty();

    const badge = document.getElementById('storageBadge');
    if (badge) badge.textContent = 'Datos en ' + DB.driverName;

    window.addEventListener('hashchange', onRoute);
    if (!location.hash) location.hash = '#/dashboard';
    await onRoute();
  }

  return { init, refresh, openModal, closeModal };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
