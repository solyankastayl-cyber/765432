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
  version?: string;
  updatedAt?: string;
}> {
  const cfg = await getRuntimeEngineConfig(asset);
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
    version: cfg.version,
    updatedAt: cfg.updatedAt?.toISOString(),
  };
}
