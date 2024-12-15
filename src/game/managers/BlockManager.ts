import Matter from 'matter-js';
import { ethers } from 'ethers';
import { Block } from '../entities/Block';
import { createProvider } from '../../utils/blockchain';
import { GAME_CONFIG } from '../../config/constants';
import { ParticleSystem } from '../effects/ParticleSystem';
import { MusicSystem } from '../audio/MusicSystem';

/**
 * 管理游戏中所有的方块
 */
export class BlockManager {
  private engine: Matter.Engine;
  private provider: ethers.Provider;
  private blocks: Block[] = [];
  private txBuffer: ethers.TransactionResponse[] = [];
  private txStatus = new Map<string, number>();
  private lastSpawnTime = Date.now();
  private nextSpawnInterval = GAME_CONFIG.BLOCK.SPAWN_INTERVAL.BASE;
  private baseSpawnInterval = GAME_CONFIG.BLOCK.SPAWN_INTERVAL.BASE;
  private maxBufferSize = 500; // 增加缓冲区大小到500
  private difficultyMultiplier: number = 1; // 难度系数
  private particleSystem: ParticleSystem;
  private musicSystem: MusicSystem;
  private networkState = {
    gasPrice: 0,
    pendingTxCount: 0,
    lastUpdate: 0,
    updateInterval: 10000, // 每10秒更新一次网络状态
  };
  private onNetworkStateChange?: (state: {
    gasPrice: number;
    pendingTxCount: number;
    congestionLevel: number;
  }) => void;
  private onBlockStatusChange?: (block: Block) => void;
  private canDestroyBlocks: boolean = false;

  constructor(engine: Matter.Engine, musicSystem: MusicSystem) {
    this.engine = engine;
    this.provider = createProvider();
    this.particleSystem = new ParticleSystem(engine);
    this.musicSystem = musicSystem;
    this.setupBlockchainListener();
    this.calculateNextSpawnInterval();
    this.startRealtimeBlockchainEventListening();
  }

  private calculateNextSpawnInterval() {
    const randomOffset = (Math.random() * 2 - 1) * GAME_CONFIG.BLOCK.SPAWN_INTERVAL.VARIANCE;
    this.nextSpawnInterval = Math.max(
      GAME_CONFIG.BLOCK.SPAWN_INTERVAL.MIN,
      Math.min(
        GAME_CONFIG.BLOCK.SPAWN_INTERVAL.MAX,
        this.baseSpawnInterval * (1 + randomOffset)
      )
    );
  }

  private setupBlockchainListener() {
    // 监听新的pending交易
    this.provider.on('pending', tx => {
      this.provider.getTransaction(tx).then(transaction => {
        if (transaction && this.txBuffer.length < this.maxBufferSize) {
          this.txBuffer.push(transaction);
        }
      });
    });

    // 每隔一段时间获取pending交易
    setInterval(() => {
      this.provider.getBlock('pending').then(block => {
        if (block && block.transactions.length > 0) {
          // 随机选择更多交易添加到缓冲区
          const availableSpace = this.maxBufferSize - this.txBuffer.length;
          if (availableSpace > 0) {
            const numToAdd = Math.min(availableSpace, 100); // 每次最多添加50个交易
            for (let i = 0; i < numToAdd; i++) {
              const randomIndex = Math.floor(Math.random() * block.transactions.length);
              const txHash = block.transactions[randomIndex];
              this.provider.getTransaction(txHash).then(transaction => {
                if (transaction) {
                  this.txBuffer.push(transaction);
                }
              });
            }
          }
        }
      });
    }, 1000); // 更新频率提高到1秒
  }

