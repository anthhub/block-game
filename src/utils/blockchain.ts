import { ethers } from 'ethers';
import { GAME_CONFIG } from '../config/constants';

interface BlockDimensions {
  width: number;
  height: number;
  vertices?: Matter.Vector[];
  shape: 'rectangle' | 'polygon' | 'circle';
}

/**
 * 计算区块的尺寸和形状
 * 考虑多个参数：
 * - gas 价格
 * - 交易价值
 * - 数据大小
 * - 交易类型
 */
export const calculateBlockDimensions = (tx: ethers.TransactionResponse): BlockDimensions => {
  // 基础大小计算
  const gasPrice = Number(tx.gasPrice) || 0;
  const value = Number(tx.value) || 0;
  const dataSize = (tx.data?.length || 0) / 2 - 1; // 去掉 '0x' 前缀

  // 归一化各个参数 (0-1范围)
  const normalizedGas = Math.min(gasPrice / (500 * 1e9), 1); // 最大500 Gwei
  const normalizedValue = Math.min(value / (100 * 1e18), 1); // 最大100 ETH
  const normalizedData = Math.min(dataSize / 10000, 1); // 最大10K字节

  // 计算基础大小
  const baseSize = GAME_CONFIG.BLOCK.MIN_SIZE + 
    (GAME_CONFIG.BLOCK.MAX_SIZE - GAME_CONFIG.BLOCK.MIN_SIZE) * 
    (normalizedGas * 0.4 + normalizedValue * 0.4 + normalizedData * 0.2);

  // 根据交易类型决定形状
  let shape: 'rectangle' | 'polygon' | 'circle' = 'rectangle';
  let dimensions: BlockDimensions = {
    width: baseSize,
    height: baseSize,
    shape: 'rectangle'
  };

  // 合约创建交易 - 使用六边形
  if (!tx.to) {
    shape = 'polygon';
    const radius = baseSize / 2;
    dimensions.vertices = Array.from({ length: 6 }, (_, i) => ({
      x: radius * Math.cos(i * Math.PI / 3),
      y: radius * Math.sin(i * Math.PI / 3)
    }));
  }
  // ERC20/ERC721交易 - 使用圆形
  else if (tx.data.startsWith('0xa9059cbb') || // ERC20 transfer
           tx.data.startsWith('0x23b872dd') || // ERC20 transferFrom
           tx.data.startsWith('0x42842e0e')) { // ERC721 safeTransferFrom
    shape = 'circle';
    dimensions.width = baseSize;
    dimensions.height = baseSize;
  }
  // 普通交易 - 使用矩形
  else {
    dimensions.width = baseSize * 1.2;
    dimensions.height = baseSize * 0.8;
  }

  dimensions.shape = shape;
  return dimensions;
};

/**
 * 获取区块颜色
 * 根据交易类型和参数计算颜色
 * 避免使用绿色（120色相），因为这是玩家的颜色
 */
export const getBlockColor = (tx: ethers.TransactionResponse): string => {
  const gasPrice = Number(tx.gasPrice) || 0;
  const value = Number(tx.value) || 0;
  
  // 特殊交易类型的颜色
  // 合约创建
  if (!tx.to) {
    return 'hsl(280, 80%, 50%)';  // 紫色
  }
  
  // ERC20/ERC721交易
  if (tx.data.startsWith('0xa9059cbb') || 
      tx.data.startsWith('0x23b872dd') || 
      tx.data.startsWith('0x42842e0e')) {
    return 'hsl(200, 75%, 50%)';  // 蓝色
  }
  
  // 高价值交易
  if (value > 10 * 1e18) {
    return 'hsl(45, 90%, 60%)';   // 金色
  }
  
  // 基于gas价格的颜色渐变
  // 使用 0-30 色相范围（红色到橙色）
  const normalizedGas = Math.min(gasPrice / (500 * 1e9), 1); // 最大500 Gwei
  if (normalizedGas > 0.7) {
    return 'hsl(0, 80%, 50%)';    // 红色 - 高gas
  } else if (normalizedGas > 0.3) {
    return 'hsl(30, 80%, 50%)';   // 橙色 - 中gas
  } else {
    return 'hsl(200, 60%, 70%)';  // 淡蓝色 - 低gas
  }
};

export const createProvider = () => {
  return new ethers.JsonRpcProvider(
    'https://eth-mainnet.g.alchemy.com/v2/ShFElt5V8pPaMbA4djojAo4b1ndF3vIa'
  );
};

/**
 * 格式化以太坊地址，只显示前6位和后4位
 * @param address 以太坊地址
 * @returns 格式化后的地址
 */
export const formatAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * 格式化ETH金额，保留4位小数
 * @param value BigNumber或字符串形式的Wei金额
 * @returns 格式化后的ETH金额字符串
 */
export const formatEthAmount = (value: ethers.BigNumberish): string => {
  try {
    const ethValue = ethers.formatEther(value);
    const amount = parseFloat(ethValue);
    if (amount === 0) return '0 ETH';
    if (amount < 0.0001) return '< 0.0001 ETH';
    return `${amount.toFixed(4)} ETH`;
  } catch (error) {
    return '0 ETH';
  }
};
