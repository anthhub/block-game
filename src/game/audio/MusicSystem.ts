import { Howl } from 'howler';

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
      src: ['/audio/base.mp3'],
      loop: true,
      volume: 0.5,
      html5: true
    });

    // 紧张音轨 - 随着网络拥堵程度增强
    this.tensionTrack = new Howl({
      src: ['/audio/tension.mp3'],
      loop: true,
      volume: 0,
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
    // 根据拥堵程度设置目标音量
    this.targetTensionVolume = Math.min(0.8, congestionLevel);
    
    // 调整基础音轨的音量和速度
    const baseVolume = Math.max(0.3, 1 - congestionLevel * 0.5);
    const basePlaybackRate = 1 + congestionLevel * 0.2; // 最多加速20%
    
    this.baseTrack.volume(baseVolume);
    this.baseTrack.rate(basePlaybackRate);
    this.tensionTrack.rate(basePlaybackRate);
  }

  /**
   * 启动音量渐变更新
   */
  private startVolumeTransition(): void {
    const updateVolume = () => {
      if (this.currentTensionVolume !== this.targetTensionVolume) {
        // 平滑过渡到目标音量
        const diff = this.targetTensionVolume - this.currentTensionVolume;
        this.currentTensionVolume += Math.sign(diff) * Math.min(Math.abs(diff), this.transitionSpeed);
        this.tensionTrack.volume(this.currentTensionVolume);
      }
      requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  /**
   * 播放一次性音效
   * @param type - 音效类型
   */
  public playSound(type: 'collision' | 'powerup' | 'confirmation'): void {
    const sound = new Howl({
      src: [`/audio/${type}.mp3`],
      volume: 0.4
    });
    sound.play();
  }

  /**
   * 停止所有音乐
   */
  public stop(): void {
    this.baseTrack.stop();
    this.tensionTrack.stop();
    this.isInitialized = false;
  }
}
