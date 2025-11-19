/**
 * Tenant filtering utilities
 * Ensures all database queries filter by tenant for data isolation
 */

/**
 * Add tenant filter to a Supabase query
 * @param {object} query - Supabase query builder
 * @param {string} tenant - Tenant identifier
 * @param {string} tableName - Name of the table (for tables that have tenant column)
 * @returns {object} - Query with tenant filter applied
 */
export const addTenantFilter = (query, tenant, tableName = 'users') => {
  if (!query) return query;
  
  const effectiveTenant = tenant || 'main';
  
  if (effectiveTenant === 'main') {
    // For main tenant, filter by tenant = 'main' OR tenant is NULL (legacy data)
    return query.or(`tenant.eq.main,tenant.is.null`);
  }
  
  // For whitelabel tenants, filter by exact tenant match
  return query.eq('tenant', effectiveTenant);
};

/**
 * Helper to get tenant from request and apply filter
 * @param {object} req - Express request object
 * @param {object} query - Supabase query builder
 * @returns {object} - Query with tenant filter applied
 */
export const filterByRequestTenant = (req, query) => {
  const tenant = req.tenant || 'main';
  return addTenantFilter(query, tenant);
};

/**
 * Ensure user can only access data from their tenant
 * @param {object} req - Express request object
 * @param {object} query - Supabase query builder
 * @param {string} tableName - Name of the table
 * @returns {object} - Query with tenant filter applied
 */
export const applyTenantFilter = (req, query, tableName = 'users') => {
  const tenant = req.tenant || 'main';
  return addTenantFilter(query, tenant, tableName);
};

/**
 * Check if user belongs to the requested tenant
 * @param {object} userData - User data from database
 * @param {string} requestedTenant - Tenant from request
 * @returns {boolean} - True if user belongs to tenant
 */
export const userBelongsToTenant = (userData, requestedTenant) => {
  if (!userData) return false;
  
  const userTenant = userData.tenant || 'main';
  
  // Main tenant users can access main tenant
  if (requestedTenant === 'main' && (userTenant === 'main' || !userData.slug_name)) {
    return true;
  }
  
  // Whitelabel tenant owners can access their tenant
  if (userData.slug_name === requestedTenant) {
    return true;
  }
  
  // Users belong to their assigned tenant
  return userTenant === requestedTenant;
};

/**
 * Get tenant filter condition for raw SQL queries
 * @param {string} tenant - Tenant identifier
 * @param {string} tableAlias - Table alias in SQL query (default: '')
 * @returns {string} - SQL WHERE condition
 */
export const getTenantSQLFilter = (tenant, tableAlias = '') => {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  if (!tenant || tenant === 'main') {
    return `(${prefix}tenant = 'main' OR ${prefix}tenant IS NULL)`;
  }
  
  return `${prefix}tenant = '${tenant}'`;
};

export default {
  addTenantFilter,
  applyTenantFilter,
  userBelongsToTenant,
  getTenantSQLFilter
};

