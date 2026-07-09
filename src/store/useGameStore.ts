import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '@/lib/supabase/client';

// ---- Types ----

export interface Attributes {
  str: number;
  dex: number;
  int: number;
  con: number;
  wis: number;
  cha: number;
}

export interface PlayerStatus {
  hp: number;
  max_hp: number;
  mana: number;
  max_mana: number;
  gold: number;
  inventory: string[];
  status_effects: string[];
  level: number;
  exp: number;
  skills: string[];
  attributes: Attributes;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface ChatLog {
  // 'system' = a world/GM-side beat the player did NOT cause (e.g. a QTE timing out
  // or a countdown reaching zero while the player stood still). Rendered as a neutral
  // centered marker, never as a player action.
  role: 'player' | 'gm' | 'system';
  content: string;
  prologue?: string;
  scene_image_prompt?: string;
  dialogue_lines?: DialogueLine[];
}

export interface CharacterEntry {
  name: string;
  description: string;
  role?: string;
  relationship?: string;
  status?: string;
  last_seen?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
}

export interface FactionStanding {
  name: string;
  standing: number;  // -100 to 100
  label: string;     // e.g. 'ศัตรู', 'เป็นกลาง', 'พันธมิตร'
}

export interface Companion {
  name: string;
  description: string;
  role: string;
  hp: number;
  max_hp: number;
  status_effects: string[];
  skills: string[];
  status: 'active' | 'dead' | 'missing';
  relationship: string;
}

export interface VisitedLocation {
  name: string;
  description: string;
}

export interface OpenThread {
  id: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  expires_in_turns: number | null;
}

export interface CountdownEvent {
  label: string;       // what the player is racing against (in game language)
  seconds: number;     // total seconds on the clock when set
  started_at: number;  // epoch ms when the clock started; lets the timer survive a reload
}

export type WorldTone = 'hardcore' | 'balanced' | 'story' | 'sandbox';

export type PlayerActionMode = 'speak' | 'think' | 'act' | 'investigate';
export type SuggestedActionsByMode = Record<PlayerActionMode, string[]>;
export const EMPTY_ACTIONS_BY_MODE: SuggestedActionsByMode = { speak: [], think: [], act: [], investigate: [] };

// Coerce untrusted data (cloud save, imported JSON, AI output) into a valid grouped-choices
// object — each mode becomes an array of non-empty strings, unknown shapes become empty.
export function normalizeActionsByMode(v: unknown): SuggestedActionsByMode {
  const src = (v && typeof v === 'object') ? v as Record<string, unknown> : {};
  const clean = (x: unknown): string[] => Array.isArray(x)
    ? x.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
    : [];
  return { speak: clean(src.speak), think: clean(src.think), act: clean(src.act), investigate: clean(src.investigate) };
}

export type UiTheme = 'theme-fantasy' | 'theme-cyberpunk' | 'theme-horror' | 'theme-survival';

/** Maps a genre string to the best-fit UI theme. Used when ui_theme is not set explicitly. */
export function genreToTheme(genre: string): UiTheme {
  const g = genre.toLowerCase();
  if (/sci.?fi|cyber|space|futur|mech|android|robot|tech|neon/.test(g)) return 'theme-cyberpunk';
  if (/horror|gothic|dark|haunt|vampir|undead|eldritch|lovecraft|ghost|demon|cthulhu/.test(g)) return 'theme-horror';
  if (/survival|post.?apoc|wasteland|wilder|zombie|disaster|apocalyp/.test(g)) return 'theme-survival';
  return 'theme-fantasy';
}

export interface WorldConfig {
  language: string;
  genre: string;
  tone: WorldTone;
  character: string;
  customWorld: string;
  openingSeed: string;
  worldName?: string;
  ui_theme?: UiTheme;
}

export interface AuthUser {
  id: string;
  email: string;
}

export type AuthStatus = 'unknown' | 'guest' | 'authenticated';

export interface SaveSlotSummary {
  id: string;
  world_name: string;
  genre: string;
  character: string;
  tone: WorldTone;
  is_dead: boolean;
  updated_at: string;
}

interface GameState {
  narrative: string;
  story_summary: string;
  player_status: PlayerStatus;
  is_dead: boolean;
  game_phase: 'Auth' | 'Dashboard' | 'Menu' | 'Playing';
  history: ChatLog[];
  current_image_prompt: string;
  suggested_actions: string[];
  // Choices grouped by the player's action mode — drives the mode-first ActionBar UI.
  // The flat suggested_actions above stays as a derived/compat mirror.
  suggested_actions_by_mode: SuggestedActionsByMode;
  current_objective: string;
  world_config: WorldConfig | null;
  is_qte_active: boolean;
  qte_time_limit: number;
  qte_options: string[];
  lives_left: number;
  known_characters: Record<string, CharacterEntry>;

