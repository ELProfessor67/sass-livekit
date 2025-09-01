export interface CalSetupArgs {
  apiKey: string;
  eventTypeSlug: string;
  timezone?: string;
}

export interface CalSetupResponse {
  eventTypeId: string;
  eventTypeSlug: string;
}

export async function setupCalEventType(args: CalSetupArgs): Promise<CalSetupResponse> {
  const primaryUrl = (import.meta.env.VITE_CAL_SETUP_URL || (import.meta.env.CAL_SETUP_URL as string | undefined) || `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'}/api/v1/calendar/setup`) as string;
  const fallbackUrl = primaryUrl; // no proxy; single direct URL

  const doPost = (endpoint: string) => fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cal_api_key: args.apiKey,
      cal_event_type_slug: args.eventTypeSlug,
      cal_timezone: args.timezone || 'UTC',
    }),
  });

  let res = await doPost(primaryUrl);
  // no proxy retry necessary anymore

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Calendar setup failed (${res.status}): ${text}`);
  }
  const data = await res.json().catch(() => ({}));
  const id = data?.eventTypeId || data?.event_type_id || data?.id || data?.eventType?.id || args.eventTypeSlug;
  const slug = data?.eventTypeSlug || data?.event_type_slug || data?.slug || args.eventTypeSlug;
  return { eventTypeId: String(id), eventTypeSlug: String(slug) };
}


