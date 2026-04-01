import { z } from "zod";

export const getHomeSchema = z.object({
    body: z.object({
        email: z.string().email(),
    })
})

export type GetHomeInput = z.infer<typeof getHomeSchema>['body'];