import { format } from 'date-fns';
import { windowTypes, windowStyles, concerns, locations } from './constants';
import { ResolutionType } from '../types';

// Generate realistic transcript based on call outcome
export const generateTranscript = (
  resolution: string | null, 
  firstName: string, 
  lastName: string, 
  callDate: Date
): any[] | null => {
  // Randomly select window details for realistic content
  const windowType = windowTypes[Math.floor(Math.random() * windowTypes.length)];
  const windowStyle = windowStyles[Math.floor(Math.random() * windowStyles.length)];
  const mainConcern = concerns[Math.floor(Math.random() * concerns.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const callTime = format(callDate, 'HH:mm');

  if (resolution === 'Appointment' || resolution === 'Booked Appointment') {
    return [
      {speaker: "Agent", time: callTime, text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hi, I'm ${firstName} ${lastName}. I'm interested in getting some new windows for my ${location}.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I'd be happy to help you with that, ${firstName}. Can you tell me more about what type of windows you're looking for?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `I'm looking at ${windowType} windows, probably ${windowStyle} style. My main concern is ${mainConcern}.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `That's a great choice. Our ${windowType} ${windowStyle} windows are excellent for addressing ${mainConcern}. They come with a 20-year warranty on both materials and installation.`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 85000), 'HH:mm'), text: `Sounds good. How would we get started? Do you come out and measure?`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 105000), 'HH:mm'), text: `Yes, we provide a free in-home consultation. One of our window specialists will measure your windows, discuss options, and provide you with a detailed quote. When would be a good time for that appointment?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 120000), 'HH:mm'), text: `How about next Tuesday afternoon?`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 135000), 'HH:mm'), text: `Perfect. I have an opening at 2 PM next Tuesday. Does that work for you?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 150000), 'HH:mm'), text: `Yes, that works great.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 170000), 'HH:mm'), text: `Excellent! I've scheduled your appointment for Tuesday at 2 PM. Our specialist will call you 30 minutes before arrival. Can I get your address, please?`}
    ];
  } else if (resolution === 'Message to Franchisee' || resolution === 'Escalated') {
    return [
      {speaker: "Agent", time: callTime, text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hi, I'm ${firstName} ${lastName}. I have some questions about custom window options.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I can provide some general information, but for detailed custom options, our local franchisee would be best to assist you. They have the most up-to-date pricing and options.`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `That makes sense. I'm interested in bay windows with custom trim.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `I'll pass your information to our local franchisee, and they'll contact you within 24 hours with all the specific details you need. What's the best number to reach you?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 85000), 'HH:mm'), text: `You can reach me at the number I'm calling from.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 105000), 'HH:mm'), text: `Perfect. I've noted this down and our local franchisee will get back to you within 24 hours. Is there anything else I can help with today?`}
    ];
  } else if (resolution === 'Not Eligible' || resolution === 'Not Qualified') {
    return [
      {speaker: "Agent", time: callTime, text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hi, my name is ${firstName} ${lastName}. I'm interested in getting a quote for replacing windows in my vacation home.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I'd be happy to help you with that, ${firstName}. May I ask where your vacation home is located?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `It's in Eastville, just about 120 miles from here.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `Thank you for that information. Let me check if we service that area... I'm sorry to inform you that Eastville is outside our current service area. We currently only install within a 75-mile radius of our showrooms.`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 85000), 'HH:mm'), text: `Oh, that's disappointing. Are there any plans to expand to that area?`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 105000), 'HH:mm'), text: `We are planning to expand our service area in the coming months, but I don't have a specific timeline for Eastville. Would you like me to take your contact information so we can reach out when we begin servicing that area?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 120000), 'HH:mm'), text: `Yes, that would be great. Can you also recommend any reputable window companies that do service that area?`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 135000), 'HH:mm'), text: `While I can't specifically endorse other companies, Mountain View Windows and Alpine Home Solutions both have good reputations in the Eastville area. I'd recommend researching their reviews online.`}
    ];
  } else if (resolution === 'Spam') {
    return [
      {speaker: "Agent", time: callTime, text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: "Hello sir, I'm calling about your car's extended warranty that is about to expire."},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: "I'm sorry, but this appears to be an unsolicited call. We are a window replacement company and do not offer car warranties."},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 35000), 'HH:mm'), text: "But sir, we've been trying to reach you about your vehicle's coverage. We can offer you a great deal on insurance that will save you hundreds of dollars..."},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: "I'll be ending this call now. Please remove this number from your calling list. Thank you."},
    ];
  } else if (resolution === 'Call Dropped') {
    return [
      {speaker: "Agent", time: callTime, text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hi, I'm ${firstName} ${lastName}. I'm looking to get some information about window replacements.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I'd be happy to help you with that, ${firstName}. Are you looking to replace specific windows or for the entire home?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `Just for my ${location} right now. I'm having issues with...`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `I'm sorry, could you repeat that? I didn't quite catch what issues you're having.`},
      {speaker: "System", time: format(new Date(callDate.getTime() + 75000), 'HH:mm'), text: "Call disconnected."}
    ];
  } else {
    return [
      {speaker: "Agent", time: callTime, text: "Thank you for calling Premier Window Replacement, this is Michael. How can I help you today?"},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 10000), 'HH:mm'), text: `Hi, I'm ${firstName} ${lastName}. I'm looking to get some information about window replacements.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 25000), 'HH:mm'), text: `I'd be happy to help you with that, ${firstName}. Are you looking to replace specific windows or for the entire home?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 45000), 'HH:mm'), text: `Just for my ${location} right now. I'm having issues with ${mainConcern}.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 65000), 'HH:mm'), text: `I understand. For ${mainConcern}, our ${windowType} windows are an excellent choice. They come with multiple glass options to address that specific concern. Would you like me to email you some information about our options?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 85000), 'HH:mm'), text: `That would be great. I'd like to look over the options before scheduling an appointment.`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 105000), 'HH:mm'), text: `No problem at all. Can I get your email address to send you our catalog and information about our current promotions?`},
      {speaker: "Customer", time: format(new Date(callDate.getTime() + 120000), 'HH:mm'), text: `It's ${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`},
      {speaker: "Agent", time: format(new Date(callDate.getTime() + 135000), 'HH:mm'), text: `Perfect. I'll send that information right away. Feel free to call us back once you've reviewed it, and we can schedule an in-home consultation when you're ready.`}
    ];
  }
};