  private startRealtimeBlockchainEventListening() {
    // 监听新的区块事件
    this.provider.on('block', async blockNumber => {
      try {
        const block = await this.provider.getBlock(blockNumber);
        if (block && block.transactions.length > 0) {
          for (const txHash of block.transactions) {
            const tx = await this.provider.getTransaction(txHash);
            if (tx) {
              const gasPrice = Number(tx.gasPrice) || 0;
              const isUniswapTx = tx.data.startsWith('0x...'); // 假设Uniswap交易的函数签名
              const isHighMEV = gasPrice > 300 * 1e9; // 假设高MEV交易的阈值

              // Uniswap交易导致低重力
              if (isUniswapTx) {
                this.triggerLowGravity();
              }

              // 高MEV交易允许破坏方块
              if (isHighMEV) {
                this.enableBlockDestruction();
              }

              // 检测高gas价格交易并降低重力
              if (gasPrice > 200 * 1e9) {
                // 高于200 Gwei
                // 临时降低重力
                const originalGravity = GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY;
                GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY *= 0.5;
                setTimeout(() => {
                  GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY = originalGravity;
                }, 5000); // 5秒后恢复正常重力
              }
            }
          }
        }
      } catch (error) {
        console.error('区块事件处理失败:', error);
      }
    });
  }

  private triggerLowGravity() {
    const originalGravity = GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY;
    GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY *= 0.3; // 更低的重力
    setTimeout(() => {
      GAME_CONFIG.PHYSICS.DEFAULT_GRAVITY = originalGravity;
    }, 10000); // 10秒后恢复正常重力
  }

  private enableBlockDestruction() {
    console.log('高MEV交易检测到：方块现在可以被破坏！');
    this.canDestroyBlocks = true;
    // 设置一个定时器在一段时间后禁用破坏功能
    setTimeout(() => {
      this.canDestroyBlocks = false;
      console.log('方块破坏功能已禁用。');
    }, 10000); // 10秒后禁用
    // 添加逻辑允许玩家破坏方块，例如通过触摸事件
    // 可以在玩家类中添加相应的处理逻辑
  }

