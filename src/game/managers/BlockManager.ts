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
  private confirmedTxs: Map<string, number> = new Map(); // 存储交易哈希和确认数
  private confirmationProgress: Map<string, number> = new Map(); // 存储交易哈希和确认进度
  private particleSystem: ParticleSystem;

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
    try {
      // 监听待处理交易
      this.provider.on('pending', async (txHash: string) => {
        if (this.txBuffer.length < this.maxBufferSize) {
          try {
            const tx = await this.provider.getTransaction(txHash);
            if (tx) {
              this.txBuffer.push(tx);
            }
          } catch (error) {
            // 静默处理错误，保持游戏流畅
          }
        }
      });

      // 监听新区块
      this.provider.on('block', async (blockNumber: number) => {
        try {
          const block = await this.provider.getBlock(blockNumber, true);
          if (block && block.transactions) {
            // 更新交易确认状态
            for (const tx of block.transactions) {
              const txHash = tx.hash;
              const confirmations = this.confirmedTxs.get(txHash) || 0;
              this.confirmedTxs.set(txHash, confirmations + 1);
            }
          }
        } catch (error) {
          console.error('获取区块信息失败:', error);
        }
      });
    } catch (error) {
      console.error('设置区块链监听器失败:', error);
    }
  }

  public update() {
    const now = Date.now();

    // 更新粒子系统
    this.particleSystem.update();

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

    // 更新和清理方块
    this.blocks = this.blocks.filter(block => {
      const txHash = block.getTransactionHash();
      const confirmations = this.confirmedTxs.get(txHash) || 0;

      // 更新确认进度
      if (confirmations > 0 && !block.isFullyConfirmed()) {
        let progress = this.confirmationProgress.get(txHash) || 0;
        progress = Math.min(confirmations, progress + 0.01); // 每帧增加0.01的进度
        this.confirmationProgress.set(txHash, progress);

        // 当进度达到整数时，增加确认数
        if (Math.floor(progress) > confirmations) {
          block.addConfirmation();
        }
      }

      // 如果方块已完全确认，开始淡出效果
      if (block.isFullyConfirmed()) {
        const pos = block.getPosition();

        // 在淡出过程中持续创建小型爆炸效果
        if (Math.random() < 0.3) { // 30%的概率生成粒子
          this.particleSystem.createExplosion(pos.x, pos.y, block.body.render.fillStyle as string, 3);
        }

        if (block.fadeOut()) {
          // 如果淡出完成，创建最终爆炸效果并移除方块
          this.particleSystem.createExplosion(pos.x, pos.y, block.body.render.fillStyle as string, 15);
          Matter.World.remove(this.engine.world, block.body);
          this.confirmedTxs.delete(txHash);
          this.confirmationProgress.delete(txHash);
          return false;
        }
      }

      // 如果方块超出屏幕，直接移除
      if (block.isOffScreen()) {
        Matter.World.remove(this.engine.world, block.body);
        this.confirmedTxs.delete(txHash);
        this.confirmationProgress.delete(txHash);
        return false;
      }

      block.update();
      return true;
    });

    // 保持缓冲区大小在限制范围内
    if (this.txBuffer.length > this.maxBufferSize) {
      this.txBuffer.length = this.maxBufferSize;
    }

    // 定期清理已确认交易集合
    if (this.confirmedTxs.size > 1000) {
      this.confirmedTxs.clear();
    }
  }

  public cleanup() {
    this.blocks.forEach(block => {
      Matter.World.remove(this.engine.world, block.body);
    });
    this.blocks = [];
    this.txBuffer = [];
    this.confirmedTxs.clear();
    this.confirmationProgress.clear();
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
      this.confirmedTxs.set(txHash, 3); // 直接设置为3个确认
      this.confirmationProgress.set(txHash, 3); // 同时更新确认进度
      latestBlock.setConfirmations(3); // 直接设置区块的确认数
    }
  }

  /**
   * 获取指定区块的确认数
   */
  public getBlockConfirmations(block: Block): number {
    const txHash = block.getTransactionHash();
    return this.confirmedTxs.get(txHash) || 0;
  }

  /**
   * 获取指定区块的确认进度
   */
  public getBlockConfirmationProgress(block: Block): { confirmations: number; progress: number } {
    const txHash = block.getTransactionHash();
    const confirmations = this.confirmedTxs.get(txHash) || 0;
    const progress = this.confirmationProgress.get(txHash) || confirmations;
    return {
      confirmations,
      progress: Math.min(100, (progress / 3) * 100)
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
}
