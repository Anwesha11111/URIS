/**
 * validate.middleware.js
 *
 * Generic Joi validation middleware factory.
 *
 * Usage:
 *   const { validate } = require('../middleware/validate.middleware');
 *   const { schemas }  = require('../validation/schemas');
 *
 *   router.post('/create', verifyToken, validate(schemas.createTask), createTask);
 *
 * The schema must be a Joi object schema that validates:
 *   { body, params, query }
 *
 * On failure → 400 { success: false, error: 'VALIDATION_ERROR', message, data: null }
 * On success → calls next(), leaving req with clean coerced values.
 *
 * Options:
 *   abortEarly: false  — collect ALL errors, surface only the first to the client
 *   allowUnknown: true — extra keys silently stripped (no breakage on minor client changes)
 *   stripUnknown: true — removes unknown keys so controllers never see unsanitised fields
 */

'use strict';

const { validationError } = require('../utils/respond');

/**
 * @param {import('joi').ObjectSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(
      { body: req.body, params: req.params, query: req.query },
      { abortEarly: false, allowUnknown: true, stripUnknown: true }
    );

    if (error) {
      // Surface only the first human-readable message — never expose raw Joi paths or context
      return validationError(res, error.details[0].message);
    }

    // Mutate the existing req objects in-place rather than replacing them.
    // Express 5 made req.query (and req.params) read-only getters — direct
    // assignment throws "Cannot set property query of #<IncomingMessage>".
    // Object.assign copies the validated + coerced keys onto the existing
    // object without triggering the setter restriction.
    if (value.body)   Object.assign(req.body,   value.body);
    if (value.params) Object.assign(req.params, value.params);
    if (value.query)  Object.assign(req.query,  value.query);

    next();
  };
}

module.exports = { validate };
