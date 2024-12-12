import Matter from 'matter-js';
import { GAME_CONFIG } from '../../config/constants';
import { PowerUpType } from '../types';

export class PowerUp {
  public body: Matter.Body;
  public type: PowerUpType;

  constructor(engine: Matter.Engine, type: PowerUpType) {
    this.type = type;
    
    const bodyOptions: Matter.IBodyDefinition = {
      label: 'powerup',
      render: {
        fillStyle: '#ffff00'
      },
      // Use a custom property that won't conflict with Matter.js types
      plugin: {
        powerUpType: type
      }
    };

    this.body = Matter.Bodies.circle(
      Math.random() * window.innerWidth,
      GAME_CONFIG.BLOCK.INITIAL_Y,
      GAME_CONFIG.POWER_UPS.SIZE,
      bodyOptions
    );

    Matter.Composite.add(engine.world, this.body);
  }

  public remove(engine: Matter.Engine) {
    Matter.Composite.remove(engine.world, this.body);
  }
}