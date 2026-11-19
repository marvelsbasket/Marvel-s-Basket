import { z } from 'zod';

const envSchema = z.object({
  appName: z.string().default("Marvel's Basket"),
  appUrl: z.string().default('http://localhost:3000'),
  apiUrl: z.string().default('http://localhost:4000/api/v1'),
});

export const env = envSchema.parse({
  appName: process.env.NEXT_PUBLIC_APP_NAME,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
});
