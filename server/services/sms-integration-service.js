import { createClient } from '@supabase/supabase-js';
import PineconeContextService from './pinecone-context-service.js';

class SMSIntegrationService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.pineconeContextService = new PineconeContextService();
  }

  /**
   * Search knowledge base for relevant information using Pinecone
   */
  async searchKnowledgeBase(knowledgeBaseId, query) {
    if (!knowledgeBaseId || knowledgeBaseId === 'None') {
      return null;
    }

    try {
      console.log(`Searching knowledge base ${knowledgeBaseId} for: ${query}`);
      
      // Get knowledge base info to get company_id
      const { data: kbData, error: kbError } = await this.supabase
        .from('knowledge_bases')
        .select('company_id')
        .eq('id', knowledgeBaseId)
        .single();

      if (kbError || !kbData) {
        console.error('Knowledge base not found:', kbError);
        return null;
      }

      // Use Pinecone to search for context snippets
      const contextResult = await this.pineconeContextService.getContextSnippets(
        kbData.company_id,
        knowledgeBaseId,
        query,
        {
          topK: 3, // Limit to top 3 results for SMS
          snippetSize: 1024 // Smaller snippets for SMS
        }
      );

      if (!contextResult.success) {
        console.error('Error searching Pinecone knowledge base:', contextResult.error);
        return null;
      }

      if (!contextResult.snippets || contextResult.snippets.length === 0) {
        console.log('No relevant documents found in Pinecone knowledge base');
        return null;
      }

      // Format the context for the LLM
      const context = contextResult.snippets
        .map((snippet, index) => `[Context ${index + 1}] ${snippet.content}`)
        .join('\n\n');

      console.log(`Found ${contextResult.snippets.length} relevant snippets from Pinecone`);
      return context;

    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return null;
    }
  }

  /**
   * Check calendar availability using Cal.com API directly
   */
  async checkCalendarAvailability(assistantConfig, startDate, endDate) {
    if (!assistantConfig.cal_api_key || !assistantConfig.cal_event_type_id) {
      console.log('Calendar not configured - missing cal_api_key or cal_event_type_id');
      return null;
    }

    try {
      console.log(`Checking calendar availability for event type: ${assistantConfig.cal_event_type_id}`);
      
      // Call Cal.com API directly for available slots
      const slotsResponse = await this.callCalComSlotsAPI(
        assistantConfig.cal_api_key,
        assistantConfig.cal_event_type_id,
        assistantConfig.cal_timezone || 'UTC',
        startDate,
        endDate
      );

      if (slotsResponse && slotsResponse.length > 0) {
        return {
          available: true,
          message: "I can help you schedule an appointment. What time works best for you?",
          nextAvailableSlots: slotsResponse.slice(0, 3).map(slot => 
            new Date(slot.start).toLocaleString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZone: assistantConfig.cal_timezone || 'UTC'
            })
          )
        };
      } else {
        return {
          available: false,
          message: "I don't see any available slots in the next week. Would you like me to check a different time range?"
        };
      }

    } catch (error) {
      console.error('Error checking calendar availability:', error);
      return {
        available: false,
        message: "I'm having trouble checking my calendar right now. Please try again later or call us directly."
      };
    }
  }

  /**
   * Handle calendar booking flow - follow the same pattern as LiveKit worker
   */
  async handleCalendarBooking(assistantConfig, message, conversationHistory) {
    if (!assistantConfig.cal_api_key || !assistantConfig.cal_event_type_id) {
      console.log('Calendar not configured - missing cal_api_key or cal_event_type_id');
      return null;
    }

    try {
      console.log(`Handling calendar booking for event type: ${assistantConfig.cal_event_type_id}`);
      console.log(`Message: "${message}"`);
      console.log(`Conversation history length: ${conversationHistory ? conversationHistory.length : 0}`);
      
      // Step 1: Detect if this is initial booking request
      if (this.isInitialBookingRequest(message)) {
        console.log('Detected initial booking request');
        return {
          success: true,
          message: "I'd be happy to help you book an appointment! What's the reason for your visit?",
          nextStep: "collect_notes"
        };
      }

      // Step 2: Check if we're collecting notes
      if (this.isCollectingNotes(message, conversationHistory)) {
        return {
          success: true,
          message: "Got it! Which day works for you? You can say 'today', 'tomorrow', or a specific day like 'Monday'.",
          nextStep: "collect_day"
        };
      }

      // Step 3: Check if we're collecting day preference
      if (this.isCollectingDay(message, conversationHistory)) {
        const day = this.extractDayFromMessage(message);
        if (!day) {
          return {
            success: true,
            message: "I didn't catch that. Which day works for you? You can say 'today', 'tomorrow', or a specific day.",
            nextStep: "collect_day"
          };
        }

        // Get available slots for the day
        const slots = await this.getAvailableSlotsForDay(assistantConfig, day);
        if (!slots || slots.length === 0) {
          return {
            success: true,
            message: `I don't see any available times on ${day}. Would you like to try a different day?`,
            nextStep: "collect_day"
          };
        }

        // Present available slots
        const slotsText = slots.slice(0, 6).map((slot, index) => 
          `Option ${index + 1}: ${slot.time}`
        ).join('\n');

        return {
          success: true,
          message: `Here are the available times on ${day}:\n${slotsText}\n\nWhich option works for you?`,
          nextStep: "collect_slot",
          availableSlots: slots
        };
      }

      // Step 4: Check if we're collecting slot selection
      if (this.isCollectingSlot(message, conversationHistory)) {
        const slotNumber = this.extractSlotNumber(message);
        if (!slotNumber) {
          return {
            success: true,
            message: "I didn't catch that. Please tell me which option number you'd like (1, 2, 3, etc.).",
            nextStep: "collect_slot"
          };
        }

        return {
          success: true,
          message: "Perfect! Now I need your details to complete the booking. What's your full name?",
          nextStep: "collect_name",
          selectedSlot: slotNumber
        };
      }

      // Step 5: Check if we're collecting name
      if (this.isCollectingName(message, conversationHistory)) {
        return {
          success: true,
          message: "Great! What's your email address?",
          nextStep: "collect_email",
          attendeeName: message.trim()
        };
      }

      // Step 6: Check if we're collecting email
      if (this.isCollectingEmail(message, conversationHistory)) {
        const email = this.extractEmail(message);
        if (!email) {
          return {
            success: true,
            message: "I didn't catch a valid email address. Could you please provide your email?",
            nextStep: "collect_email"
          };
        }

        return {
          success: true,
          message: "Perfect! What's your phone number?",
          nextStep: "collect_phone",
          attendeeEmail: email
        };
      }

      // Step 7: Check if we're collecting phone
      if (this.isCollectingPhone(message, conversationHistory)) {
        const phone = this.extractPhone(message);
        if (!phone) {
          return {
            success: true,
            message: "I didn't catch a valid phone number. Could you please provide your phone number?",
            nextStep: "collect_phone"
          };
        }

        // Now we have all details - attempt to book
        return await this.finalizeBooking(assistantConfig, conversationHistory, phone);
      }

      // If we get here, we don't know what step we're on
      return {
        success: true,
        message: "I'd be happy to help you book an appointment! What's the reason for your visit?",
        nextStep: "collect_notes"
      };

    } catch (error) {
      console.error('Error handling calendar booking:', error);
      return {
        success: false,
        message: "I encountered an error while processing your booking request. Please try again later or call us directly."
      };
    }
  }

  /**
   * Detect if message is asking about knowledge base topics
   */
  isKnowledgeBaseQuery(message) {
    const kbKeywords = [
      'what is', 'tell me about', 'how does', 'explain', 'information about',
      'company', 'business', 'service', 'product', 'price', 'cost', 'hours',
      'location', 'address', 'contact', 'phone', 'email', 'website',
      'history', 'about us', 'team', 'staff', 'founder'
    ];
    
    const lowerMessage = message.toLowerCase();
    return kbKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Detect if message is asking about scheduling/appointments
   */
  isCalendarQuery(message) {
    const calendarKeywords = [
      'schedule', 'appointment', 'booking', 'book', 'meeting', 'call',
      'available', 'availability', 'time', 'when', 'tomorrow', 'next week',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'morning', 'afternoon', 'evening', 'am', 'pm'
    ];
    
    const lowerMessage = message.toLowerCase();
    return calendarKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Extract appointment details from message
   */
  extractAppointmentDetails(message) {
    const lowerMessage = message.toLowerCase();
    
    // Simple extraction - in a real implementation, you'd use NLP
    const timeMatch = lowerMessage.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    const dateMatch = lowerMessage.match(/(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week)/);
    
    return {
      time: timeMatch ? timeMatch[0] : null,
      date: dateMatch ? dateMatch[0] : 'tomorrow',
      message: message
    };
  }

  /**
   * Call Cal.com API to get available slots
   */
  async callCalComSlotsAPI(apiKey, eventTypeId, timezone, startDate, endDate) {
    try {
      const startTime = startDate.toISOString();
      const endTime = endDate.toISOString();
      
      const response = await fetch(`https://api.cal.com/v1/slots?apiKey=${apiKey}&eventTypeId=${eventTypeId}&startTime=${startTime}&endTime=${endTime}&timeZone=${timezone}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('Cal.com slots API error:', response.status, await response.text());
        return [];
      }

      const data = await response.json();
      return data.slots || [];
    } catch (error) {
      console.error('Error calling Cal.com slots API:', error);
      return [];
    }
  }

  /**
   * Call Cal.com API to create a booking
   */
  async callCalComBookingAPI(apiKey, eventTypeId, appointmentDetails, timezone) {
    try {
      // Parse appointment details to get proper date/time
      const startTime = this.parseAppointmentTime(appointmentDetails);
      const startStr = startTime.toISOString().replace('Z', 'Z'); // Ensure UTC format
      
      // Create booking payload matching Cal.com v2 API format (based on worker implementation)
      const bookingData = {
        start: startStr,
        attendee: {
          name: "SMS User",
          email: "sms@example.com",
          timeZone: timezone,
          language: "en"
        },
        metadata: {
          source: "SMS Agent",
          notes: appointmentDetails.message || "Booked via SMS"
        }
      };

      // Convert eventTypeId to integer as required by Cal.com API
      try {
        bookingData.eventTypeId = parseInt(eventTypeId);
      } catch (error) {
        console.error('Error converting eventTypeId to integer:', error);
        return { success: false };
      }

      console.log('Cal.com booking payload:', JSON.stringify(bookingData, null, 2));

      const response = await fetch('https://api.cal.com/v2/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'cal-api-version': '2024-08-13'
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cal.com booking API error:', response.status, errorText);
        return { success: false, error: errorText };
      }

      const data = await response.json();
      console.log('Cal.com booking success:', data);
      
      return {
        success: true,
        booking_id: data.data?.id || data.id || `booking_${Date.now()}`
      };
    } catch (error) {
      console.error('Error calling Cal.com booking API:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Parse appointment time from details
   */
  parseAppointmentTime(appointmentDetails) {
    // For now, use current time + 1 hour as a placeholder
    // In a real implementation, you'd parse the actual date/time from appointmentDetails
    const now = new Date();
    const appointmentTime = new Date(now.getTime() + (60 * 60 * 1000)); // 1 hour from now
    
    // Convert to UTC
    return new Date(appointmentTime.toISOString());
  }

  // ========== BOOKING FLOW HELPER METHODS ==========

  /**
   * Detect if this is an initial booking request
   */
  isInitialBookingRequest(message) {
    const lowerMessage = message.toLowerCase();
    const bookingKeywords = [
      'book', 'booking', 'schedule', 'appointment', 'meeting', 'reserve',
      'i want to', 'i need to', 'can i', 'would like to'
    ];
    
    const isBooking = bookingKeywords.some(keyword => lowerMessage.includes(keyword));
    console.log(`isInitialBookingRequest check for "${message}": ${isBooking}`);
    if (isBooking) {
      const matchedKeyword = bookingKeywords.find(keyword => lowerMessage.includes(keyword));
      console.log(`Matched keyword: "${matchedKeyword}"`);
    }
    
    return isBooking;
  }

  /**
   * Check if we're collecting notes based on conversation history
   */
  isCollectingNotes(message, conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return false;
    
    // Find the most recent assistant message (look from the end)
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.direction === 'outbound') {
        console.log(`Checking last assistant message: "${msg.body}"`);
        return msg.body.includes('reason for your visit');
      }
    }
    return false;
  }

  /**
   * Check if we're collecting day preference
   */
  isCollectingDay(message, conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return false;
    
    // Find the most recent assistant message (look from the end)
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.direction === 'outbound') {
        console.log(`Checking last assistant message for day collection: "${msg.body}"`);
        return msg.body.includes('Which day works for you');
      }
    }
    return false;
  }

  /**
   * Check if we're collecting slot selection
   */
  isCollectingSlot(message, conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return false;
    
    // Find the most recent assistant message (look from the end)
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.direction === 'outbound') {
        console.log(`Checking last assistant message for slot collection: "${msg.body}"`);
        return msg.body.includes('Which option works for you');
      }
    }
    return false;
  }

  /**
   * Check if we're collecting name
   */
  isCollectingName(message, conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return false;
    
    // Find the most recent assistant message (look from the end)
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.direction === 'outbound') {
        console.log(`Checking last assistant message for name collection: "${msg.body}"`);
        return msg.body.includes('What\'s your full name');
      }
    }
    return false;
  }

  /**
   * Check if we're collecting email
   */
  isCollectingEmail(message, conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return false;
    
    // Find the most recent assistant message (look from the end)
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.direction === 'outbound') {
        console.log(`Checking last assistant message for email collection: "${msg.body}"`);
        return msg.body.includes('What\'s your email address');
      }
    }
    return false;
  }

  /**
   * Check if we're collecting phone
   */
  isCollectingPhone(message, conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return false;
    
    // Find the most recent assistant message (look from the end)
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      if (msg.direction === 'outbound') {
        console.log(`Checking last assistant message for phone collection: "${msg.body}"`);
        return msg.body.includes('What\'s your phone number');
      }
    }
    return false;
  }

  /**
   * Extract day from message
   */
  extractDayFromMessage(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    if (lowerMessage.includes('today')) return 'today';
    if (lowerMessage.includes('tomorrow')) return 'tomorrow';
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      if (lowerMessage.includes(day)) return day;
    }
    
    return null;
  }

  /**
   * Extract slot number from message
   */
  extractSlotNumber(message) {
    const match = message.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Extract email from message
   */
  extractEmail(message) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = message.match(emailRegex);
    return match ? match[0] : null;
  }

  /**
   * Extract phone number from message
   */
  extractPhone(message) {
    const phoneRegex = /[\+]?[1-9]?[\d\s\-\(\)]{7,}/;
    const match = message.match(phoneRegex);
    return match ? match[0].replace(/\D/g, '') : null;
  }

  /**
   * Get available slots for a specific day
   */
  async getAvailableSlotsForDay(assistantConfig, day) {
    try {
      const today = new Date();
      let targetDate;
      
      if (day === 'today') {
        targetDate = new Date(today);
      } else if (day === 'tomorrow') {
        targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      } else {
        // For specific days, we'll use tomorrow as a placeholder
        // In a real implementation, you'd parse the actual date
        targetDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }
      
      const startDate = new Date(targetDate);
      startDate.setHours(9, 0, 0, 0); // 9 AM
      
      const endDate = new Date(targetDate);
      endDate.setHours(17, 0, 0, 0); // 5 PM
      
      const slots = await this.callCalComSlotsAPI(
        assistantConfig.cal_api_key,
        assistantConfig.cal_event_type_id,
        assistantConfig.cal_timezone || 'UTC',
        startDate,
        endDate
      );
      
      return slots.map(slot => ({
        time: new Date(slot.start).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        start: slot.start
      }));
      
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  /**
   * Finalize the booking with all collected details
   */
  async finalizeBooking(assistantConfig, conversationHistory, phone) {
    try {
      // Extract all collected details from conversation history
      const details = this.extractBookingDetailsFromHistory(conversationHistory);
      
      if (!details.name || !details.email || !details.selectedSlot) {
        return {
          success: false,
          message: "I'm missing some details. Let's start over - what's the reason for your visit?"
        };
      }
      
      // Get the selected slot time
      const slots = await this.getAvailableSlotsForDay(assistantConfig, 'tomorrow'); // Simplified
      const selectedSlot = slots[details.selectedSlot - 1];
      
      if (!selectedSlot) {
        return {
          success: false,
          message: "I couldn't find that time slot. Let's try again - which day works for you?"
        };
      }
      
      // Create booking
      const appointmentDetails = {
        start: selectedSlot.start,
        attendeeName: details.name,
        attendeeEmail: details.email,
        attendeePhone: phone,
        notes: details.notes || 'Booked via SMS'
      };
      
      const bookingResponse = await this.callCalComBookingAPI(
        assistantConfig.cal_api_key,
        assistantConfig.cal_event_type_id,
        appointmentDetails,
        assistantConfig.cal_timezone || 'UTC'
      );
      
      if (bookingResponse && bookingResponse.success) {
        return {
          success: true,
          message: `Perfect! Your appointment has been scheduled for ${selectedSlot.time}. You'll receive a confirmation email at ${details.email}. Thank you!`
        };
      } else {
        return {
          success: false,
          message: "I had trouble scheduling that appointment. Please try again or call us directly."
        };
      }
      
    } catch (error) {
      console.error('Error finalizing booking:', error);
      return {
        success: false,
        message: "I encountered an error while scheduling. Please try again later or call us directly."
      };
    }
  }

  /**
   * Extract booking details from conversation history
   */
  extractBookingDetailsFromHistory(conversationHistory) {
    const details = {};
    
    // Find the last user message for each step
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const message = conversationHistory[i];
      if (message.direction === 'inbound') {
        // Check if this is a name (no email pattern, no phone pattern, not a number)
        if (!details.name && !this.extractEmail(message.body) && !this.extractPhone(message.body) && !this.extractSlotNumber(message.body)) {
          details.name = message.body.trim();
        }
        // Check if this is an email
        else if (!details.email && this.extractEmail(message.body)) {
          details.email = this.extractEmail(message.body);
        }
        // Check if this is a slot number
        else if (!details.selectedSlot && this.extractSlotNumber(message.body)) {
          details.selectedSlot = this.extractSlotNumber(message.body);
        }
        // Check if this is notes (first message that's not a booking request)
        else if (!details.notes && !this.isInitialBookingRequest(message.body)) {
          details.notes = message.body.trim();
        }
      }
    }
    
    return details;
  }
}

export { SMSIntegrationService };
