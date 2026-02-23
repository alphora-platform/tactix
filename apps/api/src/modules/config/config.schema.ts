import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Riot API
  RIOT_API_KEY: Joi.string().required(),
  RIOT_RATE_LIMIT_PER_SEC: Joi.number().default(20),
  RIOT_RATE_LIMIT_PER_2MIN: Joi.number().default(100),

  // Redis (BullMQ + Rate Limiter)
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
});
