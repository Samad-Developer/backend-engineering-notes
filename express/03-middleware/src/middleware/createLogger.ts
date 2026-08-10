import { type Request, type Response, type NextFunction } from 'express';

interface LoggerOptions {
  prefix?: string;
}

// CONFIGURABLE MIDDLEWARE (the factory pattern)
// This is NOT a middleware — it is a function that RETURNS one.
// That is why express.json() and cors() have parentheses but a plain
// middleware like blockIfBanned does not.
export function createLogger(options: LoggerOptions = {}) {
  const { prefix = 'LOG' } = options;

  return function (req: Request, res: Response, next: NextFunction) {
    console.log(`[${prefix}] ${req.method} ${req.path}`);
    next();
  };
}