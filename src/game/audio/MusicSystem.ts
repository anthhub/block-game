import { Howl } from 'howler';
import { AUDIO_CONFIG } from '../../config/audio';

/**
 * 音乐系统
 * 负责管理游戏背景音乐和音效，根据网络状态动态调整音乐
 */
export class MusicSystem {
  private baseTrack: Howl;
  private tensionTrack: Howl;
  private ambientTrack: Howl;
  private actionTrack: Howl;
  private currentTensionVolume: number = 0;
  private targetTensionVolume: number = 0;
  private currentActionVolume: number = 0;
  private targetActionVolume: number = 0;
  private transitionSpeed: number = 0.01;
  private isInitialized: boolean = false;

  // 预加载所有音效
  private sfx = {
    collision: new Howl({
      src: [AUDIO_CONFIG.SFX.COLLISION],
      volume: 0.3,
      preload: true
    }),
    powerUp: new Howl({
      src: [AUDIO_CONFIG.SFX.POWER_UP],
      volume: 0.4,
      preload: true
    }),
    blockConfirm: new Howl({
      src: [AUDIO_CONFIG.SFX.BLOCK_CONFIRM],
      volume: 0.3,
      preload: true
    }),
    jump: new Howl({
      src: [AUDIO_CONFIG.SFX.JUMP],
      volume: 0.4,
      preload: true
    }),
    gameOver: new Howl({
      src: [AUDIO_CONFIG.SFX.GAME_OVER],
      volume: 0.5,
      preload: true
    }),
    death: new Howl({
      src: [AUDIO_CONFIG.SFX.DEATH],
      volume: 0.4,
      preload: true
    }),
    levelUp: new Howl({
      src: [AUDIO_CONFIG.SFX.LEVEL_UP],
      volume: 0.5,
      preload: true
    }),
    score: new Howl({
      src: [AUDIO_CONFIG.SFX.SCORE],
      volume: 0.4,
      preload: true
    })
  };

  constructor() {
    // 基础音轨 - 平静的背景音乐
    this.baseTrack = new Howl({
      src: [AUDIO_CONFIG.MUSIC.BASE_TRACK.SRC],
      loop: true,
      volume: AUDIO_CONFIG.MUSIC.BASE_TRACK.INITIAL_VOLUME,
      html5: true,
      preload: true
    });

    // 紧张音轨 - 随着网络拥堵程度增强
    this.tensionTrack = new Howl({
      src: [AUDIO_CONFIG.MUSIC.TENSION_TRACK.SRC],
      loop: true,
      volume: AUDIO_CONFIG.MUSIC.TENSION_TRACK.INITIAL_VOLUME,
      html5: true,
      preload: true
    });

    // 环境音轨 - 提供氛围感
    this.ambientTrack = new Howl({
      src: [AUDIO_CONFIG.MUSIC.AMBIENT_TRACK.SRC],
      loop: true,
      volume: AUDIO_CONFIG.MUSIC.AMBIENT_TRACK.INITIAL_VOLUME,
      html5: true,
      preload: true
    });

    // 动作音轨 - 在特殊事件时增强
    this.actionTrack = new Howl({
      src: [AUDIO_CONFIG.MUSIC.ACTION_TRACK.SRC],
      loop: true,
      volume: AUDIO_CONFIG.MUSIC.ACTION_TRACK.INITIAL_VOLUME,
      html5: true,
      preload: true
    });

    // 开始预加载所有音频
    this.preloadAll();
  }

  private preloadAll(): void {
    const tracks = [
      this.baseTrack, 
      this.tensionTrack, 
      this.ambientTrack, 
      this.actionTrack,
      ...Object.values(this.sfx)
    ];
    let loadedCount = 0;

    tracks.forEach(track => {
      if (track.state() === 'loaded') {
        loadedCount++;
        if (loadedCount === tracks.length) {
          console.log('All audio files loaded');
        }
      } else {
        track.on('load', () => {
          loadedCount++;
          if (loadedCount === tracks.length) {
            console.log('All audio files loaded');
          }
        });
      }
    });
  }

