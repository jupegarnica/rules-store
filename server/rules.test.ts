import { assertEquals } from './test_deps.ts';
import { apiCall } from './fetch.service.ts';

Deno.test('[API RULES] PUT to onlyRead', async () => {
  {
    const response = await apiCall('PUT', '/onlyRead/z', 2);
    const { error } = await response.json();

    assertEquals(response.status, 403);
    assertEquals(error, 'Forbidden - write disallowed at path /onlyRead');
  }
});

Deno.test('[API RULES] GET to onlyRead', async () => {
  {
    const response = await apiCall('GET', '/onlyRead/z');
    const { data } = await response.json();
    assertEquals(response.status, 200);
    assertEquals(data, undefined);
  }
});

Deno.test('[API RULES] GET to onlyWrite', async () => {
    {
      const response = await apiCall('GET', '/onlyWrite/z');
      const { error } = await response.json();

      assertEquals(response.status, 403);
      assertEquals(error, 'Forbidden - read disallowed at path /onlyWrite');
    }
  });

  Deno.test('[API RULES] PUT to onlyWrite', async () => {
    {
      const response = await apiCall('PUT', '/onlyWrite/z', 0);
      const { data } = await response.json();
      assertEquals(response.status, 200);
      assertEquals(data, 0);
    }
  });

  Deno.test('[API RULES] DELETE to onlyWrite', async () => {
    {
      const response = await apiCall('DELETE', '/onlyWrite/z');
      assertEquals(response.status, 204);
    }
  });