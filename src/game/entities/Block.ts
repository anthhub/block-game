import Matter from 'matter-js';
import { ethers } from 'ethers';
import { calculateBlockDimensions, getBlockColor } from '../../utils/blockchain';
import { GAME_CONFIG } from '../../config/constants';

/**
 * 表示游戏中的一个下落方块
 * 每个方块都对应一个以太坊交易，其属性（大小、颜色）由交易详情决定
 */
export class Block {
  /** Matter.js 物理引擎中的刚体对象 */
  public body: Matter.Body;
  /** 关联的以太坊交易哈希 */
  public txHash: string;

  /**
   * 创建一个新的方块实例
   * @param engine - Matter.js 物理引擎实例
   * @param tx - 关联的以太坊交易
   */
  constructor(engine: Matter.Engine, tx: ethers.TransactionResponse) {
    // 根据交易属性计算方块尺寸
    const { width, height } = calculateBlockDimensions(tx);

    // 在屏幕顶部随机位置创建方块
    this.body = Matter.Bodies.rectangle(
      Math.random() * window.innerWidth,
      GAME_CONFIG.BLOCK.INITIAL_Y,
      width,
      height,
      {
        label: 'block',
        render: {
          // 根据 gas 价格设置颜色
          fillStyle: getBlockColor(tx),
        },
      }
    );

    this.txHash = tx.hash || '';
    
    // 将方块添加到物理世界中
    Matter.Composite.add(engine.world, this.body);
  }

  /**
   * 从物理世界中移除方块
   * @param engine - Matter.js 物理引擎实例
   */
  public remove(engine: Matter.Engine) {
    Matter.Composite.remove(engine.world, this.body);
  }
}