  // New gameplay systems
  time_of_day: string;
  in_world_date: string;
  quest_log: Quest[];
  faction_standings: FactionStanding[];
  companions: Record<string, Companion>;
  visited_locations: VisitedLocation[];
  open_threads: OpenThread[];

  // Real-time countdown event (e.g. "bomb will explode in 30 seconds")
  active_countdown: CountdownEvent | null;

  // Cinematic FX driven by the extraction model each turn (see FXManager).
  // environment_fx + player_condition are persistent scene state; impact_fx is a
  // per-turn one-shot (never persisted — excluded in partialize).
  environment_fx: string[];   // ambient overlays: 'rain' | 'snow' | 'fog' | 'embers'
  player_condition: string;   // screen overlay: '' | 'dizzy' | 'poisoned' | 'drunk'
  impact_fx: string[];        // one-shot hits this turn: 'shake' | 'flash'

  // User-supplied Groq API key. Kept in memory only for the current tab session:
  // excluded from persistence (see partialize) and never written to our DB. The user
  // must re-enter it after a refresh — a deliberate trade-off for maximum key safety.
  groq_api_key: string;

  // Auth & cloud save state
  user: AuthUser | null;
  auth_status: AuthStatus;
  save_slots: SaveSlotSummary[];
  current_save_slot_id: string | null;
  is_loading_saves: boolean;
  // Last cloud save/load failure surfaced to the player; null when the last op succeeded.
  sync_error: string | null;

  // Subscription
  is_pro: boolean;

  // Energy / action points
  energy: number;

