// DECLARATION MERGING
// TypeScript's Request type has fixed properties. Attaching anything custom
// (req.user, req.requestId) is a type error unless declared here.
//
// This does not create a new type — it MERGES these properties into the same
// Request interface that @types/express defines. That is why
// `import { type Request } from 'express'` gives the extended version
// everywhere, with no extra imports.
//
// All optional (?) because a middleware may not run for every request.
// `export {}` makes this a module, which `declare global` requires.

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      timestamp?: string;
      user?: { id: string; name: string };
    }
  }
}

export {};