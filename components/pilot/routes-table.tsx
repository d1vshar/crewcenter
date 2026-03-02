'use client';

import { Map, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';

import { searchRoutesFtsAction } from '@/actions/routes/search-routes-fts';
import { RouteDetailsDialog } from '@/components/routes/route-details-dialog';
import { Button } from '@/components/ui/button';
import { DataPagination } from '@/components/ui/data-pagination';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RouteItem {
  id: string;
  departureIcao: string;
  arrivalIcao: string;
  flightTime: number;
  details?: string | null;
  flightNumbers?: string[];
  aircraftIds?: string[];
}

interface RoutesViewProps {
  routes: RouteItem[];
  total: number;
  limit?: number;
  aircraft: { id: string; name: string; livery?: string }[];
}

export function RoutesTable({
  routes,
  total,
  limit = 10,
  aircraft,
}: RoutesViewProps) {
  const router = useRouter();
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [searchParam, setSearchParam] = useQueryState('search', parseAsString);

  const [searchInput, setSearchInput] = useState(searchParam ?? '');
  const [routesState, setRoutesState] = useState<RouteItem[]>(routes);
  const [totalState, setTotalState] = useState(total);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { execute: fetchRoutes } = useAction(searchRoutesFtsAction, {
    onSuccess: ({ data }) => {
      setRoutesState(data?.routes || []);
      setTotalState(data?.total || 0);
      setIsInitialLoad(false);
    },
  });

  useEffect(() => {
    fetchRoutes({ query: searchParam ?? '', page, limit });
  }, [page, searchParam, fetchRoutes, limit]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(async () => {
      await Promise.all([setSearchParam(value.trim() || null), setPage(1)]);
    }, 300);
  };

  const handlePageChange = async (newPage: number) => {
    await setPage(newPage);
  };

  const totalPages = Math.ceil(totalState / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1 w-full md:w-auto">
          <h3 className="font-medium text-2xl md:text-3xl text-foreground break-normal">
            Routes
          </h3>
          <p className="text-muted-foreground">
            Browse available flight routes and plan your next flights
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-full md:w-64"
              placeholder="Search routes..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="overflow-hidden rounded-md border border-border bg-panel shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Flight Numbers
                </TableHead>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Departure
                </TableHead>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Arrival
                </TableHead>
                <TableHead className="bg-muted/50 font-semibold text-foreground">
                  Aircraft Types
                </TableHead>
                <TableHead className="w-[180px] bg-muted/50 font-semibold text-foreground text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {routesState.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-6 py-12 text-center text-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Map className="h-6 w-6 text-foreground" />
                      No routes found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                routesState.map((route) => {
                  const uniqueAircraftNames = Array.from(
                    new Set(
                      (route.aircraftIds || [])
                        .map((id) => aircraft.find((a) => a.id === id)?.name)
                        .filter((n): n is string => Boolean(n))
                    )
                  );

                  return (
                    <TableRow
                      key={route.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="text-foreground">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const nums = route.flightNumbers || [];
                            const visible = nums.slice(0, 3);
                            return (
                              <>
                                {visible.map((n) => (
                                  <span
                                    key={n}
                                    className="rounded px-2 py-0.5 text-xs bg-panel-accent text-panel-accent-foreground dark:bg-nav-hover dark:text-panel-foreground uppercase"
                                  >
                                    {n}
                                  </span>
                                ))}
                                {nums.length > 3 && (
                                  <span className="rounded px-2 py-0.5 text-xs bg-panel-accent text-panel-accent-foreground dark:bg-nav-hover dark:text-panel-foreground">
                                    +{nums.length - 3}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground uppercase">
                        {route.departureIcao}
                      </TableCell>
                      <TableCell className="font-medium text-foreground uppercase">
                        {route.arrivalIcao}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="flex flex-wrap gap-1">
                          {uniqueAircraftNames.map((name) => (
                            <span
                              key={name}
                              className="rounded px-2 py-0.5 text-xs bg-panel-accent text-panel-accent-foreground dark:bg-nav-hover dark:text-panel-foreground"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <RouteDetailsDialog
                            departureIcao={route.departureIcao}
                            arrivalIcao={route.arrivalIcao}
                            flightNumbers={route.flightNumbers}
                            flightTime={route.flightTime}
                            aircraftNames={aircraft
                              .filter((a) => route.aircraftIds?.includes(a.id))
                              .map((a) =>
                                a.livery ? `${a.name} (${a.livery})` : a.name
                              )}
                            trigger={
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            }
                          />
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              const flightTimeHours = Math.floor(
                                route.flightTime / 60
                              );
                              const flightTimeMinutes = route.flightTime % 60;
                              const singleFlightNumber =
                                route.flightNumbers?.length === 1
                                  ? route.flightNumbers[0]
                                  : undefined;
                              const singleAircraft =
                                route.aircraftIds?.length === 1
                                  ? route.aircraftIds[0]
                                  : undefined;

                              const params = new URLSearchParams({
                                ...(singleFlightNumber && {
                                  flightNumber: singleFlightNumber,
                                }),
                                departureIcao: route.departureIcao,
                                arrivalIcao: route.arrivalIcao,
                                flightTimeHours: flightTimeHours.toString(),
                                flightTimeMinutes: flightTimeMinutes.toString(),
                                ...(singleAircraft && {
                                  aircraftId: singleAircraft,
                                }),
                              });

                              router.push(`/pireps?${params.toString()}`);
                            }}
                          >
                            File PIREP
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-end">
            <DataPagination
              page={page}
              totalPages={totalPages}
              totalItems={totalState}
              itemsPerPage={limit}
              itemLabelPlural="routes"
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </section>
    </div>
  );
}
