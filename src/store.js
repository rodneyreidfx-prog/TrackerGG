// Contract reference data (hardcoded)
export const CONTRACTS = { NQ: 20, ES: 50, MNQ: 2, MES: 5 };

export const TICKERS = ['NQ', 'ES', 'MNQ', 'MES'];
export const DIRECTIONS = ['Buy', 'Sell'];
export const DOL_TARGETS = ['Asia High', 'Asia Low', 'London High', 'London Low', 'Prev Day High', 'Prev Day Low', 'Weekly High', 'Weekly Low', 'FVG', 'Data High', 'Data Low'];
export const LIQUIDITY_TARGETS = ['Asia High', 'Asia Low', 'London High', 'London Low', 'Prev Day High', 'Prev Day Low', 'Weekly High', 'Weekly Low', 'FVG', 'Data High', 'Data Low'];

const STORAGE_KEY = 'trackergg_trades';

export function getPointValue(ticker) {
  return CONTRACTS[ticker] || 0;
}

export function calculatePnL(direction, entry, exit, quantity, pointValue) {
  if (direction === 'Buy') {
    return (exit - entry) * quantity * pointValue;
  } else if (direction === 'Sell') {
    return (entry - exit) * quantity * pointValue;
  }
  return 0;
}

export function getTrades() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
}

function saveTrades(trades) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

export function addTrade(trade) {
  const trades = getTrades();

  const pointValue = getPointValue(trade.ticker);
  const pnl = calculatePnL(trade.direction, trade.entryPrice, trade.exitPrice, trade.quantity, pointValue);

  const newTrade = {
    ...trade,
    id: crypto.randomUUID(),
    pointValue,
    pnl,
  };

  trades.push(newTrade);
  saveTrades(trades);
  return newTrade;
}

export function updateTrade(id, updates) {
  const trades = getTrades();
  const index = trades.findIndex(t => t.id === id);

  if (index === -1) return null;

  const trade = trades[index];
  const updatedTrade = { ...trade, ...updates };

  // Recalculate if relevant fields changed
  if (
    updates.ticker !== undefined ||
    updates.direction !== undefined ||
    updates.entryPrice !== undefined ||
    updates.exitPrice !== undefined ||
    updates.quantity !== undefined
  ) {
    updatedTrade.pointValue = getPointValue(updatedTrade.ticker);
    updatedTrade.pnl = calculatePnL(
      updatedTrade.direction,
      updatedTrade.entryPrice,
      updatedTrade.exitPrice,
      updatedTrade.quantity,
      updatedTrade.pointValue
    );
  }

  trades[index] = updatedTrade;
  saveTrades(trades);
  return updatedTrade;
}

export function deleteTrade(id) {
  let trades = getTrades();
  trades = trades.filter(t => t.id !== id);
  saveTrades(trades);
}

export function clearAllTrades() {
  saveTrades([]);
}

export function exportData() {
  const trades = getTrades();
  const jsonString = JSON.stringify(trades, null, 2);

  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toLocaleDateString('en-CA');
  const filename = `trackergg_backup_${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return jsonString;
}

export function importData(jsonString) {
  const trades = JSON.parse(jsonString);
  if (!Array.isArray(trades)) {
    throw new Error('Imported data must be an array of trades.');
  }
  saveTrades(trades);
  return trades.length;
}
