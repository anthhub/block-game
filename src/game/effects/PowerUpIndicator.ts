import { GAME_CONFIG } from '../../config/constants';

interface IndicatorElement extends HTMLDivElement {
  timer?: number | NodeJS.Timeout;
}

/**
 * 道具效果指示器
 * 显示当前激活的道具效果及其剩余时间
 */
export class PowerUpIndicator {
  private container: HTMLDivElement;
  private indicators: Map<string, IndicatorElement> = new Map();

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
   * @param customText 自定义显示文本
   */
  showEffect(type: string, duration: number, customText?: string) {
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
      clearTimeout(indicator.timer);
    }

    // 根据道具类型显示不同的图标和文本
    let text = '';
    switch (type?.toUpperCase()) {
      case 'LOWGRAVITY':
      case 'LOW_GRAVITY':
        text = '低重力模式';
        break;
      case 'SMALLSIZE':
      case 'SMALL_SIZE':
        text = '缩小模式';
        break;
      case 'INVINCIBILITY':
        text = '无敌模式';
        break;
      case 'BLACKHOLEAVAILABLE':
      case 'BLACK_HOLE_AVAILABLE':
        text = customText || '黑洞效果已就绪';
        break;
      default:
        text = type;
    }

    indicator.textContent = text;

    // 如果有持续时间，设置倒计时
    if (duration > 0) {
      const startTime = Date.now();
      const updateTimer = () => {
        const remaining = duration - (Date.now() - startTime);
        if (remaining > 0) {
          indicator.textContent = `${text} (${Math.ceil(remaining / 1000)}s)`;
          requestAnimationFrame(updateTimer);
        } else {
          this.hideEffect(type);
        }
      };
      updateTimer();
    }
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

  /**
   * 隐藏道具效果
   * @param type 道具类型
   */
  hideEffect(type: string) {
    const indicator = this.indicators.get(type);
    if (indicator) {
      indicator.style.animation = 'fadeOut 0.3s ease-in-out';
      setTimeout(() => {
        indicator.remove();
        this.indicators.delete(type);
      }, 300);
    }
  }
}
