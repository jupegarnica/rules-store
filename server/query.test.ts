import { assertEquals } from './test_deps.ts';
import { apiCall } from './fetch.service.ts';
// import { faker } from 'https://raw.githubusercontent.com/jackfiszr/deno-faker/master/mod.ts';

// Deno.test('[API CRUD] GET DELETED data', async () => {
//   const card = faker.helpers.createCard();
//   const response = await apiCall('POST', '/people', { ...card });
//   const { data } = await response.json();
// //   assertEquals(data, undefined);
// });

Deno.test('[API CRUD] GET data', async () => {
  const response = await apiCall('GET', '/people?email=Aryanna_Ledner56@gmail.com');
  const { data } = await response.json();
  assertEquals(data[0]?.email, "Aryanna_Ledner56@gmail.com");
});
