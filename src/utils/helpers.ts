import crypto from 'crypto';
import Joi from 'joi';

export const validateSchema = (schema: Joi.ObjectSchema, data: object) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
    allowUnknown: false,
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
      code: detail.type.toUpperCase().replace(/\./g, '_'),
    }));

    return {
      isValid: false,
      errors,
      value: null,
    };
  }

  return {
    isValid: true,
    errors: null,
    value,
  };
};

export function generatePassword(prefix = 'CMP_', length = 6) {
  // random alphanumeric part
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < length; i++) {
    randomPart += chars[crypto.randomInt(0, chars.length)];
  }

  // short timestamp to help uniqueness (last 3-4 digits of ms)
  const timestamp = Date.now().toString().slice(-4);

  return prefix + randomPart + timestamp; // ~10-12 chars
}
