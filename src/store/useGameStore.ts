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
}

export interface ChatLog {
  role: 'player' | 'gm';
  content: string;
}

export type WorldTone = 'hardcore' | 'balanced' | 'story' | 'sandbox';

export interface WorldConfig {
  language: string;
  genre: string;
  tone: WorldTone;
  character: string;
  customWorld: string;
  openingSeed: string;
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

  // Actions
  setGameState: (newState: Partial<GameState>) => void;
  resetGame: () => void;
}

const initialState = {
  narrative: '',
  story_summary: '',
  player_status: {
    hp: 0, max_hp: 0, mana: 0, max_mana: 0, inventory: [], status_effects: []
  },
  is_dead: false,
  game_phase: 'Menu' as const,
  current_language: 'Pending',
  history: [],
  current_image_prompt: '',
  suggested_actions: [],
  current_objective: '',
  world_config: null,
};

// 2. สร้าง Store พร้อมระบบเซฟลง LocalStorage
export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...initialState,
      setGameState: (newState) => set((state) => ({ ...state, ...newState })),
      resetGame: () => set(initialState),
    }),
    { name: 'ai-realm-save' }
  )
);
