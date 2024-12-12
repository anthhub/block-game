import Matter from 'matter-js';
import { Player } from './entities/Player';
import { BlockManager } from './managers/BlockManager';
import { PowerUpManager } from './managers/PowerUpManager';
import { GameState } from '../store/gameStore';
import { HUD } from '../components/HUD';
import { ParticleSystem } from '../components/ParticleSystem';
import { PowerUpIndicator } from '../components/PowerUpIndicator';
import { createPhysicsEngine, createRenderer } from '../utils/physics';
import { GAME_CONFIG } from '../config/constants';

export class Engine {
  private engine: Matter.Engine;
  private render: Matter.Render;
  private runner: Matter.Runner;
  private player: Player;
  private blockManager: BlockManager;
  private powerUpManager: PowerUpManager;
  private gameState: GameState;
  private hud: HUD;
  private particleSystem: ParticleSystem;
  private powerUpIndicator: PowerUpIndicator;
  private isGameOver: boolean = false;

  constructor(gameState: GameState, hud: HUD) {
    this.gameState = gameState;
    this.hud = hud;
    
    this.engine = createPhysicsEngine();
    this.engine.gravity.y = GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY;

    this.render = createRenderer(
      this.engine,
      document.getElementById('game-container')!,
      document.getElementById('game-canvas') as HTMLCanvasElement
    );

    this.particleSystem = new ParticleSystem(this.engine);
    this.powerUpIndicator = new PowerUpIndicator();
    
    this.player = new Player(this.engine);
    this.blockManager = new BlockManager(this.engine);
    this.powerUpManager = new PowerUpManager(this.engine, this.powerUpIndicator);
    
    this.runner = Matter.Runner.create();
    
    this.setupCollisions();
    this.start();
  }

  private setupCollisions() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const playerBody = this.player.body;
        
        if (bodyA === playerBody || bodyB === playerBody) {
          const otherBody = bodyA === playerBody ? bodyB : bodyA;
          
          if (otherBody.label === 'block') {
            this.gameState.decrementLives();
            this.hud.updateLives(this.gameState.lives);
            this.particleSystem.createExplosion(
              otherBody.position.x,
              otherBody.position.y,
              (otherBody.render as any).fillStyle
            );
          } else if (otherBody.label === 'powerup') {
            const powerUp = this.powerUpManager.getPowerUpByBody(otherBody);
            if (powerUp) {
              this.powerUpManager.applyPowerUp(powerUp.type);
              this.particleSystem.createExplosion(
                otherBody.position.x,
                otherBody.position.y,
                '#ffff00'
              );
            }
          }
        }
      });
    });
  }

  public start() {
    Matter.Render.run(this.render);
    Matter.Runner.run(this.runner, this.engine);
  }

  public update() {
    if (this.isGameOver) return;

    this.gameState.incrementScore();
    this.hud.updateScore(this.gameState.score);
    
    this.player.update();
    this.blockManager.update();
    this.powerUpManager.update();
    
    if (this.gameState.lives <= 0) {
      this.gameOver();
    }
  }

  private gameOver() {
    this.isGameOver = true;
    Matter.Runner.stop(this.runner);
    this.cleanup();
    this.hud.showGameOver(this.gameState.score);
  }

  private cleanup() {
    this.blockManager.cleanup();
    this.powerUpManager.cleanup();
  }
}