import { Howl } from 'howler';
import { AUDIO_CONFIG } from '../../config/audio';

/**
 * 音乐系统
 * 负责管理游戏背景音乐和音效，根据网络状态动态调整音乐
 */
export class MusicSystem {
  private baseTrack: Howl;
  private tensionTrack: Howl;
  private currentTensionVolume: number = 0;
  private targetTensionVolume: number = 0;
  private transitionSpeed: number = 0.01;
  private isInitialized: boolean = false;

  constructor() {
    // 基础音轨 - 平静的背景音乐
    this.baseTrack = new Howl({
      src: [AUDIO_CONFIG.MUSIC.BASE_TRACK.SRC],
      loop: true,
      volume: AUDIO_CONFIG.MUSIC.BASE_TRACK.INITIAL_VOLUME,
      html5: true
    });

    // 紧张音轨 - 随着网络拥堵程度增强
    this.tensionTrack = new Howl({
      src: [AUDIO_CONFIG.MUSIC.TENSION_TRACK.SRC],
      loop: true,
      volume: AUDIO_CONFIG.MUSIC.TENSION_TRACK.INITIAL_VOLUME,
      html5: true
    });
  }

  /**
   * 初始化音乐系统
   */
  public initialize(): void {
    if (this.isInitialized) return;
    
    this.baseTrack.play();
    this.tensionTrack.play();
    this.isInitialized = true;

    // 启动音量过渡更新
    this.startVolumeTransition();
  }

  /**
   * 更新音乐状态
   * @param congestionLevel - 网络拥堵程度 (0-1)
   */
  public updateMusicState(congestionLevel: number): void {
    // 调整基础音轨音量
    const baseVolume = AUDIO_CONFIG.MUSIC.BASE_TRACK.MAX_VOLUME - 
      (AUDIO_CONFIG.MUSIC.BASE_TRACK.MAX_VOLUME - AUDIO_CONFIG.MUSIC.BASE_TRACK.MIN_VOLUME) * congestionLevel;
    this.baseTrack.volume(baseVolume);

    // 设置目标紧张音轨音量
    this.targetTensionVolume = AUDIO_CONFIG.MUSIC.TENSION_TRACK.MIN_VOLUME + 
      (AUDIO_CONFIG.MUSIC.TENSION_TRACK.MAX_VOLUME - AUDIO_CONFIG.MUSIC.TENSION_TRACK.MIN_VOLUME) * congestionLevel;
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

      this.tensionTrack.volume(this.currentTensionVolume);
      requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  /**
   * 播放碰撞音效
   */
  public playCollisionSound(): void {
    new Howl({
      src: [AUDIO_CONFIG.SFX.COLLISION],
      volume: 0.3
    }).play();
  }

  /**
   * 播放道具音效
   */
  public playPowerUpSound(): void {
    new Howl({
      src: [AUDIO_CONFIG.SFX.POWER_UP],
      volume: 0.4
    }).play();
  }

  /**
   * 播放区块确认音效
   */
  public playBlockConfirmSound(): void {
    new Howl({
      src: [AUDIO_CONFIG.SFX.BLOCK_CONFIRM],
      volume: 0.3
    }).play();
  }
}
