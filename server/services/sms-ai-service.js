class SMSAIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  /**
   * Generate AI response for SMS conversation
   */
  async generateSMSResponse(message, smsPrompt, conversationHistory = [], assistantConfig = {}) {
    try {
      if (!this.openaiApiKey) {
        console.error('OpenAI API key not configured');
        return 'Sorry, I am not available right now. Please try again later.';
      }

      // Build conversation context
      const conversationContext = this.buildConversationContext(conversationHistory);
      
      // Create the system prompt
      const systemPrompt = this.buildSystemPrompt(smsPrompt, assistantConfig);
      
      // Create messages array for OpenAI
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

      // Call OpenAI API
      const response = await this.callOpenAI(messages, assistantConfig);
      
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
  buildSystemPrompt(smsPrompt, assistantConfig) {
    let systemPrompt = smsPrompt || 'You are a helpful AI assistant communicating via SMS.';
    
    // Add SMS-specific instructions
    systemPrompt += '\n\nSMS Guidelines:';
    systemPrompt += '\n- Keep responses concise and under 160 characters when possible';
    systemPrompt += '\n- Use simple, clear language';
    systemPrompt += '\n- Be friendly and professional';
    systemPrompt += '\n- If you need more information, ask one question at a time';
    systemPrompt += '\n- Use emojis sparingly and appropriately';
    
    // Add assistant-specific context
    if (assistantConfig.name) {
      systemPrompt += `\n\nYou are ${assistantConfig.name}.`;
    }
    
    return systemPrompt;
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(messages, assistantConfig) {
    try {
      // Convert model name to OpenAI API format
      const modelName = this.convertModelName(assistantConfig.llm_model_setting || 'gpt-4o-mini');
      
      const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          max_tokens: assistantConfig.max_token_setting || 150, // Shorter for SMS
          temperature: assistantConfig.temperature_setting || 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API error:', response.status, errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error('No content in OpenAI response:', data);
        return null;
      }

      // Truncate if too long for SMS (SMS limit is 160 characters for single message)
      return content.length > 160 ? content.substring(0, 157) + '...' : content;
      
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
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
