import { type Request, type Response, type NextFunction } from 'express';

// Attaches data to req. Everything registered AFTER this can read it.
export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = Math.random().toString();
  next();
};

export const addTimestamp = (req: Request, res: Response, next: NextFunction) => {
  req.timestamp = new Date().toISOString();
  next();
};

// Reads what the two above attached.
// If this runs FIRST, both values are undefined — middleware can only see
// data set by middleware that ran before it.
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[${req.requestId}] ${req.method} ${req.originalUrl} at ${req.timestamp}`);
  next();
};

// Grouping into a named array makes the set reusable across routes.
export const requestContext = [addRequestId, addTimestamp, logRequest];