/**
 * P4: Cross-Asset Module Index
 * 
 * Exports all cross-asset composite lifecycle components.
 */

// Contracts
export * from './contracts/composite.contract.js';

// Store
export { CompositeStore } from './store/composite.store.js';

// Services
export { calculateVolatilityResults, calculateVolPenalty } from './services/composite.vol.js';
export { calculateSmartWeights, calculateConfidenceFactor } from './services/composite.weights.js';
export { buildCompositePath } from './services/composite.builder.js';
export { promoteComposite, auditCompositeInvariants } from './services/composite.promote.service.js';

// Routes
export { compositeLifecycleRoutes } from './api/composite.lifecycle.routes.js';
