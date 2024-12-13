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
  private player: any; // player对象
  private musicSystem: any; // 音乐系统对象

  constructor(engine: Matter.Engine, powerUpIndicator: PowerUpIndicator, player: any, musicSystem: any) {
    this.engine = engine;
    this.powerUpIndicator = powerUpIndicator;
    this.player = player;
    this.musicSystem = musicSystem;
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
    // 如果当前道具数量已达到最大值，不再生成
    if (this.powerUps.length >= GAME_CONFIG.POWER_UPS.MAX_POWER_UPS) {
      return;
    }

    if (Math.random() < GAME_CONFIG.POWER_UPS.SPAWN_CHANCE) {
      // 随机选择一个道具类型
      const type = Math.floor(Math.random() * Object.keys(PowerUpType).length / 2) as PowerUpType;
      
      // 在屏幕上方随机位置生成道具
      const x = Math.random() * (window.innerWidth - 100) + 50; // 离边缘至少50像素
      const y = 50; // 固定在屏幕上方50像素处
      
      const powerUp = new PowerUp(this.engine, type);
      Matter.Body.setPosition(powerUp.body, { x, y });
      
      this.powerUps.push(powerUp);
    }
  }

  /**
   * 应用道具效果
   * @param type - 道具类型
   */
  public applyPowerUp(type: PowerUpType) {
    // 获取效果持续时间，根据道具类型获取对应的持续时间
    let durationKey: string;
    switch (type) {
      case PowerUpType.LowGravity:
        durationKey = 'LOW_GRAVITY';
        break;
      case PowerUpType.SmallSize:
        durationKey = 'SMALL_SIZE';
        break;
      case PowerUpType.Invincibility:
        durationKey = 'INVINCIBILITY';
        break;
    }
    const duration = GAME_CONFIG.POWER_UPS.DURATIONS[durationKey];

    // 添加到活跃效果列表
    this.activeEffects.push({
      type,
      expiresAt: Date.now() + duration
    });

    // 显示道具效果提示
    this.powerUpIndicator.showEffect(PowerUpType[type], duration);

    // 应用具体效果
    switch (type) {
      case PowerUpType.LowGravity:
        // 降低重力
        this.engine.gravity.y = GAME_CONFIG.PHYSICS.LOW_GRAVITY;
        break;
      case PowerUpType.SmallSize:
        // 缩小玩家
        Matter.Body.scale(this.player.body, 0.5, 0.5);
        break;
      case PowerUpType.Invincibility:
        // 设置无敌状态
        this.player.setInvincible(true);
        break;
    }

    // 播放道具音效
    this.musicSystem.playPowerUpSound();
  }

  /**
   * 获取当前所有道具
   */
  public getPowerUps(): PowerUp[] {
    return this.powerUps;
  }

  /**
   * 获取当前所有道具
   */
  public getPowerUpsList(): PowerUp[] {
    return this.powerUps;
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
      case PowerUpType.SmallSize:
        // 恢复正常大小
        Matter.Body.scale(this.player.body, 2, 2); // 因为之前缩小了0.5，所以现在要放大2倍
        break;
      case PowerUpType.Invincibility:
        // 关闭无敌状态
        this.player.setInvincible(false);
        break;
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