import { GAME_CONFIG } from '../../config/constants';

/**
 * 道具效果指示器
 * 显示当前激活的道具效果及其剩余时间
 */
export class PowerUpIndicator {
  private container: HTMLDivElement;
  private indicators: Map<string, HTMLDivElement> = new Map();

  constructor() {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '60px';
    this.container.style.right = '20px';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '10px';
    document.body.appendChild(this.container);
  }

  /**
   * 显示道具效果
   * @param type 道具类型
   * @param duration 持续时间
   */
  showEffect(type: string, duration: number) {
    let indicator = this.indicators.get(type);
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      indicator.style.color = '#fff';
      indicator.style.padding = '8px 12px';
      indicator.style.borderRadius = '4px';
      indicator.style.fontSize = '14px';
      this.container.appendChild(indicator);
      this.indicators.set(type, indicator);
    }

    const startTime = Date.now();
    const updateTimer = () => {
      const remaining = duration - (Date.now() - startTime);
      if (remaining <= 0) {
        indicator!.remove();
        this.indicators.delete(type);
        return;
      }

      indicator!.textContent = `${type}: ${(remaining / 1000).toFixed(1)}s`;
      requestAnimationFrame(updateTimer);
    };

    updateTimer();
  }

  /**
   * 清除所有指示器
   */
  clear() {
    this.indicators.forEach(indicator => indicator.remove());
    this.indicators.clear();
  }

  /**
   * 销毁指示器
   */
  destroy() {
    this.clear();
    this.container.remove();
  }
}
