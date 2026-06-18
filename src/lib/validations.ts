import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  displayName: z.string().min(2, "Минимум 2 символа"),
  role: z.enum(["ORGANIZER", "PARTICIPANT"]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const quizSchema = z.object({
  title: z.string().min(1, "Укажите название"),
  description: z.string().max(500).optional(),
  category: z.string().optional(),
  defaultTimeSec: z.number().int().min(5).max(300).optional(),
  scoringMode: z.enum(["CORRECT_ONLY", "SPEED"]).optional(),
});

export const questionSchema = z.object({
  type: z.enum(["SINGLE", "MULTIPLE"]),
  mediaType: z.enum(["TEXT", "IMAGE"]),
  text: z.string().min(1),
  imageUrl: z.string().nullable().optional(),
  timeLimitSec: z.number().int().min(5).max(300),
  points: z.number().int().min(100).max(5000).optional(),
  options: z
    .array(
      z.object({
        text: z.string().min(1),
        imageUrl: z.string().nullable().optional(),
        isCorrect: z.boolean(),
      })
    )
    .min(2, "Минимум 2 варианта"),
});

export const joinRoomSchema = z.object({
  roomCode: z.string().length(6),
});
