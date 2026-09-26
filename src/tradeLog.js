import { getTrades, addTrade, updateTrade, deleteTrade, TICKERS, DIRECTIONS, DOL_TARGETS, LIQUIDITY_TARGETS, CONTRACTS } from './store.js';

/**
 * Renders the Trade Log view with an interactive table and add-trade modal.
 * @param {HTMLElement} container
 */
export function renderTradeLog(container) {
  const trades = getTrades();

  container.innerHTML = `
    <div class="trade-log-header">
      <h2>📋 Trade Log</h2>
      <div class="trade-log-actions">
        <button class="btn btn-primary" id="add-trade-btn">
          <span class="btn-icon">+</span> New Trade
        </button>
        <button class="btn btn-ghost" id="export-btn">📤 Export</button>
        <button class="btn btn-ghost" id="import-btn">📥 Import</button>
        <button class="btn btn-danger" id="clear-btn">🗑 Clear All</button>
        <input type="file" id="import-file" accept=".json" style="display:none">
      </div>
    </div>

    <div class="table-wrapper">
      <table class="trade-table">
        <thead>
          <tr>
            <th>📅 Date</th>
            <th>📈 Ticker</th>
            <th>🔁 Direction</th>
            <th>📦 Qty</th>
            <th>🔢 Pt Value</th>
            <th>💵 Entry</th>
            <th>💵 Exit</th>
            <th>💰 P&L</th>
            <th>✅ Win</th>
            <th>❌ Loss</th>
            <th>🎯 DOL Target</th>
            <th>💧 Liquidity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="trade-table-body">
          ${trades.length === 0 ? `
            <tr class="empty-row">
              <td colspan="13">
                <div class="empty-state">
                  <span class="empty-icon">📊</span>
                  <p>No trades yet. Click <strong>+ New Trade</strong> to get started.</p>
                </div>
              </td>
            </tr>
          ` : trades.map(t => renderTradeRow(t)).join('')}
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Trade Modal -->
    <div class="modal-overlay" id="trade-modal" style="display:none">
      <div class="modal">
        <div class="modal-header">
          <h3 id="modal-title">➕ New Trade</h3>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <form id="trade-form" class="trade-form">
          <input type="hidden" id="trade-id">

          <div class="form-grid">
            <div class="form-group">
              <label for="trade-date">📅 Date</label>
              <input type="date" id="trade-date" required value="${new Date().toISOString().split('T')[0]}">
            </div>

            <div class="form-group">
              <label for="trade-ticker">📈 Ticker</label>
              <div class="select-wrapper">
                <select id="trade-ticker" required>
                  <option value="">Select...</option>
                  ${TICKERS.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="trade-direction">🔁 Direction</label>
              <div class="select-wrapper">
                <select id="trade-direction" required>
                  <option value="">Select...</option>
                  ${DIRECTIONS.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="trade-quantity">📦 Quantity</label>
              <input type="number" id="trade-quantity" min="1" step="1" required value="1">
            </div>

            <div class="form-group">
              <label for="trade-entry">💵 Entry Price</label>
              <input type="number" id="trade-entry" step="0.01" required placeholder="0.00">
            </div>

            <div class="form-group">
              <label for="trade-exit">💵 Exit Price</label>
              <input type="number" id="trade-exit" step="0.01" required placeholder="0.00">
            </div>

            <div class="form-group">
              <label for="trade-dol">🎯 DOL Target</label>
              <div class="select-wrapper">
                <select id="trade-dol" required>
                  <option value="">Select...</option>
                  ${DOL_TARGETS.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="trade-liquidity">💧 Liquidity Target</label>
              <div class="select-wrapper">
                <select id="trade-liquidity" required>
                  <option value="">Select...</option>
                  ${LIQUIDITY_TARGETS.map(l => `<option value="${l}">${l}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group form-group-toggle">
              <label>Result</label>
              <div class="result-toggles">
                <label class="toggle-label win-toggle">
                  <input type="radio" name="trade-result" value="win" id="trade-win" required>
                  <span class="toggle-btn toggle-win">✅ Win</span>
                </label>
                <label class="toggle-label loss-toggle">
                  <input type="radio" name="trade-result" value="loss" id="trade-loss">
                  <span class="toggle-btn toggle-loss">❌ Loss</span>
                </label>
              </div>
            </div>
          </div>

          <div class="form-preview" id="form-preview" style="display:none">
            <div class="preview-item">
              <span class="preview-label">Point Value:</span>
              <span class="preview-value" id="preview-pv">—</span>
            </div>
            <div class="preview-item">
              <span class="preview-label">Estimated P&L:</span>
              <span class="preview-value" id="preview-pnl">—</span>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-ghost" id="modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">💾 Save Trade</button>
          </div>
        </form>
      </div>
    </div>
  `;

  attachTradeLogListeners(container);
}

function renderTradeRow(trade) {
  const pnlClass = trade.pnl > 0 ? 'positive' : trade.pnl < 0 ? 'negative' : '';
  const dirClass = trade.direction === 'Buy' ? 'dir-buy' : 'dir-sell';

  return `
    <tr data-id="${trade.id}">
      <td>${formatDate(trade.date)}</td>
      <td><span class="ticker-badge">${trade.ticker}</span></td>
      <td><span class="direction-badge ${dirClass}">${trade.direction}</span></td>
      <td>${trade.quantity}</td>
      <td>${trade.pointValue}</td>
      <td>${formatCurrency(trade.entryPrice)}</td>
      <td>${formatCurrency(trade.exitPrice)}</td>
      <td class="${pnlClass}">${formatCurrency(trade.pnl)}</td>
      <td>${trade.win ? '✅' : ''}</td>
      <td>${trade.loss ? '❌' : ''}</td>
      <td><span class="target-tag">${trade.dolTarget || '—'}</span></td>
      <td><span class="target-tag">${trade.liquidityTarget || '—'}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn-icon-sm edit-btn" title="Edit" data-id="${trade.id}">✏️</button>
          <button class="btn-icon-sm delete-btn" title="Delete" data-id="${trade.id}">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}

