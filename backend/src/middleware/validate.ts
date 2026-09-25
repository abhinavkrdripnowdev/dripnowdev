import { RequestHandler } from 'express';
import { z } from 'zod';
export const validate = (schema: z.ZodType): RequestHandler => (req, _res, next) => {
  try { req.body = schema.parse(req.body); next(); } catch (error) { next(error); }
};
