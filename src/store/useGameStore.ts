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
  role: 'player' | 'gm';
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

export type WorldTone = 'hardcore' | 'balanced' | 'story' | 'sandbox';

export interface WorldConfig {
  language: string;
  genre: string;
  tone: WorldTone;
  character: string;
  customWorld: string;
  openingSeed: string;
  worldName?: string;
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
  current_language: string;
  history: ChatLog[];
  current_image_prompt: string;
  suggested_actions: string[];
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

  // User-supplied Groq API key (stored locally, never sent to our DB)
  groq_api_key: string;

  // Auth & cloud save state
  user: AuthUser | null;
  auth_status: AuthStatus;
  save_slots: SaveSlotSummary[];
  current_save_slot_id: string | null;
  is_loading_saves: boolean;

  // Actions
  setGameState: (newState: Partial<GameState>) => void;
  resetGame: () => void;
  fetchUserSaves: (userId: string) => Promise<void>;
  loadSaveSlot: (slotId: string) => Promise<void>;
  createNewSaveSlot: (worldConfig: WorldConfig) => Promise<void>;
  syncCurrentGameToCloud: () => Promise<void>;
  deleteSaveSlot: (slotId: string) => Promise<void>;
  signOut: () => Promise<void>;
  quitToMainMenu: () => Promise<void>;
}

const DEFAULT_ATTRIBUTES: Attributes = { str: 10, dex: 10, int: 10, con: 10, wis: 10, cha: 10 };

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
  current_language: 'Pending',
  history: [],
  current_image_prompt: '',
  suggested_actions: [],
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
  groq_api_key: '',
  user: null,
  auth_status: 'unknown' as AuthStatus,
  save_slots: [],
  current_save_slot_id: null,
  is_loading_saves: false,
};

type PersistedState = Omit<GameState, 'user' | 'save_slots' | 'is_loading_saves' | 'current_save_slot_id' | 'groq_api_key'>;

export const useGameStore = create<GameState>()(
  persist<GameState, [], [], PersistedState>(
    (set, get) => ({
      ...initialState,
      setGameState: (newState) => set((state) => ({ ...state, ...newState })),
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
          set({ is_loading_saves: false });
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

      loadSaveSlot: async (slotId) => {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('save_slots')
          .select('*')
          .eq('id', slotId)
          .single();

        if (error || !data) {
          console.error('loadSaveSlot error:', error);
          return;
        }

        const gs = data.game_state ?? {};

        set({
          ...initialState,
          user: get().user,
          auth_status: get().auth_status,
          save_slots: get().save_slots,
          world_config: data.world_config,
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
          known_characters: (gs.known_characters && typeof gs.known_characters === 'object') ? gs.known_characters : initialState.known_characters,
          time_of_day: gs.time_of_day ?? '',
          in_world_date: gs.in_world_date ?? '',
          quest_log: Array.isArray(gs.quest_log) ? gs.quest_log : [],
          faction_standings: Array.isArray(gs.faction_standings) ? gs.faction_standings : [],
          companions: (gs.companions && typeof gs.companions === 'object') ? gs.companions : initialState.companions,
          visited_locations: Array.isArray(gs.visited_locations) ? gs.visited_locations : [],
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
              known_characters: state.known_characters,
              time_of_day: state.time_of_day,
              in_world_date: state.in_world_date,
              quest_log: state.quest_log,
              faction_standings: state.faction_standings,
              companions: state.companions,
              visited_locations: state.visited_locations,
            },
          })
          .eq('id', state.current_save_slot_id);

        if (error) console.error('syncCurrentGameToCloud error:', error);
      },

      deleteSaveSlot: async (slotId) => {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('save_slots').delete().eq('id', slotId);

        if (error) {
          console.error('deleteSaveSlot error:', error);
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
      name: 'ai-realm-save',
      version: 4,
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user, save_slots, is_loading_saves, current_save_slot_id, groq_api_key, ...rest } = state;
        return {
          ...rest,
          game_phase: state.auth_status === 'authenticated' ? 'Dashboard' : rest.game_phase,
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
          time_of_day: state.time_of_day ?? '',
          in_world_date: state.in_world_date ?? '',
          quest_log: state.quest_log ?? [],
          faction_standings: state.faction_standings ?? [],
          companions: state.companions ?? initialState.companions,
          visited_locations: state.visited_locations ?? [],
          // NOSONAR: cast required because spreading Partial<PersistedState> makes action fields optional
        } as PersistedState;
      },
    }
  )
);
