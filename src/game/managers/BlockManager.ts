import Matter from 'matter-js';
import { ethers } from 'ethers';
import { Block } from '../entities/Block';
import { createProvider } from '../../utils/blockchain';
import { GAME_CONFIG } from '../../config/constants';
import { ParticleSystem } from '../effects/ParticleSystem';

/**
 * 管理游戏中所有的方块
 */
export class BlockManager {
  private engine: Matter.Engine;
  private provider: ethers.Provider;
  private blocks: Block[] = [];
  private txBuffer: ethers.TransactionResponse[] = [];
  private lastSpawnTime: number = 0;
  private baseSpawnInterval: number = 1000; // 基础生成间隔（毫秒）
  private spawnIntervalRange: number = 200; // 生成间隔的随机范围（毫秒）
  private nextSpawnInterval: number = 1000; // 下一个方块的生成间隔
  private maxBufferSize: number = 20; // 交易缓冲区大小
  private difficultyMultiplier: number = 1; // 难度系数
  private txStatus: Map<string, number> = new Map(); // 存储交易哈希和状态 (1: 成功, 0: 失败, undefined: 待定)
  private particleSystem: ParticleSystem;
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

  constructor(engine: Matter.Engine) {
    this.engine = engine;
    this.provider = createProvider();
    this.particleSystem = new ParticleSystem(engine);
    this.setupBlockchainListener();
    this.calculateNextSpawnInterval();
  }

  private calculateNextSpawnInterval() {
    const randomOffset = (Math.random() * 2 - 1) * this.spawnIntervalRange;
    this.nextSpawnInterval = Math.max(
      300,
      (this.baseSpawnInterval + randomOffset) / this.difficultyMultiplier
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
          // 随机选择一些交易添加到缓冲区
          const availableSpace = this.maxBufferSize - this.txBuffer.length;
          if (availableSpace > 0) {
            const numToAdd = Math.min(availableSpace, 5);
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
    }, 5000);
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

        // 如果交易从pending变为失败，触发黑洞效果
        if (oldStatus === undefined && receipt.status === 0) {
          this.handleFailedTransaction(block);
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
      gasScore * CONGESTION_WEIGHTS.GAS_PRICE +
      pendingScore * CONGESTION_WEIGHTS.PENDING_TX
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

    // 更新所有方块
    this.blocks.forEach(async block => {
      block.update();
      // 每隔一段时间更新一次交易状态
      if (!block.isConfirmed() && now - block.getLastStatusUpdateTime() > GAME_CONFIG.BLOCK.STATUS_UPDATE_INTERVAL) {
        await this.updateBlockStatus(block);
      }
    });

    // 更新和清理方块
    this.blocks = this.blocks.filter(block => {
      const txHash = block.getTransactionHash();
      const status = this.txStatus.get(txHash);

      // 如果交易已确认（有状态），触发爆炸效果
      if (status !== undefined && !block.isFading()) {
        const pos = block.getPosition();
        // 使用方块的原始颜色
        const effectColor = block.body.render.fillStyle;

        // 创建持续的爆炸效果
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

      // 如果方块已经完全淡出，移除它
      if (block.isFading() && block.body.render.opacity <= 0) {
        Matter.World.remove(this.engine.world, block.body);
        if (txHash) {
          this.txStatus.delete(txHash);
        }
        return false;
      }

      // 如果方块超出屏幕，直接移除
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
      this.blocks.push(new Block(this.engine, tx));

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
    this.baseSpawnInterval = Math.max(500, Math.min(2000, interval));
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
}
