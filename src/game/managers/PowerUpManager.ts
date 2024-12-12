import Matter from 'matter-js';
import { PowerUp } from '../entities/PowerUp';
import { PowerUpType, PowerUpEffect } from '../types';
import { GAME_CONFIG } from '../../config/constants';
import { isOutOfBounds } from '../../utils/physics';
import { PowerUpIndicator } from '../../components/PowerUpIndicator';

/**
 * 能力增强道具管理器
 * 负责道具的生成、应用和效果管理
 */
export class PowerUpManager {
  /** Matter.js 物理引擎实例 */
  private engine: Matter.Engine;
  /** 当前场景中的所有道具 */
  private powerUps: PowerUp[] = [];
  /** 当前生效的能力增强效果 */
  private activeEffects: PowerUpEffect[] = [];
  /** 道具状态指示器 */
  private powerUpIndicator: PowerUpIndicator;

  constructor(engine: Matter.Engine, powerUpIndicator: PowerUpIndicator) {
    this.engine = engine;
    this.powerUpIndicator = powerUpIndicator;
  }

  /**
   * 根据物理引擎中的刚体查找对应的道具
   * @param body - Matter.js 刚体对象
   * @returns 找到的道具对象，如果未找到则返回 undefined
   */
  public getPowerUpByBody(body: Matter.Body): PowerUp | undefined {
    return this.powerUps.find(p => p.body === body);
  }

  /**
   * 尝试生成新的道具
   * 根据配置的生成概率随机生成
   */
  public spawnPowerUp() {
    if (Math.random() < GAME_CONFIG.POWER_UPS.SPAWN_CHANCE) {
      // 随机选择一个道具类型
      const type = Math.floor(Math.random() * Object.keys(PowerUpType).length / 2) as PowerUpType;
      this.powerUps.push(new PowerUp(this.engine, type));
    }
  }

  /**
   * 应用道具效果
   * @param type - 道具类型
   */
  public applyPowerUp(type: PowerUpType) {
    // 获取效果持续时间
    const duration = GAME_CONFIG.POWER_UPS.DURATIONS[PowerUpType[type].toUpperCase()];
    // 添加到活跃效果列表
    this.activeEffects.push({
      type,
      expiresAt: Date.now() + duration
    });

    // 显示道具效果提示
    this.powerUpIndicator.show(PowerUpType[type], duration);

    // 应用具体效果
    switch (type) {
      case PowerUpType.LowGravity:
        // 降低重力
        this.engine.gravity.y = GAME_CONFIG.PHYSICS.LOW_GRAVITY;
        break;
      case PowerUpType.SmallSize:
        // TODO: 实现缩小效果
        break;
      case PowerUpType.Invincibility:
        // TODO: 实现无敌效果
        break;
    }
  }

  /**
   * 更新道具系统
   * - 更新效果状态
   * - 清理失效道具
   * - 生成新道具
   */
  public update() {
    this.updateEffects();
    this.cleanupPowerUps();
    this.spawnPowerUp();
  }

  /**
   * 更新所有活跃效果
   * 移除已过期的效果
   */
  private updateEffects() {
    const now = Date.now();
    this.activeEffects = this.activeEffects.filter(effect => {
      if (now > effect.expiresAt) {
        this.removeEffect(effect.type);
        return false;
      }
      return true;
    });
  }

  /**
   * 清理超出屏幕的道具
   */
  private cleanupPowerUps() {
    this.powerUps = this.powerUps.filter(powerUp => {
      if (isOutOfBounds(powerUp.body, window.innerHeight)) {
        powerUp.remove(this.engine);
        return false;
      }
      return true;
    });
  }

  /**
   * 移除特定类型的效果
   * @param type - 要移除的效果类型
   */
  private removeEffect(type: PowerUpType) {
    switch (type) {
      case PowerUpType.LowGravity:
        // 恢复正常重力
        this.engine.gravity.y = GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY;
        break;
      // TODO: 处理其他效果的移除
    }
  }

  /**
   * 清理所有道具和效果
   */
  public cleanup() {
    this.powerUps.forEach(powerUp => powerUp.remove(this.engine));
    this.powerUps = [];
    this.activeEffects = [];
  }
}