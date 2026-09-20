import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TripIdInput = z.object({ tripId: z.string().uuid() });

const SuggestInput = z.object({
  from: z.string().trim().min(2).max(80),
  month: z.string().trim().max(40).optional().default(""),
  budgetInr: z.coerce.number().int().min(0).max(10000000).optional().default(0),
  vibe: z.string().trim().max(200).optional().default(""),
});

export type Suggestion = {
  destination: string;
  region: string;
  best_for: string;
  why: string;
  est_total_inr: number;
  ideal_days: number;
};

export const suggestDestinations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SuggestInput.parse(input))
  .handler(async ({ data }) => {
    const { generateJson } = await import("./ai.server");
    const result = await generateJson<{ suggestions: Suggestion[] }>(
      "You are an Indian travel expert. All money is Indian Rupees (INR) and all times are Indian Standard Time. Reply with JSON only: {\"suggestions\":[{\"destination\":string,\"region\":string,\"best_for\":string,\"why\":string,\"est_total_inr\":number,\"ideal_days\":number}]}. Return exactly 6 suggestions. Keep 'why' under 22 words.",
      `Traveller starts from ${data.from}. Travel month: ${data.month || "flexible"}. Total budget per person: INR ${data.budgetInr || "flexible"}. Preferences: ${data.vibe || "any"}.`,
    );
    return { suggestions: result.suggestions ?? [] };
  });

type PlanPayload = {
  summary: string;
  transport: Array<{
    mode: string;
    provider: string;
    depart_at: string;
    arrive_at: string;
    duration_minutes: number;
    price_inr: number;
    convenience_score: number;
    notes?: string;
  }>;
  stays: Array<{
    kind: string;
    name: string;
    area?: string;
    price_per_night_inr: number;
    rating?: number;
    highlights?: string;
  }>;
  days: Array<{
    day_number: number;
    title: string;
    summary?: string;
    est_cost_inr?: number;
    activities?: Array<{ time?: string; title: string; detail?: string; cost_inr?: number }>;
  }>;
};

export const generateTripPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TripIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: trip, error } = await supabase
      .from("trips")
      .select("*")
      .eq("id", data.tripId)
      .maybeSingle();
    if (error) throw error;
    if (!trip) throw new Error("Trip not found");
    if (trip.owner_id !== userId) throw new Error("Only the trip owner can generate the plan.");

    const days = Math.max(
      1,
      Math.round(
        (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000,
      ) + 1,
    );

    const { generateJson } = await import("./ai.server");
    const plan = await generateJson<PlanPayload>(
      [
        "You are an Indian travel planning engine. Currency is INR only. All timestamps MUST be ISO 8601 with the +05:30 India Standard Time offset.",
        'Reply with JSON only in this shape: {"summary":string,"transport":[{"mode":"flight"|"train"|"bus","provider":string,"depart_at":string,"arrive_at":string,"duration_minutes":number,"price_inr":number,"convenience_score":number(1-10),"notes":string}],"stays":[{"kind":"hotel"|"airbnb","name":string,"area":string,"price_per_night_inr":number,"rating":number,"highlights":string}],"days":[{"day_number":number,"title":string,"summary":string,"est_cost_inr":number,"activities":[{"time":string,"title":string,"detail":string,"cost_inr":number}]}]}',
        "Give 6-9 transport options mixing flight, train and bus with realistic Indian operators, realistic fares and departure times. Give 6 stays mixing hotels and Airbnb-style homes. Give one entry per day with 3-5 activities each.",
      ].join(" "),
      `Trip: ${trip.title}. From ${trip.origin_city} to ${trip.destination}. Dates ${trip.start_date} to ${trip.end_date} (${days} days). Travellers: ${trip.travellers}. Total budget: INR ${trip.budget_inr ?? "flexible"}. Pace: ${trip.pace}. Interests: ${trip.interests ?? "general sightseeing"}. Notes: ${trip.notes ?? "none"}.`,
    );

    await Promise.all([
      supabase.from("transport_options").delete().eq("trip_id", trip.id),
      supabase.from("stay_options").delete().eq("trip_id", trip.id),
      supabase.from("itinerary_days").delete().eq("trip_id", trip.id),
    ]);

    const startMs = new Date(`${trip.start_date}T00:00:00+05:30`).getTime();

    if (plan.transport?.length) {
      const { error: tErr } = await supabase.from("transport_options").insert(
        plan.transport.slice(0, 12).map((t) => ({
          trip_id: trip.id,
          mode: ["flight", "train", "bus"].includes(t.mode) ? t.mode : "flight",
          provider: t.provider,
          depart_at: t.depart_at,
          arrive_at: t.arrive_at,
          duration_minutes: Math.round(t.duration_minutes ?? 0),
          price_inr: Math.round(t.price_inr ?? 0),
          convenience_score: Math.round(t.convenience_score ?? 5),
          notes: t.notes ?? null,
        })),
      );
      if (tErr) throw tErr;
    }

    if (plan.stays?.length) {
      const { error: sErr } = await supabase.from("stay_options").insert(
        plan.stays.slice(0, 10).map((s) => ({
          trip_id: trip.id,
          kind: s.kind === "airbnb" ? "airbnb" : "hotel",
          name: s.name,
          area: s.area ?? null,
          price_per_night_inr: Math.round(s.price_per_night_inr ?? 0),
          rating: s.rating ?? null,
          highlights: s.highlights ?? null,
        })),
      );
      if (sErr) throw sErr;
    }

    if (plan.days?.length) {
      const { error: dErr } = await supabase.from("itinerary_days").insert(
        plan.days.slice(0, 30).map((d, i) => ({
          trip_id: trip.id,
          day_number: d.day_number ?? i + 1,
          day_date: new Date(startMs + (d.day_number ? d.day_number - 1 : i) * 86400000)
            .toISOString()
            .slice(0, 10),
          title: d.title,
          summary: d.summary ?? null,
          est_cost_inr: d.est_cost_inr ? Math.round(d.est_cost_inr) : null,
          activities: d.activities ?? [],
        })),
      );
      if (dErr) throw dErr;
    }

    const { error: uErr } = await supabase
      .from("trips")
      .update({ plan_status: "ready", summary: plan.summary ?? null })
      .eq("id", trip.id);
    if (uErr) throw uErr;

    return { ok: true };
  });

export const joinTripByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: z.string().trim().min(4).max(16) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: trip, error } = await supabaseAdmin
      .from("trips")
      .select("id, title")
      .eq("invite_code", data.code.toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!trip) throw new Error("No trip found for that code.");

    const { error: mErr } = await supabaseAdmin
      .from("trip_members")
      .upsert(
        { trip_id: trip.id, user_id: context.userId, role: "companion" },
        { onConflict: "trip_id,user_id" },
      );
    if (mErr) throw mErr;

    return { tripId: trip.id, title: trip.title };
  });
