import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Compass, LogOut, Plane } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";

export function SiteHeader() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="bg-marigold flex size-9 items-center justify-center rounded-xl text-primary-foreground">
            <Plane className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Yatra AI</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {loading ? null : user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/discover">Discover</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/trips">My trips</Link>
              </Button>
              <Button asChild size="sm" className="bg-marigold text-primary-foreground">
                <Link to="/plan">
                  <Compass className="mr-1 size-4" /> Plan a trip
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out">
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-marigold text-primary-foreground">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Sign up
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
