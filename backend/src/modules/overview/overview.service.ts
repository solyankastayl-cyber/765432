/**
 * OVERVIEW UI SERVICE
 * 
 * Aggregates existing packs into user-friendly overview.
 * NO MATH RECALCULATION - read-only aggregation only.
 * 
 * Sources:
 * - MacroScore v3
 * - Fractal Hybrid (DXY/SPX/BTC)
 * - Cross-Asset Classification
 * - Capital Scaling
 * - L5 Audit Meta
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongodb.js';

// ═══════════════════════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════════════════════

export type Stance = 'BULLISH' | 'BEARISH' | 'HOLD';
export type ActionHint = 'INCREASE_RISK' | 'REDUCE_RISK' | 'HOLD_WAIT' | 'HEDGE';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type IndicatorStatus = 'GOOD' | 'NEUTRAL' | 'BAD';
export type Asset = 'dxy' | 'spx' | 'btc';

export interface OverviewPack {
  asOf: string;
  asset: Asset;

  verdict: {
    stance: Stance;
    actionHint: ActionHint;
    confidencePct: number;
    horizonDays: number;
    summary: string;
  };

  reasons: Array<{
    title: string;
    text: string;
    severity: Severity;
    source: 'macro' | 'dxy' | 'crossAsset' | 'brain' | 'capitalScaling';
  }>;

  risks: Array<{
    title: string;
    text: string;
    severity: Severity;
  }>;

  indicators: Array<{
    key: string;
    label: string;
    valueText: string;
    status: IndicatorStatus;
    tooltip: string;
  }>;

  horizons: Array<{
    days: number | 'synthetic';
    stance: Stance;
    medianProjectionPct: number;
    rangeLowPct: number;
    rangeHighPct: number;
    confidencePct: number;
  }>;

  pipeline: {
    macroScore: { score: number; regime: string; stability: number };
    dxyFinal: { projectionPct: number; stance: string };
    spxOverlay?: { projectionPct: number; stance: string };
    btcOverlay?: { projectionPct: number; stance: string };
    capitalScaling?: { scalePct: number; posture: string; drivers: string[] };
  };

  charts?: {
    actual: Array<{ t: string; v: number }>;
    predicted: Array<{ t: string; v: number }>;
    band?: Array<{ t: string; low: number; high: number }>;
  };

  meta: {
    systemVersion: string;
    inputsHash: string;
    dataMode: 'mongo' | 'mock';
    l5Grade: 'PRODUCTION' | 'REVIEW' | 'FAIL';
  };
}

// ═══════════════════════════════════════════════════════════════
// HUMAN TEXT BUILDER
// ═══════════════════════════════════════════════════════════════

const INDICATOR_TOOLTIPS: Record<string, string> = {
  T10Y2Y: 'Yield curve (10Y-2Y). Negative = inversion, recession signal. Positive = expansion mode.',
  CPIAUCSL: 'Consumer inflation YoY. High (>4%) = hawkish Fed. Low (<2%) = dovish.',
  CPILFESL: 'Core inflation (ex food/energy). Fed\'s preferred metric.',
  PPIACO: 'Producer prices. Leading indicator for CPI.',
  UNRATE: 'Unemployment rate. Rising = recession risk. Falling = expansion.',
  M2SL: 'Money supply growth. High = liquidity driven rally. Negative = tightening.',
  BAA10Y: 'Credit spread. Wide (>3%) = stress. Narrow (<2%) = risk-on.',
  TEDRATE: 'Interbank stress. High = funding crisis.',
  FEDFUNDS: 'Fed funds rate. Rising = tightening. Falling = easing.',
  HOUST: 'Housing starts. Leading economic indicator.',
  INDPRO: 'Industrial production. Economic growth proxy.',
  VIXCLS: 'Volatility index. High (>25) = fear. Low (<15) = complacency.',
};

const STANCE_SUMMARIES: Record<string, Record<Stance, string>> = {
  dxy: {
    BULLISH: 'Dollar strength expected. Risk assets may face headwinds.',
    BEARISH: 'Dollar weakness ahead. Supportive for risk assets and commodities.',
    HOLD: 'Dollar range-bound. No clear directional signal.',
  },
  spx: {
    BULLISH: 'Equity market conditions favorable. Consider increasing exposure.',
    BEARISH: 'Defensive positioning recommended. Reduce risk, increase cash.',
    HOLD: 'Mixed signals. Wait for confirmation before acting.',
  },
  btc: {
    BULLISH: 'Crypto conditions favorable. Risk-on environment supports BTC.',
    BEARISH: 'Caution advised. Macro headwinds may pressure crypto.',
    HOLD: 'Neutral stance. BTC following broader risk sentiment.',
  },
};

const ACTION_HINTS: Record<ActionHint, string> = {
  INCREASE_RISK: 'Market supports risk. Gradually increase exposure.',
  REDUCE_RISK: 'Defense mode. Reduce positions, raise cash.',
  HOLD_WAIT: 'Signal weak. Wait for confirmation.',
  HEDGE: 'Elevated tail risk. Consider protective positions.',
};

function buildSummary(asset: Asset, stance: Stance, confidence: number): string {
  const base = STANCE_SUMMARIES[asset][stance];
  const confText = confidence >= 70 ? 'High confidence.' : confidence >= 50 ? 'Moderate confidence.' : 'Low confidence.';
  return `${base} ${confText}`;
}

function buildReasonText(driver: string, contribution: number, direction: string): string {
  const dirText = direction === 'positive' ? 'supporting risk' : 'pressuring markets';
  const impact = Math.abs(contribution) > 0.3 ? 'strongly' : Math.abs(contribution) > 0.15 ? 'moderately' : 'slightly';
  return `${driver} is ${impact} ${dirText}.`;
}

function buildRiskText(riskType: string, severity: Severity): string {
  const texts: Record<string, string> = {
    tailRisk: 'Elevated tail risk scenarios. Consider hedges.',
    decoupled: 'Cross-asset relationships unstable. Diversification may not work.',
    horizonConflict: 'Short and long-term signals disagree. Higher uncertainty.',
    lowConfidence: 'Model confidence below threshold. Reduce position sizing.',
    spreadWide: 'Credit spreads widening. Risk-off signal.',
  };
  return texts[riskType] || 'Unknown risk factor detected.';
}

// ═══════════════════════════════════════════════════════════════
// SIMPLE CACHE (60 second TTL)
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Map<string, CacheEntry<any>> = new Map();
const CACHE_TTL_MS = 60000; // 60 seconds

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ═══════════════════════════════════════════════════════════════
// FETCHERS WITH CACHING
// ═══════════════════════════════════════════════════════════════

async function fetchMacroScore(horizon: number): Promise<any> {
  const cacheKey = `macro_${horizon}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  try {
    const res = await fetch(`http://localhost:8002/api/macro-score/v3/compute?horizon=${horizon}&dataMode=mongo`);
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch (e) {
    return null;
  }
}

async function fetchContributionReport(): Promise<any> {
  const cacheKey = 'contrib_report';
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  try {
    const res = await fetch('http://localhost:8002/api/macro-score/v3/contribution-report?dataMode=mongo');
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch (e) {
    return null;
  }
}

async function fetchFractalTerminal(asset: Asset, focus: string): Promise<any> {
  const cacheKey = `fractal_${asset}_${focus}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  try {
    // V1 LOCKED: Read from stored snapshot ONLY
    // Overview MUST NOT recalculate model - only display saved predictions
    // BTC: crossAsset required (NO FALLBACK to hybrid per V1 spec)
    // SPX/DXY: hybrid view (crossAsset optional)
    const viewMap: Record<Asset, string> = {
      dxy: 'hybrid',
      spx: 'hybrid',  // SPX uses hybrid (crossAsset overlay optional)
      btc: 'crossAsset',  // BTC FINAL = cross-asset (SPX + DXY) → BTC hybrid - NO FALLBACK
    };
    
    // V1 LOCKED: Fallback allowed for SPX/DXY (to hybrid), but NOT for BTC
    const fallbackAllowed: Record<Asset, boolean> = {
      dxy: true,   // DXY can fallback to terminal
      spx: true,   // SPX can fallback to hybrid
      btc: false,  // BTC crossAsset required - NO FALLBACK per V1 LOCKED spec
    };
    
    const horizonDays = parseInt(focus.replace('d', '')) || 90;
    const assetUpper = asset.toUpperCase();
    const primaryView = viewMap[asset];
    
    // Try primary view
    let snapshotData: any = null;
    let usedView = primaryView;
    
    // Primary: Read from prediction_snapshots with designated view
    const snapshotRes = await fetch(
      `http://localhost:8002/api/prediction/snapshots?asset=${assetUpper}&view=${primaryView}&horizon=${horizonDays}&limit=1`
    );
    snapshotData = await snapshotRes.json();
    
    // V1 LOCKED: For BTC, if no crossAsset snapshot exists, return error (no fallback)
    // For SPX/DXY, fallback to hybrid is allowed
    if ((!snapshotData.ok || !snapshotData.snapshots?.length)) {
      if (!fallbackAllowed[asset]) {
        // BTC: NO FALLBACK - crossAsset snapshot is required
        console.warn(`[Overview V1] ${assetUpper} crossAsset snapshot missing - no fallback allowed per V1 LOCKED`);
        // Continue to try terminal endpoint as last resort for BTC (realtime data)
      } else if (primaryView !== 'hybrid') {
        // SPX/DXY: Fallback to hybrid
        console.log(`[Overview] No ${primaryView} snapshot for ${assetUpper}/${horizonDays}d, trying hybrid`);
        const fallbackRes = await fetch(
          `http://localhost:8002/api/prediction/snapshots?asset=${assetUpper}&view=hybrid&horizon=${horizonDays}&limit=1`
        );
        snapshotData = await fallbackRes.json();
        usedView = 'hybrid';
      }
    }
    
    if (snapshotData.ok && snapshotData.snapshots?.length > 0) {
      const snapshot = snapshotData.snapshots[0];
      const predictedCount = snapshot.series.length - snapshot.anchorIndex;
      
      // Check if snapshot has sufficient predicted points for the horizon
      // We expect at least 50% of horizonDays as predicted points
      const minPredicted = Math.floor(horizonDays * 0.5);
      
      if (predictedCount >= minPredicted) {
        // Convert snapshot to terminal format for compatibility
        const result = {
          ok: true,
          source: 'snapshot_readonly',
          modelVersion: snapshot.metadata?.modelVersion || 'unknown',
          summary: {
            projection: {
              median: calculateProjection(snapshot.series, snapshot.anchorIndex),
            },
            confidence: snapshot.metadata?.confidence || 0.5,
            tailRiskRate: 0,
            stance: snapshot.metadata?.stance || 'HOLD',
          },
          charts: {
            actual: snapshot.series.slice(0, snapshot.anchorIndex + 1),
            predicted: snapshot.series.slice(snapshot.anchorIndex),
          },
          createdAt: snapshot.createdAt,
          snapshotId: snapshot._id,
        };
        
        console.log(`[Overview] READ-ONLY snapshot loaded: ${assetUpper}/${horizonDays}d view=${usedView} (modelVersion: ${result.modelVersion})`);
        setCache(cacheKey, result);
        return result;
      } else {
        console.warn(`[Overview] Snapshot for ${assetUpper}/${horizonDays}d has insufficient predicted points: ${predictedCount} < ${minPredicted}. Falling back to terminal.`);
      }
    }
    
    // Fallback: If no snapshot exists, trigger terminal to create one
    // IMPORTANT: Build charts from candles (FIXED_HISTORY_START) + forecast from terminal
    console.warn(`[Overview] No snapshot for ${assetUpper}/${horizonDays}d - building from candles + terminal`);
    
    const endpoints: Record<Asset, string> = {
      dxy: `/api/fractal/dxy/terminal?focus=${focus}`,
      spx: `/api/spx/v2.1/focus-pack?horizon=${focus}`,
      btc: `/api/fractal/v2.1/focus-pack?symbol=BTC&focus=${focus}&mode=crossAsset`,
    };
    
    // Fetch terminal for forecast
    const res = await fetch(`http://localhost:8002${endpoints[asset]}`);
    const data = await res.json();
    
    // Fetch candles for history using our new endpoint that works for all assets
    const candlesRes = await fetch(`http://localhost:8002/api/ui/candles?asset=${assetUpper}&years=2`);
    const candlesData = await candlesRes.json();
    const candles = candlesData.candles || [];
    
    // Build charts from candles (history) + terminal (forecast)
    const asOfDate = new Date().toISOString().split('T')[0];
    const actual = candles
      .filter((c: any) => c.t <= asOfDate)
      .map((c: any) => ({ t: c.t, v: c.c }));
    
    // Extract forecast from terminal
    let predicted: Array<{t: string, v: number}> = [];
    let currentPrice = actual.length > 0 ? actual[actual.length - 1].v : 0;
    
    if (asset === 'btc' && data.focusPack?.forecast?.path) {
      const fc = data.focusPack.forecast;
      const startTs = new Date(fc.startTs || Date.now());
      currentPrice = fc.currentPrice || currentPrice;
      
      predicted = [{ t: asOfDate, v: currentPrice }];
      for (let i = 0; i < fc.path.length; i++) {
        const d = new Date(startTs);
        d.setDate(d.getDate() + i + 1);
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr > asOfDate) {
          predicted.push({ t: dateStr, v: fc.path[i] });
        }
      }
    } else if (asset === 'spx' && data.data?.forecast?.path) {
      const fc = data.data.forecast;
      currentPrice = data.data?.price?.current || currentPrice;
      
      predicted = [{ t: asOfDate, v: currentPrice }];
      for (let i = 0; i < fc.path.length; i++) {
        const p = fc.path[i];
        if (p.date > asOfDate) {
          predicted.push({ t: p.date, v: p.value || p.price });
        }
      }
    } else if (asset === 'dxy' && data.hybrid?.path) {
      const path = data.hybrid.path;
      // Include all forecast path points - they represent the future projection
      // First point anchors to current price, rest are predictions
      predicted = path.map((p: any) => ({ t: p.date, v: p.value }));
    }
    
    const result = {
      ok: true,
      source: 'candles_terminal_hybrid',
      charts: {
        actual,
        predicted,
      },
      summary: data.focusPack?.diagnostics || data.data?.summary || data.summary || {},
    };
    
    console.log(`[Overview] Hybrid build: actual=${actual.length}, predicted=${predicted.length}, actual[0]=${actual[0]?.t}`);
    setCache(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[Overview] fetchFractalTerminal error:', e);
    return null;
  }
}

/**
 * Calculate projection percentage from series
 */
