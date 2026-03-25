/**
 * Utility to apply tenant filter to any Supabase query
 * This is a helper that can be used throughout the codebase
 */

/**
 * Apply tenant filter to a query based on tenant value
 * @param {object} query - Supabase query builder
 * @param {string} tenant - Tenant identifier (from req.tenant)
 * @returns {object} - Query with tenant filter applied
 */
export function applyTenantFilter(query, tenant) {
  if (!query) return query;

  const effectiveTenant = tenant || 'main';

  if (effectiveTenant === 'main') {
    // For main tenant, include both 'main' and NULL (legacy data)
    return query.or('tenant.eq.main,tenant.is.null');
  }

  // For whitelabel tenants, exact match
  return query.eq('tenant', effectiveTenant);
}

/**
 * Apply tenant and workspace filter from request object
 * @param {object} req - Express request object
 * @param {object} query - Supabase query builder
 * @returns {object} - Query with all filters applied
 */
export function applyTenantFilterFromRequest(req, query) {
  const tenant = req.tenant || 'main';
  let filteredQuery = applyTenantFilter(query, tenant);

  if (req.workspaceId) {
    filteredQuery = filteredQuery.eq('workspace_id', req.workspaceId);
  }

  return filteredQuery;
}

export default {
  applyTenantFilter,
  applyTenantFilterFromRequest
};



