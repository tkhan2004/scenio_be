import { z } from "zod";

export const createAccountSchemas = z.object({
    image: z.string().url(),
    fullName: z.string().min(3),
    dateOfBirth: z.string().min(3),
    gender: z.string().min(3),
    email: z.string().email(),
    password: z.string().min(6),
    displayName: z.string().min(3),
    avatarUrl: z.string().url(),
    createdAt: z.string().min(3),
    updatedAt: z.string().min(3),
})


