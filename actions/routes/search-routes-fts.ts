'use server';

import { z } from 'zod';

import { searchRoutesWithFts } from '@/db/queries';
import { handleDbError } from '@/lib/db-error';
import { authActionClient } from '@/lib/safe-action';

const inputSchema = z.object({
  query: z.string().default(''),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).default(10),
});

export const searchRoutesFtsAction = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    const { query, page, limit } = parsedInput;
    try {
      const { routes, total } = await searchRoutesWithFts(query, page, limit);
      return { success: true, routes, total };
    } catch (error) {
      handleDbError(error, { fallback: 'Failed to search routes' });
    }
  });
