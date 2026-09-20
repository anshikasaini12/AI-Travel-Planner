-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  home_city text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- trips
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  origin_city text NOT NULL,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  travellers integer NOT NULL DEFAULT 1,
  budget_inr integer,
  pace text NOT NULL DEFAULT 'balanced',
  interests text,
  notes text,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  plan_status text NOT NULL DEFAULT 'draft',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- trip members
CREATE TABLE public.trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'companion',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.trip_members TO authenticated;
GRANT ALL ON public.trip_members TO service_role;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_trip_member(_trip_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = _trip_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(_trip_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trips WHERE id = _trip_id AND owner_id = _user_id);
$$;

-- itinerary days
CREATE TABLE public.itinerary_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  day_date date,
  title text NOT NULL,
  summary text,
  activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  est_cost_inr integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_days TO authenticated;
GRANT ALL ON public.itinerary_days TO service_role;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;

-- transport options
CREATE TABLE public.transport_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  mode text NOT NULL,
  provider text NOT NULL,
  depart_at timestamptz,
  arrive_at timestamptz,
  duration_minutes integer,
  price_inr integer NOT NULL,
  convenience_score integer,
  notes text,
  booking_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_options TO authenticated;
GRANT ALL ON public.transport_options TO service_role;
ALTER TABLE public.transport_options ENABLE ROW LEVEL SECURITY;

-- stay options
CREATE TABLE public.stay_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  area text,
  price_per_night_inr integer NOT NULL,
  rating numeric(2,1),
  highlights text,
  booking_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stay_options TO authenticated;
GRANT ALL ON public.stay_options TO service_role;
ALTER TABLE public.stay_options ENABLE ROW LEVEL SECURITY;

-- policies
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "members read trips" ON public.trips FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_trip_member(id, auth.uid()));
CREATE POLICY "create own trips" ON public.trips FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates trips" ON public.trips FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes trips" ON public.trips FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "members read membership" ON public.trip_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_trip_owner(trip_id, auth.uid()));
CREATE POLICY "join trips" ON public.trip_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_trip_owner(trip_id, auth.uid()));
CREATE POLICY "leave or remove members" ON public.trip_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_trip_owner(trip_id, auth.uid()));

CREATE POLICY "members read itinerary" ON public.itinerary_days FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()) OR public.is_trip_owner(trip_id, auth.uid()));
CREATE POLICY "owner writes itinerary" ON public.itinerary_days FOR ALL TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid())) WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

CREATE POLICY "members read transport" ON public.transport_options FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()) OR public.is_trip_owner(trip_id, auth.uid()));
CREATE POLICY "owner writes transport" ON public.transport_options FOR ALL TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid())) WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

CREATE POLICY "members read stays" ON public.stay_options FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id, auth.uid()) OR public.is_trip_owner(trip_id, auth.uid()));
CREATE POLICY "owner writes stays" ON public.stay_options FOR ALL TO authenticated
  USING (public.is_trip_owner(trip_id, auth.uid())) WITH CHECK (public.is_trip_owner(trip_id, auth.uid()));

-- auto profile + owner membership
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trips_add_owner_member AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trips_touch_updated BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();