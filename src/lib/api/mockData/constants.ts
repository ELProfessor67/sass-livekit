
// Generate a list of first and last names
export const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'Lucas', 'Mia', 'Alexander', 'Harper', 'James', 'Amelia', 'Benjamin',
  'Evelyn', 'Logan', 'Abigail', 'Elijah', 'Emily', 'Michael', 'Elizabeth', 'Daniel',
  'Sofia', 'Matthew', 'Avery', 'Jackson', 'Ella', 'Sebastian', 'Scarlett', 'Jack',
  'Grace', 'Aiden', 'Chloe', 'Samuel', 'Victoria', 'David', 'Riley', 'Joseph',
  'Aria', 'Owen', 'Lily', 'Wyatt', 'Aubrey', 'John', 'Hannah', 'Carter', 'Addison',
];

export const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia',
  'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez',
  'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez', 'Lee', 'Gonzalez',
  'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young',
  'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams',
  'Nelson', 'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts', 'Carter',
  'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart',
];

// Tags for call classification - Updated for window replacement company
export const callTags = [
  { id: '1', name: 'Vinyl Windows', color: 'green' },
  { id: '2', name: 'Wood Windows', color: 'blue' },
  { id: '3', name: 'Casement', color: 'pink' },
  { id: '4', name: 'Double Hung', color: 'green' },
  { id: '5', name: 'Bay Windows', color: 'blue' },
  { id: '6', name: 'Energy Efficient', color: 'pink' },
];

// Call resolution types - Using only our established outcomes
export const resolutionTypes = [
  'Appointment',
  'Booked Appointment',
  'Message to Franchisee',
  'Not Eligible',
  'Spam',
  'Call Dropped',
  null,
];

// Window types and concerns for realistic content
export const windowTypes = ['vinyl', 'wood', 'aluminum', 'fiberglass', 'composite'];
export const windowStyles = ['double-hung', 'casement', 'sliding', 'picture', 'bay', 'bow', 'awning'];
export const concerns = ['drafty windows', 'energy efficiency', 'noise reduction', 'UV protection', 'security features', 'aesthetic upgrade'];
export const locations = ['kitchen', 'living room', 'bedrooms', 'bathroom', 'basement', 'entire home'];
export const addresses = [
  '123 Window St, Boston, MA 02108',
  '456 Glass Ave, Chicago, IL 60601',
  '789 Frame Blvd, Denver, CO 80202',
  '321 Pane Ln, Seattle, WA 98101',
  '654 Sill Rd, Austin, TX 78701'
];

export const propertyTypes = ['Residential', 'Commercial', 'Multi-family', 'Historic'];
