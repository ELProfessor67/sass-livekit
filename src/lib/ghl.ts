
/**
 * GoHighLevel (GHL) API utilities
 */

// GHL API base URL
const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

// Get the GHL API key from localStorage
export const getGHLApiKey = () => localStorage.getItem('ghl_api_key') || '';

// Check if GHL is configured
export const isGHLConfigured = () => {
  return !!getGHLApiKey();
};

// Define proper type for fetch options
interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

// Make API calls to GHL
export const fetchFromGHL = async (endpoint: string, options: FetchOptions = {}) => {
  const apiKey = getGHLApiKey();
  
  if (!apiKey) {
    throw new Error('GHL API key not configured');
  }

  const response = await fetch(`${GHL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`GHL API error: ${response.status}`);
  }

  return response.json();
};

// Fetch contacts from GHL
export const fetchContacts = async (limit = 10) => {
  try {
    return await fetchFromGHL(`/contacts?limit=${limit}`);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return { contacts: [] };
  }
};

// Fetch calls from GHL (if available in their API)
export const fetchCalls = async (limit = 10) => {
  try {
    // Note: This endpoint is hypothetical and depends on GHL's API structure
    return await fetchFromGHL(`/calls?limit=${limit}`);
  } catch (error) {
    console.error('Error fetching calls:', error);
    return { calls: [] };
  }
};
