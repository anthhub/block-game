export const AUDIO_CONFIG = {
  MUSIC: {
    BASE_TRACK: {
      SRC: './audio/base.mp3',
      INITIAL_VOLUME: 0.5,
      MIN_VOLUME: 0.2,
      MAX_VOLUME: 0.8,
    },
    TENSION_TRACK: {
      SRC: './audio/tension.mp3',
      INITIAL_VOLUME: 0,
      MIN_VOLUME: 0,
      MAX_VOLUME: 0.7,
    },
    AMBIENT_TRACK: {
      SRC: './audio/ambient.mp3',
      INITIAL_VOLUME: 0.3,
      MIN_VOLUME: 0.1,
      MAX_VOLUME: 0.5,
    },
    ACTION_TRACK: {
      SRC: './audio/action.mp3',
      INITIAL_VOLUME: 0,
      MIN_VOLUME: 0,
      MAX_VOLUME: 0.6,
    },
  },
  SFX: {
    COLLISION: './audio/collision.flac',
    POWER_UP: './audio/powerup.mp3',
    BLOCK_CONFIRM: './audio/block_confirm.ogg',
    JUMP: './audio/jump.flac',
    GAME_OVER: './audio/game_over.wav',
    DEATH: './audio/death.wav',
    LEVEL_UP: './audio/level_up.wav',
    SCORE: './audio/score.mp3',
  },
};
