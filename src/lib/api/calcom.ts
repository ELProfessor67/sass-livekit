export interface CalComEventTypeResponse {
  eventTypeId: string;
  slug: string;
  title: string;
  length: number;
}

/**
 * Create an event type in Cal.com using v2 API
 */
export async function createCalComEventType(
  apiKey: string,
  slug: string,
  title: string,
  description: string = '',
  durationMinutes: number = 30,
  scheduleId?: number
): Promise<CalComEventTypeResponse> {
  const url = `https://api.cal.com/v2/event-types`;

  const payload: Record<string, unknown> = {
    title,
    slug,
    lengthInMinutes: durationMinutes,
    description,
  };

  if (scheduleId !== undefined) {
    payload.scheduleId = scheduleId;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'cal-api-version': '2024-08-13',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cal.com API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const et = data.data || data;

    return {
      eventTypeId: et.id?.toString(),
      slug: et.slug,
      title: et.title,
      length: et.lengthInMinutes ?? et.length
    };
  } catch (error) {
    console.error('Error creating Cal.com event type:', error);
    throw error;
  }
}

/**
 * Get all event types from Cal.com using v2 API
 */
export async function getCalComEventTypes(apiKey: string): Promise<any[]> {
  const url = `https://api.cal.com/v2/event-types`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'cal-api-version': '2024-08-13',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cal.com API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    // v2 returns { status, data: [...] }
    return Array.isArray(data.data) ? data.data : (data.event_types || []);
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
