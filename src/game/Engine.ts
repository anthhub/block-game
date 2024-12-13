import Matter from 'matter-js';
import { Player } from './entities/Player';
import { BlockManager } from './managers/BlockManager';
import { PowerUpManager } from './managers/PowerUpManager';
import { ParticleSystem } from './effects/ParticleSystem';
import { MusicSystem } from './audio/MusicSystem';
import { HUD } from '../components/HUD';
import { useGameStore } from '../store/gameStore';
import { GameState } from '../store/gameStore';
import { PowerUpIndicator } from './effects/PowerUpIndicator';
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
  private hud: HUD;
  /** 粒子系统 */
  private particleSystem: ParticleSystem;
  /** 能力增强状态指示器 */
  private powerUpIndicator: PowerUpIndicator;
  /** 游戏是否结束 */
  private isGameOver: boolean = false;
  /** 音乐系统 */
  private musicSystem: MusicSystem;
  private pinnedBlock: Matter.Body | null = null;
  private selectedBlock: Block | null = null;

  /**
   * 创建游戏引擎实例
   * @param hud - HUD 显示器
   */
  constructor(hud: HUD) {
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

    // 创建玩家
    this.player = new Player(this.engine);

    // 创建区块管理器
    this.blockManager = new BlockManager(this.engine);
    this.blockManager.setNetworkStateChangeCallback(this.onNetworkStateChange.bind(this));
    // 设置区块状态变化回调
    this.blockManager.setBlockStatusChangeCallback(block => {
      const tooltip = document.getElementById('tooltip')!;
      if (tooltip.style.display === 'block') {
        const currentBlock = this.blockManager.getBlockByBody(this.pinnedBlock);
        if (currentBlock && currentBlock.getTransactionHash() === block.getTransactionHash()) {
          // 强制更新 tooltip
          const rect = tooltip.getBoundingClientRect();
          const event = new MouseEvent('mousemove', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
          });
          this.updateTooltip(currentBlock, event);
        }
      }
    });

    // 创建游戏组件
    this.particleSystem = new ParticleSystem(this.engine);
    this.powerUpIndicator = new PowerUpIndicator();
    this.powerUpManager = new PowerUpManager(
      this.engine,
      this.powerUpIndicator,
      this.player,
      this.musicSystem
    );

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

    // 设置UI
    this.setupUI();

    // 设置初始网络状态
    this.updateNetworkStatus();

    // 定期更新网络状态
    setInterval(() => this.updateNetworkStatus(), 3000);
  }

  private setupUI() {
    // 创建测试按钮
    // const testButton = document.createElement('button');
    // testButton.textContent = '测试黑洞效果';
    // testButton.style.position = 'fixed';
    // testButton.style.top = '10px';
    // testButton.style.right = '10px';
    // testButton.style.zIndex = '1000';
    // testButton.style.padding = '8px 16px';
    // testButton.style.backgroundColor = '#4CAF50';
    // testButton.style.color = 'white';
    // testButton.style.border = 'none';
    // testButton.style.borderRadius = '4px';
    // testButton.style.cursor = 'pointer';
    // testButton.addEventListener('click', () => {
    //   this.blockManager.testBlackHoleEffect();
    // });
    // document.body.appendChild(testButton);
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
  private onNetworkStateChange(state: {
    gasPrice: number;
    pendingTxCount: number;
    congestionLevel: number;
    blockchainGravity: number;
  }) {
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
      congestionLevel: state.congestionLevel,
      blockchainGravity: state.blockchainGravity,
    });
  }

  /**
   * 设置碰撞检测
   */
  private setupCollisions() {
    Matter.Events.on(this.engine, 'collisionStart', event => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        const playerBody =
          bodyA.label === 'player' ? bodyA : bodyB.label === 'player' ? bodyB : null;
        const otherBody = playerBody === bodyA ? bodyB : bodyA;

        if (!playerBody) return;

        if (otherBody.label === 'block') {
          // 获取对应的Block实例
          const block = this.blockManager.getBlockByBody(otherBody);
          if (!block) return;

          // 只有当玩家不是无敌状态，且方块从上方高速砸下来时才扣生命值
          const isBlockAbovePlayer = otherBody.position.y < playerBody.position.y;
          const fallingSpeed = otherBody.velocity.y;
          const isBlockFallingFast = fallingSpeed > GAME_CONFIG.PHYSICS.MIN_FALLING_SPEED;

          if (!this.player.getInvincible() && isBlockAbovePlayer && isBlockFallingFast) {
            useGameStore.getState().decrementLives();
            // 创建碰撞特效
            this.particleSystem.createExplosion(
              playerBody.position.x,
              playerBody.position.y,
              '#ff0000',
              20
            );
            // 播放碰撞音效
            this.musicSystem.playCollisionSound();
          }
        } else if (otherBody.label === 'powerup') {
          // 获取并应用道具效果
          const powerUp = this.powerUpManager.getPowerUpByBody(otherBody);
          if (powerUp) {
            this.powerUpManager.applyPowerUp(powerUp.type);
            // 从数组中移除道具
            const index = this.powerUpManager.getPowerUpsList().indexOf(powerUp);
            if (index !== -1) {
              this.powerUpManager.getPowerUpsList().splice(index, 1);
            }
            powerUp.remove(this.engine);
            // 立即尝试生成新的道具来维持数量
            this.powerUpManager.spawnPowerUp();
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
    const gameState = useGameStore.getState();
    if (gameState.isGameOver) {
      this.gameOver();
      return;
    }

    // 检查已经通过玩家但未计分的方块
    const playerY = this.player.body.position.y;
    this.blockManager.getBlocks().forEach(block => {
      const blockY = block.getPosition().y;
      // 如果方块已经通过玩家位置且还没有被计分
      if (blockY > playerY && !block.isScored) {
        // 增加分数（每个成功躲过的方块）
        useGameStore.getState().incrementScore();
        // 标记方块已计分
        block.setScored(true);
      }
    });

    // 更新游戏组件
    this.player.update();
    this.blockManager.update();
    this.powerUpManager.update();

    // 更新所有道具的闪烁效果
    this.powerUpManager.getPowerUps().forEach(powerUp => powerUp.update());
  }

  /**
   * 处理游戏结束
   */
  public gameOver() {
    if (this.isGameOver) return;

    this.isGameOver = true;
    useGameStore.getState().setGameOver();

    // 停止游戏物理引擎和渲染
    Matter.Runner.stop(this.runner);
    Matter.Render.stop(this.render);

    // 创建游戏结束特效
    const centerX = this.render.options.width! / 2;
    const centerY = this.render.options.height! / 2;
    this.particleSystem.createExplosion(centerX, centerY, '#ff0000', 50);

    // 播放游戏结束音效
    this.musicSystem.playGameOverSound();

    // 显示游戏结束画面
    this.hud.showGameOver();
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
    tooltip.id = 'tooltip';
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
      #tooltip {
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
      #tooltip.pinned {
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
   * 清除当前选中的方块
   */
  private clearSelectedBlock() {
    if (this.selectedBlock) {
      this.selectedBlock.setSelected(false);
      this.selectedBlock = null;
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    const canvas = this.render.canvas;
    const tooltip = document.getElementById('tooltip')!;

    // 更新tooltip位置的函数
    const updateTooltipPosition = (e: MouseEvent) => {
      if (tooltip.classList.contains('pinned')) return;

      const rect = canvas.getBoundingClientRect();
      let left = e.clientX + 16;
      let top = e.clientY + 16;

      // 确保提示框不会超出屏幕
      const tooltipRect = tooltip.getBoundingClientRect();
      if (left + tooltipRect.width > window.innerWidth - 20) {
        left = e.clientX - tooltipRect.width - 16;
      }
      if (top + tooltipRect.height > window.innerHeight - 20) {
        top = e.clientY - tooltipRect.height - 16;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    };

    const closeTooltip = () => {
      tooltip.style.display = 'none';
      tooltip.classList.remove('pinned');
      this.pinnedBlock = null;
      this.clearSelectedBlock();
    };

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const collision = Matter.Query.point(this.engine.world.bodies, {
        x: e.offsetX,
        y: e.offsetY,
      })[0];

      // 如果提示框已经固定，不处理鼠标移动事件
      if (tooltip.classList.contains('pinned')) {
        return;
      }

      if (collision && collision.label === 'block') {
        const block = this.blockManager.getBlockByBody(collision);
        if (block) {
          tooltip.style.display = 'block';
          this.updateTooltip(block, e);
          updateTooltipPosition(e);
        }
      } else {
        tooltip.style.display = 'none';
      }
    });

    canvas.addEventListener('click', async (e: MouseEvent) => {
      const collision = Matter.Query.point(this.engine.world.bodies, {
        x: e.offsetX,
        y: e.offsetY,
      })[0];

      if (collision && collision.label === 'block') {
        const block = this.blockManager.getBlockByBody(collision);
        if (block) {
          // 清除之前选中的方块
          this.clearSelectedBlock();

          // 设置新的选中方块
          this.selectedBlock = block;
          block.setSelected(true);

          // 固定提示框并设置位置
          tooltip.classList.add('pinned');
          this.pinnedBlock = collision;

          // 立即更新交易状态
          await this.blockManager.updateBlockStatus(block);
          this.updateTooltip(block, e);
          updateTooltipPosition(e);
        }
      } else {
        // 点击非方块区域时关闭提示框
        closeTooltip();
      }
    });

    // 关闭按钮事件
    tooltip.addEventListener('click', (e: MouseEvent) => {
      const closeButton = e.target as Element;
      if (closeButton.closest('.tooltip-close')) {
        closeTooltip();
        e.stopPropagation();
      }
    });

    // 点击其他地方时关闭提示框
    document.addEventListener('click', (e: MouseEvent) => {
      if (!tooltip.contains(e.target as Node) && !canvas.contains(e.target as Node)) {
        closeTooltip();
      }
    });
  }

  /**
   * 更新提示框内容
   */
  private updateTooltip(block: Block, event: MouseEvent) {
    const tooltip = document.getElementById('tooltip')!;
    const status = this.blockManager.getBlockTransactionStatus(block);
    const details = block.getTransactionDetails();

    const statusColors = {
      pending: '#FFA726',
      success: '#4CAF50',
      failed: '#F44336',
    };

    const statusText = {
      pending: 'Pending',
      success: 'Confirmed',
      failed: 'Failed',
    };

    tooltip.innerHTML = `
      <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-weight: 600; color: white; margin-bottom: 6px;">Transaction Details</div>
          <div style="display: flex; align-items: center; color: ${statusColors[status.status]}; font-size: 12px; font-weight: 500;">
            ${status.status === 'pending' ? '<div class="loading-spinner" style="border-left-color: ' + statusColors[status.status] + '"></div>' : ''}
            ${statusText[status.status]}
            ${status.confirmations ? ` (${status.confirmations} confirmations)` : ''}
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

  /**
   * 更新网络状态
   */
  private async updateNetworkStatus() {
    try {
      // 模拟网络状态数据
      const mockNetworkStatus = {
        gasPrice: Math.random() * 100 + 20,
        pendingTxCount: Math.floor(Math.random() * 200),
        congestionLevel: Math.random(),
        blockchainGravity: Math.random(), // 添加区块链重力数据
      };

      this.hud.updateNetworkStatus(mockNetworkStatus);
    } catch (error) {
      console.error('Failed to update network status:', error);
    }
  }
}
