// Pure math functions for technical indicator calculations.
// Candle shape: { x: timestamp_ms, open, high, low, close, volume }

// ─── SMA ──────────────────────────────────────────────────────────────────────
export function calcSMA(candles, period) {
  if (!candles || candles.length < period) return [];
  const result = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - (period - 1); j <= i; j++) {
      sum += candles[j].close;
    }
    result.push({ x: candles[i].x, y: parseFloat((sum / period).toFixed(4) ) });
  }
  return result;
}

// ─── EMA ──────────────────────────────────────────────────────────────────────
export function calcEMA(candles, period) {
  if (!candles || candles.length < period) return [];
  const k = 2 / (period + 1);
  // Seed with SMA of first `period` candles
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let ema = sum / period;
  const result = [{ x: candles[period - 1].x, y: parseFloat(ema.toFixed(4)) }];
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result.push({ x: candles[i].x, y: parseFloat(ema.toFixed(4)) });
  }
  return result;
}

// ─── RSI ──────────────────────────────────────────────────────────────────────
export function calcRSI(candles, period = 14) {
  if (!candles || candles.length < period + 1) return [];
  const result = [];
  let gains = 0;
  let losses = 0;

  // Initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rsi = (ag, al) => {
    if (al === 0) return 100;
    if (ag === 0) return 0;
    return parseFloat((100 - 100 / (1 + ag / al)).toFixed(2));
  };

  result.push({ x: candles[period].x, y: rsi(avgGain, avgLoss) });

  for (let i = period + 1; i < candles.length; i++) {
    const delta = candles[i].close - candles[i - 1].close;
    const gain = delta >= 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    // Wilder smoothing
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ x: candles[i].x, y: rsi(avgGain, avgLoss) });
  }
  return result;
}

// ─── MACD ─────────────────────────────────────────────────────────────────────
export function calcMACD(candles, fast = 12, slow = 26, signalPeriod = 9) {
  if (!candles || candles.length < slow + signalPeriod) return [];

  // Build EMA arrays indexed by candle position
  const kFast = 2 / (fast + 1);
  const kSlow = 2 / (slow + 1);

  // Seed slow EMA
  let sumSlow = 0;
  for (let i = 0; i < slow; i++) sumSlow += candles[i].close;
  let emaSlowVal = sumSlow / slow;

  // Seed fast EMA at slow-1 position (same starting point)
  let sumFast = 0;
  for (let i = slow - fast; i < slow; i++) sumFast += candles[i].close;
  let emaFastVal = sumFast / fast;

  const macdLine = [];
  for (let i = slow; i < candles.length; i++) {
    emaFastVal = candles[i].close * kFast + emaFastVal * (1 - kFast);
    emaSlowVal = candles[i].close * kSlow + emaSlowVal * (1 - kSlow);
    macdLine.push({ x: candles[i].x, val: emaFastVal - emaSlowVal });
  }

  if (macdLine.length < signalPeriod) return [];

  // Signal EMA
  const kSignal = 2 / (signalPeriod + 1);
  let sumSig = 0;
  for (let i = 0; i < signalPeriod; i++) sumSig += macdLine[i].val;
  let sigVal = sumSig / signalPeriod;

  const result = [];
  result.push({
    x: macdLine[signalPeriod - 1].x,
    macd: parseFloat(macdLine[signalPeriod - 1].val.toFixed(4)),
    signal: parseFloat(sigVal.toFixed(4)),
    histogram: parseFloat((macdLine[signalPeriod - 1].val - sigVal).toFixed(4)),
  });

  for (let i = signalPeriod; i < macdLine.length; i++) {
    sigVal = macdLine[i].val * kSignal + sigVal * (1 - kSignal);
    result.push({
      x: macdLine[i].x,
      macd: parseFloat(macdLine[i].val.toFixed(4)),
      signal: parseFloat(sigVal.toFixed(4)),
      histogram: parseFloat((macdLine[i].val - sigVal).toFixed(4)),
    });
  }
  return result;
}

// ─── ATR ──────────────────────────────────────────────────────────────────────
export function calcATR(candles, period = 14) {
  if (!candles || candles.length < period + 1) return [];

  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hpc = Math.abs(candles[i].high - candles[i - 1].close);
    const lpc = Math.abs(candles[i].low - candles[i - 1].close);
    trueRanges.push(Math.max(hl, hpc, lpc));
  }

  // Initial ATR = simple average of first `period` TRs
  let atr = 0;
  for (let i = 0; i < period; i++) atr += trueRanges[i];
  atr /= period;

  const result = [{ x: candles[period].x, y: parseFloat(atr.toFixed(4)) }];

  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result.push({ x: candles[i + 1].x, y: parseFloat(atr.toFixed(4)) });
  }
  return result;
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────
export function calcBB(candles, period = 20, mult = 2) {
  if (!candles || candles.length < period) return [];
  const result = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - (period - 1); j <= i; j++) sum += candles[j].close;
    const mid = sum / period;
    let variance = 0;
    for (let j = i - (period - 1); j <= i; j++) {
      variance += (candles[j].close - mid) ** 2;
    }
    const std = Math.sqrt(variance / period);
    result.push({
      x: candles[i].x,
      upper: parseFloat((mid + mult * std).toFixed(4)),
      mid: parseFloat(mid.toFixed(4)),
      lower: parseFloat((mid - mult * std).toFixed(4)),
    });
  }
  return result;
}

// ─── Support / Resistance Pivots ──────────────────────────────────────────────
export function calcPivots(candles, lookback = 5) {
  if (!candles || candles.length < lookback * 2 + 1) return [];

  // Collect pivot highs/lows with their candle timestamps
  const pivotHighPts = [];   // { price, x }
  const pivotLowPts  = [];   // { price, x }

  for (let i = lookback; i < candles.length - lookback; i++) {
    const c = candles[i];
    let isHigh = true;
    let isLow  = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low  <= c.low)  isLow  = false;
    }
    if (isHigh) pivotHighPts.push({ price: c.high, x: c.x });
    if (isLow)  pivotLowPts.push({ price: c.low,  x: c.x });
  }

  // Cluster nearby levels (within 0.5% of each other), keeping representative timestamps
  const cluster = (pts) => {
    if (!pts.length) return [];
    const sorted = [...pts].sort((a, b) => a.price - b.price);
    const clusters = [];
    let group = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if ((sorted[i].price - group[0].price) / group[0].price < 0.005) {
        group.push(sorted[i]);
      } else {
        const avg = group.reduce((s, v) => s + v.price, 0) / group.length;
        clusters.push({
          price:    avg,
          strength: group.length,
          // All timestamps where this level was touched
          touches:  group.map(p => ({ x: p.x, price: parseFloat(p.price.toFixed(4)) })),
        });
        group = [sorted[i]];
      }
    }
    const avg = group.reduce((s, v) => s + v.price, 0) / group.length;
    clusters.push({
      price:   avg,
      strength: group.length,
      touches: group.map(p => ({ x: p.x, price: parseFloat(p.price.toFixed(4)) })),
    });
    return clusters;
  };

  const resistanceClusters = cluster(pivotHighPts)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map((c) => ({ price: parseFloat(c.price.toFixed(4)), type: 'resistance', strength: c.strength, touches: c.touches }));

  const supportClusters = cluster(pivotLowPts)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map((c) => ({ price: parseFloat(c.price.toFixed(4)), type: 'support', strength: c.strength, touches: c.touches }));

  return [...resistanceClusters, ...supportClusters];
}
