// Lightweight fetch wrapper for the Fastify backend.
//
// - credentials: 'include' so the session cookie travels on every call.
// - JSON in / JSON out (204 No Content is supported for logout).
// - Decodes the backend's spec error envelope (R-API-05) and rethrows
//   as ApiError so call sites can branch on `code` / `status`.
//
// Base URL: empty by default (same-origin via the Vite dev proxy or
// the nginx /api/ location in production). Override with the
// VITE_API_BASE env var when the frontend talks to a different origin.

const API_BASE = import.meta.env.VITE_API_BASE || '';

export class ApiError extends Error {
  constructor({ status, code, message, requestId, details, issues }) {
    super(message || code || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    if (details) this.details = details;
    if (issues) this.issues = issues;
  }
}

async function request(method, path, { body, headers, signal } = {}) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  };

  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    // fetch only throws on network failure / CORS / abort. Map to a
    // stable error code so call sites can show a friendly message.
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor',
    });
  }

  // 204 No Content (used by POST /api/auth/logout).
  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: 'BAD_RESPONSE', message: text };
    }
  }

  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      code: data?.error || 'HTTP_ERROR',
      message: data?.message || res.statusText,
      requestId: data?.requestId,
      details: data?.details,
      issues: data?.issues,
    });
  }

  return data;
}

export const api = {
  get:    (path, opts)       => request('GET',    path, opts),
  post:   (path, body, opts) => request('POST',   path, { ...opts, body }),
  patch:  (path, body, opts) => request('PATCH',  path, { ...opts, body }),
  put:    (path, body, opts) => request('PUT',    path, { ...opts, body }),
  delete: (path, opts)       => request('DELETE', path, opts),
};
