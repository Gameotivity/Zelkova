import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verify2FASchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export const riskConfigSchema = z.object({
  stopLossPct: z.number().min(0.5).max(50),
  takeProfitPct: z.number().min(0.5).max(500).optional(),
  maxPositionSizePct: z.number().min(1).max(100),
  maxDailyLossPct: z.number().min(0.5).max(25),
  trailingStop: z.boolean().optional(),
  cooldownMinutes: z.number().min(0).max(1440),
  maxLeverage: z.number().int().min(1).max(50).default(1),
});

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  pairs: z.array(z.string()).optional(),
  strategy: z.string(),
  strategyConfig: z.record(z.unknown()),
  riskConfig: riskConfigSchema,
  mode: z.enum(["PAPER", "LIVE"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAgentInput = z.infer<typeof createAgentSchema>;
