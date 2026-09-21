// Augment Express Request to include `user` from JWT
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      roles: string[];
      sessionId?: number;
    };
  }
}
