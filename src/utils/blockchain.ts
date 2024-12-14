import { ethers } from 'ethers';
import { GAME_CONFIG } from '../config/constants';

interface BlockDimensions {
  width: number;
  height: number;
  vertices?: Matter.Vector[];
  shape: 'rectangle' | 'polygon' | 'circle' | 'star' | 'diamond' | 'triangle' | 'cross' | 'hexagram';
}

interface BlockPhysics {
  size: number;           // 方块大小
  speed: number;         // 下落速度
  spin: number;         // 旋转速度
  density: number;      // 密度
  restitution: number; // 弹性
  friction: number;    // 摩擦力
  vertices?: Matter.Vector[]; // 顶点（用于特殊形状）
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
  const dataSize = (tx.data?.length || 0) / 2 - 1;

  // 归一化各个参数 (0-1范围)
  const normalizedGas = Math.min(gasPrice / (500 * 1e9), 1);
  const normalizedValue = Math.min(value / (100 * 1e18), 1);
  const normalizedData = Math.min(dataSize / 10000, 1);

  // 计算基础大小，保持原有范围
  const baseSize = GAME_CONFIG.BLOCK.MIN_SIZE + 
    (GAME_CONFIG.BLOCK.MAX_SIZE - GAME_CONFIG.BLOCK.MIN_SIZE) * 
    (normalizedGas * 0.4 + normalizedValue * 0.4 + normalizedData * 0.2);

  // 根据交易类型决定形状
  let shape: 'rectangle' | 'polygon' | 'circle' | 'star' | 'diamond' | 'triangle' | 'cross' | 'hexagram' = 'rectangle';
  let dimensions: BlockDimensions = {
    width: baseSize,
    height: baseSize,
    shape: 'rectangle'
  };

  // 高价值交易 - 使用巨大的菱形，给人强烈的压迫感
  if (normalizedValue > 0.2) {
    shape = 'diamond';
    const size = baseSize * 5;  // 最大尺寸，5倍
    dimensions.vertices = [
      { x: 0, y: -size },          // 更尖锐的顶部
      { x: size/1.8, y: 0 },
      { x: 0, y: size/1.2 },       // 较短的底部
      { x: -size/1.8, y: 0 }
    ];
  }
  // 高Gas交易 - 使用大号三角形，表示危险
  else if (normalizedGas > 0.4) {
    shape = 'triangle';
    const size = baseSize * 4.5;   // 4.5倍大小
    dimensions.vertices = [
      { x: 0, y: -size },          // 尖锐的顶部
      { x: size/1.2, y: size/1.2 },
      { x: -size/1.2, y: size/1.2 }
    ];
  }
  // 合约创建交易 - 使用大型十六边形
  else if (!tx.to) {
    shape = 'polygon';
    const radius = baseSize * 4;  // 4倍大小
    dimensions.vertices = Array.from({ length: 16 }, (_, i) => ({
      x: radius * Math.cos(i * Math.PI / 8),
      y: radius * Math.sin(i * Math.PI / 8)
    }));
  }
  // ERC20转账 - 使用中等圆形
  else if (tx.data.startsWith('0xa9059cbb') || tx.data.startsWith('0x23b872dd')) {
    shape = 'circle';
    dimensions.width = baseSize * 3;   // 3倍大小
    dimensions.height = baseSize * 3;
  }
  // ERC721 NFT转账 - 使用中型六芒星
  else if (tx.data.startsWith('0x42842e0e')) {
    shape = 'hexagram';
    const outerRadius = baseSize * 2.8;  // 2.8倍大小
    const innerRadius = outerRadius * 0.4;
    const points: Matter.Vector[] = [];
    
    // 创建六芒星（两个交错的三角形）
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      });
    }
    dimensions.vertices = points;
  }
  // 大数据交易 - 使用中型十字形
  else if (normalizedData > 0.3) {
    shape = 'cross';
    const baseScale = baseSize * 2.5;  // 2.5倍基础大小
    const armWidth = baseScale * 0.2;   // 较细的手臂
    const armLength = baseScale * 1.2;  // 较长的手臂
    dimensions.vertices = [
      // 垂直臂
      { x: -armWidth/2, y: -armLength },
      { x: armWidth/2, y: -armLength },
      { x: armWidth/2, y: -armWidth/2 },
      { x: armLength, y: -armWidth/2 },
      { x: armLength, y: armWidth/2 },
      { x: armWidth/2, y: armWidth/2 },
      { x: armWidth/2, y: armLength },
      { x: -armWidth/2, y: armLength },
      { x: -armWidth/2, y: armWidth/2 },
      { x: -armLength, y: armWidth/2 },
      { x: -armLength, y: -armWidth/2 },
      { x: -armWidth/2, y: -armWidth/2 }
    ];
  }
  // 普通交易 - 使用小型矩形
  else {
    const ratio = 0.4 + normalizedGas * 1.2; // 0.4-1.6的宽高比
    const size = baseSize * 2; // 最小2倍大小
    dimensions.width = size * ratio;
    dimensions.height = size / ratio;
  }

  dimensions.shape = shape;
  return dimensions;
};

