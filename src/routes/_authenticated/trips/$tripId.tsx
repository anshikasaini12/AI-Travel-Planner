import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bus,
  Clock,
  Copy,
  Hotel,
  Home,
  Plane,
  RefreshCw,
  Star,
  Train,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatINR, formatISTDateTime, formatISTTime } from "@/lib/format";
import { generateTripPlan } from "@/lib/trips.functions";

export const Route = createFileRoute("/_authenticated/trips/$tripId")({
  head: () => ({
    meta: [
      { title: "Trip plan — Yatra AI" },
      {
        name: "description",
        content:
          "Compare flights, trains and buses, review stays and follow your day-wise itinerary in rupees and IST.",
      },
      { property: "og:title", content: "Trip plan — Yatra AI" },
      {
        property: "og:description",
        content: "Your travel options, stays and day-wise itinerary in one place.",
      },
    ],
  }),
  component: TripDetail,
});

type Activity = { time?: string; title: string; detail?: string; cost_inr?: number };

const modeIcon = { flight: Plane, train: Train, bus: Bus } as const;

function TripDetail() {
  const { tripId } = Route.useParams();
  const queryClient = useQueryClient();
  const regenerate = useServerFn(generateTripPlan);
  const [sortBy, setSortBy] = useState<"price" | "duration" | "convenience">("price");

  const trip = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).single();
      if (error) throw error;
      return data;
    },
  });

  const transport = useQuery({
    queryKey: ["transport", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_options")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
  });

  const stays = useQuery({
    queryKey: ["stays", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stay_options")
        .select("*")
        .eq("trip_id", tripId)
        .order("price_per_night_inr", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const itinerary = useQuery({
    queryKey: ["itinerary", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itinerary_days")
        .select("*")
        .eq("trip_id", tripId)
        .order("day_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const members = useQuery({
    queryKey: ["members", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_members")
        .select("id, role, user_id")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data;
    },
  });

  const regen = useMutation({
    mutationFn: async () => regenerate({ data: { tripId } }),
    onSuccess: () => {
      for (const key of ["trip", "transport", "stays", "itinerary"]) {
        queryClient.invalidateQueries({ queryKey: [key, tripId] });
      }
      toast.success("Plan refreshed");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not refresh"),
  });

  const sorted = [...(transport.data ?? [])].sort((a, b) => {
    if (sortBy === "price") return a.price_inr - b.price_inr;
    if (sortBy === "duration") return (a.duration_minutes ?? 0) - (b.duration_minutes ?? 0);
    return (b.convenience_score ?? 0) - (a.convenience_score ?? 0);
  });

  if (trip.isLoading) {
    return <p className="mx-auto max-w-6xl px-4 py-12 text-sm text-muted-foreground">Loading…</p>;
  }
  if (!trip.data) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16">
        <p className="text-sm text-muted-foreground">This trip isn't available to you.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/trips">Back to my trips</Link>
        </Button>
      </main>
    );
  }

  const t = trip.data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link
        to="/trips"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> My trips
      </Link>

      <header className="panel mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.origin_city} → {t.destination} · {formatDate(t.start_date)} –{" "}
              {formatDate(t.end_date)} · {t.travellers} travellers
            </p>
            {t.summary ? <p className="mt-3 max-w-2xl text-sm">{t.summary}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{formatINR(t.budget_inr)}</p>
            <p className="text-xs text-muted-foreground">total budget</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(t.invite_code);
              toast.success("Trip code copied — share it with your group");
            }}
          >
            <Copy className="mr-1.5 size-4" /> Code {t.invite_code}
          </Button>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-4" /> {members.data?.length ?? 1} in this trip
          </span>
          <Button
            size="sm"
            className="bg-marigold ml-auto text-primary-foreground"
            disabled={regen.isPending}
            onClick={() => regen.mutate()}
          >
            <RefreshCw className={`mr-1.5 size-4 ${regen.isPending ? "animate-spin" : ""}`} />
            {regen.isPending ? "Rebuilding…" : "Regenerate plan"}
          </Button>
        </div>
      </header>

      <Tabs defaultValue="transport" className="mt-8">
        <TabsList>
          <TabsTrigger value="transport">Getting there</TabsTrigger>
          <TabsTrigger value="stays">Stays</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
        </TabsList>

        <TabsContent value="transport" className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {(["price", "duration", "convenience"] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={sortBy === key ? "default" : "outline"}
                onClick={() => setSortBy(key)}
              >
                Sort by {key}
              </Button>
            ))}
          </div>
          {!sorted.length ? (
            <p className="text-sm text-muted-foreground">No travel options yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sorted.map((option) => {
                const Icon = modeIcon[option.mode as keyof typeof modeIcon] ?? Plane;
                return (
                  <article key={option.id} className="panel p-5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold">
                        <Icon className="size-4 text-primary" /> {option.provider}
                      </span>
                      <Badge variant="secondary" className="capitalize">
                        {option.mode}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {formatISTDateTime(option.depart_at)} → {formatISTTime(option.arrive_at)} IST
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      {Math.floor((option.duration_minutes ?? 0) / 60)}h{" "}
                      {(option.duration_minutes ?? 0) % 60}m · convenience{" "}
                      {option.convenience_score ?? "—"}/10
                    </p>
                    {option.notes ? <p className="mt-2 text-sm">{option.notes}</p> : null}
                    <p className="mt-4 text-lg font-bold text-primary">
                      {formatINR(option.price_inr)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        per person
                      </span>
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stays" className="mt-6">
          {!stays.data?.length ? (
            <p className="text-sm text-muted-foreground">No stays yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stays.data.map((stay) => (
                <article key={stay.id} className="panel p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize">
                      {stay.kind === "airbnb" ? (
                        <Home className="mr-1 size-3" />
                      ) : (
                        <Hotel className="mr-1 size-3" />
                      )}
                      {stay.kind}
                    </Badge>
                    {stay.rating ? (
                      <span className="flex items-center gap-1 text-sm text-accent">
                        <Star className="size-3.5 fill-current" /> {stay.rating}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-semibold">{stay.name}</h3>
                  {stay.area ? (
                    <p className="text-sm text-muted-foreground">{stay.area}</p>
                  ) : null}
                  {stay.highlights ? <p className="mt-2 text-sm">{stay.highlights}</p> : null}
                  <p className="mt-4 font-bold text-primary">
                    {formatINR(stay.price_per_night_inr)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      per night
                    </span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="itinerary" className="mt-6">
          {!itinerary.data?.length ? (
            <p className="text-sm text-muted-foreground">No itinerary yet.</p>
          ) : (
            <ol className="space-y-4">
              {itinerary.data.map((day) => (
                <li key={day.id} className="panel p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">
                      Day {day.day_number} · {day.title}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {day.day_date ? formatDate(day.day_date) : null}
                      {day.est_cost_inr ? ` · ${formatINR(day.est_cost_inr)}` : ""}
                    </span>
                  </div>
                  {day.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground">{day.summary}</p>
                  ) : null}
                  <ul className="mt-4 space-y-3 border-l border-border pl-4">
                    {((day.activities ?? []) as unknown as Activity[]).map((activity, i) => (
                      <li key={i}>
                        <p className="text-sm font-medium">
                          {activity.time ? (
                            <span className="mr-2 text-accent">{activity.time}</span>
                          ) : null}
                          {activity.title}
                        </p>
                        {activity.detail ? (
                          <p className="text-sm text-muted-foreground">{activity.detail}</p>
                        ) : null}
                        {activity.cost_inr ? (
                          <p className="text-xs text-muted-foreground">
                            approx {formatINR(activity.cost_inr)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
