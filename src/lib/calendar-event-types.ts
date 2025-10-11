import { supabase } from "@/integrations/supabase/client";
import { createCalComEventType, getCalComEventTypes } from "@/lib/api/calcom";
import { getCurrentUserIdAsync } from "@/lib/user-context";

export interface CalendarEventType {
  id: string;
  calendar_credential_id: string;
  event_type_id: string;
  event_type_slug: string;
  label: string;
  description?: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CalendarEventTypeInput {
  calendarCredentialId: string;
  eventTypeSlug: string;
  label: string;
  description?: string;
  durationMinutes: number;
}

export interface CalComEventType {
  id: number;
  title: string;
  slug: string;
  length: number;
  description?: string;
  locations?: any[];
  bookingFields?: any[];
  disableGuests?: boolean;
  slotInterval?: number;
  minimumBookingNotice?: number;
  beforeEventBuffer?: number;
  afterEventBuffer?: number;
  recurrence?: any;
  metadata?: any;
  price?: number;
  currency?: string;
  lockTimeZoneToggleOnBookingPage?: boolean;
  seatsPerTimeSlot?: any;
  forwardParamsSuccessRedirect?: any;
  successRedirectUrl?: any;
  isInstantEvent?: boolean;
  seatsShowAvailabilityCount?: boolean;
  scheduleId?: number;
  bookingLimitsCount?: any;
  onlyShowFirstAvailableSlot?: boolean;
  bookingLimitsDuration?: any;
  bookingWindow?: any[];
  bookerLayouts?: any;
  confirmationPolicy?: any;
  requiresBookerEmailVerification?: boolean;
  hideCalendarNotes?: boolean;
  color?: {
    lightThemeHex: string;
    darkThemeHex: string;
  };
  seats?: any;
  offsetStart?: number;
  customName?: string;
  destinationCalendar?: any;
  useDestinationCalendarEmail?: boolean;
  hideCalendarEventDetails?: boolean;
  hideOrganizerEmail?: boolean;
  calVideoSettings?: any;
  hidden?: boolean;
  bookingRequiresAuthentication?: boolean;
  ownerId?: number;
  users?: string[];
}

/**
 * Service for managing calendar event types
 */
export class CalendarEventTypeService {
  /**
   * Get all event types for a specific calendar credential
   */
  static async getEventTypesByCredential(credentialId: string): Promise<CalendarEventType[]> {
    try {
      const { data, error } = await supabase
        .from("calendar_event_types")
        .select("*")
        .eq("calendar_credential_id", credentialId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching calendar event types:", error);
      return [];
    }
  }

  /**
   * Get all event types for the current user
   */
  static async getAllEventTypes(): Promise<CalendarEventType[]> {
    try {
      const userId = await getCurrentUserIdAsync();

      const { data, error } = await supabase
        .from("calendar_event_types")
        .select(`
          *,
          calendar_credential:user_calendar_credentials!inner(user_id)
        `)
        .eq("calendar_credential.user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching all calendar event types:", error);
      return [];
    }
  }

  /**
   * Create a new event type
   */
  static async createEventType(eventType: CalendarEventTypeInput): Promise<CalendarEventType> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // First, get the calendar credential to validate ownership
      const { data: credential, error: credError } = await supabase
        .from("user_calendar_credentials")
        .select("id, api_key, provider")
        .eq("id", eventType.calendarCredentialId)
        .eq("user_id", user.id)
        .single();

      if (credError) throw credError;
      if (!credential) throw new Error("Calendar credential not found");

      // Generate event type ID (this would typically call Cal.com API)
      const eventTypeId = await this.generateEventTypeId(
        credential.api_key, 
        eventType.eventTypeSlug, 
        eventType.label, 
        eventType.description, 
        eventType.durationMinutes
      );

      // Insert the event type
      const { data, error } = await supabase
        .from("calendar_event_types")
        .insert({
          calendar_credential_id: eventType.calendarCredentialId,
          event_type_id: eventTypeId,
          event_type_slug: eventType.eventTypeSlug,
          label: eventType.label,
          description: eventType.description,
          duration_minutes: eventType.durationMinutes
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error creating calendar event type:", error);
      throw error;
    }
  }

  /**
   * Update an existing event type
   */
  static async updateEventType(
    eventTypeId: string, 
    updates: Partial<CalendarEventTypeInput>
  ): Promise<CalendarEventType> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Verify ownership through calendar credential
      const { data: eventType, error: fetchError } = await supabase
        .from("calendar_event_types")
        .select(`
          *,
          calendar_credential:user_calendar_credentials!inner(user_id)
        `)
        .eq("id", eventTypeId)
        .eq("calendar_credential.user_id", user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!eventType) throw new Error("Event type not found");

      const updateData: any = {};
      if (updates.label) updateData.label = updates.label;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.durationMinutes) updateData.duration_minutes = updates.durationMinutes;

