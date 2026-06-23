/** Same-origin in dev so Vite proxies /api → localhost:3000 (avoids CORS). */
const API_BASE = '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const hasJsonBody = options?.body != null && options.body !== '';
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.error ?? body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
