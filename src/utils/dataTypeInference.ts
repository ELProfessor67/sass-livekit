export interface DataFieldSuggestion {
  name: string;
  type: string;
  description: string;
  confidence: number;
  validation?: string;
  extractionHint?: string;
  required?: boolean;
  isUniversal?: boolean;
  origin?: string;
}

// Universal default fields that every business needs
export const UNIVERSAL_DEFAULTS: DataFieldSuggestion[] = [
  {
    name: 'Customer Name',
    type: 'string',
    description: 'Full name of the customer or caller',
    confidence: 1.0,
    extractionHint: 'Identifies customer names mentioned during the call',
    isUniversal: true,
    origin: 'Essential Customer Information'
  },
  {
    name: 'Phone Number',
    type: 'string',
    description: 'Customer contact phone number',
    confidence: 1.0,
    validation: 'Phone number format',
    extractionHint: 'Extracts phone numbers in various formats',
    isUniversal: true,
    origin: 'Essential Customer Information'
  },
  {
    name: 'Email Address',
    type: 'string',
    description: 'Customer email for follow-up communication',
    confidence: 1.0,
    validation: 'Valid email format',
    extractionHint: 'Identifies and validates email addresses',
    isUniversal: true,
    origin: 'Essential Customer Information'
  },
  {
    name: 'Call Outcome',
    type: 'string',
    description: 'Overall result or outcome of the call',
    confidence: 1.0,
    extractionHint: 'Captures the main result of the conversation',
    isUniversal: true,
    origin: 'Essential Customer Information'
  },
  {
    name: 'Follow Up Required',
    type: 'boolean',
    description: 'Whether this customer needs follow-up contact',
    confidence: 1.0,
    extractionHint: 'Determines if additional contact is needed',
    isUniversal: true,
    origin: 'Essential Customer Information'
  }
];

// Common data patterns and their types
const DATA_PATTERNS = {
  contact: {
    keywords: ['phone', 'email', 'contact', 'number', 'address', 'zip', 'postal'],
    types: {
      phone: { type: 'string', validation: 'Phone number format', hint: 'Will extract phone numbers in various formats' },
      email: { type: 'string', validation: 'Valid email format', hint: 'Will identify and validate email addresses' },
      address: { type: 'string', validation: 'Address format', hint: 'Extracts full addresses or address components' },
      zip: { type: 'string', validation: 'Postal code format', hint: 'Identifies ZIP/postal codes' }
    }
  },
  datetime: {
    keywords: ['date', 'time', 'appointment', 'schedule', 'meeting', 'when', 'day', 'hour'],
    types: {
      date: { type: 'date', validation: 'Valid date format', hint: 'Extracts dates mentioned in conversation' },
      time: { type: 'string', validation: 'Time format (HH:MM)', hint: 'Identifies specific times' },
      datetime: { type: 'date', validation: 'Full date and time', hint: 'Complete appointment scheduling info' }
    }
  },
  financial: {
    keywords: ['price', 'cost', 'budget', 'money', 'dollar', 'payment', 'fee', 'rate'],
    types: {
      amount: { type: 'number', validation: 'Positive number', hint: 'Extracts monetary amounts' },
      budget: { type: 'string', validation: 'Budget range (e.g., $1000-$5000)', hint: 'Identifies budget ranges or limits' }
    }
  },
  demographics: {
    keywords: ['age', 'gender', 'location', 'city', 'state', 'country', 'occupation', 'job'],
    types: {
      age: { type: 'number', validation: 'Age between 1-120', hint: 'Extracts age or age ranges' },
      location: { type: 'string', validation: 'City, state, or country', hint: 'Geographic information' },
      occupation: { type: 'string', validation: 'Job title or profession', hint: 'Professional background' }
    }
  },
  business: {
    keywords: ['company', 'business', 'industry', 'service', 'product', 'lead', 'prospect'],
    types: {
      company: { type: 'string', validation: 'Company name', hint: 'Business or organization names' },
      industry: { type: 'string', validation: 'Industry category', hint: 'Business sector or industry type' },
      service: { type: 'string', validation: 'Service type', hint: 'Specific services of interest' }
    }
  },
  outcome: {
    keywords: ['interested', 'outcome', 'result', 'decision', 'follow', 'next', 'action', 'qualified'],
    types: {
      interest_level: { type: 'string', validation: 'High/Medium/Low', hint: 'Customer interest assessment' },
      next_action: { type: 'string', validation: 'Action description', hint: 'Agreed upon next steps' },
      qualified: { type: 'boolean', validation: 'Yes/No', hint: 'Lead qualification status' }
    }
  }
};

