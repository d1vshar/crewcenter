import type { Metadata } from 'next';

import { RoutesTable } from '@/components/pilot/routes-table';
import {
  getAircraft,
  getRoutesPaginated,
  searchRoutesWithFts,
} from '@/db/queries';
import { requireAuth } from '@/lib/auth-check';

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
  await requireAuth();

  const resolvedParams = searchParams ? await searchParams : {};
  const page = resolvedParams?.page ? parseInt(resolvedParams.page, 10) : 1;
  const limit = 10;
  const search = resolvedParams?.search ?? '';

  const [{ routes, total }, aircraft] = await Promise.all([
    search.trim()
      ? searchRoutesWithFts(search, page, limit)
      : getRoutesPaginated(page, limit),
    getAircraft(),
  ]);

  return (
    <RoutesTable
      routes={routes}
      total={total}
      limit={limit}
      aircraft={aircraft}
    />
  );
}
