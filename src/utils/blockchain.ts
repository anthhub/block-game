import { ethers } from 'ethers';
import { GAME_CONFIG } from '../config/constants';

export const createProvider = () => {
  return new ethers.JsonRpcProvider(
    'https://eth-mainnet.g.alchemy.com/v2/ShFElt5V8pPaMbA4djojAo4b1ndF3vIa'
  );
};

export const calculateBlockDimensions = (tx: ethers.TransactionResponse) => {
  const width = Math.min(
    GAME_CONFIG.BLOCK.MIN_SIZE + Number(tx.gasLimit) / 100000,
    GAME_CONFIG.BLOCK.MAX_SIZE
  );

  const height = Math.min(
    GAME_CONFIG.BLOCK.MIN_SIZE + (Number(tx.value) / 1e18) * 10,
    GAME_CONFIG.BLOCK.MAX_SIZE
  );

  return { width, height };
};

export const getBlockColor = (tx: ethers.TransactionResponse): string => {
  const gasPrice = Number(tx.gasPrice) / 1e9;
  if (gasPrice > GAME_CONFIG.BLOCK.GAS_PRICE_THRESHOLDS.HIGH) {
    return GAME_CONFIG.BLOCK.COLORS.HIGH_GAS;
  }
  if (gasPrice > GAME_CONFIG.BLOCK.GAS_PRICE_THRESHOLDS.MEDIUM) {
    return GAME_CONFIG.BLOCK.COLORS.MEDIUM_GAS;
  }
  return GAME_CONFIG.BLOCK.COLORS.LOW_GAS;
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
