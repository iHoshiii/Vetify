import { ObjectId } from 'mongodb';
/**
 * Coerces an id that arrived as a string — from a JWT subject, a route
 * parameter, a cookie — into the ObjectId the driver needs for an `_id` filter.
 *
 * Mongoose did this implicitly on every query and raised a CastError when the
 * value was not a valid id. The driver does neither: an unconverted string
 * simply matches nothing, which reads as "not found" instead of "you sent
 * nonsense". Converting in one place keeps that distinction, because a bad id
 * throws here and the error handler turns it into a 400.
 */
export function toObjectId(value: string | ObjectId): ObjectId {
  return typeof value === 'string' ? new ObjectId(value) : value;
}

/** Non-throwing form, for input that is expected to be junk sometimes. */
export function isValidObjectId(value: unknown): value is string | ObjectId {
  if (value instanceof ObjectId) return true;
  return typeof value === 'string' && ObjectId.isValid(value);
}
