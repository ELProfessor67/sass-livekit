class SMSDatabaseService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get assistant configuration by phone number
   */
  async getAssistantByPhoneNumber(phoneNumber) {
    try {
      console.log(`Querying database for phone number: ${phoneNumber}`);
      const { data, error } = await this.supabase
        .from('phone_number')
        .select(`
          inbound_assistant_id,
          assistant:assistant(
            id,
            name,
            first_sms,
            sms_prompt,
            llm_provider_setting,
            llm_model_setting,
            temperature_setting,
            max_token_setting,
            groq_model,
            groq_temperature,
            groq_max_tokens,
            character_limit,
            response_style,
            language_setting,
            knowledge_base_id,
            cal_api_key,
            cal_event_type_id,
            cal_event_type_slug,
            cal_timezone
          )
        `)
        .eq('number', phoneNumber)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error fetching assistant by phone number:', error);
        return null;
      }

      console.log('Database query result:', data);
      return data?.assistant || null;
    } catch (error) {
      console.error('Exception in getAssistantByPhoneNumber:', error);
      return null;
    }
  }

  /**
   * Check if this is a new conversation or ongoing
   * Returns true if assistant hasn't sent any messages in the last 3 hours
   */
  async isNewConversation(userPhoneNumber, assistantId) {
    try {
      const ASSISTANT_TIMEOUT = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
      
      console.log(`Checking if assistant has sent messages recently for user phone: ${userPhoneNumber}, assistant: ${assistantId}`);
      
      // Get the assistant's phone number (the number users text to)
      const { data: assistantPhoneData, error: phoneError } = await this.supabase
        .from('phone_number')
        .select('number')
        .eq('inbound_assistant_id', assistantId)
        .eq('status', 'active')
        .single();

      if (phoneError || !assistantPhoneData) {
        console.log('Could not find assistant phone number - treating as new conversation');
        return true;
      }

      const assistantPhoneNumber = assistantPhoneData.number;
      console.log(`Assistant phone number: ${assistantPhoneNumber}`);

      // Check if assistant has sent any messages to this user in the last 3 hours
      const { data, error } = await this.supabase
        .from('sms_messages')
        .select('created_at, direction')
        .eq('from_number', assistantPhoneNumber)
        .eq('to_number', userPhoneNumber)
        .eq('direction', 'outbound')
        .gte('created_at', new Date(Date.now() - ASSISTANT_TIMEOUT).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking assistant message history:', error);
        return true; // Default to new conversation on error
      }

      if (!data) {
        console.log('No assistant messages found in last 3 hours - new conversation, will send first message');
        return true; // No assistant messages in last 3 hours = new conversation
      }

      // Assistant has sent a message recently
      const lastAssistantMessageTime = new Date(data.created_at).getTime();
      const now = Date.now();
      const timeDiff = now - lastAssistantMessageTime;
      
      console.log(`Last assistant message time: ${data.created_at}, Time diff: ${timeDiff}ms, Timeout: ${ASSISTANT_TIMEOUT}ms`);
      console.log('Assistant has sent messages recently - ongoing conversation, will generate AI response');

      return false; // Assistant has sent messages recently = ongoing conversation
    } catch (error) {
      console.error('Exception in isNewConversation:', error);
      return true; // Default to new conversation on error
    }
  }

  /**
   * Get conversation history for context
   */
  async getConversationHistory(userPhoneNumber, assistantId, limit = 10) {
    try {
      console.log(`Getting conversation history for user phone: ${userPhoneNumber}, assistant: ${assistantId}, limit: ${limit}`);
      
      // Get the assistant's phone number (the number users text to)
      const { data: assistantPhoneData, error: phoneError } = await this.supabase
        .from('phone_number')
        .select('number')
        .eq('inbound_assistant_id', assistantId)
        .eq('status', 'active')
        .single();

      if (phoneError || !assistantPhoneData) {
        console.log('Could not find assistant phone number - returning empty history');
        return [];
      }

      const assistantPhoneNumber = assistantPhoneData.number;
      console.log(`Assistant phone number: ${assistantPhoneNumber}`);

      // Get messages between user and assistant (both directions)
      const { data, error } = await this.supabase
        .from('sms_messages')
        .select('body, direction, created_at')
        .or(`and(to_number.eq.${userPhoneNumber},from_number.eq.${assistantPhoneNumber}),and(to_number.eq.${assistantPhoneNumber},from_number.eq.${userPhoneNumber})`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching conversation history:', error);
        return [];
      }

      console.log(`Found ${data?.length || 0} conversation history messages between user and assistant`);
      return data || [];
    } catch (error) {
      console.error('Exception in getConversationHistory:', error);
      return [];
    }
  }

  /**
   * Save incoming SMS message
   */
  async saveIncomingSMS(smsData) {
    try {
      console.log('💾 SMS DATABASE SERVICE: Saving incoming SMS:', {
        messageSid: smsData.messageSid,
        toNumber: smsData.toNumber,
        fromNumber: smsData.fromNumber,
        messageBody: smsData.messageBody?.substring(0, 50) + '...',
        userId: smsData.userId
      });
      
      const { data, error } = await this.supabase
        .from('sms_messages')
        .insert({
          message_sid: smsData.messageSid,
          to_number: smsData.toNumber,
          from_number: smsData.fromNumber,
          body: smsData.messageBody,
          direction: 'inbound',
          status: 'received',
          date_created: new Date().toISOString(),
          date_updated: new Date().toISOString(),
          user_id: smsData.userId
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving incoming SMS:', error);
        return null;
      }

      console.log('✅ SMS saved successfully:', {
        messageSid: data.message_sid,
        id: data.id,
        direction: data.direction
      });

      return data;
    } catch (error) {
      console.error('Exception in saveIncomingSMS:', error);
      return null;
    }
  }

  /**
   * Save outgoing SMS message
   */
  async saveOutgoingSMS(smsData) {
    try {
      const { data, error } = await this.supabase
        .from('sms_messages')
        .insert({
          message_sid: smsData.messageSid,
          to_number: smsData.toNumber,
          from_number: smsData.fromNumber,
          body: smsData.messageBody,
          direction: 'outbound',
          status: smsData.status || 'sent',
          date_created: new Date().toISOString(),
          date_updated: new Date().toISOString(),
          user_id: smsData.userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving outgoing SMS:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in saveOutgoingSMS:', error);
      return null;
    }
  }

  /**
   * Get user ID from assistant ID
   */
  async getUserIdFromAssistant(assistantId) {
    try {
      const { data, error } = await this.supabase
        .from('assistant')
        .select('user_id')
        .eq('id', assistantId)
        .single();

      if (error) {
        console.error('Error fetching user ID from assistant:', error);
        return null;
      }

      return data?.user_id || null;
    } catch (error) {
      console.error('Exception in getUserIdFromAssistant:', error);
      return null;
    }
  }
}

export { SMSDatabaseService };
