import Matter from 'matter-js';
import { ethers } from 'ethers';
import { Block } from '../entities/Block';
import { createProvider } from '../../utils/blockchain';
import { isOutOfBounds } from '../../utils/physics';

/**
 * 管理游戏中所有的方块
 * 负责创建、更新和移除方块，以及处理与以太坊区块链的交互
 */
export class BlockManager {
  /** Matter.js 物理引擎实例 */
  private engine: Matter.Engine;
  /** 当前活跃的方块列表 */
  private blocks: Block[] = [];
  /** 以太坊提供者实例 */
  private provider: ethers.Provider;

  constructor(engine: Matter.Engine) {
    this.engine = engine;
    this.provider = createProvider();
    this.setupBlockchainListener();
  }

  /**
   * 设置以太坊区块链事件监听器
   * 监听新的待处理交易并创建对应的方块
   */
  private setupBlockchainListener() {
    this.provider.on('pending', async txHash => {
      try {
        // 获取交易详情并创建新方块
        const tx = await this.provider.getTransaction(txHash);
        console.log('获取交易信息失败 tx:', tx);

        if (tx) {
          this.blocks.push(new Block(this.engine, tx));
        }
      } catch (error) {
        console.error('获取交易信息失败:', error);
      }
    });
  }

  /**
   * 更新所有方块的状态
   * 移除超出屏幕边界的方块
   */
  public update() {
    this.blocks = this.blocks.filter(block => {
      if (isOutOfBounds(block.body, window.innerHeight)) {
        block.remove(this.engine);
        return false;
      }
      return true;
    });
  }

  /**
   * 清理所有方块
   * 在游戏结束或重置时调用
   */
  public cleanup() {
    this.blocks.forEach(block => block.remove(this.engine));
    this.blocks = [];
  }
}
