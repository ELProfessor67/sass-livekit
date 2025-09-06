
import { format, startOfMonth, endOfMonth, subDays, eachDayOfInterval, differenceInDays } from 'date-fns';
import { callTags, windowTypes, windowStyles, concerns, locations, addresses, propertyTypes } from './constants';
import { randomDate, formatTime, generatePhoneNumber, generateRandomName, determineResolution, generateRealisticDuration, durationToSeconds, secondsToDuration } from './helpers';
import { generateTranscript, generateSummary } from './transcripts';
import { MockCall, CallTag, ResolutionType } from '../types';

// Generate call data for window replacement company
export const generateCalls = (count = 94, dateRange?: { from: Date; to: Date }): MockCall[] => {
  
  const endDate = dateRange?.to || new Date();
  const startDate = dateRange?.from || subDays(endDate, 30);
  
  // Calculate days in the range
  const daysInRange = differenceInDays(endDate, startDate) + 1;
  
  // Scale call count based on time range
  let targetCallCount = count;
  if (dateRange && daysInRange !== 30) {
    // Scale to maintain the same daily call rate
    targetCallCount = Math.round((count / 30) * daysInRange);
    // Ensure minimum of 3 calls for any range
    targetCallCount = Math.max(3, targetCallCount);
  }

  // Generate dates with business-like patterns
  const dates = Array.from({ length: targetCallCount }).map(() => {
    // Create pattern: more calls on weekdays, peak on Tuesday/Wednesday
    const randomFactor = Math.random();
    let date;
    
    if (randomFactor < 0.7) {
      // 70% of calls on weekdays (Mon-Fri)
      date = new Date(startDate);
      date.setDate(date.getDate() + Math.floor(Math.random() * daysInRange));
      
      // Adjust to the closest weekday
      const currentDay = date.getDay();
      if (currentDay === 0) date.setDate(date.getDate() + 1); // If Sunday, move to Monday
      if (currentDay === 6) date.setDate(date.getDate() - 1); // If Saturday, move to Friday
      
      // Create peak days (Tue-Wed)
      if (Math.random() < 0.4) {
        date.setDate(date.getDate() - currentDay + 2 + Math.floor(Math.random() * 2)); // Tue or Wed
      }
    } else {
      // 30% randomly distributed
      date = randomDate(startDate, endDate);
    }
    
    return date;
  }).sort((a, b) => a.getTime() - b.getTime()); // Sort dates chronologically

  // Using a deterministic seeding method based on the date range
  // This ensures same ranges will generate same data
  let seedValue = startDate.getTime() + endDate.getTime();
  
  const random = () => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };
  
  // Calculate how many appointments to generate (39% of total)
  const appointmentCount = Math.floor(targetCallCount * 0.39);
  
  // Generate the calls
  const calls = Array.from({ length: targetCallCount }).map((_, index) => {
    const callDate = dates[index] || randomDate(startDate, endDate);
    const callTime = formatTime(callDate);
    const { firstName, lastName } = generateRandomName();
    const direction = random() > 0.3 ? 'Inbound' : 'Outbound';
    const channel = random() > 0.2 ? 'Phone' : 'VoIP';
    const statuses = ['Completed', 'Missed', 'Voicemail'];
    const status = statuses[Math.floor(random() * statuses.length)];
    
    // Assign 1-2 random tags specific to window types/styles
    const numTags = Math.floor(random() * 2) + 1;
    const shuffledTags = [...callTags].sort(() => 0.5 - random());
    const tags = shuffledTags.slice(0, numTags);
    
    // Ensure exactly 39% of calls are appointments
    let resolution: ResolutionType;
    if (index < appointmentCount) {
      resolution = 'Appointment';
    } else if (index < targetCallCount * 0.65) {
      resolution = 'Message to Franchisee';
    } else if (index < targetCallCount * 0.80) {
      resolution = 'Not Eligible';
    } else if (index < targetCallCount * 0.95) {
      resolution = 'Spam';
    } else {
      resolution = 'Call Dropped';
    }

    // Randomly select window details for realistic content
    const windowType = windowTypes[Math.floor(random() * windowTypes.length)];
    const windowStyle = windowStyles[Math.floor(random() * windowStyles.length)];
    const mainConcern = concerns[Math.floor(random() * concerns.length)];
    const location = locations[Math.floor(random() * locations.length)];
    const address = addresses[Math.floor(random() * addresses.length)];

    // Generate analysis based on call resolution
    let analysis;
    
    if (resolution === 'Appointment') {
      analysis = {
        property_type: propertyTypes[Math.floor(random() * propertyTypes.length)],
        budget_range: random() > 0.5 ? 'High' : 'Medium',
        urgency: random() > 0.7 ? 'High' : random() > 0.4 ? 'Medium' : 'Low'
      };
    } else if (resolution === 'Not Eligible') {
      analysis = {
        property_type: propertyTypes[Math.floor(random() * propertyTypes.length)],
        urgency: random() > 0.6 ? 'Medium' : 'Low',
        out_of_area: 'Yes'
      };
    } else if (resolution === 'Message to Franchisee') {
      analysis = {
        property_type: propertyTypes[Math.floor(random() * propertyTypes.length)],
        product_interest: 'Custom Windows',
        budget_range: 'Unknown'
      };
    } else if (resolution === 'Spam') {
      analysis = {
        property_type: 'Unknown',
        spam_likelihood: 'High'
      };
    } else {
      analysis = {
        property_type: propertyTypes[Math.floor(random() * propertyTypes.length)]
      };
    }

    // Generate summary for window replacement calls
    const summary = generateSummary(resolution, firstName, lastName, location, windowType, windowStyle, mainConcern);

    // Ensure all calls have recordings for consistency
    const hasRecording = true; 
    const callRecording = hasRecording ? `https://storage.example.com/call-recordings/call-${index + 1}.wav` : null;

    // Generate transcript for call
    const transcript = generateTranscript(resolution, firstName, lastName, callDate);

    // Generate duration in MM:SS format with more realistic durations averaging around 3:33
    const duration = generateRealisticDuration(resolution);

    // Create a unique, stable ID based on the date and index
    const id = `call-${format(callDate, 'yyyyMMdd')}-${index + 1}`;

    return {
      id,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
      phoneNumber: generatePhoneNumber(),
      date: format(callDate, 'yyyy-MM-dd'),
      time: callTime,
      duration,
      direction,
      channel,
      address: resolution === 'Not Eligible' ? 'Out of service area' : address,
      analysis,
      tags,
      status,
      resolution,
      summary,
      transcript,
      call_recording: callRecording
    };
  });
  
  
  return calls;
};

// Create mock data - kept as a reference implementation
export const mockCalls = generateCalls();
