import Matter from 'matter-js';
import { GAME_CONFIG } from '../../config/constants';
import { PowerUpType } from '../types';

/**
 * 道具类
 * 表示游戏中的一个道具实例
 */
export class PowerUp {
  /** Matter.js 物理引擎中的刚体对象 */
  public body: Matter.Body;
  /** 道具类型 */
  public type: PowerUpType;
  /** 闪烁效果计时器 */
  private glowTimer: number = 0;
  /** 道具颜色 */
  private color: string;
  /** 下落速度 */
  private fallSpeed: number = 2;

  constructor(engine: Matter.Engine, type: PowerUpType) {
    this.type = type;
    
    // 根据道具类型设置颜色
    switch (type) {
      case PowerUpType.LowGravity:
        this.color = '#ffff00'; // 黄色
        break;
      case PowerUpType.SmallSize:
        this.color = '#00ffff'; // 青色
        break;
      case PowerUpType.Invincibility:
        this.color = '#ff00ff'; // 粉色
        break;
    }

    const bodyOptions: Matter.IBodyDefinition = {
      label: 'powerup',
      render: {
        fillStyle: this.color,
        opacity: 1
      },
      isSensor: true, // 设置为传感器，这样不会影响物理碰撞
      isStatic: false, // 改为非静态，这样可以下落
      frictionAir: 0.001, // 添加空气阻力
      // Use a custom property that won't conflict with Matter.js types
      plugin: {
        powerUpType: type
      }
    };

    // 创建一个圆形的道具
    this.body = Matter.Bodies.circle(
      Math.random() * (window.innerWidth - GAME_CONFIG.POWER_UPS.SIZE * 2) + GAME_CONFIG.POWER_UPS.SIZE,
      GAME_CONFIG.BLOCK.INITIAL_Y,
      GAME_CONFIG.POWER_UPS.SIZE,
      bodyOptions
    );

    Matter.Composite.add(engine.world, this.body);
  }

  /**
   * 更新道具状态
   */
  public update() {
    // 更新闪烁效果
    this.glowTimer += 0.1;
    const opacity = 0.5 + Math.sin(this.glowTimer) * 0.5;
    if (this.body.render) {
      this.body.render.opacity = opacity;
    }

    // 控制下落
    Matter.Body.setVelocity(this.body, {
      x: this.body.velocity.x,
      y: this.fallSpeed
    });
  }

  /**
   * 从物理世界中移除道具
   */
  public remove(engine: Matter.Engine) {
    Matter.Composite.remove(engine.world, this.body);
  }
}