function calculateProjection(series: Array<{t: string, v: number}>, anchorIndex: number): number {
  if (!series || series.length < 2 || anchorIndex < 0) return 0;
  
  const anchorPrice = series[anchorIndex]?.v || 0;
  const finalPrice = series[series.length - 1]?.v || 0;
  
  if (anchorPrice === 0) return 0;
  return (finalPrice - anchorPrice) / anchorPrice;
}

async function fetchBrainDecision(): Promise<any> {
  const cacheKey = 'brain_decision';
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;
  
  try {
    const res = await fetch('http://localhost:8002/api/ui/brain/decision');
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch (e) {
    return null;
  }
}

async function fetchL5Audit(): Promise<any> {
  try {
    const res = await fetch('http://localhost:8002/api/audit/l5/quick');
    return await res.json();
  } catch (e) {
    return { status: 'unknown', checks: [] };
  }
}

function deriveStance(projection: number, confidence: number, threshold = 0.02): Stance {
  if (confidence < 40) return 'HOLD';
  if (projection > threshold) return 'BULLISH';
  if (projection < -threshold) return 'BEARISH';
  return 'HOLD';
}

function deriveActionHint(stance: Stance, tailRisk: boolean, confidence: number): ActionHint {
  if (tailRisk) return 'HEDGE';
  if (confidence < 40) return 'HOLD_WAIT';
  if (stance === 'BULLISH') return 'INCREASE_RISK';
  if (stance === 'BEARISH') return 'REDUCE_RISK';
  return 'HOLD_WAIT';
}

function deriveSeverity(value: number, thresholds: [number, number] = [0.15, 0.35]): Severity {
  if (value > thresholds[1]) return 'HIGH';
  if (value > thresholds[0]) return 'MEDIUM';
  return 'LOW';
}

function deriveIndicatorStatus(contribution: number): IndicatorStatus {
  if (contribution > 0.05) return 'GOOD';
  if (contribution < -0.05) return 'BAD';
  return 'NEUTRAL';
}

// ═══════════════════════════════════════════════════════════════
// MAIN AGGREGATOR
// ═══════════════════════════════════════════════════════════════

export async function buildOverviewPack(
  asset: Asset,
  horizonDays: number
): Promise<OverviewPack> {
  const focusMap: Record<number, string> = {
    7: '7d',
    14: '14d',
    30: '30d',
    90: '90d',
    180: '180d',
    365: '365d',
  };
  const focus = focusMap[horizonDays] || '90d';
  
  // Fetch all sources in parallel
  const [macroResult, contribReport, fractalData, brainData, l5Audit] = await Promise.all([
    fetchMacroScore(horizonDays),
    fetchContributionReport(),
    fetchFractalTerminal(asset, focus),
    fetchBrainDecision(),
    fetchL5Audit(),
  ]);
  
  const asOf = new Date().toISOString().slice(0, 10);
  
  // Extract macro data
  const macroScore = macroResult?.score || 0;
  const macroRegime = macroScore > 0.1 ? 'EASING' : macroScore < -0.1 ? 'TIGHTENING' : 'NEUTRAL';
  const macroConfidence = macroResult?.diagnostics?.confidence || 50;
  
  // Extract fractal data
  const projection = fractalData?.summary?.projection?.median || 0;
  const fractalConfidence = fractalData?.summary?.confidence || 50;
  const projectionPct = projection * 100;
  
  // Derive verdict
  const stance = deriveStance(projection, fractalConfidence);
  const tailRisk = (fractalData?.summary?.tailRiskRate || 0) > 0.15;
  const actionHint = deriveActionHint(stance, tailRisk, fractalConfidence);
  
  // Build reasons from contribution report
  const reasons: OverviewPack['reasons'] = [];
  
  if (contribReport?.report?.analysis) {
    const topDrivers = contribReport.report.analysis.slice(0, 2);
    for (const driver of topDrivers) {
      reasons.push({
        title: `${driver.key} impact`,
        text: buildReasonText(driver.key, driver.rawContribution, driver.signal > 0 ? 'positive' : 'negative'),
        severity: deriveSeverity(Math.abs(driver.share / 100)),
        source: 'macro',
      });
    }
  }
  
  // Add DXY direction reason
  if (asset !== 'dxy' && macroResult) {
    const dxyDir = macroScore > 0 ? 'weakening' : 'strengthening';
    reasons.push({
      title: 'Dollar direction',
      text: `Dollar ${dxyDir} ${Math.abs(macroScore) > 0.1 ? 'significantly' : 'modestly'}. ${dxyDir === 'weakening' ? 'Supportive for risk.' : 'Headwind for risk.'}`,
      severity: deriveSeverity(Math.abs(macroScore), [0.05, 0.15]),
      source: 'dxy',
    });
  }
  
  // Build risks
  const risks: OverviewPack['risks'] = [];
  
  if (tailRisk) {
    risks.push({
      title: 'Tail risk elevated',
      text: buildRiskText('tailRisk', 'HIGH'),
      severity: 'HIGH',
    });
  }
  
  if (fractalConfidence < 50) {
    risks.push({
      title: 'Low model confidence',
      text: buildRiskText('lowConfidence', 'MEDIUM'),
      severity: 'MEDIUM',
    });
  }
  
  // Horizon conflict check
  if (brainData?.horizonConflict) {
    risks.push({
      title: 'Horizon disagreement',
      text: buildRiskText('horizonConflict', 'MEDIUM'),
      severity: 'MEDIUM',
    });
  }
  
  // Build indicators from macro diagnostics
  const indicators: OverviewPack['indicators'] = [];
  
  if (macroResult?.diagnostics?.contributions) {
    const contribs = macroResult.diagnostics.contributions;
    for (const [key, value] of Object.entries(contribs)) {
      const contrib = value as number;
      if (Math.abs(contrib) > 0.001) {
        indicators.push({
          key,
          label: key,
          valueText: contrib > 0 ? `+${(contrib * 100).toFixed(1)}%` : `${(contrib * 100).toFixed(1)}%`,
          status: deriveIndicatorStatus(contrib),
          tooltip: INDICATOR_TOOLTIPS[key] || 'Macro indicator',
        });
      }
    }
  }
  
  // Build horizons
  const horizons: OverviewPack['horizons'] = [30, 90, 180, 365].map(days => {
    const h = fractalData?.horizons?.find((h: any) => h.days === days);
    return {
      days,
      stance: h ? deriveStance(h.projection || 0, h.confidence || 50) : 'HOLD',
      medianProjectionPct: (h?.projection || 0) * 100,
      rangeLowPct: (h?.rangeLow || -0.05) * 100,
      rangeHighPct: (h?.rangeHigh || 0.05) * 100,
      confidencePct: h?.confidence || 50,
    };
  });
  
  // Add synthetic if available
  if (fractalData?.synthetic) {
    horizons.push({
      days: 'synthetic' as any,
      stance: deriveStance(fractalData.synthetic.projection || 0, fractalData.synthetic.confidence || 50),
      medianProjectionPct: (fractalData.synthetic.projection || 0) * 100,
      rangeLowPct: (fractalData.synthetic.rangeLow || -0.05) * 100,
      rangeHighPct: (fractalData.synthetic.rangeHigh || 0.05) * 100,
      confidencePct: fractalData.synthetic.confidence || 50,
    });
  }
  
  // Build pipeline
  const pipeline: OverviewPack['pipeline'] = {
    macroScore: {
      score: Math.round(macroScore * 1000) / 1000,
      regime: macroRegime,
      stability: macroConfidence / 100,
    },
    dxyFinal: {
      projectionPct: projectionPct,
      stance: stance,
    },
  };
  
  if (asset === 'spx' || asset === 'btc') {
    pipeline.spxOverlay = {
      projectionPct: projectionPct,
      stance: stance,
    };
  }
  
  if (asset === 'btc') {
    pipeline.btcOverlay = {
      projectionPct: projectionPct,
      stance: stance,
    };
  }
  
  // Build charts from fractal data
  // FIXED: Support both snapshot format (charts.actual/predicted) and terminal format (timeline)
  let charts: OverviewPack['charts'] | undefined;
  
  if (fractalData?.charts) {
    // New snapshot format
    charts = {
      actual: fractalData.charts.actual || [],
      predicted: fractalData.charts.predicted || [],
    };
    console.log(`[Overview] Charts from snapshot: actual=${charts.actual.length}, predicted=${charts.predicted.length}`);
  } else if (fractalData?.timeline) {
    // Legacy terminal format
    charts = {
      actual: fractalData.timeline.actual?.map((p: any) => ({ t: p.date, v: p.price })) || [],
      predicted: fractalData.timeline.predicted?.map((p: any) => ({ t: p.date, v: p.price })) || [],
    };
  }
  
  // Determine L5 grade
  const l5Grade = l5Audit?.status === 'healthy' ? 'PRODUCTION' : 'REVIEW';
  
  return {
    asOf,
    asset,
    verdict: {
      stance,
      actionHint,
      confidencePct: Math.round(fractalConfidence),
      horizonDays,
      summary: buildSummary(asset, stance, fractalConfidence),
    },
    reasons: reasons.slice(0, 3),
    risks: risks.slice(0, 3),
    indicators: indicators.sort((a, b) => Math.abs(parseFloat(b.valueText)) - Math.abs(parseFloat(a.valueText))).slice(0, 9),
    horizons,
    pipeline,
    charts,
    meta: {
      systemVersion: 'v3.1.0',
      inputsHash: macroResult?.diagnostics?.inputsHash || 'unknown',
      dataMode: 'mongo',
      l5Grade,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════

export async function registerOverviewRoutes(app: FastifyInstance): Promise<void> {
  
  /**
   * GET /api/ui/overview
   * Main Overview endpoint - aggregates all packs
   */
  app.get('/api/ui/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    const { asset = 'spx', horizon = '90' } = request.query as { asset?: string; horizon?: string };
    
    const validAssets: Asset[] = ['dxy', 'spx', 'btc'];
    const validHorizons = [7, 14, 30, 90, 180, 365];
    
    const assetParsed = validAssets.includes(asset as Asset) ? asset as Asset : 'spx';
    const horizonParsed = validHorizons.includes(parseInt(horizon)) ? parseInt(horizon) : 90;
    
    try {
      const start = Date.now();
      const pack = await buildOverviewPack(assetParsed, horizonParsed);
      const latency = Date.now() - start;
      
      return reply.send({
        ok: true,
        latencyMs: latency,
        ...pack,
      });
    } catch (e: any) {
      return reply.status(500).send({
        ok: false,
        error: e.message,
      });
    }
  });
  
  // ═══════════════════════════════════════════════════════════════
  // FULL HISTORY CANDLES ENDPOINT
  // For Overview chart - returns ALL history (not limited to 2026-01-01)
  // ═══════════════════════════════════════════════════════════════
  
  app.get('/api/ui/candles', async (request: FastifyRequest, reply: FastifyReply) => {
    const { asset = 'BTC', years = '2' } = request.query as { asset?: string; years?: string };
    const assetUpper = asset.toUpperCase();
    const yearsNum = parseInt(years) || 2;
    
    try {
      const db = getDb();
      const fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - yearsNum);
      
      let candles: any[] = [];
      
      if (assetUpper === 'BTC') {
        // BTC from fractal_canonical_ohlcv
        // Structure: { ts: Date, ohlcv: { o, h, l, c, v }, ... }
        const docs = await db.collection('fractal_canonical_ohlcv')
          .find({ ts: { $gte: fromDate } })
          .sort({ ts: 1 })
          .toArray();
        
        candles = docs.map((d: any) => ({
          t: d.ts.toISOString().split('T')[0],
          o: d.ohlcv?.o ?? d.open ?? 0,
          h: d.ohlcv?.h ?? d.high ?? 0,
          l: d.ohlcv?.l ?? d.low ?? 0,
          c: d.ohlcv?.c ?? d.close ?? 0,
          v: d.ohlcv?.v ?? d.volume ?? 0,
        }));
      } else if (assetUpper === 'SPX') {
        // SPX from spx_candles
        const docs = await db.collection('spx_candles')
          .find({ date: { $gte: fromDate.toISOString().split('T')[0] } })
          .sort({ date: 1 })
          .toArray();
        
        candles = docs.map((d: any) => ({
          t: d.date,
          o: d.open,
          h: d.high,
          l: d.low,
          c: d.close,
          v: d.volume || 0,
        }));
      } else if (assetUpper === 'DXY') {
        // DXY from dxy_candles
        // Note: date field is datetime object, not string
        const docs = await db.collection('dxy_candles')
          .find({ date: { $gte: fromDate } })
          .sort({ date: 1 })
          .toArray();
        
        candles = docs.map((d: any) => {
          // date can be datetime or string
          const dateVal = d.date instanceof Date ? d.date.toISOString().split('T')[0] : d.date;
          return {
            t: dateVal,
            o: d.open,
            h: d.high,
            l: d.low,
            c: d.close,
            v: d.volume || 0,
          };
        });
      }
      
      console.log(`[Overview] Full candles: ${assetUpper} years=${yearsNum} count=${candles.length} from=${candles[0]?.t}`);
      
      return reply.send({
        ok: true,
        asset: assetUpper,
        years: yearsNum,
        count: candles.length,
        from: candles[0]?.t || null,
        to: candles[candles.length - 1]?.t || null,
        candles,
      });
    } catch (e: any) {
      console.error('[Overview] Full candles error:', e.message);
      return reply.status(500).send({
        ok: false,
        error: e.message,
      });
    }
  });
  
  console.log('[Overview] UI Overview registered at /api/ui/overview');
  console.log('[Overview] Full candles registered at /api/ui/candles');
}

export default registerOverviewRoutes;
