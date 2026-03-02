/**
 * P1-A + P2: Lifecycle Routes
 * 
 * API endpoints for model lifecycle management.
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { promoteModel, resolveSnapshots, getLifecycleStatus } from './lifecycle.service.js';
import { LifecycleStore } from './lifecycle.store.js';
import { AssetKey } from './lifecycle.contract.js';

interface AssetQuery {
  asset?: string;
}

interface PromoteBody {
  asset?: string;
  user?: string;
}

export async function lifecycleAdminRoutes(fastify: FastifyInstance): Promise<void> {
  
  /**
   * GET /api/fractal/v2.1/admin/lifecycle/status
   * 
   * Get full lifecycle status for asset
   */
  fastify.get('/api/fractal/v2.1/admin/lifecycle/status', async (
    request: FastifyRequest<{ Querystring: AssetQuery }>
  ) => {
    const asset = (request.query.asset ?? 'BTC') as AssetKey;
    
    try {
      const status = await getLifecycleStatus(asset);
      return {
        ok: true,
        asset,
        ...status,
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  /**
   * POST /api/fractal/v2.1/admin/lifecycle/promote
   * 
   * Promote current model config to new version
   * Creates snapshots for tracking
   */
  fastify.post('/api/fractal/v2.1/admin/lifecycle/promote', async (
    request: FastifyRequest<{ Body: PromoteBody }>
  ) => {
    const body = request.body || {};
    const asset = (body.asset ?? 'BTC') as AssetKey;
    const user = body.user ?? 'admin';
    
    try {
      const result = await promoteModel(asset, user);
      return result;
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  /**
   * POST /api/fractal/v2.1/admin/lifecycle/resolve
   * 
   * P2: Resolve matured snapshots and create outcomes
   */
  fastify.post('/api/fractal/v2.1/admin/lifecycle/resolve', async (
    request: FastifyRequest<{ Querystring: AssetQuery }>
  ) => {
    const asset = request.query.asset as AssetKey | undefined;
    
    try {
      const result = await resolveSnapshots(asset);
      return {
        ok: true,
        ...result,
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  /**
   * GET /api/fractal/v2.1/admin/lifecycle/events
   * 
   * Get lifecycle events history
   */
  fastify.get('/api/fractal/v2.1/admin/lifecycle/events', async (
    request: FastifyRequest<{ Querystring: AssetQuery & { limit?: string } }>
  ) => {
    const asset = (request.query.asset ?? 'BTC') as AssetKey;
    const limit = parseInt(request.query.limit ?? '50', 10);
    
    try {
      const events = await LifecycleStore.getEvents(asset, limit);
      return {
        ok: true,
        asset,
        count: events.length,
        events,
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  /**
   * GET /api/fractal/v2.1/admin/lifecycle/snapshots
   * 
   * Get snapshots for current version
   */
  fastify.get('/api/fractal/v2.1/admin/lifecycle/snapshots', async (
    request: FastifyRequest<{ Querystring: AssetQuery }>
  ) => {
    const asset = (request.query.asset ?? 'BTC') as AssetKey;
    
    try {
      const state = await LifecycleStore.getState(asset);
      if (!state?.activeVersion) {
        return { ok: true, snapshots: [], message: 'No active version' };
      }
      
      const snapshots = await LifecycleStore.getSnapshotsByVersion(asset, state.activeVersion);
      return {
        ok: true,
        asset,
        version: state.activeVersion,
        count: snapshots.length,
        snapshots,
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  /**
   * GET /api/fractal/v2.1/admin/lifecycle/outcomes
   * 
   * P2: Get decision outcomes with stats
   */
  fastify.get('/api/fractal/v2.1/admin/lifecycle/outcomes', async (
    request: FastifyRequest<{ Querystring: AssetQuery & { limit?: string } }>
  ) => {
    const asset = (request.query.asset ?? 'BTC') as AssetKey;
    const limit = parseInt(request.query.limit ?? '100', 10);
    
    try {
      const outcomes = await LifecycleStore.getOutcomes(asset, limit);
      const stats = await LifecycleStore.getOutcomeStats(asset);
      
      return {
        ok: true,
        asset,
        stats,
        count: outcomes.length,
        outcomes,
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  /**
   * GET /api/fractal/v2.1/admin/lifecycle/all-states
   * 
   * Get lifecycle states for all assets
   */
  fastify.get('/api/fractal/v2.1/admin/lifecycle/all-states', async () => {
    try {
      const states = await LifecycleStore.getAllStates();
      return {
        ok: true,
        count: states.length,
        states,
      };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  console.log('[Fractal] P1-A + P2: Lifecycle Admin routes registered');
  console.log('[Fractal]   - POST /api/fractal/v2.1/admin/lifecycle/promote');
  console.log('[Fractal]   - POST /api/fractal/v2.1/admin/lifecycle/resolve');
  console.log('[Fractal]   - GET  /api/fractal/v2.1/admin/lifecycle/status');
}

export default lifecycleAdminRoutes;
