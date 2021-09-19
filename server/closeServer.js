import { apiCall } from './fetch.service.ts';
await apiCall(
  'OPTIONS',
  '/',
  {},
  {
    'x-close-server': 'true',
  },
);
