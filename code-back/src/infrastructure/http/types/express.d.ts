import { CurrentUser } from './CurrentUser';

declare module 'express' {
  export interface Request {
    user?: CurrentUser;
  }
}
