import { assertEquals } from "./test_deps.ts";
import { apiCall } from "./fetch.service.ts";

Deno.test("[Api] POST new data", async () => {
  const payload = { b: 1 };

  const response = await apiCall("POST", "/new", payload);
  const { data } = await response.json();
  assertEquals(data, payload);
});

Deno.test("[Api] POST to old data", async () => {
  const payload = { b: 1 };

  const response = await apiCall("POST", "/new", payload);
  const { error } = await response.json();

  assertEquals(response.status, 405);
  assertEquals(error, "Method not allowed, resource not empty");
});
Deno.test("[Api] PUT to old data", async () => {
  const payload = { b: 2 };

  const response = await apiCall("PUT", "/new", payload);
  const { data } = await response.json();

  assertEquals(data, payload);
});

Deno.test("[Api] PATCH to old data", async () => {
  const payload = { a: 0 };

  const response = await apiCall("PATCH", "/new", payload);
  const { data } = await response.json();

  assertEquals(data, { b: 2, a: 0 });
});

Deno.test("[Api] PATCH to a not object", async () => {
  const payload = { a: 0 };

  const response = await apiCall("PATCH", "/new/a", payload);
  const { error } = await response.json();
  assertEquals(response.status, 405);
  assertEquals(error, "Method not allowed, resource not a object");
});
Deno.test("[Api] PATCH body not object", async () => {
  const payload = 0;

  const response = await apiCall("PATCH", "/new", payload);
  const { error } = await response.json();
  assertEquals(response.status, 405);
  assertEquals(error, "Method not allowed, body not a object");
});
Deno.test("[Api] GET data", async () => {
  const payload = { b: 2, a: 0 };
  const response = await apiCall("GET", "/new");
  const { data } = await response.json();
  assertEquals(data, payload);
});
Deno.test("[Api] DELETE  data", async () => {
  const payload = { b: 2, a: 0 };

  const response = await apiCall("DELETE", "/new");
  const { data } = await response.json();
  assertEquals(data, payload);
});

Deno.test("[Api] GET DELETED data", async () => {
  const response = await apiCall("GET", "/new");
  const { data } = await response.json();
  assertEquals(data, undefined);
});
