import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Routes that should be ignored (don't require tenant validation)
const ignoreRoutes = [
  '/api/health',
  '/api/v1/livekit/create-token',
  '/api/v1/livekit/dispatch',
  '/api/v1/recording',
  '/api/v1/sms/webhook',
  '/api/v1/twilio/sms/webhook',
  '/api/v1/twilio/sms/status-callback',
];

function isIgnoredRoute(uri) {
  return ignoreRoutes.some(route => uri.startsWith(route));
}

async function extractTenantFromUrl(url) {
  try {
    if (!url || url.trim() === '') return 'main';
    
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      // If URL parsing fails, return main tenant
      return 'main';
    }
    
    let hostname = parsedUrl.hostname;
    if (!hostname) return 'main';
    
    hostname = hostname.replace('www.', '');
    const parts = hostname.split('.');

    // In development, we might have localhost:port, so check parts length
    const isDevelopment = process.env.NODE_ENV === 'development';
    const minParts = isDevelopment ? 1 : 2;
    const mainDomain = process.env.MAIN_DOMAIN || 'localhost';

    // Check if it's a subdomain (e.g., mycompany.maindomain.com or gomezlouis.localhost)
    // For localhost subdomains like gomezlouis.localhost, parts will be ['gomezlouis', 'localhost']
    // For regular subdomains like mycompany.example.com, parts will be ['mycompany', 'example', 'com']
    const isLocalhostSubdomain = parts.length === 2 && parts[1] === 'localhost';
    const isRegularSubdomain = parts.length > minParts;
    
    if (isLocalhostSubdomain || isRegularSubdomain) {
      const subdomain = parts[0];
      
      if (!supabase) {
        console.warn('Supabase not initialized, returning main tenant');
        return 'main';
      }

      const { data: tenantOwner, error } = await supabase
        .from('users')
        .select('slug_name, tenant')
        .eq('slug_name', subdomain)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tenant by slug:', error);
        return null;
      }

      if (!tenantOwner) {
        return null;
      }

      return tenantOwner.slug_name || tenantOwner.tenant || 'main';
    }

    // Check if it's exactly localhost or 127.0.0.1 (no subdomain)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('127.0.0.1')) {
      return 'main';
    }

    // Check if it's the main domain
    if (hostname === mainDomain || hostname === `www.${mainDomain}`) {
      return 'main';
    }

    // Check if it's a custom domain
    if (!supabase) {
      console.warn('Supabase not initialized, returning main tenant');
      return 'main';
    }

    const { data: tenantOwner, error } = await supabase
      .from('users')
      .select('slug_name, tenant')
      .eq('custom_domain', hostname)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tenant by custom domain:', error);
      return null;
    }

    if (!tenantOwner) {
      return null;
    }

    return tenantOwner.slug_name || tenantOwner.tenant || 'main';
  } catch (error) {
    console.error('Error extracting tenant from URL:', error);
    return null;
  }
}

export const tenantMiddleware = async (req, res, next) => {
  const origin = req.headers.origin || req.headers.referer || '';
  const uri = req.url;

  // Skip tenant validation for ignored routes
  if (isIgnoredRoute(uri)) {
    req.tenant = 'main';
    return next();
  }

  // For authenticated API routes (like whitelabel, admin, etc.), allow through even if tenant can't be determined
  // These routes will handle authentication and authorization themselves
  const isAuthenticatedApiRoute = uri.startsWith('/api/v1/whitelabel') || 
                                  uri.startsWith('/api/v1/admin') ||
                                  uri.startsWith('/api/v1/minutes') ||
                                  uri.startsWith('/api/v1/support-access');
  
  // Extract tenant from origin/referer
  const tenant = await extractTenantFromUrl(origin);

  // If tenant can't be determined and it's not an ignored route or authenticated API route, block it
  if (!tenant && !isIgnoredRoute(uri) && !isAuthenticatedApiRoute) {
    return res.status(401).json({
      success: false,
      message: 'Invalid Tenant'
    });
  }

  // Only set tenant to 'main' if it's explicitly the main domain or localhost
  // Don't default to 'main' for invalid tenants
  if (!tenant) {
    // For authenticated API routes, allow through (they'll handle auth themselves)
    if (isAuthenticatedApiRoute) {
      req.tenant = 'main'; // Default for authenticated routes
      return next();
    }
    // For ignored routes, allow through with main tenant
    if (isIgnoredRoute(uri)) {
      req.tenant = 'main';
      return next();
    }
    // Otherwise, block it
    return res.status(401).json({
      success: false,
      message: 'Invalid Tenant'
    });
  }

  req.tenant = tenant;
  next();
};