  // Actions
  setGameState: (newState: Partial<GameState>) => void;
  setEnergy: (value: number) => void;
  resetGame: () => void;
  fetchUserSaves: (userId: string) => Promise<void>;
  fetchSubscriptionStatus: () => Promise<void>;
  fetchEnergyBalance: () => Promise<void>;
  loadSaveSlot: (slotId: string) => Promise<void>;
  createNewSaveSlot: (worldConfig: WorldConfig) => Promise<void>;
  syncCurrentGameToCloud: () => Promise<void>;
  deleteSaveSlot: (slotId: string) => Promise<void>;
  signOut: () => Promise<void>;
  quitToMainMenu: () => Promise<void>;
}

const DEFAULT_ATTRIBUTES: Attributes = { str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10 };

/**
 * Max number of history entries persisted to localStorage. The full history lives
 * in memory (and in the cloud save for authenticated users); localStorage only needs
 * enough recent backlog to restore a guest's session without growing past the ~5MB quota.
 */
const MAX_PERSISTED_HISTORY = 40;

const initialState = {
  narrative: '',
  story_summary: '',
  player_status: {
    hp: 0, max_hp: 0, mana: 0, max_mana: 0, gold: 0,
    inventory: [], status_effects: [],
    level: 1, exp: 0, skills: [],
    attributes: DEFAULT_ATTRIBUTES,
  },
  is_dead: false,
  game_phase: 'Auth' as const,
  history: [],
  current_image_prompt: '',
  suggested_actions: [],
  suggested_actions_by_mode: EMPTY_ACTIONS_BY_MODE,
  current_objective: '',
  world_config: null,
  is_qte_active: false,
  qte_time_limit: 0,
  qte_options: [],
  lives_left: 3,
  known_characters: {} as Record<string, CharacterEntry>,
  time_of_day: '',
  in_world_date: '',
  quest_log: [] as Quest[],
  faction_standings: [] as FactionStanding[],
  companions: {} as Record<string, Companion>,
  visited_locations: [] as VisitedLocation[],
  open_threads: [] as OpenThread[],
  active_countdown: null,
  environment_fx: [] as string[],
  player_condition: '',
  impact_fx: [] as string[],
  groq_api_key: '',
  user: null,
  auth_status: 'unknown' as AuthStatus,
  save_slots: [],
  current_save_slot_id: null,
  is_loading_saves: false,
  sync_error: null,
  is_pro: false,
  energy: 50,
};

type PersistedState = Omit<GameState, 'user' | 'save_slots' | 'is_loading_saves' | 'current_save_slot_id' | 'groq_api_key' | 'is_pro' | 'energy' | 'sync_error'>;

export const useGameStore = create<GameState>()(
  persist<GameState, [], [], PersistedState>(
    (set, get) => ({
      ...initialState,
      setGameState: (newState) => set((state) => ({ ...state, ...newState })),
      setEnergy: (value) => set({ energy: value }),
      resetGame: () => set(initialState),

      fetchUserSaves: async (userId) => {
        set({ is_loading_saves: true });
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('save_slots')
          .select('id, world_name, world_config, game_state, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('fetchUserSaves error:', error);
          set({ is_loading_saves: false, sync_error: 'Failed to load save list' });
          return;
        }

        set({
          save_slots: (data ?? []).map((row: { id: string; world_name: string; world_config: WorldConfig; game_state: { is_dead?: boolean } | null; updated_at: string }) => ({
            id: row.id,
            world_name: row.world_name,
            genre: row.world_config?.genre ?? '',
            character: row.world_config?.character ?? '',
            tone: row.world_config?.tone ?? 'balanced',
            is_dead: !!row.game_state?.is_dead,
            updated_at: row.updated_at,
          })),
          is_loading_saves: false,
        });
      },

      fetchSubscriptionStatus: async () => {
        const { user } = get();
        if (!user) { set({ is_pro: false }); return; }
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('user_subscriptions')
          .select('status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        set({ is_pro: !!data });
      },

      fetchEnergyBalance: async () => {
        const { user } = get();
        if (!user) return;
        const supabase = getSupabaseClient();
        const { data } = await supabase
          .from('profiles')
          .select('energy_balance')
          .eq('id', user.id)
          .single();
        if (data && typeof data.energy_balance === 'number') {
          set({ energy: data.energy_balance });
        }
      },

      loadSaveSlot: async (slotId) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('save_slots')
          .select('*')
          .eq('id', slotId)
          .single();

        if (error || !data) {
          console.error('loadSaveSlot error:', error);
          set({ sync_error: 'Failed to load save' });
          return;
        }

        // A save without a usable world_config can't drive the game (the system prompt and
        // UI both depend on it). Bail loudly instead of entering Playing with a broken world.
        const wc = data.world_config;
        if (!wc || typeof wc !== 'object' || typeof wc.language !== 'string' || typeof wc.genre !== 'string') {
          console.error('loadSaveSlot: invalid world_config in save', slotId, wc);
          set({ sync_error: 'Save is corrupted (world data incomplete) — cannot load' });
          return;
        }

        const gs = data.game_state ?? {};

        set({
          ...initialState,
          user: get().user,
          auth_status: get().auth_status,
          save_slots: get().save_slots,
          world_config: wc,
          player_status: {
            ...initialState.player_status,
            ...data.player_status,
            attributes: { ...DEFAULT_ATTRIBUTES, ...data.player_status?.attributes },
          },
          history: Array.isArray(data.history) ? data.history : [],
          story_summary: gs.story_summary ?? '',
          current_objective: gs.current_objective ?? '',
          lives_left: typeof gs.lives_left === 'number' ? gs.lives_left : 3,
          is_dead: !!gs.is_dead,
          current_image_prompt: gs.current_image_prompt ?? '',
          suggested_actions: Array.isArray(gs.suggested_actions) ? gs.suggested_actions : [],
          suggested_actions_by_mode: normalizeActionsByMode(gs.suggested_actions_by_mode),
          known_characters: (gs.known_characters && typeof gs.known_characters === 'object') ? gs.known_characters : initialState.known_characters,
          time_of_day: gs.time_of_day ?? '',
          in_world_date: gs.in_world_date ?? '',
          quest_log: Array.isArray(gs.quest_log) ? gs.quest_log : [],
          faction_standings: Array.isArray(gs.faction_standings) ? gs.faction_standings : [],
          companions: (gs.companions && typeof gs.companions === 'object') ? gs.companions : initialState.companions,
          visited_locations: Array.isArray(gs.visited_locations) ? gs.visited_locations : [],
          open_threads: Array.isArray(gs.open_threads) ? gs.open_threads : [],
          active_countdown: (gs.active_countdown && typeof gs.active_countdown === 'object') ? gs.active_countdown : null,
          current_save_slot_id: slotId,
          game_phase: 'Playing',
        });
      },

      createNewSaveSlot: async (worldConfig) => {
        const user = get().user;
        if (!user) return;

        if (get().save_slots.length >= 10) {
          console.warn('createNewSaveSlot: save slot limit reached (10)');
          return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('save_slots')
          .insert({
            user_id: user.id,
            world_name: worldConfig.worldName?.trim() || worldConfig.genre || 'New World',
            world_config: worldConfig,
            player_status: initialState.player_status,
            game_state: {},
            history: [],
          })
          .select('id')
          .single();

        if (error || !data) {
          console.error('createNewSaveSlot error:', error);
          set({ sync_error: 'Failed to create new save' });
          return;
        }

        set({
          ...initialState,
          user,
          auth_status: 'authenticated',
          world_config: worldConfig,
          current_save_slot_id: data.id,
          game_phase: 'Playing',
        });
      },

      syncCurrentGameToCloud: async () => {
        const state = get();
        if (!state.current_save_slot_id || !state.user) return;

        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('save_slots')
          .update({
            world_config: state.world_config,
            player_status: state.player_status,
            history: state.history,
            game_state: {
              story_summary: state.story_summary,
              current_objective: state.current_objective,
              lives_left: state.lives_left,
              is_dead: state.is_dead,
              current_image_prompt: state.current_image_prompt,
              suggested_actions: state.suggested_actions,
              suggested_actions_by_mode: state.suggested_actions_by_mode,
              known_characters: state.known_characters,
              time_of_day: state.time_of_day,
              in_world_date: state.in_world_date,
              quest_log: state.quest_log,
              faction_standings: state.faction_standings,
              companions: state.companions,
              visited_locations: state.visited_locations,
              open_threads: state.open_threads,
              active_countdown: state.active_countdown,
            },
          })
          .eq('id', state.current_save_slot_id);

        if (error) {
          console.error('syncCurrentGameToCloud error:', error);
          set({ sync_error: 'Cloud save failed — your latest progress may not be saved' });
        } else if (get().sync_error) {
          set({ sync_error: null });
        }
      },

      deleteSaveSlot: async (slotId) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('save_slots').delete().eq('id', slotId);

        if (error) {
          console.error('deleteSaveSlot error:', error);
          set({ sync_error: 'Failed to delete save' });
          return;
        }

        set({ save_slots: get().save_slots.filter((slot) => slot.id !== slotId) });
      },

      signOut: async () => {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();

        set({
          ...initialState,
          user: null,
          auth_status: 'unknown',
          save_slots: [],
          current_save_slot_id: null,
          game_phase: 'Auth',
        });
      },

      quitToMainMenu: async () => {
        await get().syncCurrentGameToCloud();
        const user = get().user;

        set({
          ...initialState,
          user,
          auth_status: 'authenticated',
          current_save_slot_id: null,
          game_phase: 'Dashboard',
        });

        if (user) await get().fetchUserSaves(user.id);
      },
    }),
    {
      name: 'storyweave-save',
      version: 7,
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user, save_slots, is_loading_saves, current_save_slot_id, groq_api_key, is_pro, energy, sync_error, ...rest } = state;
        return {
          ...rest,
          // Cap persisted history so a long game can't overflow the localStorage quota.
          history: rest.history.slice(-MAX_PERSISTED_HISTORY),
          game_phase: state.auth_status === 'authenticated' ? 'Dashboard' : rest.game_phase,
          // impact_fx is a per-turn one-shot trigger — persist it empty so it never re-fires on reload.
          impact_fx: [],
        };
      },
      migrate: (persistedState) => {
        const state = (persistedState ?? initialState) as Partial<PersistedState>;
        return {
          ...initialState,
          ...state,
          player_status: {
            ...initialState.player_status,
            ...state.player_status,
            attributes: {
              ...DEFAULT_ATTRIBUTES,
              ...state.player_status?.attributes,
            },
          },
          // Migrate new fields that old saves won't have
          known_characters: state.known_characters ?? initialState.known_characters,
          time_of_day: state.time_of_day ?? '',
          in_world_date: state.in_world_date ?? '',
          quest_log: state.quest_log ?? [],
          faction_standings: state.faction_standings ?? [],
          companions: state.companions ?? initialState.companions,
          visited_locations: state.visited_locations ?? [],
          open_threads: state.open_threads ?? [],
          active_countdown: state.active_countdown ?? null,
          environment_fx: state.environment_fx ?? [],
          player_condition: state.player_condition ?? '',
          impact_fx: [],
          suggested_actions_by_mode: state.suggested_actions_by_mode ?? EMPTY_ACTIONS_BY_MODE,
          // NOSONAR: cast required because spreading Partial<PersistedState> makes action fields optional
        } as PersistedState;
      },
    }
  )
);
