import Matter from 'matter-js';
import { ethers } from 'ethers';
import { Block } from '../entities/Block';
import { createProvider } from '../../utils/blockchain';
import { isOutOfBounds } from '../../utils/physics';

export class BlockManager {
  private engine: Matter.Engine;
  private blocks: Block[] = [];
  private provider: ethers.Provider;

  constructor(engine: Matter.Engine) {
    this.engine = engine;
    this.provider = createProvider();
    this.setupBlockchainListener();
  }

  private setupBlockchainListener() {
    this.provider.on('pending', async (txHash) => {
      try {
        const tx = await this.provider.getTransaction(txHash);
        if (tx) {
          this.blocks.push(new Block(this.engine, tx));
        }
      } catch (error) {
        console.error('Error fetching transaction:', error);
      }
    });
  }

  public update() {
    this.blocks = this.blocks.filter(block => {
      if (isOutOfBounds(block.body, window.innerHeight)) {
        block.remove(this.engine);
        return false;
      }
      return true;
    });
  }

  public cleanup() {
    this.blocks.forEach(block => block.remove(this.engine));
    this.blocks = [];
  }
}