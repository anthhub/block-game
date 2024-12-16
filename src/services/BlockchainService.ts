import { ethers } from 'ethers';
import { createProvider } from '../utils/blockchain';

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private lastBlockTime: number = 0;
  private lastBlockNumber: number = 0;

  constructor() {
    this.provider = createProvider();
  }

  /**
   * 获取网络状态
   * 返回 Gas 价格、待处理交易数、网络拥堵度和计算出的重力值
   */
  async getNetworkStatus() {
    try {
      // 获取当前 Gas 价格（单位：Gwei）
      const gasPriceWei = await this.provider.getFeeData();
      const gasPrice = Number(ethers.formatUnits(gasPriceWei.gasPrice || 0, 'gwei'));

      // 获取当前区块
      const currentBlock = await this.provider.getBlock('latest');
      if (!currentBlock) {
        throw new Error('Failed to get latest block');
      }

      const currentBlockNumber = currentBlock.number;
      const currentBlockTime = currentBlock.timestamp;

      // 计算区块间隔时间（如果有上一个区块的数据）
      let blockInterval = 0;
      if (this.lastBlockTime && this.lastBlockNumber) {
        blockInterval = currentBlockTime - this.lastBlockTime;
      }

      // 更新最后区块的数据
      this.lastBlockTime = currentBlockTime;
      this.lastBlockNumber = currentBlockNumber;

      // 获取待处理交易数（mempool大小）
      const pendingBlock = await this.provider.getBlock('pending');
      const pendingTxCount = pendingBlock?.transactions.length || 0;

      // 计算网络拥堵度（0-1之间）
      // 基于以下因素：
      // 1. Gas价格（当前假设正常范围是20-100 Gwei）
      // 2. 待处理交易数（当前假设正常范围是0-500笔）
      // 3. 区块间隔（以太坊目标是12秒）
      const gasCongestion = Math.min(Math.max((gasPrice - 20) / 80, 0), 1);
      const pendingTxCongestion = Math.min(pendingTxCount / 500, 1);
      const blockTimeCongestion = blockInterval
        ? Math.min(Math.max((blockInterval - 12) / 18, 0), 1)
        : 0;

      // 综合计算拥堵度（给予不同权重）
      const congestionLevel =
        gasCongestion * 0.4 + pendingTxCongestion * 0.4 + blockTimeCongestion * 0.2;

      // 计算重力值（0-1之间）
      // 拥堵程度越高，重力越大
      const blockchainGravity = Math.min(0.3 + congestionLevel * 0.7, 1);

      return {
        gasPrice,
        pendingTxCount,
        congestionLevel,
        blockchainGravity,
      };
    } catch (error) {
      console.error('获取区块链数据失败:', error);
      // 发生错误时返回默认值
      return {
        gasPrice: 30,
        pendingTxCount: 100,
        congestionLevel: 0.5,
        blockchainGravity: 0.65,
      };
    }
  }
}
