import { z } from 'zod';

export const searchScenesSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    q: z.string().trim().min(1, 'Từ khóa tìm kiếm không được để trống'),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  }),
});

export type SearchScenesQuery = z.infer<typeof searchScenesSchema>['query'];
