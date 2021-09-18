const BASE_URL = "http://localhost:8000";


export async function apiCall(
    method: string,
    pathname: string,
    body?: unknown,
    headers?: {[key:string]:string}
  ): Promise<Response> {
    const result = await fetch(BASE_URL + pathname, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: (body && JSON.stringify(body)) as string | undefined,
    });
    return result;
  }