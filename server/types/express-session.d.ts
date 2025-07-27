import 'express-session';

declare module 'express-session' {
  export interface SessionData {
    userId?: string;
    userEmail?: string;
    authenticated?: boolean;
    sessionId?: string;
    platformTokens?: Record<string, any>;
    subscription?: {
      plan: string;
      active: boolean;
      remainingPosts: number;
      totalPosts: number;
    };
    lastActivity?: Date;
    regeneratedAt?: Date;
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    session: import('express-session').Session & Partial<import('express-session').SessionData>;
  }
}