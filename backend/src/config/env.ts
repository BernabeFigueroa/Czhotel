import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('10000').transform((v) => parseInt(v, 10)),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  TUYA_ACCESS_ID: z.string().min(1, 'TUYA_ACCESS_ID es obligatorio'),
  TUYA_ACCESS_SECRET: z.string().min(1, 'TUYA_ACCESS_SECRET es obligatorio'),
  TUYA_ENV: z.enum(['prod', 'test']).default('prod'),
  TUYA_REGION: z.enum(['cn', 'us', 'us-e', 'eu']).default('us'),
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN es obligatorio'),
  TELEGRAM_ADMIN_CHAT_ID: z.string().min(1, 'TELEGRAM_ADMIN_CHAT_ID es obligatorio'),
});

export const env = envSchema.parse(process.env);
