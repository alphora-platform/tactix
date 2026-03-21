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

  // Data Collector
  COLLECTOR_MODE: Joi.string().valid('pbe', 'live').default('live'),

  // Community Dragon
  COMMUNITY_DRAGON_ENV: Joi.string().valid('pbe', 'latest').default('latest'),

  // Admin
  ADMIN_API_KEY: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
});
