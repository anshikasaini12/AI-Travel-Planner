import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { suggestDestinations, type Suggestion } from "@/lib/trips.functions";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Discover destinations — Yatra AI" },
      {
        name: "description",
        content:
          "Tell Yatra AI your city, travel month and rupee budget and get destination ideas that fit.",
      },
      { property: "og:title", content: "Discover destinations — Yatra AI" },
      {
        property: "og:description",
        content: "AI destination ideas matched to your city, month and budget in rupees.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const suggest = useServerFn(suggestDestinations);
  const [form, setForm] = useState({ from: "", month: "", budgetInr: "", vibe: "" });
  const [results, setResults] = useState<Suggestion[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.from.trim().length < 2) throw new Error("Where are you starting from?");
      return suggest({
        data: {
          from: form.from.trim(),
          month: form.month.trim(),
          budgetInr: form.budgetInr ? Number(form.budgetInr) : 0,
          vibe: form.vibe.trim(),
        },
      });
    },
    onSuccess: (data) => setResults(data.suggestions),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not fetch ideas"),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Where should we go?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Six destination ideas matched to your city, month and rupee budget.
      </p>

      <form
        className="panel mt-8 grid gap-4 p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="from">Starting city</Label>
          <Input
            id="from"
            value={form.from}
            maxLength={80}
            onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
            placeholder="Hyderabad"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="month">Travel month</Label>
          <Input
            id="month"
            value={form.month}
            maxLength={40}
            onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
            placeholder="December"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Budget per person (₹)</Label>
          <Input
            id="budget"
            type="number"
            min={0}
            max={10000000}
            value={form.budgetInr}
            onChange={(e) => setForm((p) => ({ ...p, budgetInr: e.target.value }))}
            placeholder="25000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vibe">Kind of trip</Label>
          <Input
            id="vibe"
            value={form.vibe}
            maxLength={200}
            onChange={(e) => setForm((p) => ({ ...p, vibe: e.target.value }))}
            placeholder="Mountains, quiet, good food"
          />
        </div>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="bg-marigold sm:col-span-2 text-primary-foreground"
        >
          <Compass className="mr-2 size-4" />
          {mutation.isPending ? "Thinking…" : "Suggest destinations"}
        </Button>
      </form>

      {results.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((s) => (
            <article key={s.destination} className="panel p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{s.destination}</h2>
                <Badge variant="secondary">{s.region}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.why}</p>
              <p className="mt-3 text-sm">
                Best for <span className="text-accent">{s.best_for}</span>
              </p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.ideal_days} days</span>
                <span className="font-bold text-primary">{formatINR(s.est_total_inr)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </main>
  );
}
