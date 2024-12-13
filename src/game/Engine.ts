import Matter from 'matter-js';
import { Player } from './entities/Player';
import { BlockManager } from './managers/BlockManager';
import { PowerUpManager } from './managers/PowerUpManager';
import { GameState } from '../store/gameStore';
import { ParticleSystem } from './effects/ParticleSystem';
import { PowerUpIndicator } from './effects/PowerUpIndicator';
import { HUD } from '../components/HUD';
import { MusicSystem } from './audio/MusicSystem';
import { GAME_CONFIG } from '../config/constants';
import { createPhysicsEngine, createRenderer } from '../utils/physics';

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
  /** 音乐系统 */
  private musicSystem: MusicSystem;

  /**
   * 创建游戏引擎实例
   * @param gameState - 游戏状态管理器
   * @param hud - HUD 显示器
   */
  constructor(gameState: GameState, hud: HUD) {
    this.gameState = gameState;
    this.hud = hud;
    this.musicSystem = new MusicSystem();
    
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

    // 监听网络状态变化
    this.blockManager.setNetworkStateChangeCallback(this.onNetworkStateChange.bind(this));

    // 添加测试按钮
    this.addTestButton();

    // 创建交易信息提示框
    this.createTooltip();

    // 创建地面
    this.createGround();
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 创建物理引擎运行器
    this.runner = Matter.Runner.create();
    
    // 设置碰撞检测和开始游戏
    this.setupCollisions();

    // 添加音乐初始化按钮
    this.addMusicButton();

    // 启动游戏
    Matter.Runner.run(this.runner, this.engine);
    Matter.Render.run(this.render);
  }

  /**
   * 添加音乐控制按钮
   */
  private addMusicButton(): void {
    const button = document.createElement('button');
    button.textContent = '开始音乐';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '150px';
    button.style.zIndex = '1000';
    button.style.padding = '8px 16px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', () => {
      this.musicSystem.initialize();
      button.style.display = 'none';
    });

    document.body.appendChild(button);
  }

  /**
   * 处理网络状态变化
   */
  private onNetworkStateChange(state: { gasPrice: number, pendingTxCount: number, congestionLevel: number }) {
    // 更新音乐状态
    this.musicSystem.updateMusicState(state.congestionLevel);

    // 根据拥堵程度调整背景颜色
    const container = document.getElementById('game-container')!;
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    
    // 计算背景颜色
    const r = Math.floor(30 + state.congestionLevel * 20); // 红色分量随拥堵程度增加
    const g = Math.floor(30 + (1 - state.congestionLevel) * 20); // 绿色分量随拥堵程度减少
    const b = 40; // 保持蓝色分量稳定
    const a = 0.95; // 透明度

    // 设置渐变背景
    container.style.background = `
      radial-gradient(
        circle at 50% 50%,
        rgba(${r + 10}, ${g + 10}, ${b + 10}, ${a}),
        rgba(${r}, ${g}, ${b}, ${a})
      )
    `;

    // 更新渲染器背景色
    if (this.render.options.background) {
      this.render.options.background = `rgb(${r}, ${g}, ${b})`;
    }

    // 更新地面颜色
    const ground = this.engine.world.bodies.find(body => body.label === 'ground');
    if (ground && ground.render) {
      ground.render.fillStyle = `rgb(${r + 20}, ${g + 20}, ${b + 20})`;
    }

    // 更新HUD显示
    this.hud.updateNetworkStatus({
      gasPrice: state.gasPrice,
      pendingTxCount: state.pendingTxCount,
      congestionLevel: state.congestionLevel
    });
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
            // 播放碰撞音效
            this.musicSystem.playCollisionSound();
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
              // 播放能量道具音效
              this.musicSystem.playPowerUpSound();
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
    
    // 每100分播放一次区块确认音效
    if (this.gameState.score % 100 === 0) {
      this.musicSystem.playBlockConfirmSound();
    }
    
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
    this.musicSystem.stop();
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

  /**
   * 添加测试按钮
   */
  private addTestButton(): void {
    const button = document.createElement('button');
    button.textContent = '测试区块确认';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = '1000';
    button.style.padding = '8px 16px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    
    button.addEventListener('click', () => {
      this.blockManager.confirmLatestBlock();
    });

    document.body.appendChild(button);
  }

  /**
   * 创建交易信息提示框
   */
  private createTooltip(): void {
    const tooltip = document.createElement('div');
    tooltip.id = 'tx-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      display: none;
      background: linear-gradient(to bottom right, rgba(33, 33, 33, 0.95), rgba(25, 25, 25, 0.95));
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      max-width: 400px;
      min-width: 300px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: opacity 0.2s ease-out;
    `;

    // 添加CSS动画
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-left-color: currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        display: inline-block;
        vertical-align: middle;
        margin-right: 8px;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(tooltip);
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    const canvas = this.render.canvas;
    const tooltip = document.getElementById('tx-tooltip')!;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      const hoveredBlock = this.blockManager.getBlockAtPosition(mousePosition);
      
      if (hoveredBlock) {
        const { confirmations } = this.blockManager.getBlockConfirmationProgress(hoveredBlock);
        const details = hoveredBlock.getTransactionDetails(confirmations);
        
        const progressColor = confirmations === 0 ? '#FFA726' : 
                            confirmations < 3 ? '#29B6F6' : 
                            '#4CAF50';
        
        tooltip.innerHTML = `
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 600; color: white;">Transaction Details</div>
            <div style="display: flex; align-items: center; color: ${progressColor}; font-size: 12px; font-weight: 500;">
              ${confirmations < 3 ? '<div class="loading-spinner" style="border-left-color: ' + progressColor + '"></div>' : ''}
              ${confirmations} of 3 confirmations
            </div>
          </div>

          <div style="display: grid; gap: 12px;">
            <div>
              <div style="color: #9E9E9E; font-size: 12px; margin-bottom: 4px;">Value</div>
              <div style="font-weight: 500;">${details.value} ETH</div>
            </div>
            
            <div>
              <div style="color: #9E9E9E; font-size: 12px; margin-bottom: 4px;">From</div>
              <div style="font-family: monospace; word-break: break-all; opacity: 0.9;">${details.from}</div>
            </div>
            
            <div>
              <div style="color: #9E9E9E; font-size: 12px; margin-bottom: 4px;">To</div>
              <div style="font-family: monospace; word-break: break-all; opacity: 0.9;">${details.to}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <div style="color: #9E9E9E; font-size: 12px; margin-bottom: 4px;">Gas Price</div>
                <div>${details.gasPrice} Gwei</div>
              </div>
              <div>
                <div style="color: #9E9E9E; font-size: 12px; margin-bottom: 4px;">Gas Limit</div>
                <div>${details.gasLimit}</div>
              </div>
            </div>

            <div>
              <div style="color: #9E9E9E; font-size: 12px; margin-bottom: 4px;">Transaction Hash</div>
              <div style="font-family: monospace; word-break: break-all; opacity: 0.9; font-size: 12px;">${details.hash}</div>
            </div>
          `;
        
        // 设置提示框位置
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX + 16}px`;
        tooltip.style.top = `${e.clientY + 16}px`;

        // 确保提示框不会超出屏幕
        const tooltipRect = tooltip.getBoundingClientRect();
        if (tooltipRect.right > window.innerWidth) {
          tooltip.style.left = `${e.clientX - tooltipRect.width - 16}px`;
        }
        if (tooltipRect.bottom > window.innerHeight) {
          tooltip.style.top = `${e.clientY - tooltipRect.height - 16}px`;
        }
      } else {
        tooltip.style.display = 'none';
      }
    });

    // 当鼠标离开画布时隐藏提示框
    canvas.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  }

  /**
   * 创建地面
   */
  private createGround(): void {
    const ground = Matter.Bodies.rectangle(
      GAME_CONFIG.CANVAS.WIDTH / 2,
      GAME_CONFIG.CANVAS.HEIGHT - 10,
      GAME_CONFIG.CANVAS.WIDTH,
      20,
      { isStatic: true }
    );
    Matter.Composite.add(this.engine.world, ground);
  }
}