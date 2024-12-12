import Matter from 'matter-js';
import { ethers } from 'ethers';
import {
  calculateBlockDimensions,
  getBlockColor,
  formatAddress,
  formatEthAmount,
} from '../../utils/blockchain';

/**
 * 表示游戏中的一个下落方块
 * 每个方块都对应一个以太坊交易，其属性（大小、颜色）由交易详情决定
 */
export class Block {
  /** Matter.js 物理引擎中的刚体对象 */
  public body: Matter.Body;
  /** 关联的以太坊交易 */
  private tx: ethers.TransactionResponse;
  /** 方块移动速度 */
  private speed: number = 2;
  private confirmations: number = 0;
  private readonly requiredConfirmations: number = 1; // 需要的确认数
  private isConfirming: boolean = false;
  private opacity: number = 1;
  private fadeOutSpeed: number = 0.1;
  private isLanded: boolean = false;

  /**
   * 创建一个新的方块实例
   * @param engine - Matter.js 物理引擎实例
   * @param tx - 关联的以太坊交易
   */
  constructor(engine: Matter.Engine, tx: ethers.TransactionResponse) {
    this.tx = tx;
    
    // 计算方块尺寸和位置
    const { width, height } = calculateBlockDimensions(tx);
    const x = Math.random() * (window.innerWidth - width) + width / 2;
    
    // 创建方块
    this.body = Matter.Bodies.rectangle(x, -height, width, height, {
      label: 'block',
      render: {
        fillStyle: getBlockColor(tx),
        opacity: 1,
      },
      friction: 0.8,        // 增加摩擦力
      frictionAir: 0.01,    // 增加空气阻力
      frictionStatic: 1,    // 增加静摩擦力
      restitution: 0.2,     // 降低弹性
      density: 0.001,       // 降低密度，使其下落更慢
    });

    // 更新渲染属性
    this.updateRenderText();
    
    // 添加交易信息到方块的用户数据中
    this.body.render.text = {
      content: `${formatEthAmount(tx.value)}\n${formatAddress(tx.from)} → ${formatAddress(tx.to || '')}`,
      color: '#ffffff',
      size: 14,
      family: 'Arial',
    };
    
    // 将方块添加到物理世界中
    Matter.World.add(engine.world, this.body);

    // 监听碰撞事件
    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        if ((pair.bodyA === this.body || pair.bodyB === this.body) &&
            (pair.bodyA.label === 'ground' || pair.bodyB.label === 'ground')) {
          this.onLand();
        }
      });
    });
  }

  private onLand() {
    if (this.isLanded) return;
    
    this.isLanded = true;
    // 落地后固定位置
    Matter.Body.setStatic(this.body, true);
    // 重置速度和角速度
    Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(this.body, 0);
  }

  private updateRenderText() {
    const confirmationText = this.isConfirming 
      ? `\n确认中: ${this.confirmations}/${this.requiredConfirmations}` 
      : '';

    this.body.render.text = {
      content: `${formatEthAmount(this.tx.value)}\n${formatAddress(this.tx.from)} → ${formatAddress(this.tx.to || '')}${confirmationText}`,
      color: '#ffffff',
      size: 14,
      family: 'Arial',
    };
  }

  /**
   * 更新方块状态
   */
  public update() {
    if (!this.isLanded) {
      // 只在未落地时更新位置
      Matter.Body.setPosition(this.body, {
        x: this.body.position.x,
        y: this.body.position.y + this.speed,
      });
    }
  }

  /**
   * 检查方块是否超出屏幕范围
   * @returns 如果方块超出屏幕返回true，否则返回false
   */
  public isOffScreen(): boolean {
    return this.body.position.y > window.innerHeight + 100;
  }

  /**
   * 获取方块对应的交易哈希
   */
  public getTransactionHash(): string {
    return this.tx.hash;
  }

  /**
   * 设置方块的移动速度
   */
  public setSpeed(speed: number) {
    this.speed = Math.max(0.5, Math.min(5, speed));
  }

  public startConfirming() {
    this.isConfirming = true;
    this.updateRenderText();
  }

  public addConfirmation() {
    this.confirmations++;
    this.updateRenderText();
  }

  public isFullyConfirmed(): boolean {
    return this.confirmations >= this.requiredConfirmations;
  }

  public fadeOut(): boolean {
    if (this.opacity <= 0) return true;
    
    this.opacity -= this.fadeOutSpeed;
    if (this.body.render) {
      this.body.render.opacity = Math.max(0, this.opacity);
    }
    
    return false;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.body.position.x, y: this.body.position.y };
  }
}
