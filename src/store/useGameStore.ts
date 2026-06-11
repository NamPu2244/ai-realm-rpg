import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export type WorldTone = 'hardcore' | 'balanced' | 'story' | 'sandbox';

export type AiProvider = 'ollama' | 'groq';

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

interface GameState {
  narrative: string;
  story_summary: string;
  player_status: PlayerStatus;
  is_dead: boolean;
  game_phase: 'Menu' | 'Playing';
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

  // Actions
  setGameState: (newState: Partial<GameState>) => void;
  resetGame: () => void;
}

const initialState = {
  narrative: '',
  story_summary: '',
  player_status: {
    hp: 0, max_hp: 0, mana: 0, max_mana: 0, inventory: [], status_effects: [],
    level: 1, exp: 0, skills: []
  },
  is_dead: false,
  game_phase: 'Menu' as const,
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
};

// 2. สร้าง Store พร้อมระบบเซฟลง LocalStorage
export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...initialState,
      setGameState: (newState) => set((state) => ({ ...state, ...newState })),
      resetGame: () => set(initialState),
    }),
    {
      name: 'ai-realm-save',
      // version ของ schema สำหรับ localStorage เพิ่มเลขนี้เมื่อมีการเปลี่ยนโครงสร้าง
      // GameState/PlayerStatus แบบ breaking change แล้วเขียน migration ใน `migrate` ด้านล่าง
      version: 1,
      // กัน save เก่าที่ field ใน player_status (หรือ field บนสุด) ขาดหายไปหลังแก้ schema
      // โดย merge กับ initialState ก่อนเสมอ
      migrate: (persistedState) => {
        const state = (persistedState ?? initialState) as Partial<GameState>;
        return {
          ...initialState,
          ...state,
          player_status: {
            ...initialState.player_status,
            ...(state.player_status ?? {}),
          },
        };
      },
    }
  )
);