// Generate summary based on resolution and customer info
export const generateSummary = (
  resolution: string | null,
  firstName: string, 
  lastName: string,
  location: string, 
  windowType: string,
  windowStyle: string,
  mainConcern: string
): string => {
  if (resolution === 'Spam') {
    return `Spam call attempting to sell car insurance or extended warranties. The call was identified as spam and terminated.`;
  } else if (resolution === 'Message to Franchisee' || resolution === 'Escalated') {
    return `Customer ${firstName} ${lastName} had specific questions about custom bay windows with special trim options and pricing. Information was passed to the local franchisee for follow-up within 24 hours.`;
  } else if (resolution === 'Not Eligible' || resolution === 'Not Qualified') {
    return `Customer ${firstName} ${lastName} was interested in ${windowType} ${windowStyle} windows for a property in Eastville. The property was outside our service area (120 miles away), so we couldn't schedule an appointment but offered to contact them when service becomes available in their area.`;
  } else if (resolution === 'Call Dropped') {
    return `Call with ${firstName} ${lastName} regarding ${windowType} windows for their ${location} was disconnected before completing the conversation. The customer mentioned issues with ${mainConcern} before the call dropped.`;
  } else if (resolution === 'Appointment' || resolution === 'Booked Appointment') {
    return `Customer ${firstName} ${lastName} scheduled a consultation for ${windowType} ${windowStyle} windows in their ${location} to address concerns with ${mainConcern}. The appointment was set for next Tuesday at 2:00 PM. Customer expressed interest in energy-efficient options.`;
  } else {
    return `Customer ${firstName} ${lastName} inquired about ${windowType} ${windowStyle} windows for their ${location}, primarily concerned about ${mainConcern}. Product information was sent via email for review before scheduling an appointment.`;
  }
};