  private async getTransactionStatus(txHash: string): Promise<number | undefined> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (receipt) {
        console.log(`Transaction ${txHash} receipt:`, receipt);
        return receipt.status;
      }
      return undefined;
    } catch (error) {
      console.error(`获取交易状态失败: ${txHash}`, error);
      return undefined;
    }
  }

  /**
   * 立即更新指定方块的交易状态
   */
  public async updateBlockStatus(block: Block): Promise<void> {
    try {
      const hash = block.getTransactionHash();
      if (!hash) return;

      const receipt = await this.provider.getTransactionReceipt(hash);
      const currentBlock = await this.provider.getBlockNumber();

      if (receipt) {
        const confirmations = currentBlock - receipt.blockNumber + 1;
        const oldStatus = this.txStatus.get(hash);
        this.txStatus.set(hash, receipt.status);

        // 如果交易从pending变为失败或者被Dropped，触发黑洞效果
        if ((oldStatus === undefined && receipt.status === 0) || receipt.status === 2) {
          // status 2 表示Dropped
          this.handleFailedTransaction(block);
        } else if (receipt.status === 1 && confirmations >= 3 && !block.isFullyConfirmed()) {
        }

        // 触发状态变化回调
        if (this.onBlockStatusChange) {
          this.onBlockStatusChange(block);
        }
      }

      // 更新状态更新时间
      block.updateLastStatusUpdateTime();
    } catch (error) {
      console.error('Error updating block status:', error);
    }
  }

  private handleFailedTransaction(block: Block) {
    this.musicSystem.playBlockConfirmSound();

    // 如果方块已经在淡出，不处理
    if (block.isFading()) return;

    // 变黑
    block.turnBlack();

    // 获取周围的方块
    const radius = 100;
    const blockPos = block.body.position;
    const nearbyBodies = Matter.Query.region(this.engine.world.bodies, {
      min: { x: blockPos.x - radius, y: blockPos.y - radius },
      max: { x: blockPos.x + radius, y: blockPos.y + radius },
    });

    // 找到周围未开始淡出的方块
    const nearbyBlocks = nearbyBodies
      .filter(body => body.label === 'block')
      .map(body => this.getBlockByBody(body))
      .filter(block => block !== null && !block.isFading());

    // 延迟一小段时间后让所有方块消失
    setTimeout(() => {
      for (const nearbyBlock of nearbyBlocks) {
        if (nearbyBlock) {
          nearbyBlock.startFadeOut();
        }
      }
      block.startFadeOut();
    }, 300);
  }

  /**
   * 开始监控网络状态
   */
  private async startNetworkMonitoring() {
    const updateNetworkState = async () => {
      try {
        const now = Date.now();
        if (now - this.networkState.lastUpdate < this.networkState.updateInterval) {
          return;
        }

        // 获取当前gas价格 (ethers v6)
        const feeData = await this.provider.getFeeData();
        this.networkState.gasPrice = parseFloat(ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'));

        // 获取待处理交易数量
        const pendingTxCount = await this.provider.getTransactionCount('pending');
        this.networkState.pendingTxCount = pendingTxCount;
        // 计算网络拥堵程度 (0-1)
        const congestionLevel = this.calculateCongestionLevel();

        // 调整游戏参数
        this.adjustGameParameters(congestionLevel);

        this.networkState.lastUpdate = now;

        // 触发状态变化回调
        if (this.onNetworkStateChange) {
          this.onNetworkStateChange({
            gasPrice: this.networkState.gasPrice,
            pendingTxCount: this.networkState.pendingTxCount,
            congestionLevel,
          });
        }
      } catch (error) {
        console.error('更新网络状态失败:', error);
      }
    };

    // 立即更新一次
    await updateNetworkState();

    // 定期更新
    setInterval(updateNetworkState, this.networkState.updateInterval);
  }

  /**
   * 计算网络拥堵程度 (0-1)
   */
  private calculateCongestionLevel(): number {
    const { MAX_GAS_PRICE, MAX_PENDING_TX, CONGESTION_WEIGHTS } = GAME_CONFIG.PHYSICS.NETWORK;

    // Gas价格评分 (0-1)
    const gasScore = Math.min(this.networkState.gasPrice / MAX_GAS_PRICE, 1);

    // 待处理交易评分 (0-1)
    const pendingScore = Math.min(this.networkState.pendingTxCount / MAX_PENDING_TX, 1);

    // 根据权重计算综合拥堵度
    return (
      gasScore * CONGESTION_WEIGHTS.GAS_PRICE + pendingScore * CONGESTION_WEIGHTS.PENDING_TX
    );
  }

  /**
   * 更新物理引擎的重力
   */
  private updateGravity(congestionLevel: number) {
    const { GRAVITY } = GAME_CONFIG.PHYSICS;

    // 根据拥堵程度计算重力
    const gravity =
      GRAVITY.BASE + congestionLevel * (GRAVITY.MAX - GRAVITY.MIN) * GRAVITY.SCALE_FACTOR;

    // 平滑过渡到新的重力值
    const currentGravity = this.engine.world.gravity.y;
    const smoothFactor = 0.1; // 平滑因子

    const newGravity = currentGravity + (gravity - currentGravity) * smoothFactor;

    // 更新物理引擎的重力
    this.engine.gravity.y = newGravity;
  }

  /**
   * 根据网络拥堵程度调整游戏参数
   */
  private adjustGameParameters(congestionLevel: number) {
    // 更新重力
    this.updateGravity(congestionLevel);

    // 调整生成速度
    const { SPAWN_INTERVAL } = GAME_CONFIG.BLOCK;
    const baseInterval =
      SPAWN_INTERVAL.BASE - congestionLevel * (SPAWN_INTERVAL.BASE - SPAWN_INTERVAL.MIN);

    // 添加随机变化
    const variance = baseInterval * SPAWN_INTERVAL.VARIANCE;
    this.nextSpawnInterval = baseInterval + (Math.random() * 2 - 1) * variance;

    // 确保在允许范围内
    this.nextSpawnInterval = Math.max(
      SPAWN_INTERVAL.MIN,
      Math.min(this.nextSpawnInterval, SPAWN_INTERVAL.MAX)
    );

    // 触发状态变化回调
    if (this.onNetworkStateChange) {
      this.onNetworkStateChange({
        gasPrice: this.networkState.gasPrice,
        pendingTxCount: this.networkState.pendingTxCount,
        congestionLevel,
      });
    }
  }

  /**
   * 设置网络状态变化回调
   */
  public setNetworkStateChangeCallback(
    callback: (state: { gasPrice: number; pendingTxCount: number; congestionLevel: number }) => void
  ) {
    this.onNetworkStateChange = callback;
  }

  /**
   * 设置区块状态变化回调
   */
  public setBlockStatusChangeCallback(callback: (block: Block) => void) {
    this.onBlockStatusChange = callback;
  }

  public async update() {
    const now = Date.now();

    this.blocks.forEach(async block => {
      block.update();
      if (
        !block.isConfirmed() &&
        now - block.getLastStatusUpdateTime() > GAME_CONFIG.BLOCK.STATUS_UPDATE_INTERVAL
      ) {
        await this.updateBlockStatus(block);
      }
    });

    this.blocks = this.blocks.filter(block => {
      const txHash = block.getTransactionHash();
      const status = this.txStatus.get(txHash);

      if (status !== undefined && !block.isFading()) {
        this.musicSystem.playBlockConfirmSound();

        const pos = block.getPosition();
        const effectColor = block.body.render.fillStyle;

        for (let i = 0; i < 3; i++) {
          this.particleSystem.createExplosion(
            pos.x + (Math.random() - 0.5) * 20,
            pos.y + (Math.random() - 0.5) * 20,
            effectColor,
            5 + Math.random() * 5
          );
        }

        block.startFadeOut();
        return true;
      }

      if (block.isFading() && block.body.render.opacity <= 0) {
        Matter.World.remove(this.engine.world, block.body);
        if (txHash) {
          this.txStatus.delete(txHash);
        }
        return false;
      }

      if (block.isOffScreen()) {
        Matter.World.remove(this.engine.world, block.body);
        if (txHash) {
          this.txStatus.delete(txHash);
        }
        return false;
      }

      return true;
    });

    // 检查是否应该生成新方块
    if (now - this.lastSpawnTime >= this.nextSpawnInterval && this.txBuffer.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.txBuffer.length);
      const tx = this.txBuffer.splice(randomIndex, 1)[0];

      // 创建新方块
      this.blocks.push(new Block(this.engine, tx, this.engine.world));

      // 更新时间并计算下一个生成间隔
      this.lastSpawnTime = now;
      this.calculateNextSpawnInterval();
    }

    // 更新网络状态
    void this.updateNetworkState();

    // 保持缓冲区大小在限制范围内
    if (this.txBuffer.length > this.maxBufferSize) {
      this.txBuffer.length = this.maxBufferSize;
    }

    // 定期清理已确认交易集合
    if (this.txStatus.size > 1000) {
      this.txStatus.clear();
    }
  }

  private async updateNetworkState() {
    const now = Date.now();

    // 每隔一段时间更新一次网络状态
    if (now - this.networkState.lastUpdate >= this.networkState.updateInterval) {
      try {
        // 获取当前gas价格
        const feeData = await this.provider.getFeeData();
        if (feeData.gasPrice) {
          this.networkState.gasPrice = Number(feeData.gasPrice);
        }

        // 获取pending交易数量
        const block = await this.provider.getBlock('pending');
        if (block) {
          this.networkState.pendingTxCount = block.transactions.length;
        }

        this.networkState.lastUpdate = now;

        // 触发回调
        if (this.onNetworkStateChange) {
          this.onNetworkStateChange({
            gasPrice: this.networkState.gasPrice,
            pendingTxCount: this.networkState.pendingTxCount,
            congestionLevel: this.calculateCongestionLevel(),
          });
        }
      } catch (error) {
        console.error('更新网络状态失败:', error);
      }
    }
  }

  /**
   * 获取所有方块
   */
  public getBlocks(): Block[] {
    return this.blocks;
  }

  public cleanup() {
    this.blocks.forEach(block => {
      Matter.World.remove(this.engine.world, block.body);
    });
    this.blocks = [];
    this.txBuffer = [];
    this.txStatus.clear();
    this.particleSystem.cleanup();
    this.provider.removeAllListeners();
  }

  public setDifficulty(difficulty: number) {
    this.difficultyMultiplier = Math.max(1, Math.min(3, difficulty));
  }

  public setBaseSpawnInterval(interval: number) {
    this.baseSpawnInterval = Math.max(
      GAME_CONFIG.BLOCK.SPAWN_INTERVAL.MIN,
      Math.min(GAME_CONFIG.BLOCK.SPAWN_INTERVAL.MAX, interval)
    );
    this.calculateNextSpawnInterval();
  }

  /**
   * 测试用：确认最近的一个区块
   */
  public confirmLatestBlock(): void {
    if (this.blocks.length > 0) {
      const latestBlock = this.blocks[this.blocks.length - 1];
      const txHash = latestBlock.getTransactionHash();
      this.txStatus.set(txHash, 1); // 直接设置为成功
    }
  }

  /**
   * 测试黑洞效果
   */
  public testBlackHoleEffect() {
    // 随机选择一个方块
    if (this.blocks.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.blocks.length);
      const block = this.blocks[randomIndex];
      this.handleFailedTransaction(block);
    }
  }

  /**
   * 获取指定区块的交易状态
   */
  public getBlockTransactionStatus(block: Block): {
    status: 'pending' | 'success' | 'failed';
    confirmations?: number;
  } {
    const txHash = block.getTransactionHash();
    const status = this.txStatus.get(txHash);

    if (status === undefined) {
      return { status: 'pending' };
    }

    // 获取确认数
    const confirmations = block.getConfirmations();

    return {
      status: status === 1 ? 'success' : 'failed',
      confirmations: confirmations > 0 ? confirmations : undefined,
    };
  }

  /**
   * 获取指定位置的区块
   */
  public getBlockAtPosition(position: { x: number; y: number }): Block | null {
    for (const block of this.blocks) {
      const bounds = block.getBounds();
      if (
        position.x >= bounds.x &&
        position.x <= bounds.x + bounds.width &&
        position.y >= bounds.y &&
        position.y <= bounds.y + bounds.height
      ) {
        return block;
      }
    }
    return null;
  }

  /**
   * 获取指定 body 的区块
   */
  public getBlockByBody(body: Matter.Body): Block | null {
    return this.blocks.find(block => block.body === body) || null;
  }

  public getCanDestroyBlocks(): boolean {
    return this.canDestroyBlocks;
  }

  /**
   * 获取当前网络拥堵程度 (0-1)
   */
  public getCongestionLevel(): number {
    const { gasPrice, pendingTxCount } = this.networkState;

    // 计算 gas 价格的拥堵程度 (0-1)
    const gasPriceCongestion = Math.min(gasPrice / GAME_CONFIG.PHYSICS.NETWORK.MAX_GAS_PRICE, 1);

    // 计算待处理交易的拥堵程度 (0-1)
    const pendingTxCongestion = Math.min(
      pendingTxCount / GAME_CONFIG.PHYSICS.NETWORK.MAX_PENDING_TX,
      1
    );

    // 根据权重计算总体拥堵程度
    return (
      gasPriceCongestion * GAME_CONFIG.PHYSICS.NETWORK.CONGESTION_WEIGHTS.GAS_PRICE +
      pendingTxCongestion * GAME_CONFIG.PHYSICS.NETWORK.CONGESTION_WEIGHTS.PENDING_TX
    );
  }
}