/**
 * 根据交易属性计算方块的物理特性
 */
export const calculateBlockPhysics = (tx: ethers.TransactionResponse): BlockPhysics => {
  const gasPrice = Number(tx.gasPrice) || 0;
  const value = Number(tx.value) || 0;
  const dataSize = (tx.data?.length || 0) / 2 - 1;
  const nonce = Number(tx.nonce) || 0;
  const gasLimit = Number(tx.gasLimit) || 0;
  const isContract = !tx.to;
  const isNFT = tx.data?.startsWith('0x42842e0e');
  const isERC20 = tx.data?.startsWith('0xa9059cbb');
  const isHighValue = value > 50 * 1e18; // 50 ETH
  const isHighGas = gasPrice > 200 * 1e9; // 200 Gwei
  const isBigData = dataSize > 5000; // 大于5000字节

  // 归一化值到0-1范围，但使用更极端的阈值
  const normalizedGas = Math.min(gasPrice / (1000 * 1e9), 1);  // 最高1000 Gwei
  const normalizedValue = Math.min(value / (200 * 1e18), 1);   // 最高200 ETH
  const normalizedData = Math.min(dataSize / 20000, 1);        // 最高20000字节
  const normalizedNonce = Math.min(nonce / 200, 1);            // 最高200
  const normalizedGasLimit = Math.min(gasLimit / (2000000), 1); // 最高2M gas

  // 基础大小 (3-8倍)，让差异更明显
  const baseSize = GAME_CONFIG.BLOCK.MIN_SIZE * (3 + normalizedValue * 5);
  
  let vertices: Matter.Vector[] | undefined;
  
  // 根据交易类型决定形状，更夸张的形状
  if (isHighValue) {
    // 超大钻石形（高价值交易）
    const size = baseSize * 1.5;
    vertices = [
      { x: 0, y: -size * 1.2 },      // 更尖的顶部
      { x: size * 0.8, y: 0 },
      { x: 0, y: size * 0.8 },
      { x: -size * 0.8, y: 0 }
    ];
  } else if (isContract) {
    // 不规则十二边形（合约创建）
    const points = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const radius = baseSize * (1 + Math.sin(i * 0.5) * 0.3); // 不规则半径
      points.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      });
    }
    vertices = points;
  } else if (isNFT) {
    // 更复杂的星形（NFT）
    const outerRadius = baseSize * 1.2;
    const midRadius = baseSize * 0.8;
    const innerRadius = baseSize * 0.4;
    vertices = Array.from({ length: 24 }, (_, i) => {
      const angle = (i * Math.PI) / 12;
      let radius;
      if (i % 3 === 0) radius = outerRadius;
      else if (i % 3 === 1) radius = midRadius;
      else radius = innerRadius;
      return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      };
    });
  } else if (isERC20) {
    // 箭头形状（ERC20转账）
    const width = baseSize * 1.2;
    const height = baseSize * 1.5;
    vertices = [
      { x: 0, y: -height/2 },         // 顶点
      { x: width/2, y: 0 },          // 右翼
      { x: width/4, y: height/4 },   // 右内
      { x: width/4, y: height/2 },   // 右底
      { x: -width/4, y: height/2 },  // 左底
      { x: -width/4, y: height/4 },  // 左内
      { x: -width/2, y: 0 }          // 左翼
    ];
  } else if (isBigData) {
    // 宽扁矩形（大数据交易）
    const width = baseSize * 2;
    const height = baseSize * 0.5;
    vertices = [
      { x: -width/2, y: -height/2 },
      { x: width/2, y: -height/2 },
      { x: width/2, y: height/2 },
      { x: -width/2, y: height/2 }
    ];
  }

  // 基于交易类型的特殊物理属性
  const specialPhysics = {
    // 高价值交易：超重、快速下落
    highValue: {
      density: 3,
      speed: 12,
      friction: 0.2
    },
    // 高Gas交易：超快速、低摩擦
    highGas: {
      speed: 15,
      friction: 0.1,
      density: 0.8
    },
    // 合约创建：中等速度，高弹性
    contract: {
      speed: 6,
      restitution: 0.9,
      density: 1.5
    },
    // NFT：轻盈、高旋转
    nft: {
      density: 0.5,
      speed: 4,
      spin: 0.3
    },
    // 大数据：超重、低弹性
    bigData: {
      density: 2.5,
      restitution: 0.1,
      friction: 0.9
    }
  };

  // 选择适当的物理属性集
  let physicsSet = {
    speed: 5 + normalizedGas * 10,        // 基础速度更快 (5-15)
    spin: (normalizedNonce - 0.5) * 0.4,  // 更大的旋转范围
    density: 0.8 + normalizedValue * 2.2,  // 更大的密度范围
    restitution: 0.2 + normalizedGasLimit * 0.7,
    friction: 0.1 + normalizedData * 0.9
  };

  // 应用特殊物理属性
  if (isHighValue) Object.assign(physicsSet, specialPhysics.highValue);
  else if (isHighGas) Object.assign(physicsSet, specialPhysics.highGas);
  else if (isContract) Object.assign(physicsSet, specialPhysics.contract);
  else if (isNFT) Object.assign(physicsSet, specialPhysics.nft);
  else if (isBigData) Object.assign(physicsSet, specialPhysics.bigData);

  return {
    size: baseSize,
    ...physicsSet,
    vertices
  };
};

