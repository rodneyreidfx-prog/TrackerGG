import { getTrades, DOL_TARGETS, LIQUIDITY_TARGETS, TICKERS } from './store.js';

// --- Formatters ---
const formatCurrency = (val) => {
    if (val == null || isNaN(val)) return '$0.00';
    const num = Number(val);
    const sign = num < 0 ? '-' : '';
    return `${sign}$${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (val) => {
    if (val == null || isNaN(val)) return '0.0%';
    return `${(Number(val) * 100).toFixed(1)}%`;
};

const getColorClass = (val) => {
    const num = Number(val);
    if (num > 0) return 'positive';
    if (num < 0) return 'negative';
    return '';
};

// --- Helper for grouping stats ---
function calculateStats(trades) {
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.win === true);
    const losses = trades.filter(t => t.loss === true);
    
    const grossWins = wins.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const grossLosses = losses.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const totalPnl = grossWins + grossLosses;
    
    return {
        totalTrades,
        totalWins: wins.length,
        totalLosses: losses.length,
        winRate: totalTrades > 0 ? wins.length / totalTrades : 0,
        totalPnl,
        avgPnl: totalTrades > 0 ? totalPnl / totalTrades : 0,
        avgWin: wins.length > 0 ? grossWins / wins.length : 0,
        avgLoss: losses.length > 0 ? grossLosses / losses.length : 0,
        largestWin: wins.length > 0 ? Math.max(...wins.map(t => Number(t.pnl) || 0)) : 0,
        largestLoss: losses.length > 0 ? Math.min(...losses.map(t => Number(t.pnl) || 0)) : 0,
        grossWins,
        grossLosses,
        profitFactor: grossLosses !== 0 ? grossWins / Math.abs(grossLosses) : (grossWins > 0 ? grossWins : 0) // if no losses, PF is grossWins (or handle as ∞)
    };
}

export function renderAnalytics(container) {
    if (!container) return;
    
    // 1. Get all trades from store (with valid ticker)
    const allTrades = getTrades().filter(t => !!t.ticker);
    const stats = calculateStats(allTrades);

    // --- HTML GENERATORS ---

    // 1. Summary Metrics
    const renderSummaryMetrics = () => `
        <div class="glass-card">
            <h2>📊 Summary Metrics</h2>
            <div class="metric-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div class="metric-card"><div class="metric-value">${stats.totalTrades}</div><div class="metric-label">Total Trades</div></div>
                <div class="metric-card"><div class="metric-value positive">${stats.totalWins}</div><div class="metric-label">Total Wins</div></div>
                <div class="metric-card"><div class="metric-value negative">${stats.totalLosses}</div><div class="metric-label">Total Losses</div></div>
                <div class="metric-card"><div class="metric-value">${formatPercent(stats.winRate)}</div><div class="metric-label">Win Rate</div></div>
                <div class="metric-card"><div class="metric-value ${getColorClass(stats.totalPnl)}">${formatCurrency(stats.totalPnl)}</div><div class="metric-label">Total P&L</div></div>
                <div class="metric-card"><div class="metric-value ${getColorClass(stats.avgPnl)}">${formatCurrency(stats.avgPnl)}</div><div class="metric-label">Avg P&L / Trade</div></div>
                <div class="metric-card"><div class="metric-value positive">${formatCurrency(stats.avgWin)}</div><div class="metric-label">Avg Win</div></div>
                <div class="metric-card"><div class="metric-value negative">${formatCurrency(stats.avgLoss)}</div><div class="metric-label">Avg Loss</div></div>
                <div class="metric-card"><div class="metric-value positive">${formatCurrency(stats.largestWin)}</div><div class="metric-label">Largest Win</div></div>
                <div class="metric-card"><div class="metric-value negative">${formatCurrency(stats.largestLoss)}</div><div class="metric-label">Largest Loss</div></div>
                <div class="metric-card"><div class="metric-value positive">${formatCurrency(stats.grossWins)}</div><div class="metric-label">Gross Wins</div></div>
                <div class="metric-card"><div class="metric-value negative">${formatCurrency(stats.grossLosses)}</div><div class="metric-label">Gross Losses</div></div>
                <div class="metric-card"><div class="metric-value">${stats.profitFactor.toFixed(2)}</div><div class="metric-label">Profit Factor</div></div>
            </div>
        </div>
    `;

    // 2. By Ticker Table
    const renderTickerTable = () => {
        const tickerStats = TICKERS.map(ticker => {
            const tTrades = allTrades.filter(t => t.ticker === ticker);
            return { ticker, stats: calculateStats(tTrades) };
        });

        const rows = tickerStats.map(({ ticker, stats }) => `
            <tr>
                <td>${ticker}</td>
                <td>${stats.totalTrades}</td>
                <td>${formatPercent(stats.winRate)}</td>
                <td class="${getColorClass(stats.totalPnl)}">${formatCurrency(stats.totalPnl)}</td>
                <td class="${getColorClass(stats.avgPnl)}">${formatCurrency(stats.avgPnl)}</td>
            </tr>
        `).join('');

        return `
        <div class="glass-card">
            <h2>📈 Performance by Ticker</h2>
            <table class="analytics-table">
                <thead><tr><th>Ticker</th><th>Trades</th><th>Win Rate</th><th>Total P&L</th><th>Avg P&L</th></tr></thead>
                <tbody>
                    ${rows}
                    <tr style="font-weight: bold;">
                        <td>TOTAL</td>
                        <td>${stats.totalTrades}</td>
                        <td>${formatPercent(stats.winRate)}</td>
                        <td class="${getColorClass(stats.totalPnl)}">${formatCurrency(stats.totalPnl)}</td>
                        <td class="${getColorClass(stats.avgPnl)}">${formatCurrency(stats.avgPnl)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;
    };

    // 3. & 4. Category Analysis Tables
    const renderCategoryTable = (title, categories, fieldName) => {
        const rows = categories.map(cat => {
            const catTrades = allTrades.filter(t => t[fieldName] === cat);
            const cStats = calculateStats(catTrades);
            const pctAll = stats.totalTrades > 0 ? (cStats.totalTrades / stats.totalTrades) : 0;
            return `
                <tr>
                    <td>${cat}</td>
                    <td>${cStats.totalTrades}</td>
                    <td>${formatPercent(pctAll)}</td>
                    <td>${formatPercent(cStats.winRate)}</td>
                    <td class="${getColorClass(cStats.avgPnl)}">${formatCurrency(cStats.avgPnl)}</td>
                </tr>
            `;
        }).join('');

        return `
        <div class="glass-card">
            <h2>🎯 ${title} Analysis</h2>
            <table class="analytics-table">
                <thead><tr><th>Target</th><th>Count</th><th>% of Trades</th><th>Win Rate</th><th>Avg P&L</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        `;
    };

    // 5. Scenario Selector
    const renderScenarioSelector = () => {
        const liqOptions = ['<option value="">Any Liquidity</option>', ...LIQUIDITY_TARGETS.map(l => \`<option value="\${l}">\${l}</option>\`)].join('');
        const dolOptions = ['<option value="">Any DOL</option>', ...DOL_TARGETS.map(d => \`<option value="\${d}">\${d}</option>\`)].join('');

        return `
        <div class="glass-card scenario-selector-container">
            <h2>🔮 Scenario Analysis</h2>
            <div class="scenario-selector" style="margin-bottom: 20px; display: flex; gap: 15px;">
                <select id="scenario-liq" class="form-select">${liqOptions}</select>
                <select id="scenario-dol" class="form-select">${dolOptions}</select>
            </div>
            <div id="scenario-results" class="scenario-results" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;">
                <!-- Filled via JS -->
            </div>
        </div>
        `;
    };

    // 6. & 7. Matrices
    const renderMatrix = (type) => {
        const title = type === 'count' ? '🔢 Liquidity × DOL Count' : '🏆 Liquidity × DOL Win Rate';
        const headers = DOL_TARGETS.map(d => \`<th>\${d}</th>\`).join('');

        const rows = LIQUIDITY_TARGETS.map(liq => {
            const cells = DOL_TARGETS.map(dol => {
                const subset = allTrades.filter(t => t.liquidityTarget === liq && t.dolTarget === dol);
                const sStats = calculateStats(subset);
                
                let val, display, bgColorClass = '';
                if (type === 'count') {
                    val = sStats.totalTrades;
                    display = val;
                    if (val === 0) bgColorClass = 'cell-gray';
                } else {
                    val = sStats.winRate;
                    display = sStats.totalTrades > 0 ? formatPercent(val) : '-';
                    if (sStats.totalTrades === 0) {
                        bgColorClass = 'cell-gray';
                    } else if (val >= 0.7) {
                        bgColorClass = 'cell-dark-green';
                    } else if (val >= 0.5) {
                        bgColorClass = 'cell-light-green';
                    } else if (val >= 0.3) {
                        bgColorClass = 'cell-yellow';
                    } else {
                        bgColorClass = 'cell-red';
                    }
                }

                return \`<td class="\${bgColorClass}" data-val="\${val}">\${display}</td>\`;
            }).join('');
            return \`<tr><th>\${liq}</th>\${cells}</tr>\`;
        }).join('');

        return `
        <div class="glass-card">
            <h2>${title}</h2>
            <div style="overflow-x: auto;">
                <table class="matrix-table analytics-table">
                    <thead><tr><th>Liq \\ DOL</th>${headers}</tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
        `;
    };

    // --- RENDER ALL ---
    container.innerHTML = `
        <div class="analytics-dashboard" style="display: flex; flex-direction: column; gap: 20px;">
            ${renderSummaryMetrics()}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                ${renderTickerTable()}
                ${renderScenarioSelector()}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
                ${renderCategoryTable('DOL Target', DOL_TARGETS, 'dolTarget')}
                ${renderCategoryTable('Liquidity Target', LIQUIDITY_TARGETS, 'liquidityTarget')}
            </div>
            ${renderMatrix('count')}
            ${renderMatrix('winrate')}
        </div>
    `;

    // --- EVENT LISTENERS (Scenario) ---
    const liqSelect = container.querySelector('#scenario-liq');
    const dolSelect = container.querySelector('#scenario-dol');
    const scenarioResults = container.querySelector('#scenario-results');

    const updateScenario = () => {
        const liq = liqSelect.value;
        const dol = dolSelect.value;
        
        const subset = allTrades.filter(t => 
            (liq === '' || t.liquidityTarget === liq) && 
            (dol === '' || t.dolTarget === dol)
        );
        
        const sStats = calculateStats(subset);
        const pctAll = stats.totalTrades > 0 ? sStats.totalTrades / stats.totalTrades : 0;

        scenarioResults.innerHTML = `
            <div class="metric-card"><div class="metric-value">${sStats.totalTrades}</div><div class="metric-label">Matches</div></div>
            <div class="metric-card"><div class="metric-value">${formatPercent(sStats.winRate)}</div><div class="metric-label">Win Rate</div></div>
            <div class="metric-card"><div class="metric-value ${getColorClass(sStats.totalPnl)}">${formatCurrency(sStats.totalPnl)}</div><div class="metric-label">Total P&L</div></div>
            <div class="metric-card"><div class="metric-value ${getColorClass(sStats.avgPnl)}">${formatCurrency(sStats.avgPnl)}</div><div class="metric-label">Avg P&L</div></div>
            <div class="metric-card"><div class="metric-value positive">${formatCurrency(sStats.largestWin)}</div><div class="metric-label">Largest Win</div></div>
            <div class="metric-card"><div class="metric-value negative">${formatCurrency(sStats.largestLoss)}</div><div class="metric-label">Largest Loss</div></div>
            <div class="metric-card"><div class="metric-value">${formatPercent(pctAll)}</div><div class="metric-label">% of All Trades</div></div>
        `;
    };

    liqSelect.addEventListener('change', updateScenario);
    dolSelect.addEventListener('change', updateScenario);
    
    // Initial run for scenario
    updateScenario();
}
