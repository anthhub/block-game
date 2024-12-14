import Matter from 'matter-js';
import { ethers } from 'ethers';
import {
  calculateBlockDimensions,
  calculateBlockPhysics,
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
  private originalColor: string;
  private isFadingOut: boolean = false;
  /** 标记方块是否已被计分 */
  public isScored: boolean = false;
  private lastStatusUpdateTime: number = 0;
  private world: Matter.World;

  /**
   * 创建一个新的方块实例
   * @param engine - Matter.js 物理引擎实例
   * @param tx - 关联的以太坊交易
   * @param world - Matter.js 物理世界实例
   */
  constructor(engine: Matter.Engine, tx: ethers.TransactionResponse, world: Matter.World) {
    this.tx = tx;
    this.world = world;
    this.originalColor = getBlockColor(tx);

    // 计算方块的物理属性
    const physics = calculateBlockPhysics(tx);
    
    // 创建方块
    const options: Matter.IBodyDefinition = {
      label: 'block',
      render: {
        fillStyle: this.originalColor,
        opacity: 1,
      },
      friction: physics.friction,
      frictionAir: 0.01,
      frictionStatic: 1,
      restitution: physics.restitution,
      density: physics.density,
      angle: Math.random() * Math.PI / 4 - Math.PI / 8,
    };

    // 根据是否有自定义形状创建刚体
    if (physics.vertices) {
      this.body = Matter.Bodies.fromVertices(
        Math.random() * (window.innerWidth - physics.size) + physics.size / 2,
        -physics.size,
        [physics.vertices],
        options
      );
    } else {
      this.body = Matter.Bodies.rectangle(
        Math.random() * (window.innerWidth - physics.size) + physics.size / 2,
        -physics.size,
        physics.size,
        physics.size,
        options
      );
    }

    // 设置初始速度和角速度
    Matter.Body.setVelocity(this.body, {
      x: 0,
      y: physics.speed
    });
    Matter.Body.setAngularVelocity(this.body, physics.spin);

    // 将方块添加到物理世界中
    Matter.World.add(engine.world, this.body);

    // 监听碰撞事件
    Matter.Events.on(engine, 'collisionStart', event => {
      event.pairs.forEach(pair => {
        if (
          (pair.bodyA === this.body || pair.bodyB === this.body) &&
          (pair.bodyA.label === 'ground' || pair.bodyB.label === 'ground')
        ) {
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
      Matter.Body.setPosition(this.body, {
        x: this.body.position.x,
        y: this.body.position.y + this.speed,
      });

      // 检查是否已经落地
      if (this.body.position.y >= window.innerHeight - 50) {
        this.isLanded = true;
      }
    }

    if (this.isFadingOut && this.currentScale > 0) {
      // 减小缩放和透明度
      this.currentScale = Math.max(0, this.currentScale - this.fadeSpeed);

      // 更新渲染属性
      if (this.body.render) {
        this.body.render.opacity = this.currentScale;
      }

      // 缩小方块
      const scaleChange = 1 - this.fadeSpeed;
      Matter.Body.scale(this.body, scaleChange, scaleChange);
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
    if (!this.isFadingOut) {
      this.startFadeOut();
      return false;
    }
    return this.currentScale <= 0;
  }

  /**
   * 开始淡出效果
   */
  public startFadeOut() {
    this.isFadingOut = true;
  }

  /**
   * 检查方块是否正在淡出
   */
  public isFading(): boolean {
    return this.isFadingOut;
  }

  /**
   * 获取方块位置
   */
  public getPosition(): { x: number; y: number } {
    return {
      x: this.body.position.x,
      y: this.body.position.y,
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
      height: max.y - min.y,
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

  /**
   * 将方块变成黑色
   */
  public turnBlack() {
    if (this.body.render) {
      this.body.render.fillStyle = '#000000';
    }
  }

  /**
   * 恢复方块原来的颜色
   */
  public restoreColor() {
    if (this.body.render) {
      this.body.render.fillStyle = this.originalColor;
    }
  }

  /**
   * 设置方块是否已被计分
   */
  public setScored(scored: boolean) {
    this.isScored = scored;
  }

  /**
   * 获取方块是否已被计分
   */
  public getIsScored(): boolean {
    return this.isScored;
  }

  /**
   * 获取上次状态更新时间
   */
  public getLastStatusUpdateTime(): number {
    return this.lastStatusUpdateTime;
  }

  /**
   * 更新状态更新时间
   */
  public updateLastStatusUpdateTime(): void {
    this.lastStatusUpdateTime = Date.now();
  }

  /**
   * 检查是否已确认
   */
  public isConfirmed(): boolean {
    return this.confirmations > 0;
  }

  /**
   * 破坏方块
   */
  public destroy(): void {
    if (this.isLanded) {
      // 从物理世界中移除方块
      Matter.World.remove(this.world, this.body);
      console.log('方块已被破坏！');
    }
  }
}
