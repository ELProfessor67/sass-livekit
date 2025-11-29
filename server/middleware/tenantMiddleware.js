import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client with service role key for admin operations
// Add custom headers to help bypass Cloudflare bot detection
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
    global: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Server/1.0)',
        'X-Client-Info': 'supabase-js-server',
      },
    },
  })
  : null;

// Hardcoded hosts that should always map to the main tenant
const hardcodedMainHosts = [
  'frontend.ultratalkai.com'
];

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
      if (process.env.NODE_ENV === 'development') {
        console.log('[extractTenantFromUrl] URL parsing failed:', url, e.message);
      }
      return 'main';
    }

    let hostname = parsedUrl.hostname;
    if (!hostname) return 'main';

    hostname = hostname.replace('www.', '');

    if (hardcodedMainHosts.includes(hostname)) {
      return 'main';
    }
    const parts = hostname.split('.');

    // In development, we might have localhost:port, so check parts length
    const isDevelopment = process.env.NODE_ENV === 'development';
    const minParts = isDevelopment ? 1 : 2;
    const mainDomain = process.env.MAIN_DOMAIN || 'localhost';

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[extractTenantFromUrl] Parsing hostname:', {
        hostname,
        parts,
        partsLength: parts.length,
        minParts,
        isDevelopment
      });
    }

    // Check if it's a subdomain (e.g., mycompany.maindomain.com or gomezlouis.localhost)
    // For localhost subdomains like gomezlouis.localhost, parts will be ['gomezlouis', 'localhost']
    // For regular subdomains like mycompany.example.com, parts will be ['mycompany', 'example', 'com']
    // For multi-level subdomains like gomezlouis.frontend.ultratalkai.com, parts will be ['gomezlouis', 'frontend', 'ultratalkai', 'com']
    const isLocalhostSubdomain = parts.length === 2 && parts[1] === 'localhost';
    const isRegularSubdomain = parts.length > minParts;

    if (isLocalhostSubdomain || isRegularSubdomain) {
      const subdomain = parts[0];

      if (process.env.NODE_ENV === 'development') {
        console.log('[extractTenantFromUrl] Detected subdomain:', subdomain, 'from hostname:', hostname);
      }

      if (!supabase) {
        console.warn('Supabase not initialized, returning main tenant');
        return 'main';
      }

      // Retry logic for Cloudflare-protected Supabase queries
      let tenantOwner = null;
      let error = null;
      const maxRetries = 3;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const result = await supabase
          .from('users')
          .select('slug_name, tenant')
          .eq('slug_name', subdomain)
          .maybeSingle();

        error = result.error;
        tenantOwner = result.data;

        // If successful or not a network/Cloudflare error, break
        if (!error || (error.code !== 'PGRST116' && error.code !== 'PGRST301' && !error.message?.includes('fetch'))) {
          break;
        }

        // If it's a network error (possibly Cloudflare), retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
          console.warn(`[extractTenantFromUrl] Supabase query failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (error) {
        console.error('Error fetching tenant by slug after retries:', {
          error: error.message,
          code: error.code,
          subdomain,
          attempts: maxRetries
        });
        // Don't return null immediately - Cloudflare might be blocking, but we should still try to proceed
        // Return null so the middleware can handle it appropriately
        return null;
      }

      if (!tenantOwner) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[extractTenantFromUrl] No tenant found for slug:', subdomain);
        }
        return null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[extractTenantFromUrl] Found tenant:', tenantOwner.slug_name || tenantOwner.tenant);
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

    // No subdomain detected and not main → invalid tenant
    return null;
  } catch (error) {
    console.error('Error extracting tenant from URL:', error);
    return null;
  }
}

export const tenantMiddleware = async (req, res, next) => {
  // Try multiple sources for the hostname in order of preference:
  // 1. origin header (most reliable for CORS requests)
  // 2. referer header (fallback for same-origin requests)
  // 3. x-forwarded-host header (set by reverse proxies)
  // 4. host header (last resort, but may be API server's hostname)
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const forwardedHost = req.headers['x-forwarded-host'] || '';
  const host = req.headers.host || '';
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

  // Extract tenant from multiple sources, in order of preference
  let urlToCheck = origin || referer;

  // If origin/referer not available, try x-forwarded-host (set by reverse proxies)
  if (!urlToCheck && forwardedHost) {
    const forwardedProto = req.headers['x-forwarded-proto'] || '';
    const protocol = forwardedProto === 'https' || req.secure ? 'https' : 'http';
    urlToCheck = `${protocol}://${forwardedHost}`;
  }

  // Last resort: use host header (but this might be API server's hostname, not frontend's)
  if (!urlToCheck && host) {
    // Only use host header if it looks like a frontend subdomain (has more than 2 parts, or is localhost subdomain)
    // This helps avoid using API server's hostname
    const hostParts = host.split(':')[0].split('.'); // Remove port if present
    const isLocalhost = hostParts.length === 2 && hostParts[1] === 'localhost';
    if (hostParts.length > 2 || isLocalhost) {
      const forwardedProto = req.headers['x-forwarded-proto'] || '';
      const protocol = forwardedProto === 'https' || req.secure ? 'https' : 'http';
      urlToCheck = `${protocol}://${host}`;
    }
  }

  // Debug logging (can be removed in production if not needed)
  if (process.env.NODE_ENV === 'development') {
    console.log('[TenantMiddleware] Extracting tenant from:', {
      origin: req.headers.origin,
      referer: req.headers.referer,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      host: req.headers.host,
      urlToCheck,
      uri
    });
  }

  const tenant = await extractTenantFromUrl(urlToCheck);

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[TenantMiddleware] Extracted tenant:', tenant);
  }

  // Production logging for tenant extraction failures (helps debug whitelabel issues)
  if (!tenant && !isIgnoredRoute(uri) && !isAuthenticatedApiRoute) {
    console.warn('[TenantMiddleware] Failed to extract tenant:', {
      origin: req.headers.origin || 'missing',
      referer: req.headers.referer || 'missing',
      'x-forwarded-host': req.headers['x-forwarded-host'] || 'missing',
      host: req.headers.host || 'missing',
      urlToCheck: urlToCheck || 'none',
      uri
    });
  }

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

