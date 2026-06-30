/**
 * Random seed library for Quick Start games (no custom world/scenario).
 * Combines a random location, starting event, and narrative tone into a
 * single opening seed string that is injected into the AI system prompt.
 */

const RANDOM_LOCATIONS: string[] = [
  // Fantasy / Wuxia
  "A wizard's tower crumbling apart piece by piece",
  "A mountain fortress surrounded by an army tens of thousands strong",
  "The ruins of an ancient city half-submerged in shallow water",
  "A sky-temple whose anchor chains to the earth are about to snap",
  "A cursed forest where the trees move and seal every exit",
  "A rope bridge over a chasm so deep its floor is invisible",
  // Sci-Fi / Cyberpunk
  "An airship with dead engines plummeting toward the ground",
  "A space station where artificial gravity has suddenly failed",
  "A desert planet so scorching the environment suit is beginning to melt",
  "The control room of a nuclear reactor spiraling into meltdown",
  "A spacecraft being pulled into a black hole",
  "An undersea city sinking as leaks burst through every wall",
  // Cyberpunk / Modern
  "A cyberpunk slum in relentless acid rain with pitch-black alleys",
  "A skyscraper under aerial bombardment while the elevators have stopped",
  "A secret laboratory seconds after an explosion from an unknown chemical",
  "A city subway tunnel with the lights cut and something walking down the tracks",
  "An underground black market where a deal is about to turn violent",
  "A military base seized by enemy forces less than an hour ago",
  // Horror / Mystery
  "An old manor on a hill during a great storm, every door locking itself",
  "An abandoned hospital with a staircase descending to a basement not on any blueprint",
  "A village encircled by a creeping toxic fog with no way out",
  "A pitch-black underground dungeon slowly filling with water every minute",
  "A ship adrift in a sea of fog, no crew, no direction",
  "A room where the door and windows have vanished, leaving four walls and a ceiling that is slowly descending",
  // Action / Adventure
  "The roof of a high-speed train cutting through a blizzard",
  "The deck of a pirate ship as a colossal wave rises to swallow it",
  "An underground fighting pit ringed by a screaming crowd",
  "A secret tunnel beneath a palace being breached from two directions at once",
  "The bottom of a mine shaft as the walls begin to collapse",
  "A gun turret atop a city wall under heavy artillery fire",
  // Exotic / Unique
  "A dimensional void between worlds where physics is failing and reality is dissolving",
  "An underground tomb where the last torch just went out and footsteps approach from a dead end",
  "An underground boxing ring inside a mafia casino moments after a betrayal",
];

const RANDOM_EVENTS: string[] = [
  // Physical peril
  "Holding a ticking bomb with 30 seconds left — every wire is red",
  "Waking to find yourself bound hand and foot, dangling upside-down from a high ceiling",
  "Climbing out of a 30-story burning building with nothing but a single length of cloth",
  "Having just survived an ambush with no idea who ordered it",
  "Being hunted by tracking hounds and fully armed soldiers",
  "Finding yourself caught between two armies about to collide",
  "Treading water as enormous creatures circle silently beneath you",
  "Discovering you are the sole survivor on a wrecked and sinking ship",
  "Breaking out of prison alongside an inmate you cannot bring yourself to trust",
  "Realizing you are the last person in the bunker and the oxygen runs out in 20 minutes",
  // Social / Situational
  "Jolting awake with a stranger pressing a weapon to your forehead",
  "Being falsely accused of murder in front of dozens of witnesses",
  "Looking down to find yourself wearing unfamiliar clothes stained with blood",
  "Being taken hostage in a negotiation that is collapsing fast",
  "Receiving a message warning you will be dead within 24 hours — and knowing it is true",
  "Having been sold out by the one person you trusted most",
  "Standing on an arena stage while the crowd roars for blood",
  "Surrounded by a secret cult in the middle of a ritual that places you at its center",
  "Discovering you are the prime suspect in a crime that just happened",
  "Being interrogated by a shadow agency that knows things about you that you do not",
  // Supernatural / Sci-Fi
  "Waking in someone else's body — and that person has enemies across the entire city",
  "Finding yourself wielding a strange power you cannot control, destroying everything around you",
  "Coming to in an era that is not your own with no way back",
  "Learning that a chip embedded in your body is about to transmit your location to an enemy",
  "Discovering you have been buried alive — and time is running out",
  "Waking with another person's memories intact, memories that reveal an assassination plot",
  // Moral dilemma / Intrigue
  "Holding a mysterious artifact in your hand that every faction is willing to kill for",
  "Knowing a secret that, if revealed, would change the entire world",
  "Just learning that the mission you accepted requires you to betray the person you love most",
  "Witnessing a catastrophe that only you might have the power to stop",
  "Hired for a job that risks your life — but still not knowing what the job actually is",
  "Waking to find no one recognises you and every record of your existence has been erased",
];

const RANDOM_TONES: string[] = [
  "Dark Comedy — a disastrous situation with a bitter, absurd edge; life is tragically ridiculous",
  "Survival Thriller — every second counts, resources are gone, and no one is coming to help",
  "Paranoia / Mystery — impossible to know who is an ally or what is actually true",
  "High-Octane Action — fast, brutal, loud, relentless",
  "Psychological Horror — the most terrifying thing lives inside the mind",
  "Epic Tragedy — grand in scale, deep in feeling, and mercilessly fateful",
  "Political Intrigue — everyone has a hidden agenda; honesty is just another word for weakness",
  "Gritty Realism — no heroes here, just people trying to survive",
  "Swashbuckling Adventure — danger around every corner, but thrilling every step of the way",
  "War & Brutality — no side is righteous; there are only the defeated and the barely living",
  "Anti-Hero Journey — doing the right thing by entirely the wrong means",
  "Supernatural Mystery — the rules of the known world are coming apart",
  "Treasure Hunt — riddles, traps, rivals, and a prize at the end worth far more than gold",
  "Dystopian Sci-Fi — a bleak future where power controls everything except hope",
  "Dangerous Romance — love and betrayal are impossible to separate",
  "Noir Detective — everyone lies, the city is rotten, and the truth always hurts",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Returns a single seed string combining a random location, starting event,
 * and narrative tone. Injected as `openingSeed` into the AI system prompt
 * for Quick Start games (no custom world configured).
 */
export function generateRandomStart(): string {
  const location = pick(RANDOM_LOCATIONS);
  const event = pick(RANDOM_EVENTS);
  const tone = pick(RANDOM_TONES);
  return `Location: ${location} | Situation: ${event} | Tone & Atmosphere: ${tone}`;
}
