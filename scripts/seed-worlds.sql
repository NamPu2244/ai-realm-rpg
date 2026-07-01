-- Seed data for the World Store / Marketplace.
-- Run in Supabase SQL Editor (after 20260701_worlds_marketplace.sql) to populate
-- public.worlds with demo listings.
-- creator_id is left NULL (nullable FK) so no auth.users row is required.
--
-- world_config mirrors WorldConfig in src/store/useGameStore.ts so each listing
-- loads straight into a fresh game when played from the store.

INSERT INTO public.worlds
  (title, synopsis, cover_url, cover_type, trope_tags, is_premium, price_coins, rating, player_count, world_config)
VALUES
  ('The Villainess Reverses the Hourglass',
   'She died at the executioner''s block — then woke ten years in the past. This time the hourglass runs backward, and every noble who wronged her will pay.',
   NULL, 'auto', ARRAY['Villainess','Regression'], TRUE, 50, 4.9, 48200,
   '{"language":"th","genre":"Fantasy Court Intrigue","tone":"story","character":"Aria Valmonte, a disgraced duchess reborn a decade before her execution","customWorld":"A gilded empire of scheming nobles where a beheaded villainess wakes ten years in the past, memories intact, determined to rewrite her fate.","openingSeed":"You gasp awake in your childhood bedroom, the phantom bite of the guillotine still on your neck. The clock reads a decade before your ruin.","worldName":"The Villainess Reverses the Hourglass","ui_theme":"theme-fantasy"}'::jsonb),

  ('Ninth Heaven Sword Ascension',
   'A crippled disciple inherits a dead immortal''s memories and begins the long climb from mortal dust to the Ninth Heaven.',
   NULL, 'auto', ARRAY['Cultivation','OP MC'], FALSE, 0, 4.7, 31900,
   '{"language":"th","genre":"Xianxia Cultivation","tone":"balanced","character":"Lin Fei, a crippled outer-sect disciple carrying an immortal''s inheritance","customWorld":"A world of sword sects and spirit qi where the weak are trampled, and a dead immortal''s memories awaken inside a discarded disciple.","openingSeed":"The elders sneer as they strike your name from the sect roster — but tonight, a dying immortal''s voice echoes in your shattered meridians.","worldName":"Ninth Heaven Sword Ascension","ui_theme":"theme-fantasy"}'::jsonb),

  ('Reincarnated as the Demon King''s Slime',
   'Killed by a truck, reborn as the weakest monster in the dungeon — but the System says otherwise. Absorb, evolve, conquer.',
   NULL, 'auto', ARRAY['Isekai','System'], TRUE, 0, 4.8, 27400,
   '{"language":"th","genre":"Isekai Dungeon System","tone":"balanced","character":"a newly-reincarnated slime with a mysterious Absorb & Evolve System","customWorld":"A monster-infested dungeon world governed by a game-like System, where the lowliest slime can devour its way to demon-king power.","openingSeed":"You open eyes you no longer have. A translucent panel blinks: [System online. Species: Slime (Lv.1). Skill acquired: Absorb.]","worldName":"Reincarnated as the Demon King''s Slime","ui_theme":"theme-fantasy"}'::jsonb),

  ('Level 0 Hero in a Dungeon of Kings',
   'Summoned with a useless class and zero stats, you must bluff, scheme, and grind your way past heroes who started at Level 99.',
   NULL, 'auto', ARRAY['System','Survival'], FALSE, 120, 4.6, 19100,
   '{"language":"th","genre":"Isekai Summoning System","tone":"hardcore","character":"a hero summoned with the [Commoner] class and a flat zero in every stat","customWorld":"A kingdom that summons heroes to fight the Demon Lord — but you arrived with the worst class in history, surrounded by Level 99 rivals who want you gone.","openingSeed":"The summoning circle fades. The court mage frowns at your status screen: every stat reads 0. Guards reach for their swords.","worldName":"Level 0 Hero in a Dungeon of Kings","ui_theme":"theme-fantasy"}'::jsonb),

  ('I Alone Rewind the Apocalypse',
   'Every time you die, the clock rewinds three days. Ninety-nine loops in, you finally understand what''s hunting humanity.',
   NULL, 'auto', ARRAY['Regression','OP MC'], FALSE, 0, 4.9, 52700,
   '{"language":"th","genre":"Apocalyptic Time-Loop","tone":"hardcore","character":"the only human who remembers every reset of the three-day loop","customWorld":"When the sky tore open and monsters poured through, one survivor discovered that death rewinds time three days — and only they keep their memories.","openingSeed":"The rift-beast''s claw finds your heart. Darkness — then you jolt awake in your apartment, three days before the sky first cracked. Again.","worldName":"I Alone Rewind the Apocalypse","ui_theme":"theme-survival"}'::jsonb),

  ('The Duke''s Adopted Daughter Rebels',
   'Raised as a spare heir and traded like a bargaining chip, she decides the quiet, obedient girl they knew is already dead.',
   NULL, 'auto', ARRAY['Villainess'], FALSE, 80, 4.5, 14800,
   '{"language":"th","genre":"Fantasy Court Intrigue","tone":"story","character":"Celes, the duke''s adopted daughter kept as a political bargaining chip","customWorld":"A noble house that adopted a commoner girl as a spare heir and pawn — until the day she stops playing the obedient role written for her.","openingSeed":"The duke announces your betrothal to a man twice your age as though discussing the weather. You smile, curtsy — and quietly begin to plan.","worldName":"The Duke''s Adopted Daughter Rebels","ui_theme":"theme-fantasy"}'::jsonb),

  ('Frostbound: Last Signal on Earth',
   'The sun went out eighteen months ago. Ration your heat, decode the signal from the dark, and decide who freezes so others live.',
   NULL, 'auto', ARRAY['Survival','System'], TRUE, 0, 4.7, 22300,
   '{"language":"th","genre":"Post-Apocalyptic Survival","tone":"hardcore","character":"the heat-warden of a dying shelter on a frozen Earth","customWorld":"Eighteen months after the sun dimmed, the last survivors huddle in failing shelters. A repeating signal pulses from the frozen dark, and fuel is almost gone.","openingSeed":"The thermometer reads minus fifty. The generator coughs. On the radio, through the static, a voice that is not human begins to count down.","worldName":"Frostbound: Last Signal on Earth","ui_theme":"theme-survival"}'::jsonb),

  ('Ten Thousand Years of Pill Refining',
   'Trapped in a time-dilated cauldron realm, you refine pills for a hundred lifetimes — then step out to a sect that forgot your name.',
   NULL, 'auto', ARRAY['Cultivation'], FALSE, 60, 4.8, 35600,
   '{"language":"th","genre":"Xianxia Alchemy","tone":"balanced","character":"an alchemist sealed inside a time-dilated cauldron realm for ten thousand years","customWorld":"A cultivation world of pill sects and spirit herbs, where a single alchemist emerges from a time-warped cauldron realm carrying ten millennia of refining mastery.","openingSeed":"The cauldron realm shatters at last. You step into daylight ten thousand years wiser — and find the sect that sealed you has forgotten you ever lived.","worldName":"Ten Thousand Years of Pill Refining","ui_theme":"theme-fantasy"}'::jsonb);
