export const AUDIO_CONFIG = {
  MUSIC: {
    BASE_TRACK: {
      SRC: '/audio/base.mp3',
      INITIAL_VOLUME: 0.5,
      MIN_VOLUME: 0.2,
      MAX_VOLUME: 0.8
    },
    TENSION_TRACK: {
      SRC: '/audio/tension.mp3',
      INITIAL_VOLUME: 0,
      MIN_VOLUME: 0,
      MAX_VOLUME: 0.7
    }
  },
  SFX: {
    COLLISION: '/audio/collision.mp3',
    POWER_UP: '/audio/powerup.mp3',
    BLOCK_CONFIRM: '/audio/confirmation.mp3'
  }
};
