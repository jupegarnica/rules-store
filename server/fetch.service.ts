const BASE_URL = "http://localhost:8000";


export async function apiCall(
    method: string,
    pathname: string,
    body?: unknown,
  ): Promise<Response> {
    const result = await fetch(BASE_URL + pathname, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: (body && JSON.stringify(body)) as string | undefined,
    });
    return result;
  }