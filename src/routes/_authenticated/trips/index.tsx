import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatINR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/trips/")({
  head: () => ({
    meta: [
      { title: "My trips — Yatra AI" },
      { name: "description", content: "All the trips you own or joined, with budgets in rupees." },
      { property: "og:title", content: "My trips — Yatra AI" },
      { property: "og:description", content: "Your saved travel plans and shared trips." },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { data: trips, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My trips</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every plan you own or joined. Amounts in ₹, schedules in IST.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/join">Join with code</Link>
          </Button>
          <Button asChild className="bg-marigold text-primary-foreground">
            <Link to="/plan">
              <Plus className="mr-1 size-4" /> New trip
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading your trips…</p>
      ) : !trips?.length ? (
        <div className="panel mt-10 p-10 text-center">
          <h2 className="text-xl font-semibold">No trips yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Plan your first one and invite your travel group.
          </p>
          <Button asChild className="bg-marigold mt-6 text-primary-foreground">
            <Link to="/plan">Plan a trip</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              to="/trips/$tripId"
              params={{ tripId: trip.id }}
              className="panel block p-6 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <Badge variant={trip.plan_status === "ready" ? "default" : "secondary"}>
                  {trip.plan_status === "ready" ? "Plan ready" : "Draft"}
                </Badge>
                <span className="text-xs text-muted-foreground">#{trip.invite_code}</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{trip.title}</h2>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4" /> {trip.origin_city} → {trip.destination}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-4" /> {formatDate(trip.start_date)} –{" "}
                {formatDate(trip.end_date)}
              </p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-4" /> {trip.travellers}
                </span>
                <span className="font-semibold text-primary">{formatINR(trip.budget_inr)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
