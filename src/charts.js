import { getTrades } from './store.js';

let winLossChart = null;
let pnlChart = null;

/**
 * Renders Chart.js charts for Win/Loss pie and cumulative P&L line.
 * @param {HTMLElement} container
 */
export function renderCharts(container) {
  const trades = getTrades();

  container.innerHTML = `
    <div class="charts-grid">
      <div class="glass-card chart-card">
        <h3>📊 Win / Loss Distribution</h3>
        <div class="chart-container">
          <canvas id="win-loss-chart"></canvas>
        </div>
      </div>
      <div class="glass-card chart-card">
        <h3>📈 Cumulative P&L</h3>
        <div class="chart-container">
          <canvas id="pnl-chart"></canvas>
        </div>
      </div>
    </div>
  `;

  // Destroy previous chart instances
  if (winLossChart) { winLossChart.destroy(); winLossChart = null; }
  if (pnlChart) { pnlChart.destroy(); pnlChart = null; }

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }

  const wins = trades.filter(t => t.win).length;
  const losses = trades.filter(t => t.loss).length;
  const noResult = trades.length - wins - losses;

  // Win/Loss Pie Chart
  const pieCtx = container.querySelector('#win-loss-chart');
  if (pieCtx && trades.length > 0) {
    winLossChart = new Chart(pieCtx, {
      type: 'doughnut',
      data: {
        labels: ['Wins', 'Losses', 'No Result'],
        datasets: [{
          data: [wins, losses, noResult],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(107, 114, 128, 0.5)',
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(107, 114, 128, 1)',
          ],
          borderWidth: 1,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#e2e8f0',
              font: { family: 'Inter', size: 13 },
              padding: 16,
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
          }
        },
        cutout: '60%',
      }
    });
  }

  // Cumulative P&L Line Chart
  const lineCtx = container.querySelector('#pnl-chart');
  if (lineCtx && trades.length > 0) {
    // Sort trades by date
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulative = 0;
    const labels = [];
    const data = [];
    const colors = [];

    sorted.forEach((trade, i) => {
      cumulative += (trade.pnl || 0);
      labels.push(`#${i + 1}`);
      data.push(cumulative);
      colors.push(cumulative >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)');
    });

    pnlChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Cumulative P&L',
          data,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(99, 102, 241, 0.1)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');
            return gradient;
          },
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          borderWidth: 2.5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 11 },
              callback: (val) => '$' + val.toLocaleString(),
            },
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#e2e8f0',
              font: { family: 'Inter', size: 13 },
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              label: (ctx) => `P&L: $${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            }
          }
        }
      }
    });
  }
}
