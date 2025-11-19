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
  minutesLimit: number; // 0 means unlimited
  features: string[];
}

// Default fallback plans (used if database fetch fails)
const DEFAULT_PLAN_CONFIGS: Record<string, PlanConfig> = {
  starter: {
    key: "starter",
    name: "Starter",
    price: 19,
    minutesLimit: 500, // 500 minutes per month
    features: [
      "Up to 500 calls/month",
      "Basic analytics",
      "Email support",
      "2 team members",
      "Standard integrations"
    ]
  },
  professional: {
    key: "professional",
    name: "Professional",
    price: 49,
    minutesLimit: 2500, // 2,500 minutes per month
    features: [
      "Up to 2,500 calls/month",
      "Advanced analytics & reporting",
      "Priority support",
      "10 team members",
      "All integrations",
      "Custom branding"
    ]
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    price: 99,
    minutesLimit: 0, // 0 means unlimited
    features: [
      "Unlimited calls",
      "Real-time analytics",
      "24/7 phone support",
      "Unlimited team members",
      "Enterprise integrations",
      "Advanced security",
      "Dedicated account manager"
    ]
  },
  free: {
    key: "free",
    name: "Free",
    price: 0,
    minutesLimit: 100, // 100 minutes for free tier
    features: [
      "Up to 100 minutes/month",
      "Basic features",
      "Community support"
    ]
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
async function fetchPlanConfigsFromDB(tenant?: string | null): Promise<Record<string, PlanConfig>> {
  try {
    // Get tenant from hostname if not provided
    const currentTenant = tenant ?? getCurrentTenant();
    
    // Build query: get plans for current tenant OR main tenant plans (tenant IS NULL)
    let query = supabase
      .from('plan_configs')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    let data: any[] = [];
    
    if (currentTenant) {
      // For whitelabel tenant: get their plans AND main tenant plans separately
      // Tenant plans will override main plans for the same plan_key
      console.log(`[Plan Config] Fetching plans for tenant: ${currentTenant}`);
      
      // First, let's check what plans exist in the database for debugging
      const debugQuery = await supabase
        .from('plan_configs')
        .select('plan_key, name, price, tenant, is_active')
        .eq('is_active', true);
      
      console.log(`[Plan Config] All active plans in DB:`, debugQuery.data);
      console.log(`[Plan Config] Plans with tenant=${currentTenant}:`, 
        debugQuery.data?.filter(p => p.tenant === currentTenant));
      
      const [tenantPlansResult, mainPlansResult] = await Promise.all([
        // Fetch tenant-specific plans (created by slug owner)
        supabase
          .from('plan_configs')
          .select('*')
          .eq('is_active', true)
          .eq('tenant', currentTenant)
          .order('display_order', { ascending: true }),
        // Fetch main tenant plans (fallback for plan_keys not customized by tenant)
        supabase
          .from('plan_configs')
          .select('*')
          .eq('is_active', true)
          .is('tenant', null)
          .order('display_order', { ascending: true })
      ]);
      
      if (tenantPlansResult.error) {
        console.warn('Error fetching tenant plans:', tenantPlansResult.error);
      }
      if (mainPlansResult.error) {
        console.warn('Error fetching main plans:', mainPlansResult.error);
      }
      
      const tenantPlans = tenantPlansResult.data || [];
      const mainPlans = mainPlansResult.data || [];
      
      console.log(`[Plan Config] Query details:`, {
        tenant: currentTenant,
        tenantPlansCount: tenantPlans.length,
        mainPlansCount: mainPlans.length,
        tenantPlansData: tenantPlans.map(p => ({ key: p.plan_key, tenant: p.tenant, price: p.price })),
        tenantPlansError: tenantPlansResult.error
      });
      
      // Convert to PlanConfig format and create maps
      const tenantPlansMap: Record<string, PlanConfig> = {};
      const mainPlansMap: Record<string, PlanConfig> = {};
      
      // Convert tenant plans
      tenantPlans.forEach(plan => {
        tenantPlansMap[plan.plan_key] = {
          key: plan.plan_key,
          name: plan.name,
          price: Number(plan.price),
          minutesLimit: plan.minutes_limit,
          features: Array.isArray(plan.features) ? plan.features : []
        };
      });
      
      // Convert main plans
      mainPlans.forEach(plan => {
        mainPlansMap[plan.plan_key] = {
          key: plan.plan_key,
          name: plan.name,
          price: Number(plan.price),
          minutesLimit: plan.minutes_limit,
          features: Array.isArray(plan.features) ? plan.features : []
        };
      });
      
      // Merge: tenant plans override main plans, then defaults
      // If slug owner created a plan, use it. Otherwise, use main plan as fallback.
      const mergedPlans = { ...DEFAULT_PLAN_CONFIGS, ...mainPlansMap, ...tenantPlansMap };
      console.log(`[Plan Config] Tenant plans found: ${Object.keys(tenantPlansMap).length}, Main plans: ${Object.keys(mainPlansMap).length}, Final plans: ${Object.keys(mergedPlans).length}`);
      console.log(`[Plan Config] Starter plan price: $${mergedPlans.starter?.price} (tenant: ${tenantPlansMap.starter ? 'custom' : 'main'})`);
      return mergedPlans;
    } else {
      // For main tenant: only get main tenant plans
      const result = await query.is('tenant', null);
      if (result.error) {
        throw result.error;
      }
      data = result.data || [];
      
      if (!data || data.length === 0) {
        console.warn('No plan configs found in database, using defaults');
        return DEFAULT_PLAN_CONFIGS;
      }
      
      // Convert database format to PlanConfig format
      const configs: Record<string, PlanConfig> = {};
      for (const plan of data) {
        configs[plan.plan_key] = {
          key: plan.plan_key,
          name: plan.name,
          price: Number(plan.price),
          minutesLimit: plan.minutes_limit,
          features: Array.isArray(plan.features) ? plan.features : []
        };
      }
      
      // Merge with defaults
      return { ...DEFAULT_PLAN_CONFIGS, ...configs };
    }
  } catch (error) {
    console.error('Error fetching plan configs:', error);
    return DEFAULT_PLAN_CONFIGS;
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
 * Get minutes limit for a plan
 * @param planKey - The plan key (starter, professional, enterprise, free)
 * @returns Minutes limit (0 means unlimited)
 */
export function getMinutesLimitForPlan(planKey: string | null | undefined): number {
  if (!planKey) {
    return getPlanConfigsSync().free.minutesLimit;
  }
  
  const plan = getPlanConfigsSync()[planKey.toLowerCase()];
  return plan?.minutesLimit ?? getPlanConfigsSync().free.minutesLimit;
}

/**
 * Get plan configuration (synchronous - uses cache)
 * @param planKey - The plan key
 * @returns Plan configuration or free plan as default
 */
export function getPlanConfig(planKey: string | null | undefined): PlanConfig {
  if (!planKey) {
    return getPlanConfigsSync().free;
  }
  
  const plan = getPlanConfigsSync()[planKey.toLowerCase()];
  return plan ?? getPlanConfigsSync().free;
}

/**
 * Get plan configuration (async - fetches from database if needed)
 * @param planKey - The plan key
 * @returns Plan configuration or free plan as default
 */
export async function getPlanConfigAsync(planKey: string | null | undefined): Promise<PlanConfig> {
  const configs = await getPlanConfigs();
  
  if (!planKey) {
    return configs.free;
  }
  
  const plan = configs[planKey.toLowerCase()];
  return plan ?? configs.free;
}

/**
 * Check if plan has unlimited minutes
 * @param planKey - The plan key
 * @returns true if unlimited (minutesLimit === 0)
 */
export function isUnlimitedPlan(planKey: string | null | undefined): boolean {
  return getMinutesLimitForPlan(planKey) === 0;
}

/**
 * Format minutes for display
 * @param minutes - Minutes count (0 means unlimited)
 * @returns Formatted string
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0) {
    return "Unlimited";
  }
  if (minutes >= 1000) {
    return `${(minutes / 1000).toFixed(1)}k`;
  }
  return minutes.toString();
}

