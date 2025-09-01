
import { format } from 'date-fns';
import { firstNames, lastNames, resolutionTypes } from './constants';
import { ResolutionType } from '../types';

// Helper function to generate a random date within a range
export const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Helper function to format time from date
export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

// Helper to generate a random phone number
export const generatePhoneNumber = (): string => {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${prefix}-${lineNumber}`;
};

// Helper to generate a random name
export const generateRandomName = () => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return { firstName, lastName };
};

// Helper to generate a consistent name from an ID
export const generateNameFromId = (id: string): { firstName: string; lastName: string } => {
  // Simple algorithm to generate consistent names based on the ID
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Lucas'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez', 'Wilson'];
  
  // Use the ID to deterministically pick names
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const firstNameIndex = hash % firstNames.length;
  const lastNameIndex = (hash * 13) % lastNames.length; // Use a different number to get variation
  
  return {
    firstName: firstNames[firstNameIndex],
    lastName: lastNames[lastNameIndex]
  };
};

// Helper to generate a realistic duration based on call resolution
// Adjusted to create an average of 3:33 (213 seconds) across all calls
export const generateRealisticDuration = (resolution: string | null): string => {
  if (resolution === 'Appointment' || resolution === 'Booked Appointment') {
    // Appointments are longer calls - around 3-5 minutes
    const minutes = Math.floor(Math.random() * 3) + 3; // 3-5 minutes
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else if (resolution === 'Message to Franchisee') {
    // Medium length calls - around 2-4 minutes
    const minutes = Math.floor(Math.random() * 3) + 2; // 2-4 minutes
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else if (resolution === 'Spam') {
    // Very short calls - under a minute
    const seconds = Math.floor(Math.random() * 30) + 15; // 15-45 seconds
    return `00:${seconds.toString().padStart(2, '0')}`;
  } else if (resolution === 'Call Dropped') {
    // Brief calls that ended prematurely
    const seconds = Math.floor(Math.random() * 40) + 10; // 10-50 seconds
    return `00:${seconds.toString().padStart(2, '0')}`;
  } else {
    // Other calls - 1-3 minutes
    const minutes = Math.floor(Math.random() * 3) + 1; // 1-3 minutes
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
};

// Helper to determine resolution with controlled distribution
// Adjusted to create exactly 39% booking rate (Appointment outcome)
export const determineResolution = (): ResolutionType => {
  const resolutionIndex = Math.random();
  if (resolutionIndex < 0.39) { // Exactly 39% for appointments
    return 'Appointment';
  } else if (resolutionIndex < 0.65) { // 26% messages
    return 'Message to Franchisee';
  } else if (resolutionIndex < 0.80) { // 15% not eligible
    return 'Not Eligible';
  } else if (resolutionIndex < 0.95) { // 15% spam
    return 'Spam';
  } else { // 5% call dropped
    return 'Call Dropped';
  }
};

// Convert MM:SS format duration to seconds
export const durationToSeconds = (duration: string): number => {
  const [minutes, seconds] = duration.split(':').map(Number);
  return (minutes * 60) + seconds;
};

// Convert seconds to MM:SS format
export const secondsToDuration = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
