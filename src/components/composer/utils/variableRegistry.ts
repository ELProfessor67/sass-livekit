/**
 * Variable Registry
 * Defines all available variables organized by category for the Variable Picker
 */

export interface Variable {
  key: string;
  label: string;
  description?: string;
  example?: string;
}

export interface VariableCategory {
  id: string;
  label: string;
  description?: string;
  variables: Variable[];
}

/**
 * Mapping of trigger types to allowed variable category IDs
 */
const TRIGGER_MAPPING: Record<string, string[]> = {
  'webhook': ['call_data', 'appointment_data', 'custom_variables'],
  'hubspot_contact_created': ['hubspot_contact', 'custom_variables'],
  'hubspot_contact_updated': ['hubspot_contact', 'custom_variables'],
  'hubspot_contact_in_list': ['hubspot_contact', 'custom_variables'],
  'hubspot_contact_property_change': ['hubspot_contact', 'custom_variables'],
  'facebook_leads': ['facebook_lead', 'custom_variables'],
  'default': ['call_data', 'appointment_data', 'custom_variables']
};

/**
 * Get all available variables organized by category
 * @param triggerType Optional trigger type to filter variables
 */
export function getVariableRegistry(triggerType?: string): VariableCategory[] {
  const allCategories: VariableCategory[] = [
    {
      id: 'call_data',
      label: 'Call Data',
      description: 'Core call information captured during the call',
      variables: [
        {
          key: 'name',
          label: 'Contact Name',
          description: 'Name of the contact from the call report',
          example: 'John Doe'
        },
        {
          key: 'summary',
          label: 'AI Summary',
          description: 'AI-generated call summary',
          example: 'Customer called to book an appointment...'
        },
        {
          key: 'outcome',
          label: 'Call Outcome',
          description: 'Result or status of the call',
          example: 'Qualified'
        },
        {
          key: 'duration',
          label: 'Call Duration',
          description: 'Length of the call in seconds',
          example: '180'
        },
        {
          key: 'sentiment',
          label: 'Sentiment',
          description: 'Overall tone of the caller (positive, neutral, negative, frustrated)',
          example: 'Positive'
        },
        {
          key: 'urgent',
          label: 'Is Urgent',
          description: 'Whether the call requires immediate attention',
          example: 'true'
        },
        {
          key: 'transcript',
          label: 'Full Transcript',
          description: 'Complete conversation transcript',
          example: 'Agent: Hello, Customer: Hi...'
        },
        {
          key: 'phone_number',
          label: 'Phone Number',
          description: 'Caller\'s phone number',
          example: '+1234567890'
        },
        {
          key: 'agent_phone_number',
          label: 'Agent Phone Number',
          description: 'Phone number used by the agent/assistant',
          example: '+1234567890'
        },
        {
          key: 'call_id',
          label: 'Call ID',
          description: 'Unique call identifier (room name)',
          example: 'call-+1234567890-1234567890'
        },
        {
          key: 'call_sid',
          label: 'Call SID',
          description: 'Unique call identifier from telephony provider',
          example: 'CA1234567890'
        },
        {
          key: 'start_time',
          label: 'Start Time',
          description: 'Call start time (ISO format)',
          example: '2024-01-15T10:00:00'
        }
      ]
    },
    {
      id: 'appointment_data',
      label: 'Appointment Data',
      description: 'Standardized appointment object (always available - check appointment.status)',
      variables: [
        {
          key: 'appointment.status',
          label: 'Appointment Status',
          description: 'Booking status: "booked" or "not_booked"',
          example: 'booked'
        },
        {
          key: 'appointment.start_time',
          label: 'Start Time',
          description: 'Appointment start time in ISO format',
          example: '2024-01-15T10:00:00+00:00'
        },
        {
          key: 'appointment.timezone',
          label: 'Timezone',
          description: 'Timezone of the appointment',
          example: 'America/New_York'
        },
        {
          key: 'appointment.calendar',
          label: 'Calendar',
          description: 'Calendar service name (e.g., "Cal.com")',
          example: 'Cal.com'
        },
        {
          key: 'appointment.contact.name',
          label: 'Contact Name',
          description: 'Name of the person who booked',
          example: 'John Doe'
        },
        {
          key: 'appointment.contact.email',
          label: 'Contact Email',
          description: 'Email of the person who booked',
          example: 'john@example.com'
        },
        {
          key: 'appointment.contact.phone',
          label: 'Contact Phone',
          description: 'Phone number of the person who booked',
          example: '+1234567890'
        }
      ]
    },
    {
      id: 'hubspot_contact',
      label: 'HubSpot Contact',
      description: 'Contact data from HubSpot trigger',
      variables: [
        { key: 'firstname', label: 'First Name', example: 'John' },
        { key: 'lastname', label: 'Last Name', example: 'Doe' },
        { key: 'email', label: 'Email', example: 'john@example.com' },
        { key: 'phone', label: 'Phone Number', example: '+1234567890' },
        { key: 'company', label: 'Company', example: 'Acme Corp' },
        { key: 'jobtitle', label: 'Job Title', example: 'CEO' },
        { key: 'city', label: 'City', example: 'New York' },
        { key: 'state', label: 'State', example: 'NY' },
        { key: 'zip', label: 'Zip Code', example: '10001' },
        { key: 'country', label: 'Country', example: 'USA' },
        { key: 'lifecyclestage', label: 'Lifecycle Stage', example: 'Lead' },
      ]
    },
    {
      id: 'facebook_lead',
      label: 'Facebook Lead',
      description: 'Lead data from Facebook Ads',
      variables: [
        { key: 'full_name', label: 'Full Name', example: 'John Doe' },
        { key: 'email', label: 'Email', example: 'john@example.com' },
        { key: 'phone_number', label: 'Phone Number', example: '+1234567890' },
        { key: 'city', label: 'City', example: 'Los Angeles' },
        { key: 'created_time', label: 'Created Time', example: '2024-01-15T10:00:00' },
        { key: 'ad_id', label: 'Ad ID', example: '123456789' },
        { key: 'ad_name', label: 'Ad Name', example: 'Summer Promo' },
        { key: 'adset_name', label: 'Ad Set Name', example: 'Retargeting' },
        { key: 'campaign_name', label: 'Campaign Name', example: 'Lead Generation' },
        { key: 'form_id', label: 'Form ID', example: '987654321' },
      ]
    },
    {
      id: 'custom_variables',
      label: 'Custom Variables',
      description: 'User-defined variables from trigger node configuration',
      variables: [
        {
          key: 'custom_variable',
          label: 'Custom Variable',
          description: 'Add custom variables in the trigger node configuration',
          example: '{your_variable}'
        }
      ]
    }
  ];

  if (!triggerType) return allCategories;

  const allowedIds = TRIGGER_MAPPING[triggerType] || TRIGGER_MAPPING['default'];
  return allCategories.filter(category => allowedIds.includes(category.id));
}

/**
 * Get variables for a specific category
 */
export function getVariablesByCategory(categoryId: string): Variable[] {
  const registry = getVariableRegistry();
  const category = registry.find(cat => cat.id === categoryId);
  return category?.variables || [];
}

/**
 * Format variable key for insertion (wraps in curly braces)
 */
export function formatVariableKey(key: string): string {
  // Remove existing braces if present
  const cleanKey = key.replace(/[{}]/g, '');
  return `{${cleanKey}}`;
}

/**
 * Extract variable key from formatted string (removes curly braces)
 */
export function extractVariableKey(formatted: string): string {
  return formatted.replace(/[{}]/g, '');
}

/**
 * Get all variable keys as a flat list
 */
export function getAllVariableKeys(): string[] {
  const registry = getVariableRegistry();
  return registry.flatMap(category =>
    category.variables.map(v => formatVariableKey(v.key))
  );
}
