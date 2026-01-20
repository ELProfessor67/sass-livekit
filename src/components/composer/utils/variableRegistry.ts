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
 * Get all available variables organized by category
 */
export function getVariableRegistry(): VariableCategory[] {
  return [
    {
      id: 'call_data',
      label: 'Call Data',
      description: 'Core call information captured during the call',
      variables: [
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
          key: 'participant_identity',
          label: 'Participant Identity',
          description: 'Identity of the call participant',
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
          key: 'summary',
          label: 'AI Summary',
          description: 'AI-generated call summary (alias for call_summary)',
          example: 'Customer called to book an appointment...'
        },
        {
          key: 'call_summary',
          label: 'Call Summary',
          description: 'Detailed AI-generated call summary',
          example: 'Customer interested in scheduling...'
        },
        {
          key: 'outcome',
          label: 'Call Outcome',
          description: 'Result of the call (alias for call_status)',
          example: 'Qualified'
        },
        {
          key: 'call_status',
          label: 'Call Status',
          description: 'Status/outcome of the call',
          example: 'Qualified'
        },
        {
          key: 'call_outcome',
          label: 'Call Outcome (Detailed)',
          description: 'Detailed call outcome from AI analysis',
          example: 'Qualified'
        },
        {
          key: 'call_duration',
          label: 'Call Duration',
          description: 'Length of the call in seconds',
          example: '180'
        },
        {
          key: 'transcription',
          label: 'Full Transcript',
          description: 'Complete conversation transcript (array format)',
          example: '[{"role": "agent", "content": "Hello..."}]'
        },
        {
          key: 'start_time',
          label: 'Start Time',
          description: 'Call start time (ISO format)',
          example: '2024-01-15T10:00:00'
        },
        {
          key: 'end_time',
          label: 'End Time',
          description: 'Call end time (ISO format)',
          example: '2024-01-15T10:03:00'
        },
        {
          key: 'outcome_confidence',
          label: 'Outcome Confidence',
          description: 'Confidence score for the call outcome',
          example: '0.95'
        },
        {
          key: 'outcome_reasoning',
          label: 'Outcome Reasoning',
          description: 'AI reasoning for the call outcome',
          example: 'Customer expressed strong interest...'
        },
        {
          key: 'outcome_sentiment',
          label: 'Outcome Sentiment',
          description: 'Sentiment analysis of the call',
          example: 'positive'
        },
        {
          key: 'follow_up_required',
          label: 'Follow Up Required',
          description: 'Whether follow-up is needed',
          example: 'true'
        },
        {
          key: 'follow_up_notes',
          label: 'Follow Up Notes',
          description: 'Notes about required follow-up',
          example: 'Customer wants callback tomorrow'
        },
        {
          key: 'success_evaluation',
          label: 'Success Evaluation',
          description: 'Whether the call was successful',
          example: 'SUCCESS'
        },
        {
          key: 'assistant_id',
          label: 'Assistant ID',
          description: 'ID of the assistant that handled the call',
          example: 'asst_123456'
        }
      ]
    },
    {
      id: 'structured_data',
      label: 'Structured Data',
      description: 'Extracted structured information from the call (fields vary based on assistant configuration)',
      variables: [
        {
          key: 'structured_data.name',
          label: 'Name',
          description: 'Extracted name from structured data (may be name, full_name, contact_name, customer_name, or client_name)',
          example: 'John Doe'
        },
        {
          key: 'structured_data.email',
          label: 'Email',
          description: 'Extracted email address',
          example: 'john@example.com'
        },
        {
          key: 'structured_data.phone',
          label: 'Phone',
          description: 'Extracted phone number',
          example: '+1234567890'
        },
        {
          key: 'structured_data.address',
          label: 'Address',
          description: 'Extracted address',
          example: '123 Main St, City, State'
        },
        {
          key: 'structured_data.company',
          label: 'Company',
          description: 'Extracted company name',
          example: 'Acme Corp'
        },
        {
          key: 'structured_data.notes',
          label: 'Notes',
          description: 'Additional notes from structured data',
          example: 'Customer prefers morning calls'
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
          key: 'appointment.end_time',
          label: 'End Time',
          description: 'Appointment end time in ISO format',
          example: '2024-01-15T10:30:00+00:00'
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
          key: 'appointment.booking_link',
          label: 'Booking Link',
          description: 'URL to view/manage the booking',
          example: 'https://cal.com/username/event-slug/uid'
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
      id: 'custom_variables',
      label: 'Custom Variables',
      description: 'User-defined variables from trigger node configuration',
      variables: [
        // These will be populated dynamically from the trigger node's expected_variables
        // For now, we show a placeholder
        {
          key: 'custom_variable',
          label: 'Custom Variable',
          description: 'Add custom variables in the trigger node configuration',
          example: '{your_variable}'
        }
      ]
    }
  ];
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
