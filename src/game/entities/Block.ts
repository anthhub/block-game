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
  private isLanded: boolean = false;
  private confirmations: number = 0;
  private isConfirming: boolean = false;
  private opacity: number = 1;
  private currentScale: number = 1;
  private fadeSpeed: number = 0.05;
  private isSelected: boolean = false;

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
   * 获取交易哈希
   */
  public getTransactionHash(): string {
    return this.tx.hash;
  }

  /**
   * 开始确认过程
   */
  public startConfirming(): void {
    this.isConfirming = true;
  }

  /**
   * 添加一个确认
   */
  public addConfirmation(): void {
    this.confirmations++;
  }

  /**
   * 设置区块的确认数
   */
  public setConfirmations(count: number): void {
    this.confirmations = count;
    if (count >= 3) {
      this.isConfirming = true;
    }
  }

  /**
   * 获取确认数
   */
  public getConfirmations(): number {
    return this.confirmations;
  }

  /**
   * 检查是否完全确认
   */
  public isFullyConfirmed(): boolean {
    return this.confirmations >= 3; // 需要3个确认
  }

  /**
   * 淡出效果
   * @returns 如果淡出完成返回true
   */
  public fadeOut(): boolean {
    if (this.isFullyConfirmed()) {
      // 计算新的缩放比例和透明度
      this.opacity = Math.max(0, this.opacity - this.fadeSpeed);
      const newScale = Math.max(0.1, this.currentScale - this.fadeSpeed);
      
      // 计算相对缩放比例
      const scaleRatio = newScale / this.currentScale;
      this.currentScale = newScale;
      
      // 更新渲染属性
      this.body.render.opacity = this.opacity;
      Matter.Body.scale(this.body, scaleRatio, scaleRatio);
      
      // 当透明度为0时完成淡出
      return this.opacity <= 0;
    }
    return false;
  }

  /**
   * 获取方块位置
   */
  public getPosition(): { x: number, y: number } {
    return {
      x: this.body.position.x,
      y: this.body.position.y
    };
  }

  /**
   * 获取原始交易对象
   */
  public getTransaction(): ethers.TransactionResponse {
    return this.tx;
  }

  /**
   * 获取交易详情
   */
  public getTransactionDetails(): {
    hash: string;
    from: string;
    to: string;
    value: string;
    gasPrice: string;
    gasLimit: string;
  } {
    return {
      hash: this.tx.hash,
      from: this.tx.from,
      to: this.tx.to || '',
      value: ethers.formatEther(this.tx.value),
      gasPrice: ethers.formatUnits(this.tx.gasPrice || 0n, 'gwei'),
      gasLimit: this.tx.gasLimit.toString(),
    };
  }

  /**
   * 获取方块的位置和尺寸
   */
  public getBounds(): { x: number; y: number; width: number; height: number } {
    const { min, max } = this.body.bounds;
    return {
      x: min.x,
      y: min.y,
      width: max.x - min.x,
      height: max.y - min.y
    };
  }

  /**
   * 设置方块下落速度
   */
  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * 设置选中状态
   */
  public setSelected(selected: boolean) {
    this.isSelected = selected;
    if (this.body.render) {
      const render = this.body.render as any;
      if (selected) {
        render.strokeStyle = '#ffffff';
        render.lineWidth = 2;
      } else {
        render.strokeStyle = 'transparent';
        render.lineWidth = 0;
      }
    }
  }

  /**
   * 获取选中状态
   */
  public isBlockSelected(): boolean {
    return this.isSelected;
  }
}
