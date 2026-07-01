-- Seed data for the World Store / Marketplace.
-- Run in Supabase SQL Editor to populate public.worlds with demo listings.
-- creator_id is left NULL (nullable FK) so no auth.users row is required.

INSERT INTO public.worlds
  (title, synopsis, cover_url, cover_type, trope_tags, is_premium, price_coins, rating, player_count)
VALUES
  ('The Villainess Reverses the Hourglass',
   'She died at the executioner''s block — then woke ten years in the past. This time the hourglass runs backward, and every noble who wronged her will pay.',
   NULL, 'auto', ARRAY['Villainess','Regression'], TRUE, 50, 4.9, 48200),

  ('Ninth Heaven Sword Ascension',
   'A crippled disciple inherits a dead immortal''s memories and begins the long climb from mortal dust to the Ninth Heaven.',
   NULL, 'auto', ARRAY['Cultivation','OP MC'], FALSE, 0, 4.7, 31900),

  ('Reincarnated as the Demon King''s Slime',
   'Killed by a truck, reborn as the weakest monster in the dungeon — but the System says otherwise. Absorb, evolve, conquer.',
   NULL, 'auto', ARRAY['Isekai','System'], TRUE, 0, 4.8, 27400),

  ('Level 0 Hero in a Dungeon of Kings',
   'Summoned with a useless class and zero stats, you must bluff, scheme, and grind your way past heroes who started at Level 99.',
   NULL, 'auto', ARRAY['System','Survival'], FALSE, 120, 4.6, 19100),

  ('I Alone Rewind the Apocalypse',
   'Every time you die, the clock rewinds three days. Ninety-nine loops in, you finally understand what''s hunting humanity.',
   NULL, 'auto', ARRAY['Regression','OP MC'], FALSE, 0, 4.9, 52700),

  ('The Duke''s Adopted Daughter Rebels',
   'Raised as a spare heir and traded like a bargaining chip, she decides the quiet, obedient girl they knew is already dead.',
   NULL, 'auto', ARRAY['Villainess'], FALSE, 80, 4.5, 14800),

  ('Frostbound: Last Signal on Earth',
   'The sun went out eighteen months ago. Ration your heat, decode the signal from the dark, and decide who freezes so others live.',
   NULL, 'auto', ARRAY['Survival','System'], TRUE, 0, 4.7, 22300),

  ('Ten Thousand Years of Pill Refining',
   'Trapped in a time-dilated cauldron realm, you refine pills for a hundred lifetimes — then step out to a sect that forgot your name.',
   NULL, 'auto', ARRAY['Cultivation'], FALSE, 60, 4.8, 35600);
