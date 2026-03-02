/**
 * P0: Model Config Contract
 * 
 * Runtime-configurable engine parameters stored in MongoDB.
 * This replaces hardcoded HORIZON_CONFIG for managed assets.
 */

export type AssetKey = 'BTC' | 'SPX' | 'DXY';

export type SimilarityMode = 'zscore' | 'raw_returns';

export interface ModelConfigDoc {
  asset: AssetKey;

  // Core engine knobs
  windowLen: number;
  topK: number;
  similarityMode: SimilarityMode;

  // Optional knobs
  minGapDays?: number;
  ageDecayLambda?: number;
  regimeConditioning?: boolean;

  // Governance weights (used by consensus)
  horizonWeights?: Record<string, number>;
  tierWeights?: Record<string, number>;

  // Metadata
  updatedAt: Date;
  updatedBy?: string;
  version?: string;
}

// Default values (used as fallback)
export const DEFAULT_MODEL_CONFIG: Omit<ModelConfigDoc, 'asset' | 'updatedAt'> = {
  windowLen: 60,
  topK: 25,
  similarityMode: 'zscore',
  minGapDays: 60,
  ageDecayLambda: 0.0,
  regimeConditioning: true,
  horizonWeights: {
    '7d': 0.15,
    '14d': 0.20,
    '30d': 0.35,
    '90d': 0.30,
  },
  tierWeights: {
    'TIMING': 0.12,
    'TACTICAL': 0.36,
    'STRUCTURE': 0.52,
  },
};
