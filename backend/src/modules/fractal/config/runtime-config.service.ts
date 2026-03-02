/**
 * P0: Runtime Config Service
 * 
 * Single point for engine to get runtime configuration.
 * Reads from MongoDB, falls back to static HORIZON_CONFIG if empty.
 * 
 * This is the KEY piece that connects Governance UI to Engine.
 */

import { ModelConfigStore } from './model-config.store.js';
import { AssetKey, ModelConfigDoc, DEFAULT_MODEL_CONFIG, SimilarityMode } from './model-config.contract.js';
import { HORIZON_CONFIG, HorizonKey } from './horizon.config.js';

/**
 * Unified runtime config used by engine
 */
export interface RuntimeEngineConfig {
  // Core engine parameters
  windowLen: number;
  topK: number;
  similarityMode: SimilarityMode;
  minGapDays: number;
  ageDecayLambda: number;
  regimeConditioning: boolean;

  // Governance weights
  horizonWeights?: Record<string, number>;
  tierWeights?: Record<string, number>;

  // SPX-specific: Consensus parameters
  consensusThreshold?: number;    // Default: 0.05
  divergencePenalty?: number;     // Default: 0.85

  // DXY-specific: Path blend weights
  syntheticWeight?: number;       // Default: 0.4
  replayWeight?: number;          // Default: 0.4
  macroWeight?: number;           // Default: 0.2

  // Metadata
  source: 'mongo' | 'static';
  version?: string;
  updatedAt?: Date;
}

/**
 * Get runtime engine config for asset
 * 
 * Priority:
 * 1. MongoDB model_config (if exists)
 * 2. Static DEFAULT_MODEL_CONFIG (fallback)
 */
export async function getRuntimeEngineConfig(asset: AssetKey): Promise<RuntimeEngineConfig> {
  const doc = await ModelConfigStore.get(asset);

  if (doc) {
    console.log(`[RuntimeConfig] Using Mongo config for ${asset} (updated: ${doc.updatedAt})`);
    return {
      windowLen: doc.windowLen ?? DEFAULT_MODEL_CONFIG.windowLen,
      topK: doc.topK ?? DEFAULT_MODEL_CONFIG.topK,
      similarityMode: doc.similarityMode ?? DEFAULT_MODEL_CONFIG.similarityMode,
      minGapDays: doc.minGapDays ?? DEFAULT_MODEL_CONFIG.minGapDays ?? 60,
      ageDecayLambda: doc.ageDecayLambda ?? DEFAULT_MODEL_CONFIG.ageDecayLambda ?? 0,
      regimeConditioning: doc.regimeConditioning ?? DEFAULT_MODEL_CONFIG.regimeConditioning ?? true,
      horizonWeights: doc.horizonWeights ?? DEFAULT_MODEL_CONFIG.horizonWeights,
      tierWeights: doc.tierWeights ?? DEFAULT_MODEL_CONFIG.tierWeights,
      // SPX-specific
      consensusThreshold: doc.consensusThreshold ?? 0.05,
      divergencePenalty: doc.divergencePenalty ?? 0.85,
      // DXY-specific
      syntheticWeight: doc.syntheticWeight ?? 0.4,
      replayWeight: doc.replayWeight ?? 0.4,
      macroWeight: doc.macroWeight ?? 0.2,
      source: 'mongo',
      version: doc.version,
      updatedAt: doc.updatedAt,
    };
  }

  // Fallback to static config
  console.log(`[RuntimeConfig] Using STATIC config for ${asset} (no Mongo doc)`);
  return {
    windowLen: DEFAULT_MODEL_CONFIG.windowLen,
    topK: DEFAULT_MODEL_CONFIG.topK,
    similarityMode: DEFAULT_MODEL_CONFIG.similarityMode as SimilarityMode,
    minGapDays: DEFAULT_MODEL_CONFIG.minGapDays ?? 60,
    ageDecayLambda: DEFAULT_MODEL_CONFIG.ageDecayLambda ?? 0,
    regimeConditioning: DEFAULT_MODEL_CONFIG.regimeConditioning ?? true,
    horizonWeights: DEFAULT_MODEL_CONFIG.horizonWeights,
    tierWeights: DEFAULT_MODEL_CONFIG.tierWeights,
    // SPX defaults
    consensusThreshold: 0.05,
    divergencePenalty: 0.85,
    // DXY defaults
    syntheticWeight: 0.4,
    replayWeight: 0.4,
    macroWeight: 0.2,
    source: 'static',
  };
}

