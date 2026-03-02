import type { Metadata } from 'next';

import { AdminRoutesView } from '@/components/routes/admin-routes-view';
import {
  getAircraft,
  getRoutesPaginated,
  searchRoutesWithFts,
} from '@/db/queries';
import { requireRole } from '@/lib/auth-check';
import { parsePaginationParams } from '@/lib/pagination';

export function generateMetadata(): Metadata {
  return {
    title: 'Routes',
  };
}

interface RoutesPageProps {
  searchParams?: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function RoutesPage({ searchParams }: RoutesPageProps) {
  await requireRole(['routes']);

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const { page, limit } = await parsePaginationParams(searchParams);
  const search = resolvedSearchParams?.search ?? '';

  const [{ routes, total }, aircraft] = await Promise.all([
    search.trim()
      ? searchRoutesWithFts(search, page, limit)
      : getRoutesPaginated(page, limit),
    getAircraft(),
  ]);

  return (
    <AdminRoutesView
      routes={routes}
      total={total}
      limit={limit}
      aircraft={aircraft}
    />
  );
}
