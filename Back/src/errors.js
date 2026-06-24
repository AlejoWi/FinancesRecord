// Spec error envelope (R-API-05):
//   { "error": "CODE", "message": "human readable", "requestId": "..." }
//
// Codes used in PR 3:
//   VALIDATION_FAILED      (zod issue → 400)
//   REGISTRATION_FAILED    (register, 409 — generic, prevents email enumeration)
//   LOGIN_FAILED           (login, 401 — same shape on wrong-pwd and unknown-email)
//   PASSWORD_TOO_SHORT     (register, 400)
//   NAME_TOO_LONG          (register, 400)
//   UNAUTHENTICATED        (me, 401)
//   INTERNAL_ERROR         (500, fallback)
//
// requestId is generated per-request by a Fastify onRequest hook (added
// in commit 5). The error handler below reads it from the request.

import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor({ code, message, statusCode, details }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

export function attachRequestId(app) {
  app.addHook('onRequest', async (req, reply) => {
    const id = req.headers['x-request-id'] || randomUUID();
    req.requestId = id;
    reply.header('x-request-id', id);
  });
}

export function registerErrorHandler(app) {
  app.setErrorHandler((err, req, reply) => {
    const requestId = req.requestId;
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: 'VALIDATION_FAILED',
        message: 'Request body or parameters failed validation',
        requestId,
        issues: err.issues.map((i) => ({ path: i.path, message: i.message, code: i.code })),
      });
    }
    if (err instanceof ApiError) {
      const body = { error: err.code, message: err.message, requestId };
      if (err.details) body.details = err.details;
      return reply.code(err.statusCode).send(body);
    }
    if (err.statusCode && err.statusCode < 500) {
      // Fastify's own 4xx (e.g., wrong content-type)
      return reply.code(err.statusCode).send({
        error: err.code || 'BAD_REQUEST',
        message: err.message,
        requestId,
      });
    }
    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId,
    });
  });
}
