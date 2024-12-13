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
    
    // 初始化音乐系统
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

    // 启动游戏
    Matter.Runner.run(this.runner, this.engine);
    Matter.Render.run(this.render);

    // 等待一小段时间后开始音乐，确保所有资源都加载完成
    setTimeout(() => {
      this.musicSystem.initialize();
    }, 1000);
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
      padding: 14px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      max-width: 320px;
      width: 100%;
      box-shadow: 0 8px 16px -1px rgba(0, 0, 0, 0.2);
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
      .block-explorer-link {
        display: inline-flex;
        align-items: center;
        padding: 8px 12px;
        margin-top: 12px;
        background: rgba(41, 182, 246, 0.1);
        color: #29B6F6;
        text-decoration: none;
        border-radius: 6px;
        font-size: 12px;
        transition: all 0.2s ease;
      }
      .block-explorer-link:hover {
        background: rgba(41, 182, 246, 0.2);
      }
      .block-explorer-link svg {
        width: 14px;
        height: 14px;
        margin-right: 6px;
      }
      #tx-tooltip {
        max-width: 320px;
        width: 100%;
        padding: 14px;
        background: #1E1E1E;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        position: fixed;
        z-index: 1000;
        display: none;
        font-size: 13px;
        color: #E0E0E0;
      }
      #tx-tooltip.pinned {
        right: 24px;
        top: 24px;
        left: auto !important;
      }
      .tooltip-close {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #9E9E9E;
        border-radius: 50%;
        transition: all 0.2s ease;
        z-index: 1;
      }
      .tooltip-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }
      .tooltip-close svg {
        width: 16px;
        height: 16px;
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
    let pinnedBlock: Matter.Body | null = null;

    const closeTooltip = () => {
      if (pinnedBlock) {
        // 恢复区块的原始渲染样式
        const block = this.blockManager.getBlockByBody(pinnedBlock);
        if (block) {
          block.body.render.strokeStyle = 'transparent';
          block.body.render.lineWidth = 0;
        }
      }
      tooltip.style.display = 'none';
      tooltip.classList.remove('pinned');
      pinnedBlock = null;
    };

    // 高亮显示区块
    const highlightBlock = (block: any) => {
      block.body.render.strokeStyle = '#29B6F6';
      block.body.render.lineWidth = 2;
    };

    // 添加关闭按钮到tooltip
    const closeButton = document.createElement('div');
    closeButton.className = 'tooltip-close';
    closeButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    `;
    
    // 点击关闭按钮事件
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      closeTooltip();
    });

    // 点击页面其他地方关闭tooltip
    document.addEventListener('click', (e) => {
      const clickedElement = e.target as HTMLElement;
      if (!tooltip.contains(clickedElement) && tooltip.classList.contains('pinned')) {
        closeTooltip();
      }
    });

    // 阻止tooltip内部点击事件冒泡
    tooltip.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      const hoveredBlock = this.blockManager.getBlockAtPosition(mousePosition);
      
      if (hoveredBlock) {
        // 如果之前有其他高亮的区块，先恢复其样式
        if (pinnedBlock) {
          const oldBlock = this.blockManager.getBlockByBody(pinnedBlock);
          if (oldBlock) {
            oldBlock.body.render.strokeStyle = 'transparent';
            oldBlock.body.render.lineWidth = 0;
          }
        }
        
        pinnedBlock = hoveredBlock.body;
        highlightBlock(hoveredBlock);
        this.updateTooltip(hoveredBlock, e);
        tooltip.classList.add('pinned');
        e.stopPropagation();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (tooltip.classList.contains('pinned')) return;

      const rect = canvas.getBoundingClientRect();
      const mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };

      const hoveredBlock = this.blockManager.getBlockAtPosition(mousePosition);
      
      if (hoveredBlock) {
        this.updateTooltip(hoveredBlock, e);
        // 只在悬停时添加较浅的边框
        if (!pinnedBlock || pinnedBlock !== hoveredBlock.body) {
          hoveredBlock.body.render.strokeStyle = 'rgba(41, 182, 246, 0.3)';
          hoveredBlock.body.render.lineWidth = 1;
        }
      } else {
        tooltip.style.display = 'none';
        // 恢复所有非固定区块的样式
        this.blockManager.blocks.forEach(block => {
          if (block.body !== pinnedBlock) {
            block.body.render.strokeStyle = 'transparent';
            block.body.render.lineWidth = 0;
          }
        });
      }
    });

    // 当鼠标离开画布时隐藏提示框（仅当未锚定时）
    canvas.addEventListener('mouseleave', () => {
      if (!tooltip.classList.contains('pinned')) {
        tooltip.style.display = 'none';
      }
    });

    // 更新tooltip内容的函数
    this.updateTooltip = (block: any, e: MouseEvent) => {
      const { confirmations } = this.blockManager.getBlockConfirmationProgress(block);
      const details = block.getTransactionDetails(confirmations);
      
      const progressColor = confirmations === 0 ? '#FFA726' : 
                          confirmations < 3 ? '#29B6F6' : 
                          '#4CAF50';
      
      tooltip.innerHTML = `
        <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 600; color: white; margin-bottom: 6px;">Transaction Details</div>
            <div style="display: flex; align-items: center; color: ${progressColor}; font-size: 12px; font-weight: 500;">
              ${confirmations < 3 ? '<div class="loading-spinner" style="border-left-color: ' + progressColor + '"></div>' : ''}
              ${confirmations} of 3 confirmations
            </div>
          </div>
          <div class="tooltip-close">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </div>
        </div>

        <div style="display: grid; gap: 14px;">
          <div>
            <div style="color: #9E9E9E; font-size: 11px; margin-bottom: 4px;">Value</div>
            <div style="font-weight: 500;">${details.value} ETH</div>
          </div>
          
          <div>
            <div style="color: #9E9E9E; font-size: 11px; margin-bottom: 4px;">From</div>
            <div style="font-family: monospace; font-size: 12px; word-break: break-all; opacity: 0.9;">${details.from}</div>
          </div>
          
          <div>
            <div style="color: #9E9E9E; font-size: 11px; margin-bottom: 4px;">To</div>
            <div style="font-family: monospace; font-size: 12px; word-break: break-all; opacity: 0.9;">${details.to}</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <div style="color: #9E9E9E; font-size: 11px; margin-bottom: 4px;">Gas Price</div>
              <div>${details.gasPrice} Gwei</div>
            </div>
            <div>
              <div style="color: #9E9E9E; font-size: 11px; margin-bottom: 4px;">Gas Limit</div>
              <div>${details.gasLimit}</div>
            </div>
          </div>

          <div>
            <div style="color: #9E9E9E; font-size: 11px; margin-bottom: 4px;">Transaction Hash</div>
            <div style="font-family: monospace; font-size: 12px; word-break: break-all; opacity: 0.9;">${details.hash}</div>
          </div>

          <a href="https://etherscan.io/tx/${details.hash}" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="block-explorer-link">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
            </svg>
            View on Etherscan
          </a>
        </div>
      `;

      // 重新添加关闭按钮事件监听器
      const newCloseButton = tooltip.querySelector('.tooltip-close') as HTMLElement;
      if (newCloseButton) {
        newCloseButton.addEventListener('click', (e) => {
          e.stopPropagation();
          closeTooltip();
        });
      }

      tooltip.style.display = 'block';
      
      if (!tooltip.classList.contains('pinned')) {
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
      }
    };
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