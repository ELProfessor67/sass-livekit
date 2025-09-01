
import { MockCall, ResolutionType } from "../types";
import { generateNameFromId, generatePhoneNumber } from "./helpers";
import { format } from "date-fns";

// Mock call cache - maintains consistent mock data between list and detail views
const mockCallCache = new Map<string, MockCall[]>();

// Get a stable key for the date range to use in caching
export const getMockCallCacheKey = (dateRange?: { from: Date; to: Date }) => {
  if (!dateRange) return 'default-30days';
  return `${dateRange.from.toISOString().split('T')[0]}-to-${dateRange.to.toISOString().split('T')[0]}`;
};

// Get mock calls from cache
export const getMockCallsFromCache = (key: string): MockCall[] | null => {
  if (mockCallCache.has(key)) {
    return mockCallCache.get(key) || null;
  }
  return null;
};

// Cache mock calls
export const cacheMockCalls = (key: string, calls: MockCall[]): void => {
  mockCallCache.set(key, calls);
};

// Find a call in any cache by ID
export const findCallInCache = (id: string): MockCall | null => {
  for (const calls of mockCallCache.values()) {
    const call = calls.find(call => call.id === id);
    if (call) {
      return call;
    }
  }
  return null;
};

// Add a call to a specific cache
export const addCallToCache = (key: string, call: MockCall): void => {
  if (!mockCallCache.has(key)) {
    mockCallCache.set(key, []);
  }
  const calls = mockCallCache.get(key)!;
  calls.push(call);
};

// Get all mock calls (default 30 days)
export const getMockCalls = () => {
  // Initialize default calls if needed
  if (!mockCallCache.has('default-30days')) {
    const { generateCalls } = require('./generator');
    const calls = generateCalls(94);
    mockCallCache.set('default-30days', calls);
  }
  
  const calls = mockCallCache.get('default-30days')!;
  return {
    calls,
    total: calls.length,
  };
};

// Helper function to generate a specific mock call for a given ID
export const generateSpecificMockCall = (id: string, callDate: Date, callIndex: number): MockCall | null => {
  const { firstName, lastName } = generateNameFromId(id);
  
  // Determine the resolution type consistently based on the callIndex for variety
  let resolution: ResolutionType;
  let summary: string;
  let transcript: any[] = [];

  // Create different outcomes based on callIndex to ensure variety and consistency
  // This ensures that a specific ID always gets the same outcome
  if (callIndex % 5 === 0) {
    resolution = "Spam";
    summary = `Call from ${firstName} ${lastName} was identified as spam. The caller was attempting to solicit unwanted services such as car insurance or energy savings programs.`;
    transcript = [
      {speaker: "Agent", time: format(callDate, 'HH:mm'), text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hello, I'm calling about your car's extended warranty.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I'm sorry, but we don't offer car warranty services. We're a window replacement company.`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `We've been trying to reach you about saving money on your energy bill through our special program.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `We're not interested in solicitations. Please remove us from your call list. Goodbye.`}
    ];
  } else if (callIndex % 3 === 0) {
    resolution = "Appointment";
    summary = `Customer ${firstName} ${lastName} scheduled a consultation for window replacement in their living room and kitchen. The appointment was set for next Tuesday at 2:00 PM. Customer expressed interest in energy-efficient options.`;
    transcript = [
      {speaker: "Agent", time: format(callDate, 'HH:mm'), text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hi, I'm ${firstName} ${lastName}. I need to replace some windows in my home.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I'd be happy to help you with that, ${firstName}. What areas of your home are you looking to update?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `The living room and kitchen. They're old and not energy efficient.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `We can definitely help with that. Would you be available for a consultation next Tuesday at 2:00 PM?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 85000), 'HH:mm'), text: `Yes, that works for me.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 100000), 'HH:mm'), text: `Great! I've scheduled you for Tuesday at 2:00 PM. Our specialist will bring samples and provide a free estimate for energy-efficient options.`}
    ];
  } else if (callIndex % 4 === 0) {
    resolution = "Not Eligible";
    summary = `Customer ${firstName} ${lastName} was interested in window replacements but the property was outside of our service area in Eastville (120 miles away). Caller was referred to another provider.`;
    transcript = [
      {speaker: "Agent", time: format(callDate, 'HH:mm'), text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hello, this is ${firstName} ${lastName}. I need some information about replacing my windows.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I'd be happy to help. Could you first tell me your location so I can check if we service your area?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `I'm in Eastville, about 120 miles north of your office.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `I'm sorry to say that's outside of our service radius. We typically only work within 75 miles of our locations. I can refer you to a trusted partner in your area if you'd like?`}
    ];
  } else {
    resolution = "Message to Franchisee";
    summary = `Customer ${firstName} ${lastName} had specific questions about custom bay windows with special trim options and pricing. Information was passed to the local franchisee for follow-up within 24 hours.`;
    transcript = [
      {speaker: "Agent", time: format(callDate, 'HH:mm'), text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hi, I'm ${firstName} ${lastName}. I have some questions about custom window options.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I can provide some general information, but for detailed custom options, our local franchisee would be best to assist you. They have the most up-to-date pricing and options.`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `That makes sense. I'm interested in bay windows with custom trim.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `I'll pass your information to our local franchisee, and they'll contact you within 24 hours with all the specific details you need. What's the best number to reach you?`}
    ];
  }

  // Generate relevant analysis based on the outcome
  let analysis = {};

  if (resolution === "Appointment") {
    analysis = {
      property_type: "Residential",
      budget_range: callIndex % 2 === 0 ? "High" : "Medium",
      urgency: "High"
    };
  } else if (resolution === "Not Eligible") {
    analysis = {
      property_type: "Residential",
      urgency: "Medium",
      out_of_area: "Yes"
    };
  } else if (resolution === "Message to Franchisee") {
    analysis = {
      property_type: "Residential",
      product_interest: "Custom Windows",
      budget_range: "Unknown"
    };
  } else {
    analysis = {
      property_type: "Unknown",
      spam_likelihood: "High"
    };
  }

  return {
    id,
    first_name: firstName,
    last_name: lastName,
    name: `${firstName} ${lastName}`,
    phoneNumber: generatePhoneNumber(),
    date: format(callDate, 'yyyy-MM-dd'),
    time: format(callDate, 'HH:mm'),
    duration: '03:45',
    direction: callIndex % 3 === 0 ? 'Outbound' : 'Inbound',
    channel: 'Phone',
    address: resolution === "Not Eligible" ? "Out of service area" : '123 Main Street, Anytown, USA',
    analysis,
    tags: [
      { id: '1', name: 'Vinyl Windows', color: 'green' },
      { id: '3', name: 'Casement', color: 'purple' }
    ],
    status: 'Completed',
    resolution,
    summary,
    transcript,
    call_recording: `https://storage.example.com/call-recordings/${id}.wav`
  };
};
