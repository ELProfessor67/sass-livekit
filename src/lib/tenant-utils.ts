/**
 * Extract tenant from current hostname
 * Examples:
 * - gomezlouis.localhost -> gomezlouis
 * - mycompany.example.com -> mycompany
 * - localhost -> main
 * - example.com -> main
 */
export function extractTenantFromHostname(): string {
  if (typeof window === 'undefined') {
    return 'main';
  }

  const hostname = window.location.hostname;
  if (!hostname) {
    return 'main';
  }

  // Remove www. prefix if present
  const cleanHostname = hostname.replace(/^www\./, '');
  const parts = cleanHostname.split('.');

  // Check if it's a subdomain
  // For localhost: gomezlouis.localhost -> ['gomezlouis', 'localhost']
  // For regular domain: mycompany.example.com -> ['mycompany', 'example', 'com']
  const isLocalhostSubdomain = parts.length === 2 && parts[1] === 'localhost';
  const isRegularSubdomain = parts.length > 2;

  if (isLocalhostSubdomain || isRegularSubdomain) {
    const subdomain = parts[0];
    // Return the subdomain as potential tenant
    // The backend will verify if it's a valid tenant
    return subdomain;
  }

  // Default to main for localhost, 127.0.0.1, or main domain
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('127.0.0.1')) {
    return 'main';
  }

  // For main domain (no subdomain), return main
  return 'main';
}


