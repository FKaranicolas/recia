/* =============================================================================
   dashboard.js — resumen: KPIs, actividad de 7 días, categorías y últimos 5
   ========================================================================== */
window.Dashboard = (function () {
  'use strict';

  const esc = U.escapeHtml;

  function kpi(label, value, foot) {
    return '<div class="kpi">' +
      '<div class="kpi-label"><span class="kpi-dot"></span>' + esc(label) + '</div>' +
      '<div class="kpi-value">' + value + '</div>' +
      '<div class="kpi-foot">' + esc(foot) + '</div></div>';
  }

  function chartHTML(byDay) {
    const max = Math.max.apply(null, byDay.map(d => d.count).concat([1]));
    return byDay.map((d, i) => {
      const h = d.count ? Math.max(6, Math.round((d.count / max) * 100)) : 2;
      return '<div class="chart-col' + (d.isToday ? ' chart-today' : '') + '">' +
        '<span class="chart-val">' + d.count + '</span>' +
        '<div class="chart-bar' + (d.count ? '' : ' is-empty') + '" style="height:' + h + '%;animation-delay:' + (i * 55) + 'ms"></div>' +
        '<span class="chart-day">' + esc(d.isToday ? 'hoy' : d.label) + '</span></div>';
    }).join('');
  }

  function categoriesHTML(byCategory, total) {
    if (!total) {
      return '<p class="card-note">Todavía no hay gastos cargados.</p>';
    }
    return byCategory.filter(c => c.amount > 0).map((c, i) =>
      '<div class="cat-row">' +
        '<span class="cat-name">' + esc(c.name) + '</span>' +
        '<span class="cat-amount">' + U.money(c.amount) + '</span>' +
        '<div class="cat-track"><div class="cat-fill" style="width:' + (c.share * 100).toFixed(1) + '%;animation-delay:' + (i * 70) + 'ms"></div></div>' +
        '<span class="cat-pct">' + U.pct(c.share, 1) + '</span>' +
      '</div>'
    ).join('');
  }

  async function render(container) {
    const m = await DB.calculateMetrics();
    const receipts = await DB.getReceipts();
    const latest = receipts.slice(0, 5);

    const week = m.byDay.reduce((s, d) => s + d.count, 0);

    container.innerHTML =
      '<div class="wrap anim-in">' +
        '<header class="page-head">' +
          '<div><p class="eyebrow">RECIA · AI Document Processing</p>' +
          '<h1 class="page-title">Resumen</h1>' +
          '<p class="page-sub">Todo lo que procesaste, en un solo lugar.</p></div>' +
          '<a class="btn btn-primary" href="#/nuevo">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
            'Nuevo comprobante</a>' +
        '</header>' +

        '<div class="kpis">' +
          kpi('Comprobantes procesados', String(m.count), m.pending ? m.pending + ' pendientes de revisión' : 'Todos revisados') +
          kpi('Monto total', U.money(m.total), 'Suma de los totales') +
          kpi('Proveedores', String(m.suppliers), 'CUIT distintos') +
          kpi('Precisión de IA', m.count ? U.pct(m.accuracy, 1) : '—', 'Confianza promedio') +
        '</div>' +

        '<div class="grid-2">' +
          '<section class="card card-pad">' +
            '<div class="card-head"><h2 class="card-title">Comprobantes procesados</h2>' +
            '<span class="card-note">' + week + ' en los últimos 7 días</span></div>' +
            '<div class="chart">' + chartHTML(m.byDay) + '</div>' +
          '</section>' +
          '<section class="card card-pad">' +
            '<div class="card-head"><h2 class="card-title">Gastos por categoría</h2></div>' +
            '<div class="cat">' + categoriesHTML(m.byCategory, m.total) + '</div>' +
          '</section>' +
        '</div>' +

        '<section class="card card-pad">' +
          '<div class="card-head"><h2 class="card-title">Últimos comprobantes</h2>' +
          '<a class="btn btn-ghost" href="#/comprobantes">Ver todos</a></div>' +
          (latest.length
            ? '<div class="rec-list" id="dashLatest">' + latest.map(Receipts.cardHTML).join('') + '</div>'
            : '<div class="empty"><p class="empty-title">Todavía no hay comprobantes</p>' +
              '<p class="empty-text">Sacale una foto a una factura y la IA carga los datos por vos.</p>' +
              '<a class="btn btn-primary" href="#/nuevo">Cargar el primero</a></div>') +
        '</section>' +
      '</div>';

    const list = U.$('#dashLatest', container);
    if (list) {
      list.addEventListener('click', e => {
        const card = e.target.closest('[data-id]');
        if (card) Receipts.openDetail(card.dataset.id);
      });
    }
  }

  return { render };
})();
