/**
 * Plan Configuration
 * Defines minutes allocation and features for each plan
 * Fetches from database with fallback to defaults
 */

import { supabase } from '@/integrations/supabase/client';
import { extractTenantFromHostname } from './tenant-utils';

export interface PlanConfig {
  key: string;
  name: string;
  price: number;
  features: string[];
  whitelabelEnabled?: boolean;
}

// Default fallback plans (used if database fetch fails)
const DEFAULT_PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    key: "starter",
    name: "Starter",
    price: 19,
    features: [
      "Basic analytics",
      "Email support",
      "2 team members",
      "Standard integrations",
      "Minutes purchased separately"
    ],
    whitelabelEnabled: false
  },
  professional: {
    key: "professional",
    name: "Professional",
    price: 49,
    features: [
      "Advanced analytics & reporting",
      "Priority support",
      "10 team members",
      "All integrations",
      "Custom branding",
      "Minutes purchased separately"
    ],
    whitelabelEnabled: false
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    price: 99,
    features: [
      "Real-time analytics",
      "24/7 phone support",
      "Unlimited team members",
      "Enterprise integrations",
      "Advanced security",
      "Dedicated account manager",
      "Minutes purchased separately"
    ],
    whitelabelEnabled: false
  },
  free: {
    key: "free",
    name: "Free",
    price: 0,
    features: [
      "Basic features",
      "Community support",
      "Minutes purchased separately"
    ],
    whitelabelEnabled: false
  }
};

// Cache for plan configs
let planConfigsCache: Record<string, PlanConfig> | null = null;
let planConfigsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get current tenant from hostname
 */
function getCurrentTenant(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const tenant = extractTenantFromHostname();
    // Return null for 'main' tenant, otherwise return the tenant slug
    return tenant === 'main' ? null : tenant;
  } catch (error) {
    console.warn('Error extracting tenant:', error);
    return null;
  }
}

/**
 * Fetch plan configs from database (filtered by tenant)
 */
/**
 * Fetch plan configs from database (filtered by tenant)
 */
async function fetchPlanConfigsFromDB(tenant?: string | null): Promise<Record<string, PlanConfig>> {
  try {
    // Get tenant from hostname if not provided
    const currentTenant = tenant ?? getCurrentTenant();

    let mergedPlans: Record<string, PlanConfig> = {};

    if (currentTenant) {
      // For whitelabel tenant: ONLY get their tenant-specific plans
      console.log(`[Plan Config] Fetching plans for whitelabel tenant: ${currentTenant}`);

      const tenantPlansResult = await (supabase as any)
        .from('plan_configs')
        .select('*')
        .eq('tenant', currentTenant)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (tenantPlansResult.error) {
        console.warn('Error fetching tenant plans:', tenantPlansResult.error);
        return {};
      }

      const tenantPlans = tenantPlansResult.data || [];

      // Only include active tenant plans
      tenantPlans.forEach((plan: any) => {
        mergedPlans[plan.plan_key] = {
          key: plan.plan_key,
          name: plan.name,
          price: Number(plan.price),
          features: Array.isArray(plan.features) ? plan.features : [],
          whitelabelEnabled: plan.whitelabel_enabled ?? false
        };
      });

      return mergedPlans;
    } else {
      // For main tenant: ONLY get main tenant plans (no defaults)
      console.log('[Plan Config] Fetching plans for main tenant');

      const result = await (supabase as any)
        .from('plan_configs')
        .select('*')
        .is('tenant', null)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (result.error) {
        console.warn('Error fetching main plans:', result.error);
        return {};
      }

      const data = result.data || [];

      // Only include active main plans
      data.forEach((plan: any) => {
        mergedPlans[plan.plan_key] = {
          key: plan.plan_key,
          name: plan.name,
          price: Number(plan.price),
          features: Array.isArray(plan.features) ? plan.features : [],
          whitelabelEnabled: plan.whitelabel_enabled ?? false
        };
      });

      return mergedPlans;
    }
  } catch (error) {
    console.error('Error fetching plan configs:', error);
    return {};
  }
}

/**
 * Get plan configs (from cache or database)
 * @param tenant - Optional tenant identifier to fetch tenant-specific plans
 */
export async function getPlanConfigs(tenant?: string | null): Promise<Record<string, PlanConfig>> {
  const now = Date.now();

  // For tenant-specific requests, don't use cache (or use tenant-specific cache)
  // For now, we'll always fetch fresh data if tenant is specified
  if (!tenant && planConfigsCache && (now - planConfigsCacheTime) < CACHE_DURATION) {
    return planConfigsCache;
  }

  // Fetch from database
  const configs = await fetchPlanConfigsFromDB(tenant);

  // Only cache if it's a main tenant request
  if (!tenant) {
    planConfigsCache = configs;
    planConfigsCacheTime = now;
  }

  return configs;
}

/**
 * Get plan configs synchronously (uses cache or defaults)
 * Use this for synchronous operations, but prefer getPlanConfigs() for async
 */
export function getPlanConfigsSync(): Record<string, PlanConfig> {
  return planConfigsCache || DEFAULT_PLAN_CONFIGS;
}

/**
 * Invalidate plan configs cache (call after admin updates plans)
 */
export function invalidatePlanConfigsCache(): void {
  planConfigsCache = null;
  planConfigsCacheTime = 0;
}

// Export default configs for backward compatibility
export const PLAN_CONFIGS = DEFAULT_PLAN_CONFIGS;



/**
 * Get plan configuration (synchronous - uses cache)
 * @param planKey - The plan key
 * @returns Plan configuration or free plan as default
 */
export function getPlanConfig(planKey: string | null | undefined): PlanConfig {
  const configs = getPlanConfigsSync();
  // Fallback to default free plan if the configured free plan was deleted/hidden
  const defaultFree = DEFAULT_PLAN_CONFIGS.free;

  if (!planKey) {
    return configs.free ?? defaultFree;
  }

  const plan = configs[planKey.toLowerCase()];
  return plan ?? configs.free ?? defaultFree;
}

/**
 * Get plan configuration (async - fetches from database if needed)
 * @param planKey - The plan key
 * @returns Plan configuration or free plan as default
 */
export async function getPlanConfigAsync(planKey: string | null | undefined): Promise<PlanConfig> {
  const configs = await getPlanConfigs();
  // Fallback to default free plan if the configured free plan was deleted/hidden
  const defaultFree = DEFAULT_PLAN_CONFIGS.free;

  if (!planKey) {
    return configs.free ?? defaultFree;
  }

  const plan = configs[planKey.toLowerCase()];
  return plan ?? configs.free ?? defaultFree;
}



