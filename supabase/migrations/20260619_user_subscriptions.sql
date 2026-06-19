-- user_subscriptions table
-- Tracks Pro subscription status per user (from Stripe or manual admin grant).

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                 TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'cancelled', 'expired')),
  plan                   TEXT        NOT NULL DEFAULT 'pro',
  granted_by             TEXT        NOT NULL DEFAULT 'manual'
                           CHECK (granted_by IN ('stripe', 'manual')),
  granted_by_email       TEXT,
  stripe_subscription_id TEXT        UNIQUE,
  stripe_customer_id     TEXT,
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx
  ON public.user_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx
  ON public.user_subscriptions (status);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription (for permission checks on the client)
CREATE POLICY "Users can read own subscription"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
