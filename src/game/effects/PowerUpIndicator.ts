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
    this.container.style.zIndex = '1000';
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
      indicator.style.display = 'flex';
      indicator.style.alignItems = 'center';
      indicator.style.gap = '8px';
      indicator.style.animation = 'fadeIn 0.3s ease-in-out';
      this.container.appendChild(indicator);
      this.indicators.set(type, indicator);
    }

    // 清除之前的定时器（如果存在）
    if (indicator.timer) {
      clearInterval(indicator.timer);
    }

    const startTime = Date.now();
    const updateTimer = () => {
      const remaining = Math.max(0, duration - (Date.now() - startTime));
      
      if (remaining <= 0) {
        indicator!.style.animation = 'fadeOut 0.3s ease-in-out';
        setTimeout(() => {
          indicator!.remove();
          this.indicators.delete(type);
        }, 300);
        clearInterval(indicator.timer);
        return;
      }

      // 添加图标和中文说明
      let icon = '';
      let name = '';
      switch (type) {
        case 'LowGravity':
          icon = '🪶';
          name = '低重力';
          break;
        case 'SmallSize':
          icon = '🔍';
          name = '缩小';
          break;
        case 'Invincibility':
          icon = '⭐';
          name = '无敌';
          break;
      }

      const seconds = (remaining / 1000).toFixed(1);
      indicator!.innerHTML = `${icon} ${name}: ${seconds}秒`;
    };

    // 立即更新一次
    updateTimer();
    
    // 每100ms更新一次
    indicator.timer = setInterval(updateTimer, 100);
  }

  /**
   * 清除所有指示器
   */
  clear() {
    this.indicators.forEach(indicator => {
      if (indicator.timer) {
        clearInterval(indicator.timer);
      }
      indicator.remove();
    });
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
