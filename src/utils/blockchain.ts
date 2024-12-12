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
