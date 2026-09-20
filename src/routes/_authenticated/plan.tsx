import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { generateTripPlan } from "@/lib/trips.functions";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Plan a new trip — Yatra AI" },
      {
        name: "description",
        content:
          "Enter your city, destination, dates and rupee budget and let AI build travel options and a day-wise itinerary.",
      },
      { property: "og:title", content: "Plan a new trip — Yatra AI" },
      {
        property: "og:description",
        content: "AI-built travel options and itinerary for your dates and budget.",
      },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateTripPlan);
  const [form, setForm] = useState({
    title: "",
    origin_city: "",
    destination: "",
    start_date: "",
    end_date: "",
    travellers: "2",
    budget_inr: "",
    pace: "balanced",
    interests: "",
    notes: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.origin_city || !form.destination || !form.start_date || !form.end_date) {
        throw new Error("Fill in the cities and dates first.");
      }
      if (new Date(form.end_date) < new Date(form.start_date)) {
        throw new Error("Return date can't be before the start date.");
      }
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Please sign in again.");

      const { data: trip, error } = await supabase
        .from("trips")
        .insert({
          owner_id: uid,
          title: form.title.trim() || `${form.origin_city} → ${form.destination}`,
          origin_city: form.origin_city.trim(),
          destination: form.destination.trim(),
          start_date: form.start_date,
          end_date: form.end_date,
          travellers: Number(form.travellers) || 1,
          budget_inr: form.budget_inr ? Number(form.budget_inr) : null,
          pace: form.pace,
          interests: form.interests.trim() || null,
          notes: form.notes.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;

      await generate({ data: { tripId: trip.id } });
      return trip.id;
    },
    onSuccess: (tripId) => {
      toast.success("Your plan is ready!");
      navigate({ to: "/trips/$tripId", params: { tripId } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not plan trip"),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Plan a new trip</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Budgets in Indian Rupees, schedules on Indian Standard Time.
      </p>

      <form
        className="panel mt-8 space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="title">Trip name</Label>
          <Input
            id="title"
            value={form.title}
            maxLength={80}
            onChange={(e) => set("title")(e.target.value)}
            placeholder="Goa reunion"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="origin">Starting from</Label>
            <Input
              id="origin"
              value={form.origin_city}
              maxLength={80}
              onChange={(e) => set("origin_city")(e.target.value)}
              placeholder="Bengaluru"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={form.destination}
              maxLength={80}
              onChange={(e) => set("destination")(e.target.value)}
              placeholder="Manali"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start">Start date</Label>
            <Input
              id="start"
              type="date"
              value={form.start_date}
              onChange={(e) => set("start_date")(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end">Return date</Label>
            <Input
              id="end"
              type="date"
              value={form.end_date}
              onChange={(e) => set("end_date")(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="travellers">Travellers</Label>
            <Input
              id="travellers"
              type="number"
              min={1}
              max={30}
              value={form.travellers}
              onChange={(e) => set("travellers")(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Total budget (₹)</Label>
            <Input
              id="budget"
              type="number"
              min={0}
              max={10000000}
              value={form.budget_inr}
              onChange={(e) => set("budget_inr")(e.target.value)}
              placeholder="45000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Pace</Label>
          <Select value={form.pace} onValueChange={set("pace")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relaxed">Relaxed — few things a day</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="packed">Packed — see everything</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interests">Interests</Label>
          <Input
            id="interests"
            value={form.interests}
            maxLength={200}
            onChange={(e) => set("interests")(e.target.value)}
            placeholder="Trekking, cafes, local food, temples"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Anything else?</Label>
          <Textarea
            id="notes"
            value={form.notes}
            maxLength={600}
            onChange={(e) => set("notes")(e.target.value)}
            placeholder="Travelling with elderly parents, prefer overnight trains"
          />
        </div>

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-marigold w-full text-primary-foreground"
          size="lg"
        >
          <Sparkles className="mr-2 size-4" />
          {mutation.isPending ? "Building your plan…" : "Generate travel plan"}
        </Button>
      </form>
    </main>
  );
}
