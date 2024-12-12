import Matter from 'matter-js';

/**
 * 玩家角色类
 * 处理玩家的移动、跳跃和边界检测
 */
export class Player {
  /** Matter.js 物理引擎中的刚体对象 */
  public body: Matter.Body;
  /** 跳跃力度，负值表示向上 */
  private jumpForce = -10;
  /** 水平移动速度 */
  private moveSpeed = 5;
  /** 是否可以跳跃（只有在接触地面时才能跳跃） */
  private canJump = false;

  /**
   * 创建玩家角色
   * @param engine - Matter.js 物理引擎实例
   */
  constructor(engine: Matter.Engine) {
    // 在屏幕底部中间创建玩家
    this.body = Matter.Bodies.rectangle(
      window.innerWidth / 2,  // 水平居中
      window.innerHeight - 50, // 距离底部 50 像素
      30, // 宽度
      30, // 高度
      {
        label: 'player',
        render: {
          fillStyle: '#00ff00' // 玩家颜色为绿色
        }
      }
    );

    // 将玩家添加到物理世界
    Matter.Composite.add(engine.world, this.body);
    // 设置键盘控制
    this.setupControls();
  }

  /**
   * 设置键盘控制
   * - 左右方向键：水平移动
   * - 空格键：跳跃（需要在地面上）
   */
  private setupControls() {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          // 向左移动，保持当前垂直速度
          Matter.Body.setVelocity(this.body, {
            x: -this.moveSpeed,
            y: this.body.velocity.y
          });
          break;
        case 'ArrowRight':
          // 向右移动，保持当前垂直速度
          Matter.Body.setVelocity(this.body, {
            x: this.moveSpeed,
            y: this.body.velocity.y
          });
          break;
        case ' ':
          // 如果在地面上，则可以跳跃
          if (this.canJump) {
            Matter.Body.setVelocity(this.body, {
              x: this.body.velocity.x,
              y: this.jumpForce
            });
            this.canJump = false;
          }
          break;
      }
    });
  }

  /**
   * 更新玩家状态
   * - 确保玩家不会超出屏幕边界
   * - 检测是否可以跳跃
   */
  public update() {
    // 防止玩家超出左边界
    if (this.body.position.x < 0) {
      Matter.Body.setPosition(this.body, {
        x: 0,
        y: this.body.position.y
      });
    }
    // 防止玩家超出右边界
    if (this.body.position.x > window.innerWidth) {
      Matter.Body.setPosition(this.body, {
        x: window.innerWidth,
        y: this.body.position.y
      });
    }

    // 当玩家接触地面时，允许跳跃
    if (this.body.position.y >= window.innerHeight - 50) {
      this.canJump = true;
    }
  }
}