/**
 * 获取区块颜色，使用更鲜艳的颜色
 */
export const getBlockColor = (tx: ethers.TransactionResponse): string => {
  const gasPrice = Number(tx.gasPrice) || 0;
  const value = Number(tx.value) || 0;
  const dataSize = (tx.data?.length || 0) / 2 - 1;
  
  const normalizedGas = Math.min(gasPrice / (500 * 1e9), 1);
  const normalizedValue = Math.min(value / (100 * 1e18), 1);
  
  // 合约创建 - 耀眼的紫色
  if (!tx.to) {
    return `hsl(290, 100%, ${40 + normalizedGas * 30}%)`; // 更亮的紫色
  }
  
  // 高价值交易 - 金色
  if (normalizedValue > 0.5) {
    return `hsl(45, 100%, ${50 + normalizedValue * 30}%)`; // 更亮的金色
  }
  
  // 高Gas交易 - 红色
  if (normalizedGas > 0.7) {
    return `hsl(0, 100%, ${45 + normalizedGas * 25}%)`; // 更亮的红色
  }
  
  // NFT交易 - 彩虹色
  if (tx.data?.startsWith('0x42842e0e')) {
    const hue = (Date.now() / 50) % 360; // 随时间变化的色相
    return `hsl(${hue}, 100%, 60%)`; // 更鲜艳的彩虹色
  }
  
  // ERC20转账 - 蓝色
  if (tx.data?.startsWith('0xa9059cbb')) {
    return `hsl(210, 100%, ${50 + normalizedValue * 20}%)`; // 更亮的蓝色
  }
  
  // 大数据交易 - 绿色
  if (dataSize > 5000) {
    return `hsl(120, 100%, ${45 + (dataSize/10000) * 25}%)`; // 更亮的绿色
  }
  
  // 普通交易 - 基于gas和value的渐变色
  const baseHue = 180 + normalizedGas * 60;
  const saturation = 70 + normalizedValue * 30;
  const lightness = 40 + normalizedValue * 30;
  return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
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
