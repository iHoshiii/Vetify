// public surface of the anon-quota module: the cookie that gives an anonymous
// visitor a stable id, and the counter that spends their free allowance.
//
// anon-crypto is deliberately left out. Sealing and unsealing the id is only
// ever anon-cookie's business, and keeping the HMAC helpers off the module's
// surface means no route can hand out a signed id of its own.
export { ANON_ID_COOKIE, anonCookieOptions, ensureAnonId } from './anon-cookie';

export { consumeAnonQuery, peekAnonUsage, type QuotaVerdict } from './anon-quota-services';