      const { data, error } = await supabase
        .from("calendar_event_types")
        .update(updateData)
        .eq("id", eventTypeId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error updating calendar event type:", error);
      throw error;
    }
  }

  /**
   * Delete an event type
   */
  static async deleteEventType(eventTypeId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Verify ownership through calendar credential
      const { data: eventType, error: fetchError } = await supabase
        .from("calendar_event_types")
        .select(`
          *,
          calendar_credential:user_calendar_credentials!inner(user_id)
        `)
        .eq("id", eventTypeId)
        .eq("calendar_credential.user_id", user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!eventType) throw new Error("Event type not found");

      const { error } = await supabase
        .from("calendar_event_types")
        .delete()
        .eq("id", eventTypeId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting calendar event type:", error);
      throw error;
    }
  }

  /**
   * Generate event type ID by calling Cal.com API
   */
  private static async generateEventTypeId(apiKey: string, eventTypeSlug: string, label: string, description?: string, durationMinutes: number = 30): Promise<string> {
    try {
      // Call Cal.com API to create the event type
      const calComResult = await createCalComEventType(
        apiKey, 
        eventTypeSlug, 
        label, 
        description || '', 
        durationMinutes
      );
      return calComResult.eventTypeId;
    } catch (error) {
      console.error("Error generating event type ID:", error);
      // Fallback: generate a mock ID
      return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Get event types grouped by calendar credential
   */
  static async getEventTypesGroupedByCredential(): Promise<Record<string, CalendarEventType[]>> {
    try {
      const eventTypes = await this.getAllEventTypes();
      
      return eventTypes.reduce((acc, eventType) => {
        const credentialId = eventType.calendar_credential_id;
        if (!acc[credentialId]) {
          acc[credentialId] = [];
        }
        acc[credentialId].push(eventType);
        return acc;
      }, {} as Record<string, CalendarEventType[]>);
    } catch (error) {
      console.error("Error grouping event types by credential:", error);
      return {};
    }
  }

  /**
   * Fetch event types directly from Cal.com for a specific calendar credential
   */
  static async fetchEventTypesFromCalCom(calendarCredentialId: string): Promise<CalComEventType[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get the calendar credential to access the API key
      const { data: credential, error: credError } = await supabase
        .from("user_calendar_credentials")
        .select("id, api_key, provider")
        .eq("id", calendarCredentialId)
        .eq("user_id", user.id)
        .single();

      if (credError) throw credError;
      if (!credential) throw new Error("Calendar credential not found");

      // Fetch event types from Cal.com
      const eventTypes = await getCalComEventTypes(credential.api_key);
      return eventTypes;
    } catch (error) {
      console.error("Error fetching event types from Cal.com:", error);
      throw error;
    }
  }
}

// Export convenience functions
export const getEventTypesByCredential = (credentialId: string) => 
  CalendarEventTypeService.getEventTypesByCredential(credentialId);
export const getAllEventTypes = () => CalendarEventTypeService.getAllEventTypes();
export const createEventType = (eventType: CalendarEventTypeInput) => 
  CalendarEventTypeService.createEventType(eventType);
export const updateEventType = (id: string, updates: Partial<CalendarEventTypeInput>) => 
  CalendarEventTypeService.updateEventType(id, updates);
export const deleteEventType = (id: string) => CalendarEventTypeService.deleteEventType(id);
export const getEventTypesGroupedByCredential = () => 
  CalendarEventTypeService.getEventTypesGroupedByCredential();
export const fetchEventTypesFromCalCom = (calendarCredentialId: string) => 
  CalendarEventTypeService.fetchEventTypesFromCalCom(calendarCredentialId);
