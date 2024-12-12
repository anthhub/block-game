import { create } from 'zustand';

export interface GameState {
  score: number;
  lives: number;
  highScore: number;
  incrementScore: () => void;
  decrementLives: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  lives: 3,
  highScore: 0,
  incrementScore: () => set((state) => ({ score: state.score + 1 })),
  decrementLives: () => set((state) => ({ lives: state.lives - 1 })),
  resetGame: () => set({ score: 0, lives: 3 })
}));