// Business use case templates for smarter suggestions
const BUSINESS_TEMPLATES = {
  'real-estate': [
    { name: 'property_interest', type: 'string', description: 'Type of property customer is interested in' },
    { name: 'price_range', type: 'string', description: 'Budget range for property purchase' },
    { name: 'preferred_location', type: 'string', description: 'Desired neighborhoods or areas' },
    { name: 'timeline', type: 'string', description: 'When they want to buy/sell' }
  ],
  'healthcare': [
    { name: 'symptoms_described', type: 'string', description: 'Patient-described symptoms or concerns' },
    { name: 'appointment_urgency', type: 'string', description: 'How urgent the appointment is' },
    { name: 'insurance_provider', type: 'string', description: 'Patient insurance information' },
    { name: 'preferred_doctor', type: 'string', description: 'Specific doctor preference' }
  ],
  'automotive': [
    { name: 'vehicle_interest', type: 'string', description: 'Type of vehicle customer wants' },
    { name: 'trade_in_vehicle', type: 'string', description: 'Current vehicle for trade-in' },
    { name: 'financing_needed', type: 'boolean', description: 'Whether customer needs financing' },
    { name: 'test_drive_scheduled', type: 'boolean', description: 'If test drive was arranged' }
  ],
  'general': [
    { name: 'customer_name', type: 'string', description: 'Customer name mentioned in call' },
    { name: 'contact_phone', type: 'string', description: 'Customer phone number' },
    { name: 'follow_up_needed', type: 'boolean', description: 'Whether follow-up is required' },
    { name: 'call_outcome', type: 'string', description: 'Result or outcome of the call' }
  ]
};

export const inferDataType = async (input: string, businessType: string = 'general'): Promise<DataFieldSuggestion[]> => {
  const suggestions: DataFieldSuggestion[] = [];
  const inputLower = input.toLowerCase();
  
  // Start with business-specific templates if they match
  const businessTemplate = BUSINESS_TEMPLATES[businessType as keyof typeof BUSINESS_TEMPLATES] || BUSINESS_TEMPLATES.general;
  
  // Check if input mentions any business template fields
  for (const template of businessTemplate) {
    const templateWords = template.name.split('_').concat(template.description.toLowerCase().split(' '));
    const hasMatch = templateWords.some(word => inputLower.includes(word.toLowerCase()));
    
    if (hasMatch) {
      suggestions.push({
        ...template,
        confidence: 0.8,
        required: false,
        extractionHint: `Based on ${businessType} business patterns`
      });
    }
  }
  
  // Pattern-based inference
  for (const [category, pattern] of Object.entries(DATA_PATTERNS)) {
    const hasKeyword = pattern.keywords.some(keyword => inputLower.includes(keyword));
    
    if (hasKeyword) {
      for (const [fieldName, config] of Object.entries(pattern.types)) {
        const specificMatch = inputLower.includes(fieldName) || 
                             pattern.keywords.some(k => inputLower.includes(k + ' ' + fieldName) || inputLower.includes(fieldName + ' ' + k));
        
        if (specificMatch) {
          const existingSuggestion = suggestions.find(s => s.name === fieldName || s.name.includes(fieldName));
          if (!existingSuggestion) {
            suggestions.push({
              name: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              type: config.type,
              description: `Extract ${fieldName.replace(/_/g, ' ')} from conversation`,
              confidence: 0.9,
              validation: config.validation,
              extractionHint: config.hint,
              required: false
            });
          }
        }
      }
    }
  }
  
  // Smart name inference from common phrases
  const nameInferences = [
    { pattern: /customer (name|info|details)/, name: 'Customer Name', type: 'string', confidence: 0.85 },
    { pattern: /contact (info|details|information)/, name: 'Contact Information', type: 'string', confidence: 0.8 },
    { pattern: /appointment (time|date|scheduling)/, name: 'Appointment Details', type: 'date', confidence: 0.9 },
    { pattern: /budget (range|limit|amount)/, name: 'Budget Range', type: 'string', confidence: 0.85 },
    { pattern: /interested (in|about)/, name: 'Interest Level', type: 'string', confidence: 0.75 },
    { pattern: /follow[\s-]?up/, name: 'Follow Up Required', type: 'boolean', confidence: 0.8 },
    { pattern: /next (step|action)/, name: 'Next Action', type: 'string', confidence: 0.8 }
  ];
  
  for (const inference of nameInferences) {
    if (inference.pattern.test(inputLower)) {
      const existingSuggestion = suggestions.find(s => s.name.toLowerCase().includes(inference.name.toLowerCase()));
      if (!existingSuggestion) {
        suggestions.push({
          name: inference.name,
          type: inference.type,
          description: `Extract ${inference.name.toLowerCase()} mentioned in calls`,
          confidence: inference.confidence,
          required: false,
          extractionHint: 'Automatically detected from your description'
        });
      }
    }
  }
  
  // If no specific patterns matched, provide general suggestions based on common words
  if (suggestions.length === 0) {
    const generalSuggestions = [
      {
        name: 'Key Information',
        type: 'string',
        description: 'Extract the main information discussed in the call',
        confidence: 0.6,
        extractionHint: 'General information extraction based on call content'
      },
      {
        name: 'Customer Response',
        type: 'string', 
        description: 'Capture customer responses and feedback',
        confidence: 0.6,
        extractionHint: 'Customer engagement and response tracking'
      }
    ];
    
    suggestions.push(...generalSuggestions);
  }
  
  // Sort by confidence and limit results
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6); // Limit to 6 suggestions to avoid overwhelming the user
};

