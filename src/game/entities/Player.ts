import Matter from 'matter-js';
import { GAME_CONFIG } from '../../config/constants';

/**
 * 玩家角色类
 * 处理玩家的移动、跳跃和边界检测
 */
export class Player {
  /** Matter.js 物理引擎中的刚体对象 */
  public body: Matter.Body;
  /** 是否正在跳跃 */
  private isJumping: boolean = false;
  /** 水平移动速度 */
  private moveSpeed: number = GAME_CONFIG.PLAYER.MOVE_SPEED;
  /** 跳跃力度，负值表示向上 */
  private jumpForce: number = GAME_CONFIG.PLAYER.JUMP_FORCE;

  /**
   * 创建玩家角色
   * @param engine - Matter.js 物理引擎实例
   */
  constructor(engine: Matter.Engine) {
    // 创建玩家物理体
    this.body = Matter.Bodies.rectangle(
      window.innerWidth / 2,  // 屏幕中央
      window.innerHeight - 100,  // 距离底部100像素
      GAME_CONFIG.PLAYER.WIDTH,
      GAME_CONFIG.PLAYER.HEIGHT,
      {
        render: {
          fillStyle: GAME_CONFIG.PLAYER.COLOR
        },
        label: 'player',
        inertia: Infinity,  // 防止旋转
        friction: 0.001,    // 很小的摩擦力
        restitution: 0.1    // 很小的弹性
      }
    );

    // 添加到物理世界
    Matter.World.add(engine.world, this.body);

    // 设置键盘控制
    this.setupControls();
  }

  /**
   * 设置键盘控制
   * - 左右方向键：水平移动
   * - 空格键/上方向键/W键：跳跃（需要在地面上）
   */
  private setupControls() {
    window.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          Matter.Body.setVelocity(this.body, {
            x: -this.moveSpeed,
            y: this.body.velocity.y
          });
          break;
        case 'ArrowRight':
        case 'KeyD':
          Matter.Body.setVelocity(this.body, {
            x: this.moveSpeed,
            y: this.body.velocity.y
          });
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          this.jump();
          break;
      }
    });

    // 停止移动
    window.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
        case 'ArrowRight':
        case 'KeyD':
          Matter.Body.setVelocity(this.body, {
            x: 0,
            y: this.body.velocity.y
          });
          break;
      }
    });
  }

  /**
   * 跳跃
   * 只有在地面上时才能跳跃
   */
  private jump() {
    if (!this.isJumping) {
      Matter.Body.setVelocity(this.body, {
        x: this.body.velocity.x,
        y: this.jumpForce
      });
      this.isJumping = true;
    }
  }

  /**
   * 更新玩家状态
   * - 检查是否在地面上
   * - 限制在屏幕范围内
   */
  public update() {
    // 检查是否在地面上
    const groundLevel = window.innerHeight - GAME_CONFIG.PLAYER.HEIGHT / 2;
    if (this.body.position.y >= groundLevel) {
      Matter.Body.setPosition(this.body, {
        x: this.body.position.x,
        y: groundLevel
      });
      this.isJumping = false;
    }

    // 限制在屏幕范围内
    const halfWidth = GAME_CONFIG.PLAYER.WIDTH / 2;
    if (this.body.position.x < halfWidth) {
      Matter.Body.setPosition(this.body, {
        x: halfWidth,
        y: this.body.position.y
      });
    } else if (this.body.position.x > window.innerWidth - halfWidth) {
      Matter.Body.setPosition(this.body, {
        x: window.innerWidth - halfWidth,
        y: this.body.position.y
      });
    }
  }
}