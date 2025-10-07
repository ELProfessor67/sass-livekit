import { SMSIntegrationService } from './sms-integration-service.js';

class SMSAIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqBaseUrl = 'https://api.groq.com/openai/v1';
    this.cerebrasApiKey = process.env.CEREBRAS_API_KEY;
    this.cerebrasBaseUrl = process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1';
    this.integrationService = new SMSIntegrationService();
  }

  /**
   * Generate AI response for SMS conversation
   */
  async generateSMSResponse(message, smsPrompt, conversationHistory = [], assistantConfig = {}) {
    try {
      // Check for knowledge base queries
      let knowledgeBaseContext = null;
      if (this.integrationService.isKnowledgeBaseQuery(message) && assistantConfig.knowledge_base_id) {
        console.log('Detected knowledge base query, searching...');
        knowledgeBaseContext = await this.integrationService.searchKnowledgeBase(
          assistantConfig.knowledge_base_id, 
          message
        );
      }

      // Check for calendar queries
      let calendarResponse = null;
      if (this.integrationService.isCalendarQuery(message) && assistantConfig.cal_api_key && assistantConfig.cal_event_type_id) {
        console.log('Detected calendar query, checking availability...');
        
        // Use the new booking flow that follows the same pattern as LiveKit worker
        calendarResponse = await this.integrationService.handleCalendarBooking(
          assistantConfig,
          message,
          conversationHistory
        );
        
        // If we have a successful calendar response, return it directly
        if (calendarResponse && calendarResponse.success && calendarResponse.message) {
          console.log('Using calendar booking response directly:', calendarResponse.message);
          return calendarResponse.message;
        }
      }

      // Build conversation context
      const conversationContext = this.buildConversationContext(conversationHistory);
      
      // Create the system prompt with integrations
      const systemPrompt = this.buildSystemPrompt(smsPrompt, assistantConfig, knowledgeBaseContext, calendarResponse);
      
      // Create messages array for LLM
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...conversationContext,
        {
          role: 'user',
          content: message
        }
      ];

      // Call configured LLM API
      const response = await this.callLLM(messages, assistantConfig);
      
      return response || 'I apologize, but I cannot process your message right now. Please try again.';
      
    } catch (error) {
      console.error('Error generating SMS response:', error);
      return 'I apologize, but I encountered an error. Please try again later.';
    }
  }

  /**
   * Build conversation context from history
   */
  buildConversationContext(conversationHistory) {
    const context = [];
    
    // Process conversation history (most recent first, so reverse)
    const sortedHistory = conversationHistory.reverse();
    
    for (const message of sortedHistory) {
      const role = message.direction === 'inbound' ? 'user' : 'assistant';
      context.push({
        role: role,
        content: message.body
      });
    }
    
    return context;
  }

  /**
   * Build system prompt for SMS conversations
   */
  buildSystemPrompt(smsPrompt, assistantConfig, knowledgeBaseContext = null, calendarResponse = null) {
    let systemPrompt = smsPrompt || 'You are a helpful AI assistant communicating via SMS.';
    
    // Add SMS-specific instructions
    systemPrompt += '\n\nSMS Guidelines:';
    systemPrompt += '\n- Keep responses concise and under 160 characters when possible';
    systemPrompt += '\n- Use simple, clear language';
    systemPrompt += '\n- Be friendly and professional';
    systemPrompt += '\n- If you need more information, ask one question at a time';
    systemPrompt += '\n- Use emojis sparingly and appropriately';
    
    // Add tone instructions based on responseStyle setting
    const responseStyle = assistantConfig.responseStyle || 0.5;
    if (responseStyle < 0.3) {
      systemPrompt += '\n- Use a formal, professional tone';
      systemPrompt += '\n- Avoid contractions and casual language';
      systemPrompt += '\n- Be more structured and business-like';
    } else if (responseStyle > 0.7) {
      systemPrompt += '\n- Use a casual, friendly tone';
      systemPrompt += '\n- Feel free to use contractions and informal language';
      systemPrompt += '\n- Be conversational and relaxed';
    } else {
      systemPrompt += '\n- Use a balanced, professional yet friendly tone';
      systemPrompt += '\n- Mix formal and casual elements appropriately';
    }
    
    // Add language instructions if specified
    const language = assistantConfig.language || 'en';
    if (language !== 'en') {
      const languageNames = {
        'es': 'Spanish',
        'pt': 'Portuguese', 
        'fr': 'French',
        'de': 'German',
        'nl': 'Dutch',
        'no': 'Norwegian',
        'ar': 'Arabic'
      };
      const langName = languageNames[language] || language;
      systemPrompt += `\n- Respond in ${langName}`;
    }
    
    // Add knowledge base context if available
    if (knowledgeBaseContext) {
      systemPrompt += '\n\nKNOWLEDGE BASE CONTEXT:';
      systemPrompt += '\nYou have access to company information. Use this context to answer questions accurately:';
      systemPrompt += `\n${knowledgeBaseContext}`;
      systemPrompt += '\n- Always prioritize information from the knowledge base when available';
      systemPrompt += '\n- If the knowledge base doesn\'t have the answer, say so clearly';
    }
    
    // Add calendar context if available
    if (calendarResponse) {
      systemPrompt += '\n\nCALENDAR INFORMATION:';
      if (calendarResponse.success) {
        systemPrompt += '\nYou can help with scheduling appointments.';
        systemPrompt += `\nIMPORTANT: Use this exact response: "${calendarResponse.message}"`;
        systemPrompt += '\n- Follow the booking flow step by step';
        systemPrompt += '\n- Collect all required details before scheduling';
        systemPrompt += '\n- Confirm appointments before finalizing';
      } else {
        systemPrompt += '\nCalendar is currently unavailable. Offer to help in other ways.';
        systemPrompt += `\nIMPORTANT: Use this exact response: "${calendarResponse.message}"`;
      }
    }
    
    // Add assistant-specific context
    if (assistantConfig.name) {
      systemPrompt += `\n\nYou are ${assistantConfig.name}.`;
    }
    
    return systemPrompt;
  }

  /**
   * Call LLM API based on configured provider
   */
  async callLLM(messages, assistantConfig) {
    const provider = assistantConfig.llm_provider_setting || 'OpenAI';
    const characterLimit = assistantConfig.characterLimit || 160;
    
    try {
      let apiUrl, apiKey, modelName, maxTokens, temperature;
      
      switch (provider) {
        case 'Groq':
          apiUrl = this.groqBaseUrl;
          apiKey = this.groqApiKey;
          modelName = assistantConfig.groq_model || assistantConfig.llm_model_setting || 'llama-3.1-8b-instant';
          maxTokens = assistantConfig.groq_max_tokens || assistantConfig.max_token_setting || 150;
          temperature = assistantConfig.groq_temperature || assistantConfig.temperature_setting || 0.7;
          break;
          
        case 'Cerebras':
          apiUrl = this.cerebrasBaseUrl;
          apiKey = this.cerebrasApiKey;
          modelName = assistantConfig.llm_model_setting || 'llama3.1-8b';
          maxTokens = assistantConfig.max_token_setting || 150;
          temperature = assistantConfig.temperature_setting || 0.7;
          break;
          
        case 'OpenAI':
        default:
          apiUrl = this.openaiBaseUrl;
          apiKey = this.openaiApiKey;
          modelName = this.convertModelName(assistantConfig.llm_model_setting || 'gpt-4o-mini');
          maxTokens = assistantConfig.max_token_setting || 150;
          temperature = assistantConfig.temperature_setting || 0.7;
          break;
      }
      
      if (!apiKey) {
        console.error(`${provider} API key not configured`);
        throw new Error(`${provider} API key not configured`);
      }
      
      console.log(`Using ${provider} LLM: ${modelName}`);
      
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`${provider} API error:`, response.status, errorData);
        throw new Error(`${provider} API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error(`No content in ${provider} response:`, data);
        return null;
      }

      // Apply character limit from assistant settings
      return content.length > characterLimit ? content.substring(0, characterLimit - 3) + '...' : content;
      
    } catch (error) {
      console.error(`Error calling ${provider} API:`, error);
      throw error;
    }
  }

  /**
   * Generate first SMS message
   */
  generateFirstSMSMessage(firstSmsMessage, assistantConfig = {}) {
    if (firstSmsMessage && firstSmsMessage.trim()) {
      return firstSmsMessage.trim();
    }
    
    // Default first message if none configured
    const assistantName = assistantConfig.name || 'AI Assistant';
    return `Hello! I'm ${assistantName}. How can I help you today?`;
  }

  /**
   * Check if message contains conversation end keywords
   */
  isConversationEnd(message) {
    const endKeywords = ['end', 'stop', 'goodbye', 'bye', 'quit', 'exit', 'cancel'];
    const lowerMessage = message.toLowerCase().trim();
    
    return endKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Generate conversation end message
   */
  generateEndMessage() {
    return 'Thank you for chatting with me! Have a great day! 👋';
  }

  /**
   * Convert model name from database format to OpenAI API format
   */
  convertModelName(modelName) {
    const modelMap = {
      'GPT-4o Mini': 'gpt-4o-mini',
      'GPT-4o': 'gpt-4o',
      'GPT-4': 'gpt-4',
      'GPT-3.5 Turbo': 'gpt-3.5-turbo',
      'gpt-4o-mini': 'gpt-4o-mini',
      'gpt-4o': 'gpt-4o',
      'gpt-4': 'gpt-4',
      'gpt-3.5-turbo': 'gpt-3.5-turbo'
    };
    
    return modelMap[modelName] || 'gpt-4o-mini';
  }
}

export { SMSAIService };
