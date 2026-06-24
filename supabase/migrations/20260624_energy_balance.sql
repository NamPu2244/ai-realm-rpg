-- Energy balance for action-points system.
-- Each user gets 50 energy by default; one point is deducted per successful AI turn.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS energy_balance INTEGER NOT NULL DEFAULT 50;

-- Atomically decrement by 1 (guarded by > 0), returns the new balance.
-- Using SECURITY DEFINER so the service-role caller can update any profile row.
CREATE OR REPLACE FUNCTION public.spend_energy(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET energy_balance = energy_balance - 1
  WHERE id = p_user_id
    AND energy_balance > 0
  RETURNING energy_balance INTO v_new_balance;

  -- If no row was updated (balance already 0 or no profile), read current value.
  IF v_new_balance IS NULL THEN
    SELECT energy_balance
    INTO v_new_balance
    FROM public.profiles
    WHERE id = p_user_id;
  END IF;

  RETURN COALESCE(v_new_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
