import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinTripByCode } from "@/lib/trips.functions";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({
    meta: [
      { title: "Join a trip — Yatra AI" },
      {
        name: "description",
        content: "Enter a trip code to join a friend's travel plan and coordinate together.",
      },
      { property: "og:title", content: "Join a trip — Yatra AI" },
      { property: "og:description", content: "Join a shared travel plan with a trip code." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const join = useServerFn(joinTripByCode);

  const mutation = useMutation({
    mutationFn: async () => join({ data: { code: code.trim().toUpperCase() } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast.success(`Joined "${result.title}"`);
      navigate({ to: "/trips/$tripId", params: { tripId: result.tripId } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not join"),
  });

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <div className="panel p-8">
        <h1 className="text-2xl font-bold">Join a trip</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask the trip owner for their 8-character trip code.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="code">Trip code</Label>
            <Input
              id="code"
              value={code}
              maxLength={16}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="A1B2C3D4"
              className="tracking-[0.3em] uppercase"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-marigold w-full text-primary-foreground"
          >
            {mutation.isPending ? "Joining…" : "Join trip"}
          </Button>
        </form>
      </div>
    </main>
  );
}
