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

/**
 * 游戏主引擎类
 * 负责协调游戏的各个组件，处理物理系统和游戏循环
 */
export class Engine {
  /** Matter.js 物理引擎实例 */
  private engine: Matter.Engine;
  /** Matter.js 渲染器实例 */
  private render: Matter.Render;
  /** Matter.js 运行器实例 */
  private runner: Matter.Runner;
  /** 玩家实例 */
  private player: Player;
  /** 方块管理器 */
  private blockManager: BlockManager;
  /** 能力增强道具管理器 */
  private powerUpManager: PowerUpManager;
  /** 游戏状态管理器 */
  private gameState: GameState;
  /** HUD 显示器 */
  private hud: HUD;
  /** 粒子系统 */
  private particleSystem: ParticleSystem;
  /** 能力增强状态指示器 */
  private powerUpIndicator: PowerUpIndicator;
  /** 游戏是否结束 */
  private isGameOver: boolean = false;

  /**
   * 创建游戏引擎实例
   * @param gameState - 游戏状态管理器
   * @param hud - HUD 显示器
   */
  constructor(gameState: GameState, hud: HUD) {
    this.gameState = gameState;
    this.hud = hud;
    
    // 创建物理引擎并设置重力
    this.engine = createPhysicsEngine();
    this.engine.gravity.y = GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY;

    // 创建渲染器
    this.render = createRenderer(
      this.engine,
      document.getElementById('game-container')!,
      document.getElementById('game-canvas') as HTMLCanvasElement
    );

    // 创建游戏组件
    this.particleSystem = new ParticleSystem(this.engine);
    this.powerUpIndicator = new PowerUpIndicator();
    this.player = new Player(this.engine);
    this.blockManager = new BlockManager(this.engine);
    this.powerUpManager = new PowerUpManager(this.engine, this.powerUpIndicator);
    
    // 创建地面
    this.createGround();
    
    // 创建物理引擎运行器
    this.runner = Matter.Runner.create();
    
    // 设置碰撞检测和开始游戏
    this.setupCollisions();
    this.start();
  }

  /**
   * 创建地面
   */
  private createGround() {
    const ground = Matter.Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight,
      window.innerWidth,
      20,
      {
        isStatic: true,
        label: 'ground',
        render: {
          fillStyle: '#666666'
        }
      }
    );
    Matter.World.add(this.engine.world, ground);
  }

  /**
   * 设置碰撞检测
   * 处理玩家与方块、道具的碰撞事件
   */
  private setupCollisions() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        const playerBody = this.player.body;
        
        // 检查是否涉及玩家的碰撞
        if (bodyA === playerBody || bodyB === playerBody) {
          const otherBody = bodyA === playerBody ? bodyB : bodyA;
          
          // 处理与方块的碰撞
          if (otherBody.label === 'block') {
            // 减少生命值并更新显示
            this.gameState.decrementLives();
            this.hud.updateLives(this.gameState.lives);
            // 创建碰撞粒子效果
            this.particleSystem.createExplosion(
              otherBody.position.x,
              otherBody.position.y,
              (otherBody.render as any).fillStyle
            );
            if (this.gameState.lives <= 0) {
              this.gameOver();
            }
          } 
          // 处理与道具的碰撞
          else if (otherBody.label === 'powerup') {
            const powerUp = this.powerUpManager.getPowerUpByBody(otherBody);
            if (powerUp) {
              // 应用道具效果并创建粒子效果
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

  /**
   * 启动游戏
   * 开始物理引擎和渲染循环
   */
  public start() {
    Matter.Render.run(this.render);
    Matter.Runner.run(this.runner, this.engine);
  }

  /**
   * 更新游戏状态
   * 在每一帧调用，处理游戏逻辑
   */
  public update() {
    if (this.isGameOver) return;

    // 增加分数并更新显示
    this.gameState.incrementScore();
    this.hud.updateScore(this.gameState.score);
    
    // 更新游戏组件
    this.player.update();
    this.blockManager.update();
    this.powerUpManager.update();
  }

  /**
   * 处理游戏结束
   */
  public gameOver() {
    this.isGameOver = true;
    this.hud.showGameOver(this.gameState.score);
    this.cleanup();
  }

  /**
   * 清理游戏资源
   */
  public cleanup() {
    Matter.Runner.stop(this.runner);
    Matter.Render.stop(this.render);
    Matter.Engine.clear(this.engine);
    this.blockManager.cleanup();
    this.powerUpManager.cleanup();
  }
}