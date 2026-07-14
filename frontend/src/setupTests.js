// src/setupTests.js
import '@testing-library/jest-dom';

// Intercept all Axios imports globally and avoid the TDZ bug
jest.mock('axios', () => {
  // 1. Define it INSIDE the mock block so it gets hoisted together
  const mockAxiosInstance = {
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    patch: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() }
    }
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      ...mockAxiosInstance
    },
    create: jest.fn(() => mockAxiosInstance),
    ...mockAxiosInstance
  };
});