import Matter from 'matter-js';
import { PowerUp } from '../entities/PowerUp';
import { PowerUpType, PowerUpEffect } from '../types';
import { GAME_CONFIG } from '../../config/constants';
import { isOutOfBounds } from '../../utils/physics';
import { PowerUpIndicator } from '../../components/PowerUpIndicator';

export class PowerUpManager {
  private engine: Matter.Engine;
  private powerUps: PowerUp[] = [];
  private activeEffects: PowerUpEffect[] = [];
  private powerUpIndicator: PowerUpIndicator;

  constructor(engine: Matter.Engine, powerUpIndicator: PowerUpIndicator) {
    this.engine = engine;
    this.powerUpIndicator = powerUpIndicator;
  }

  public getPowerUpByBody(body: Matter.Body): PowerUp | undefined {
    return this.powerUps.find(p => p.body === body);
  }

  public spawnPowerUp() {
    if (Math.random() < GAME_CONFIG.POWER_UPS.SPAWN_CHANCE) {
      const type = Math.floor(Math.random() * Object.keys(PowerUpType).length / 2) as PowerUpType;
      this.powerUps.push(new PowerUp(this.engine, type));
    }
  }

  public applyPowerUp(type: PowerUpType) {
    const duration = GAME_CONFIG.POWER_UPS.DURATIONS[PowerUpType[type].toUpperCase()];
    this.activeEffects.push({
      type,
      expiresAt: Date.now() + duration
    });

    this.powerUpIndicator.show(PowerUpType[type], duration);

    switch (type) {
      case PowerUpType.LowGravity:
        this.engine.gravity.y = GAME_CONFIG.PHYSICS.LOW_GRAVITY;
        break;
      case PowerUpType.SmallSize:
        // Implement size reduction
        break;
      case PowerUpType.Invincibility:
        // Implement invincibility
        break;
    }
  }

  public update() {
    this.updateEffects();
    this.cleanupPowerUps();
    this.spawnPowerUp();
  }

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

  private cleanupPowerUps() {
    this.powerUps = this.powerUps.filter(powerUp => {
      if (isOutOfBounds(powerUp.body, window.innerHeight)) {
        powerUp.remove(this.engine);
        return false;
      }
      return true;
    });
  }

  private removeEffect(type: PowerUpType) {
    switch (type) {
      case PowerUpType.LowGravity:
        this.engine.gravity.y = GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY;
        break;
      // Handle other effect removals
    }
  }

  public cleanup() {
    this.powerUps.forEach(powerUp => powerUp.remove(this.engine));
    this.powerUps = [];
    this.activeEffects = [];
  }
}