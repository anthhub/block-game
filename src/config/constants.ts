export const GAME_CONFIG = {
  PLAYER: {
    WIDTH: 30,
    HEIGHT: 30,
    JUMP_FORCE: -10,
    MOVE_SPEED: 5,
    INITIAL_LIVES: 3,
    COLOR: '#00ff00'
  },
  PHYSICS: {
    DEFAULT_GRAVITY: 0.5,
    LOW_GRAVITY: 0.2
  },
  POWER_UPS: {
    SIZE: 15,
    SPAWN_CHANCE: 0.001,
    DURATIONS: {
      LOW_GRAVITY: 5000,
      SMALL_SIZE: 3000,
      INVINCIBILITY: 2000
    }
  },
  BLOCK: {
    MIN_SIZE: 30,
    MAX_SIZE: 100,
    INITIAL_Y: -50,
    GAS_PRICE_THRESHOLDS: {
      HIGH: 100,
      MEDIUM: 50
    },
    COLORS: {
      HIGH_GAS: '#ff0000',
      MEDIUM_GAS: '#ff9900',
      LOW_GAS: '#0099ff'
    }
  }
};