/**
 * Get merged horizon config (static + runtime overrides)
 * 
 * For each horizon (7d, 14d, 30d, etc.):
 * - windowLen from runtime config
 * - aftermathDays from static HORIZON_CONFIG
 * - topK from runtime config
 */
export async function getMergedHorizonConfig(
  asset: AssetKey,
  horizon: HorizonKey
): Promise<{
  windowLen: number;
  aftermathDays: number;
  topK: number;
  minHistory: number;
  source: 'mongo' | 'static';
}> {
  const runtime = await getRuntimeEngineConfig(asset);
  const staticCfg = HORIZON_CONFIG[horizon];

  // For now, runtime config overrides core params globally
  // Horizon-specific params (aftermathDays, minHistory) come from static
  return {
    windowLen: runtime.windowLen,
    aftermathDays: staticCfg.aftermathDays,
    topK: runtime.topK,
    minHistory: staticCfg.minHistory,
    source: runtime.source,
  };
}

/**
 * Debug endpoint data
 * P1-A: Added activeVersion from lifecycle
 */
export async function getRuntimeDebugInfo(asset: AssetKey): Promise<{
  asset: AssetKey;
  configSource: 'mongo' | 'static';
  windowLen: number;
  topK: number;
  similarityMode: string;
  minGapDays: number;
  ageDecayLambda: number;
  regimeConditioning: boolean;
  horizonWeights?: Record<string, number>;
  tierWeights?: Record<string, number>;
  // SPX-specific
  consensusThreshold?: number;
  divergencePenalty?: number;
  // DXY-specific
  syntheticWeight?: number;
  replayWeight?: number;
  macroWeight?: number;
  version?: string;
  updatedAt?: string;
  activeVersion?: string;
  activeConfigHash?: string;
  promotedAt?: string;
}> {
  const cfg = await getRuntimeEngineConfig(asset);
  
  // P1-A: Get lifecycle state for activeVersion
  let lifecycleState: any = null;
  try {
    const { LifecycleStore } = await import('../lifecycle/lifecycle.store.js');
    lifecycleState = await LifecycleStore.getState(asset);
  } catch (err) {
    // Lifecycle store may not exist yet
  }
  
  return {
    asset,
    configSource: cfg.source,
    windowLen: cfg.windowLen,
    topK: cfg.topK,
    similarityMode: cfg.similarityMode,
    minGapDays: cfg.minGapDays,
    ageDecayLambda: cfg.ageDecayLambda,
    regimeConditioning: cfg.regimeConditioning,
    horizonWeights: cfg.horizonWeights,
    tierWeights: cfg.tierWeights,
    // SPX-specific
    consensusThreshold: cfg.consensusThreshold,
    divergencePenalty: cfg.divergencePenalty,
    // DXY-specific
    syntheticWeight: cfg.syntheticWeight,
    replayWeight: cfg.replayWeight,
    macroWeight: cfg.macroWeight,
    version: cfg.version,
    updatedAt: cfg.updatedAt?.toISOString(),
    // P1-A: Lifecycle info
    activeVersion: lifecycleState?.activeVersion,
    activeConfigHash: lifecycleState?.activeConfigHash,
    promotedAt: lifecycleState?.promotedAt?.toISOString(),
  };
}