  /**
   * 初始化音乐系统
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // 确保基础音轨已加载
    if (this.baseTrack.state() === 'loaded') {
      this.startMusic();
    } else {
      this.baseTrack.on('load', () => {
        this.startMusic();
      });
    }
  }

  private startMusic(): void {
    if (this.isInitialized) return;
    
    // 播放所有背景音轨
    this.baseTrack.play();
    this.tensionTrack.play();
    this.ambientTrack.play();
    this.actionTrack.play();
    
    // 设置初始音量
    this.baseTrack.volume(AUDIO_CONFIG.MUSIC.BASE_TRACK.INITIAL_VOLUME);
    this.tensionTrack.volume(AUDIO_CONFIG.MUSIC.TENSION_TRACK.INITIAL_VOLUME);
    this.ambientTrack.volume(AUDIO_CONFIG.MUSIC.AMBIENT_TRACK.INITIAL_VOLUME);
    this.actionTrack.volume(AUDIO_CONFIG.MUSIC.ACTION_TRACK.INITIAL_VOLUME);
    
    this.isInitialized = true;
    this.startVolumeTransition();
    
    console.log('Music started');
  }

  /**
   * 更新音乐状态
   * @param congestionLevel - 网络拥堵程度 (0-1)
   */
  public updateMusicState(congestionLevel: number): void {
    if (!this.isInitialized) return;

    // 调整基础音轨音量
    const baseVolume = AUDIO_CONFIG.MUSIC.BASE_TRACK.MAX_VOLUME - 
      (AUDIO_CONFIG.MUSIC.BASE_TRACK.MAX_VOLUME - AUDIO_CONFIG.MUSIC.BASE_TRACK.MIN_VOLUME) * congestionLevel;
    this.baseTrack.volume(baseVolume);

    // 设置目标紧张音轨音量
    this.targetTensionVolume = AUDIO_CONFIG.MUSIC.TENSION_TRACK.MIN_VOLUME + 
      (AUDIO_CONFIG.MUSIC.TENSION_TRACK.MAX_VOLUME - AUDIO_CONFIG.MUSIC.TENSION_TRACK.MIN_VOLUME) * congestionLevel;
  }

  /**
   * 增强动作音轨（用于特殊事件）
   */
  public enhanceActionTrack(): void {
    this.targetActionVolume = AUDIO_CONFIG.MUSIC.ACTION_TRACK.MAX_VOLUME;
    setTimeout(() => {
      this.targetActionVolume = AUDIO_CONFIG.MUSIC.ACTION_TRACK.MIN_VOLUME;
    }, 5000); // 5秒后淡出
  }

  /**
   * 启动音量过渡更新
   */
  private startVolumeTransition(): void {
    const updateVolume = () => {
      if (!this.isInitialized) return;

      // 平滑过渡到目标音量
      if (this.currentTensionVolume < this.targetTensionVolume) {
        this.currentTensionVolume = Math.min(
          this.currentTensionVolume + this.transitionSpeed,
          this.targetTensionVolume
        );
      } else if (this.currentTensionVolume > this.targetTensionVolume) {
        this.currentTensionVolume = Math.max(
          this.currentTensionVolume - this.transitionSpeed,
          this.targetTensionVolume
        );
      }

      // 更新动作音轨音量
      if (this.currentActionVolume < this.targetActionVolume) {
        this.currentActionVolume = Math.min(
          this.currentActionVolume + this.transitionSpeed,
          this.targetActionVolume
        );
      } else if (this.currentActionVolume > this.targetActionVolume) {
        this.currentActionVolume = Math.max(
          this.currentActionVolume - this.transitionSpeed,
          this.targetActionVolume
        );
      }

      this.tensionTrack.volume(this.currentTensionVolume);
      this.actionTrack.volume(this.currentActionVolume);
      requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  /**
   * 播放音效
   * @param soundName 音效名称
   */
  public playSound(soundName: 'collision' | 'powerUp' | 'blockConfirm' | 'jump' | 'gameOver' | 'death' | 'levelUp' | 'score') {
    const sound = this.sfx[soundName];
    if (sound) {
      sound.play();
    }
  }

  // 音效播放方法
  public playCollisionSound(): void {
    if (this.sfx.collision.state() === 'loaded') {
      this.sfx.collision.play();
    }
  }

  public playPowerUpSound(): void {
    if (this.sfx.powerUp.state() === 'loaded') {
      this.sfx.powerUp.play();
    }
  }

  public playBlockConfirmSound(): void {
    if (this.sfx.blockConfirm.state() === 'loaded') {
      this.sfx.blockConfirm.play();
    }
  }

  public playJumpSound(): void {
    if (this.sfx.jump.state() === 'loaded') {
      this.sfx.jump.play();
    }
  }

  public playGameOverSound(): void {
    if (this.sfx.gameOver.state() === 'loaded') {
      this.sfx.gameOver.play();
    }
  }

  public playDeathSound(): void {
    if (this.sfx.death.state() === 'loaded') {
      this.sfx.death.play();
    }
  }

  public playLevelUpSound(): void {
    if (this.sfx.levelUp.state() === 'loaded') {
      this.sfx.levelUp.play();
    }
  }

  public playScoreSound(): void {
    if (this.sfx.score.state() === 'loaded') {
      this.sfx.score.play();
    }
  }
}
