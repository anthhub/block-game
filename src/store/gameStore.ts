import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameState {
  score: number;
  lives: number;
  highScore: number;
  isGameOver: boolean;
  incrementScore: () => void;
  decrementLives: () => void;
  resetGame: () => void;
  setGameOver: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      score: 0,
      lives: 2,
      highScore: 0,
      isGameOver: false,
      incrementScore: () => set((state) => {
        if (state.isGameOver) return state;
        const newScore = state.score + 1;
        return {
          score: newScore,
          highScore: newScore > state.highScore ? newScore : state.highScore,
        };
      }),
      decrementLives: () => set((state) => {
        if (state.isGameOver) return state;
        const newLives = Math.max(0, state.lives - 1);
        return {
          lives: newLives,
          isGameOver: newLives === 0,
        };
      }),
      resetGame: () => set((state) => ({
        score: 0,
        lives: 2,
        isGameOver: false,
        highScore: state.highScore,
      })),
      setGameOver: () => set({ isGameOver: true }),
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({ highScore: state.highScore }),
    }
  )
);
