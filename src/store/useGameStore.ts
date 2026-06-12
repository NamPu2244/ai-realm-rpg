import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getSupabaseClient } from '@/lib/supabase/client';

// 1. กำหนด Type ตาม JSON Schema ของเรา
export interface PlayerStatus {
  hp: number;
  max_hp: number;
  mana: number;
  max_mana: number;
  inventory: string[];
  status_effects: string[];
  level: number;
  exp: number;
  skills: string[];
}

export interface ChatLog {
  role: 'player' | 'gm';
  content: string;
  prologue?: string;
}

export type WorldTone = 'hardcore' | 'balanced' | 'story' | 'sandbox';

export type AiProvider = 'ollama' | 'groq' | 'gemini';

export interface WorldConfig {
  language: string;
  genre: string;
  tone: WorldTone;
  character: string;
  customWorld: string;
  openingSeed: string;
  aiModel: string;
  aiProvider: AiProvider;
}

export interface AuthUser {
  id: string;
  email: string;
}

export type AuthStatus = 'unknown' | 'guest' | 'authenticated';

// ข้อมูลสรุปของแต่ละ save slot สำหรับแสดงใน Dashboard (ไม่ต้องโหลดทั้งเกม)
export interface SaveSlotSummary {
  id: string;
  world_name: string;
  genre: string;
  character: string;
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

const initialState = {
  narrative: '',
  story_summary: '',
  player_status: {
    hp: 0, max_hp: 0, mana: 0, max_mana: 0, inventory: [], status_effects: [],
    level: 1, exp: 0, skills: []
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
  user: null,
  auth_status: 'unknown' as AuthStatus,
  save_slots: [],
  current_save_slot_id: null,
  is_loading_saves: false,
};

// ข้อมูลที่ persist ลง localStorage (ไม่รวมข้อมูลบัญชี/รายชื่อ save บนคลาวด์
// เพราะดึงจาก Supabase ใหม่ทุกครั้งที่ login)
type PersistedState = Omit<GameState, 'user' | 'save_slots' | 'is_loading_saves' | 'current_save_slot_id'>;

// 2. สร้าง Store พร้อมระบบเซฟลง LocalStorage (สำหรับผู้เล่นที่ไม่ได้ login)
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
          .select('id, world_name, world_config, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('fetchUserSaves error:', error);
          set({ is_loading_saves: false });
          return;
        }

        set({
          save_slots: (data ?? []).map((row: { id: string; world_name: string; world_config: WorldConfig; updated_at: string }) => ({
            id: row.id,
            world_name: row.world_name,
            genre: row.world_config?.genre ?? '',
            character: row.world_config?.character ?? '',
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

        const gameStateData = data.game_state ?? {};

        set({
          ...initialState,
          user: get().user,
          auth_status: get().auth_status,
          save_slots: get().save_slots,
          world_config: data.world_config,
          player_status: { ...initialState.player_status, ...data.player_status },
          history: Array.isArray(data.history) ? data.history : [],
          story_summary: gameStateData.story_summary ?? '',
          current_objective: gameStateData.current_objective ?? '',
          lives_left: typeof gameStateData.lives_left === 'number' ? gameStateData.lives_left : 3,
          is_dead: !!gameStateData.is_dead,
          current_image_prompt: gameStateData.current_image_prompt ?? '',
          suggested_actions: Array.isArray(gameStateData.suggested_actions) ? gameStateData.suggested_actions : [],
          current_save_slot_id: slotId,
          game_phase: 'Playing',
        });
      },

      createNewSaveSlot: async (worldConfig) => {
        const user = get().user;
        if (!user) return;

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('save_slots')
          .insert({
            user_id: user.id,
            world_name: worldConfig.genre || 'New World',
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
      // version ของ schema สำหรับ localStorage เพิ่มเลขนี้เมื่อมีการเปลี่ยนโครงสร้าง
      // GameState/PlayerStatus แบบ breaking change แล้วเขียน migration ใน `migrate` ด้านล่าง
      version: 2,
      // เก็บไว้เฉพาะข้อมูลเกมของผู้เล่น guest (ไม่ persist ข้อมูลบัญชี/รายชื่อ save บนคลาวด์
      // เพราะดึงจาก Supabase ใหม่ทุกครั้งที่ login)
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user, save_slots, is_loading_saves, current_save_slot_id, ...rest } = state;
        // ผู้เล่นที่ login แล้วให้กลับมาที่ Dashboard เสมอหลังโหลดหน้าใหม่
        // (ความคืบหน้าจริงถูกซิงค์ขึ้นคลาวด์แล้ว ไม่ต้องพึ่ง localStorage)
        return {
          ...rest,
          game_phase: state.auth_status === 'authenticated' ? 'Dashboard' : rest.game_phase,
        };
      },
      // กัน save เก่าที่ field ใน player_status (หรือ field บนสุด) ขาดหายไปหลังแก้ schema
      // โดย merge กับ initialState ก่อนเสมอ
      migrate: (persistedState) => {
        const state = (persistedState ?? initialState) as Partial<PersistedState>;
        return {
          ...initialState,
          ...state,
          player_status: {
            ...initialState.player_status,
            ...(state.player_status ?? {}),
          },
        } as PersistedState;
      },
    }
  )
);
