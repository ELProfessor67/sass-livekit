export interface CalComEventTypeResponse {
  eventTypeId: string;
  slug: string;
  title: string;
  length: number;
}

/**
 * Create an event type in Cal.com using v1 API
 */
export async function createCalComEventType(
  apiKey: string,
  slug: string,
  title: string,
  description: string = '',
  durationMinutes: number = 30,
  scheduleId?: number
): Promise<CalComEventTypeResponse> {
  const url = `https://api.cal.com/v1/event-types?apiKey=${apiKey}`;
  
  const payload = {
    title: title,
    slug: slug,
    length: durationMinutes,
    description: description,
    metadata: {}, // Required field, can be empty object
    hidden: false, // Set to true if you want it hidden initially
    position: 0,
    scheduleId: scheduleId, // Optional: link to a schedule
    requiresConfirmation: false,
    disableGuests: false,
    minimumBookingNotice: 120, // 2 hours in minutes
    beforeEventBuffer: 0,
    afterEventBuffer: 0,
    price: 0,
    currency: 'usd'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cal.com API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    return {
      eventTypeId: data.event_type?.id?.toString() || data.id?.toString(),
      slug: data.event_type?.slug || data.slug,
      title: data.event_type?.title || data.title,
      length: data.event_type?.length || data.length
    };
  } catch (error) {
    console.error('Error creating Cal.com event type:', error);
    throw error;
  }
}

/**
 * Get all event types from Cal.com using v1 API
 */
export async function getCalComEventTypes(apiKey: string): Promise<any[]> {
  const url = `https://api.cal.com/v1/event-types?apiKey=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cal.com API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.event_types || [];
  } catch (error) {
    console.error('Error fetching Cal.com event types:', error);
    throw error;
  }
}

/**
 * DEPRECATED: Mock function - DO NOT USE in production
 */
export async function createCalComEventTypeMock(
  apiKey: string,
  eventTypeSlug: string,
  label: string,
  description?: string,
  durationMinutes: number = 30
): Promise<{ eventTypeId: string }> {
  console.warn('WARNING: Using mock function. Replace with createCalComEventType()');
  return {
    eventTypeId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}