function attachTradeLogListeners(container) {
  const modal = container.querySelector('#trade-modal');
  const form = container.querySelector('#trade-form');
  const addBtn = container.querySelector('#add-trade-btn');
  const closeBtn = container.querySelector('#modal-close');
  const cancelBtn = container.querySelector('#modal-cancel');
  const exportBtn = container.querySelector('#export-btn');
  const importBtn = container.querySelector('#import-btn');
  const importFile = container.querySelector('#import-file');
  const clearBtn = container.querySelector('#clear-btn');

  // Live P&L preview
  const tickerSel = container.querySelector('#trade-ticker');
  const dirSel = container.querySelector('#trade-direction');
  const qtyInput = container.querySelector('#trade-quantity');
  const entryInput = container.querySelector('#trade-entry');
  const exitInput = container.querySelector('#trade-exit');
  const previewDiv = container.querySelector('#form-preview');
  const previewPV = container.querySelector('#preview-pv');
  const previewPnl = container.querySelector('#preview-pnl');

  function updatePreview() {
    const ticker = tickerSel.value;
    const direction = dirSel.value;
    const qty = parseFloat(qtyInput.value) || 0;
    const entry = parseFloat(entryInput.value) || 0;
    const exit = parseFloat(exitInput.value) || 0;

    if (ticker && direction && entry && exit) {
      const pv = CONTRACTS[ticker] || 0;
      const pnl = direction === 'Buy'
        ? (exit - entry) * qty * pv
        : (entry - exit) * qty * pv;

      previewPV.textContent = `$${pv}`;
      previewPnl.textContent = formatCurrency(pnl);
      previewPnl.className = `preview-value ${pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : ''}`;
      previewDiv.style.display = 'flex';
    } else {
      previewDiv.style.display = 'none';
    }
  }

  [tickerSel, dirSel, qtyInput, entryInput, exitInput].forEach(el => {
    el.addEventListener('input', updatePreview);
    el.addEventListener('change', updatePreview);
  });

  // Open modal for new trade
  addBtn.addEventListener('click', () => {
    form.reset();
    container.querySelector('#trade-id').value = '';
    container.querySelector('#modal-title').textContent = '➕ New Trade';
    container.querySelector('#trade-date').value = new Date().toISOString().split('T')[0];
    previewDiv.style.display = 'none';
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  });

  // Close modal
  function closeModal() {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 200);
  }
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Submit trade
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = container.querySelector('#trade-id').value;
    const tradeData = {
      date: container.querySelector('#trade-date').value,
      ticker: tickerSel.value,
      direction: dirSel.value,
      quantity: parseInt(qtyInput.value),
      entryPrice: parseFloat(entryInput.value),
      exitPrice: parseFloat(exitInput.value),
      dolTarget: container.querySelector('#trade-dol').value,
      liquidityTarget: container.querySelector('#trade-liquidity').value,
      win: container.querySelector('#trade-win').checked,
      loss: container.querySelector('#trade-loss').checked,
    };

    if (id) {
      updateTrade(id, tradeData);
      showToast('Trade updated successfully', 'success');
    } else {
      addTrade(tradeData);
      showToast('Trade added successfully', 'success');
    }

    closeModal();
    // Re-render
    if (window.app && window.app.refresh) window.app.refresh();
  });

  // Edit trade
  container.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tradeId = btn.dataset.id;
      const trades = getTrades();
      const trade = trades.find(t => t.id === tradeId);
      if (!trade) return;

      container.querySelector('#trade-id').value = trade.id;
      container.querySelector('#modal-title').textContent = '✏️ Edit Trade';
      container.querySelector('#trade-date').value = trade.date;
      tickerSel.value = trade.ticker;
      dirSel.value = trade.direction;
      qtyInput.value = trade.quantity;
      entryInput.value = trade.entryPrice;
      exitInput.value = trade.exitPrice;
      container.querySelector('#trade-dol').value = trade.dolTarget;
      container.querySelector('#trade-liquidity').value = trade.liquidityTarget;

      if (trade.win) container.querySelector('#trade-win').checked = true;
      else if (trade.loss) container.querySelector('#trade-loss').checked = true;

      updatePreview();
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('active'), 10);
    });
  });

  // Delete trade
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this trade?')) {
        deleteTrade(btn.dataset.id);
        showToast('Trade deleted', 'success');
        if (window.app && window.app.refresh) window.app.refresh();
      }
    });
  });

  // Export
  exportBtn.addEventListener('click', () => {
    const { exportData } = require_store();
    exportData();
    showToast('Data exported', 'success');
  });

  // Import
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const { importData } = require_store();
        const count = importData(event.target.result);
        showToast(`Imported ${count} trades`, 'success');
        if (window.app && window.app.refresh) window.app.refresh();
      } catch (err) {
        showToast('Import failed: invalid file', 'error');
      }
    };
    reader.readAsText(file);
    importFile.value = '';
  });

  // Clear all
  clearBtn.addEventListener('click', () => {
    if (confirm('⚠️ This will delete ALL trades. Are you sure?')) {
      const { clearAllTrades } = require_store();
      clearAllTrades();
      showToast('All trades cleared', 'success');
      if (window.app && window.app.refresh) window.app.refresh();
    }
  });
}

// Lazy import helper to avoid circular deps
function require_store() {
  return { exportData, importData, clearAllTrades };
}
// Re-import at top level
import { exportData, importData, clearAllTrades } from './store.js';

function formatCurrency(value) {
  if (value == null || isNaN(value)) return '—';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('active'), 10);
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
