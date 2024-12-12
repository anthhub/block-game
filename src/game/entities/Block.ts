import Matter from 'matter-js';
import { ethers } from 'ethers';
import { calculateBlockDimensions, getBlockColor } from '../../utils/blockchain';
import { GAME_CONFIG } from '../../config/constants';

export class Block {
  public body: Matter.Body;
  public txHash: string;

  constructor(engine: Matter.Engine, tx: ethers.TransactionResponse) {
    const { width, height } = calculateBlockDimensions(tx);
    
    this.body = Matter.Bodies.rectangle(
      Math.random() * window.innerWidth,
      GAME_CONFIG.BLOCK.INITIAL_Y,
      width,
      height,
      {
        label: 'block',
        render: {
          fillStyle: getBlockColor(tx)
        }
      }
    );

    this.txHash = tx.hash || '';
    Matter.Composite.add(engine.world, this.body);
  }

  public remove(engine: Matter.Engine) {
    Matter.Composite.remove(engine.world, this.body);
  }
}