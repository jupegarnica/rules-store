import { assertEquals } from "./test_deps.ts";
import { apiCall } from "./fetch.service.ts";

Deno.test("[API VALIDATION] PUT to validation", async () => {
  {
    const response = await apiCall("PUT", "/validation", 2);
    const { error } = await response.json();

    assertEquals(response.status, 422);
    assertEquals(
      error,
      "Validation Error - Validation fails at path /validation",
    );
  }
});

Deno.test("[API VALIDATION] PUT to validation", async () => {
  {
    const response = await apiCall("PUT", "/validation", 1);
    const { data } = await response.json();

    assertEquals(response.status, 200);
    assertEquals(data, 1);
  }
});

Deno.test("[API VALIDATION] DELETE to validation", async () => {
  {
    const response = await apiCall("DELETE", "/validation");
    assertEquals(response.status, 204);
  }
});
