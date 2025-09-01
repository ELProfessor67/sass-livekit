
import { fetchCalls, fetchCallById, fetchMockCalls } from './api/apiService';
import { generateCalls, mockCalls } from './api/mockData/generator';

// Export API functions
export { fetchCalls, fetchCallById, fetchMockCalls };

// Export mock API helpers
export const mockApi = {
  generateCalls,
  mockCalls
};
