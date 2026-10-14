import { Router } from 'express';
import local from './auth-local.route';
import sessions from './auth-session.route';
import recovery from './auth-recovery.route';
import oauth from './auth-oauth.route';

const router = Router();
router.use(local, sessions, recovery, oauth);
export default router;
