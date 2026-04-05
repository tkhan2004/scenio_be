import { z } from "zod";

export const getHomeSchema = z.object({
    body: z.object({}),
    query: z.object({}),
    params: z.object({}),
});

export type GetHomeInput = z.infer<typeof getHomeSchema>;
