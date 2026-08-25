/* =============================================================================
   receipts.js — UI de comprobantes: listado, detalle, edición y formulario
   ========================================================================== */
window.Receipts = (function () {
  'use strict';

  const esc = U.escapeHtml;

  /* =========================== Piezas reutilizables ======================= */

  function statusBadge(status) {
    const label = DB.STATUS_LABEL[status] || 'Revisar';
    const cls = DB.STATUS_CLASS[status] || 'badge-warn';
    return '<span class="badge ' + cls + '">' + esc(label) + '</span>';
  }

  /** Miniatura del documento; los datos demo no tienen foto, así que se dibuja una. */
  function docThumb(receipt) {
    if (receipt.documentImage) {
      return '<img src="' + receipt.documentImage + '" alt="Comprobante de ' + esc(receipt.supplier) + '">';
    }
    return '<div class="doc-ph" role="img" aria-label="Comprobante sin imagen">' +
      '<i class="w1"></i><i class="w2"></i><i class="w3"></i><i class="w4"></i><i class="w2"></i><i class="w3"></i><i class="w5"></i>' +
      '</div>';
  }

  function confidenceBlock(conf) {
    const p = Math.round((Number(conf) || 0) * 100);
    let cls = 'conf-ok', label = 'Alta confianza', text = 'Los datos se detectaron con claridad.';
    if (p < 60) { cls = 'conf-err'; label = 'Requiere revisión'; text = 'Revisá cada campo antes de guardar.'; }
    else if (p < 85) { cls = 'conf-warn'; label = 'Revisar datos'; text = 'Algunos campos pueden estar incompletos.'; }

    const r = 19, c = 2 * Math.PI * r;
    const off = c * (1 - p / 100);
    return '<div class="conf ' + cls + '">' +
      '<div class="conf-ring"><svg viewBox="0 0 44 44">' +
        '<circle cx="22" cy="22" r="' + r + '" fill="none" stroke="currentColor" stroke-width="3.5" opacity=".18"/>' +
        '<circle cx="22" cy="22" r="' + r + '" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" ' +
          'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
      '</svg><span>' + p + '%</span></div>' +
      '<div><div class="conf-label">Confianza de IA · ' + esc(label) + '</div>' +
      '<div class="conf-text">' + esc(text) + '</div></div></div>';
  }

  /* ============================== Formulario ============================== */

  function options(list, selected) {
    return list.map(o => '<option value="' + esc(o) + '"' + (o === selected ? ' selected' : '') + '>' + esc(o) + '</option>').join('');
  }

  function field(name, label, value, opts) {
    opts = opts || {};
    const cls = opts.wide ? 'field wide' : 'field';
    const mono = opts.mono ? ' mono' : '';
    let input;
    if (opts.select) {
      input = '<select name="' + name + '" id="f_' + name + '">' + options(opts.select, value) + '</select>';
    } else {
      input = '<input class="' + mono.trim() + '" type="' + (opts.type || 'text') + '" name="' + name +
        '" id="f_' + name + '" value="' + esc(value == null ? '' : value) + '"' +
        (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : '') +
        (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '>';
    }
    return '<div class="' + cls + '" data-field="' + name + '">' +
      '<label for="f_' + name + '">' + esc(label) + '</label>' + input + '</div>';
  }

  /** Formulario de datos extraídos. Se usa igual al procesar y al editar. */
  function formHTML(d) {
    d = d || {};
    return '<div class="form-grid">' +
      field('documentType', 'Tipo de comprobante', d.documentType, { select: DB.DOC_TYPES }) +
      field('cuit', 'CUIT', d.cuit, { mono: true, placeholder: '30-71234567-8', inputmode: 'numeric' }) +
      field('supplier', 'Proveedor', d.supplier, { wide: true }) +
      field('date', 'Fecha', d.date, { type: 'date' }) +
      field('pointOfSale', 'Punto de venta', d.pointOfSale, { mono: true, inputmode: 'numeric' }) +
      field('invoiceNumber', 'Número de comprobante', d.invoiceNumber, { mono: true, wide: true, inputmode: 'numeric' }) +
      field('subtotal', 'Subtotal', d.subtotal, { mono: true, type: 'number', inputmode: 'decimal' }) +
      field('iva', 'IVA', d.iva, { mono: true, type: 'number', inputmode: 'decimal' }) +
      field('total', 'Total', d.total, { mono: true, type: 'number', inputmode: 'decimal', wide: true }) +
      field('paymentMethod', 'Medio de pago', d.paymentMethod, { select: DB.PAYMENT_METHODS }) +
      field('category', 'Categoría', d.category, { select: DB.CATEGORIES }) +
      '<p class="total-hint">El total se recalcula solo al cambiar subtotal o IVA. Podés sobrescribirlo.</p>' +
      '</div>';
  }

  /** Recalcula el total mientras se editan subtotal e IVA. */
  function wireForm(root) {
    const sub = U.$('[name=subtotal]', root);
    const iva = U.$('[name=iva]', root);
    const tot = U.$('[name=total]', root);
    if (!sub || !iva || !tot) return;
    const sync = () => { tot.value = (U.toNumber(sub.value) + U.toNumber(iva.value)).toFixed(0); };
    sub.addEventListener('input', sync);
    iva.addEventListener('input', sync);
  }

  function clearErrors(root) {
    U.$$('.field.has-error', root).forEach(f => f.classList.remove('has-error'));
    U.$$('.field-error', root).forEach(e => e.remove());
  }

  function showErrors(root, errors) {
    clearErrors(root);
    Object.keys(errors).forEach(name => {
      const f = U.$('[data-field="' + name + '"]', root);
      if (!f) return;
      f.classList.add('has-error');
      f.appendChild(U.el('<p class="field-error">' + esc(errors[name]) + '</p>'));
    });
    const first = U.$('.field.has-error input, .field.has-error select', root);
    if (first) first.focus();
  }

  /** Lee y valida el formulario. Devuelve { data, errors }. */
  function readForm(root) {
    const get = n => {
      const node = U.$('[name=' + n + ']', root);
      return node ? node.value.trim() : '';
    };
    const data = {
      documentType: get('documentType'),
      cuit: get('cuit'),
      supplier: get('supplier'),
      date: get('date'),
      pointOfSale: get('pointOfSale'),
      invoiceNumber: get('invoiceNumber'),
      subtotal: U.toNumber(get('subtotal')),
      iva: U.toNumber(get('iva')),
      total: U.toNumber(get('total')),
      paymentMethod: get('paymentMethod'),
      category: get('category')
    };

    const errors = {};
    if (!data.supplier) errors.supplier = 'Escribí el nombre del proveedor.';
    if (!data.date) errors.date = 'Elegí la fecha del comprobante.';
    if (!(data.total > 0)) errors.total = 'El total tiene que ser mayor a cero.';
    if (data.cuit && data.cuit.replace(/\D/g, '').length !== 11) errors.cuit = 'El CUIT tiene 11 dígitos.';

    return { data, errors };
  }

  /* ============================== Listado ================================= */

  const state = { q: '', type: 'all', category: 'all', range: 'all' };

  function matches(r) {
    if (state.q) {
      const hay = (r.supplier + ' ' + r.cuit + ' ' + r.pointOfSale + ' ' + r.invoiceNumber + ' ' + r.documentType).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
    }
    if (state.type === 'factura' && r.documentType.indexOf('Factura') !== 0) return false;
    if (state.type === 'recibo' && r.documentType !== 'Recibo') return false;
    if (state.type === 'pending' && r.status === 'processed') return false;
    if (state.category !== 'all' && r.category !== state.category) return false;
    if (state.range !== 'all') {
      const limit = U.daysAgo(state.range === '7' ? 7 : 30);
      if (U.parseDate(r.date) < limit) return false;
    }
    return true;
  }

  function cardHTML(r, i) {
    return '<button class="rec-card" data-id="' + r.id + '" style="animation-delay:' + Math.min(i * 22, 220) + 'ms">' +
      '<div><span class="rec-supplier">' + esc(r.supplier) + '</span>' +
      '<div class="rec-meta">' + esc(r.documentType) + ' · ' + esc(r.pointOfSale) + '-' + esc(r.invoiceNumber) + '</div>' +
      '<div class="rec-date">' + U.dateLong(r.date) + ' · ' + esc(r.category) + '</div></div>' +
      '<div class="rec-right"><span class="rec-total">' + U.money(r.total) + '</span>' + statusBadge(r.status) + '</div>' +
      '</button>';
  }

  function rowHTML(r) {
    return '<tr data-id="' + r.id + '" tabindex="0">' +
      '<td class="cell-mono">' + U.dateLong(r.date) + '</td>' +
      '<td class="cell-strong">' + esc(r.supplier) + '</td>' +
      '<td>' + esc(r.documentType) + '</td>' +
      '<td class="cell-mono">' + esc(r.pointOfSale) + '-' + esc(r.invoiceNumber) + '</td>' +
      '<td><span class="chip-cat">' + esc(r.category) + '</span></td>' +
      '<td class="cell-mono ta-right">' + U.money(r.total) + '</td>' +
      '<td>' + statusBadge(r.status) + '</td>' +
      '</tr>';
  }

  function resultsHTML(list) {
    if (!list.length) {
      return '<div class="card empty">' +
        '<p class="empty-title">No hay comprobantes para este filtro</p>' +
        '<p class="empty-text">Probá con otra búsqueda, o cargá un comprobante nuevo con una foto.</p>' +
        '<a class="btn btn-primary" href="#/nuevo">Nuevo comprobante</a></div>';
    }
    return '<div class="rec-list mobile-only">' + list.map(cardHTML).join('') + '</div>' +
      '<div class="card desktop-only" style="padding:18px 6px 6px">' +
        '<div class="table-wrap"><table class="rec-table"><thead><tr>' +
        '<th>Fecha</th><th>Proveedor</th><th>Tipo</th><th>Comprobante</th><th>Categoría</th>' +
        '<th class="ta-right">Total</th><th>Estado</th></tr></thead><tbody>' +
        list.map(rowHTML).join('') + '</tbody></table></div></div>';
  }

  async function renderResults(container) {
    const all = await DB.getReceipts();
    const list = all.filter(matches);
    const box = U.$('#listResults', container);
    box.innerHTML = resultsHTML(list);
    U.$('#listCount', container).textContent =
      list.length + (list.length === 1 ? ' comprobante' : ' comprobantes');
  }

  async function renderList(container) {
    container.innerHTML =
      '<div class="wrap anim-in">' +
        '<header class="page-head">' +
          '<div><p class="eyebrow">Archivo</p><h1 class="page-title">Comprobantes</h1>' +
          '<p class="page-sub">Todos tus documentos procesados.</p></div>' +
          '<a class="btn btn-primary" href="#/nuevo">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            'Nuevo comprobante</a>' +
        '</header>' +

        '<div class="toolbar">' +
          '<div class="search">' +
            '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
            '<input id="listSearch" type="search" placeholder="Buscar proveedor, CUIT o comprobante..." value="' + esc(state.q) + '" aria-label="Buscar comprobantes">' +
          '</div>' +
          '<div class="selects">' +
            '<select class="mini" id="listCategory" aria-label="Categoría"><option value="all">Todas las categorías</option>' +
              options(DB.CATEGORIES, state.category) + '</select>' +
            '<select class="mini" id="listRange" aria-label="Fecha">' +
              '<option value="all">Todas las fechas</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option>' +
            '</select>' +
          '</div>' +
        '</div>' +

        '<div class="filters" role="group" aria-label="Filtrar por tipo">' +
          '<button class="chip" data-type="all">Todos</button>' +
          '<button class="chip" data-type="factura">Facturas</button>' +
          '<button class="chip" data-type="recibo">Recibos</button>' +
          '<button class="chip" data-type="pending">Pendientes de revisión</button>' +
        '</div>' +

        '<p class="card-note" id="listCount" style="margin:14px 2px"></p>' +
        '<div id="listResults"></div>' +
      '</div>';

    // Estado actual reflejado en los controles
    U.$$('.chip[data-type]', container).forEach(c =>
      c.setAttribute('aria-pressed', String(c.dataset.type === state.type)));
    U.$('#listCategory', container).value = state.category;
    U.$('#listRange', container).value = state.range;

    U.$('#listSearch', container).addEventListener('input', U.debounce(e => {
      state.q = e.target.value;
      renderResults(container);
    }, 180));

    U.$('#listCategory', container).addEventListener('change', e => {
      state.category = e.target.value; renderResults(container);
    });
    U.$('#listRange', container).addEventListener('change', e => {
      state.range = e.target.value; renderResults(container);
    });

    U.$$('.chip[data-type]', container).forEach(chip => {
      chip.addEventListener('click', () => {
        state.type = chip.dataset.type;
        U.$$('.chip[data-type]', container).forEach(c =>
          c.setAttribute('aria-pressed', String(c === chip)));
        renderResults(container);
      });
    });

    // Un solo listener para cards y filas
    U.$('#listResults', container).addEventListener('click', e => {
      const node = e.target.closest('[data-id]');
      if (node) openDetail(node.dataset.id);
    });
    U.$('#listResults', container).addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const row = e.target.closest('tr[data-id]');
      if (row) { e.preventDefault(); openDetail(row.dataset.id); }
    });

    await renderResults(container);
  }

  /* =============================== Detalle ================================ */

  function detailHTML(r) {
    const dl = [
      ['Tipo de comprobante', esc(r.documentType), ''],
      ['CUIT', esc(r.cuit || '—'), 'mono'],
      ['Proveedor', esc(r.supplier), 'wide'],
      ['Punto de venta', esc(r.pointOfSale || '—'), 'mono'],
      ['Número', esc(r.invoiceNumber || '—'), 'mono'],
      ['Fecha del comprobante', U.dateLong(r.date), ''],
      ['Medio de pago', esc(r.paymentMethod || '—'), ''],
      ['Subtotal', U.money(r.subtotal), 'mono'],
      ['IVA', U.money(r.iva), 'mono'],
      ['Categoría', esc(r.category), ''],
      ['Procesado el', U.dateTime(r.createdAt), '']
    ].map(item => {
      const wide = item[2] === 'wide';
      const mono = item[2] === 'mono';
      return '<div class="dl-item' + (wide ? ' wide' : '') + '"><div class="dl-k">' + item[0] + '</div>' +
        '<div class="dl-v' + (mono ? ' mono' : '') + '">' + item[1] + '</div></div>';
    }).join('');

    return '<div class="detail-body">' +
      '<div><div class="detail-doc">' + docThumb(r) + '</div></div>' +
      '<div>' +
        confidenceBlock(r.aiConfidence) +
        '<div class="dl">' +
          '<div class="dl-item"><div class="dl-k">Total</div><div class="dl-v big">' + U.money(r.total) + '</div></div>' +
          '<div class="dl-item"><div class="dl-k">Estado</div><div class="dl-v">' + statusBadge(r.status) + '</div></div>' +
          dl +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="form-actions">' +
      '<button class="btn btn-primary" data-act="edit">Editar</button>' +
      '<button class="btn btn-danger" data-act="delete">Eliminar</button>' +
      '<button class="btn btn-ghost" data-act="close">Volver</button>' +
    '</div>';
  }

  function editHTML(r) {
    return '<form id="editForm" novalidate>' + formHTML(r) +
      '<div class="form-actions">' +
        '<button class="btn btn-primary" type="submit">Guardar cambios</button>' +
        '<button class="btn btn-ghost" type="button" data-act="cancel">Cancelar</button>' +
      '</div></form>';
  }

  async function openDetail(id) {
    const r = await DB.getReceiptById(id);
    if (!r) { U.toast('Ese comprobante ya no está.', 'error'); return; }

    const modal = App.openModal('Detalle del comprobante', detailHTML(r));
    bindDetail(modal, r);
  }

  function bindDetail(modal, r) {
    const body = U.$('.modal-body', modal);

    body.addEventListener('click', async e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;

      if (act === 'close') App.closeModal();

      if (act === 'edit') {
        U.$('.modal-title', modal).textContent = 'Editar comprobante';
        body.innerHTML = editHTML(r);
        const form = U.$('#editForm', body);
        wireForm(form);

        U.$('[data-act=cancel]', form).addEventListener('click', () => {
          U.$('.modal-title', modal).textContent = 'Detalle del comprobante';
          body.innerHTML = detailHTML(r);
        });

        form.addEventListener('submit', async ev => {
          ev.preventDefault();
          const read = readForm(form);
          if (Object.keys(read.errors).length) { showErrors(form, read.errors); return; }
          try {
            // Revisado por una persona: el comprobante queda como procesado.
            const updated = await DB.updateReceipt(r.id, Object.assign({}, read.data, { status: 'processed' }));
            App.closeModal();
            U.toast('Comprobante actualizado');
            App.refresh();
          } catch (err) {
            U.toast(err.message, 'error');
          }
        });
      }

      if (act === 'delete') {
        if (btn.dataset.confirm !== '1') {
          btn.dataset.confirm = '1';
          btn.textContent = 'Confirmar eliminación';
          setTimeout(() => {
            if (!btn.isConnected) return;
            btn.dataset.confirm = '';
            btn.textContent = 'Eliminar';
          }, 4000);
          return;
        }
        try {
          await DB.deleteReceipt(r.id);
          App.closeModal();
          U.toast('Comprobante eliminado');
          App.refresh();
        } catch (err) {
          U.toast(err.message, 'error');
        }
      }
    });
  }

  return {
    statusBadge, docThumb, confidenceBlock,
    formHTML, wireForm, readForm, showErrors, clearErrors,
    renderList, openDetail, cardHTML
  };
})();
