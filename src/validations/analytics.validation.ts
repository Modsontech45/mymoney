import Joi from 'joi';

export const analyticsRefreshSchema = Joi.object({
  type: Joi.string()
    .valid('summary', 'monthly', 'trends', 'distribution', 'highest')
    .optional()
    .messages({
      'any.only':
        'Type must be one of: summary, monthly, trends, distribution, highest',
    }),
}).messages({
  'object.base': 'Request body must be a valid object',
});

export const analyticsQuerySchema = Joi.object({
  months: Joi.number()
    .integer()
    .min(1)
    .max(24)
    .optional()
    .default(12)
    .messages({
      'number.base': 'Months must be a number',
      'number.integer': 'Months must be an integer',
      'number.min': 'Months must be at least 1',
      'number.max': 'Months must be at most 24',
    }),

  includeProjections: Joi.boolean().optional().default(false).messages({
    'boolean.base': 'Include projections must be a boolean value',
  }),

  department: Joi.string().trim().optional().messages({
    'string.base': 'Department must be a string',
  }),

  action: Joi.string().trim().optional().messages({
    'string.base': 'Action must be a string',
  }),
}).messages({
  'object.base': 'Query parameters must be valid',
});

export const companyAnalyticsParamSchema = Joi.object({
  companyId: Joi.string().uuid().required().messages({
    'string.base': 'Company ID must be a string',
    'string.uuid': 'Company ID must be a valid UUID',
    'any.required': 'Company ID is required',
  }),
}).messages({
  'object.base': 'Parameters must be a valid object',
});
