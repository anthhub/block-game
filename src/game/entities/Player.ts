import Matter from 'matter-js';
import { GAME_CONFIG } from '../../config/constants';
import { BlockManager } from '../managers/BlockManager';
import { MusicSystem } from '../audio/MusicSystem';

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
  /** 物理引擎实例 */
  private engine: Matter.Engine;
  /** 是否处于无敌状态 */
  private isInvincible: boolean = false;
  /** 无敌状态下的闪烁效果计时器 */
  private invincibilityBlinkTimer: number = 0;
  /** 是否按下了向下键 */
  private isPressingDown: boolean = false;
  private blockManager: BlockManager;
  private musicSystem: MusicSystem;

  /**
   * 创建玩家角色
   * @param engine - Matter.js 物理引擎实例
   * @param blockManager - BlockManager 实例
   * @param musicSystem - MusicSystem 实例
   */
  constructor(engine: Matter.Engine, blockManager: BlockManager, musicSystem: MusicSystem) {
    this.engine = engine;
    this.blockManager = blockManager;
    this.musicSystem = musicSystem;

    // 创建玩家物理体
    this.body = Matter.Bodies.rectangle(
      GAME_CONFIG.CANVAS.WIDTH / 2, // 屏幕中央
      GAME_CONFIG.CANVAS.HEIGHT - 100, // 距离底部100像素
      GAME_CONFIG.PLAYER.WIDTH,
      GAME_CONFIG.PLAYER.HEIGHT,
      {
        render: {
          fillStyle: GAME_CONFIG.PLAYER.COLOR,
        },
        label: 'player',
        inertia: Infinity, // 防止旋转
        friction: 0.001, // 很小的摩擦力
        restitution: 0.1, // 很小的弹性
      }
    );

    // 将玩家添加到物理世界
    Matter.Composite.add(engine.world, this.body);

    // 设置键盘控制
    this.setupControls();

    // 设置触摸控制
    this.setupTouchControls();

    // 设置碰撞检测
    this.setupCollisions();
  }

  /**
   * 设置碰撞检测
   */
  private setupCollisions() {
    Matter.Events.on(this.engine, 'collisionStart', event => {
      event.pairs.forEach(pair => {
        if (pair.bodyA === this.body || pair.bodyB === this.body) {
          // 检查碰撞的垂直分量
          const otherBody = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;
          const relativeVelocity = {
            x: this.body.velocity.x - otherBody.velocity.x,
            y: this.body.velocity.y - otherBody.velocity.y,
          };

          // 如果垂直速度向下，说明是从上方碰撞，可以跳跃
          if (relativeVelocity.y > 0) {
            this.isJumping = false;
          }
        }
      });
    });

    Matter.Events.on(this.engine, 'collisionEnd', event => {
      event.pairs.forEach(pair => {
        if (pair.bodyA === this.body || pair.bodyB === this.body) {
          // 当离开碰撞物体时，检查是否还有其他碰撞
          const collisions = Matter.Query.collides(
            this.body,
            Matter.Composite.allBodies(this.engine.world)
          );
          if (collisions.length === 0) {
            this.isJumping = true;
          }
        }
      });
    });
  }

  private setupControls() {
    document.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowLeft':
          Matter.Body.setVelocity(this.body, {
            x: -this.moveSpeed,
            y: this.body.velocity.y,
          });
          break;
        case 'ArrowRight':
          Matter.Body.setVelocity(this.body, {
            x: this.moveSpeed,
            y: this.body.velocity.y,
          });
          break;
        case ' ':
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.jump();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.isPressingDown = true;
          // 如果正在跳跃中，降低跳跃高度
          if (this.isJumping && this.body.velocity.y < 0) {
            Matter.Body.setVelocity(this.body, {
              x: this.body.velocity.x,
              y: this.body.velocity.y * 0.5, // 降低向上的速度
            });
          }
          break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'ArrowDown':
        case 's':
        case 'S':
          this.isPressingDown = false;
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          Matter.Body.setVelocity(this.body, {
            x: 0,
            y: this.body.velocity.y,
          });
          break;
      }
    });
  }

  private setupTouchControls() {
    let touchStartY = 0;
    let touchStartX = 0;

    document.addEventListener('touchstart', (event) => {
      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
    });

    document.addEventListener('touchmove', (event) => {
      const touchY = event.touches[0].clientY;
      const touchX = event.touches[0].clientX;
      const deltaY = touchY - touchStartY;
      const deltaX = touchX - touchStartX;

      // 向下滑动
      if (deltaY > 50) {
        this.isPressingDown = true;
        if (this.isJumping && this.body.velocity.y < 0) {
          Matter.Body.setVelocity(this.body, {
            x: this.body.velocity.x,
            y: this.body.velocity.y * 0.5,
          });
        }
      }
      // 向上滑动
      else if (deltaY < -50) {
        this.jump();
      }

      // 水平移动
      if (Math.abs(deltaX) > 30) {
        Matter.Body.setVelocity(this.body, {
          x: deltaX > 0 ? this.moveSpeed : -this.moveSpeed,
          y: this.body.velocity.y,
        });
      }
    });

    document.addEventListener('touchend', () => {
      this.isPressingDown = false;
      Matter.Body.setVelocity(this.body, {
        x: 0,
        y: this.body.velocity.y,
      });
    });
  }

  /**
   * 跳跃
   * 只有在地面上或其他物体上时才能跳跃
   */
  private jump() {
    if (!this.isJumping) {
      Matter.Body.setVelocity(this.body, {
        x: this.body.velocity.x,
        y: this.jumpForce,
      });
      this.isJumping = true;
      this.musicSystem.playJumpSound();
    }
  }

  /**
   * 设置无敌状态
   * @param invincible - 是否无敌
   */
  public setInvincible(invincible: boolean) {
    this.isInvincible = invincible;
    // 重置闪烁计时器
    this.invincibilityBlinkTimer = 0;
  }

  /**
   * 获取无敌状态
   */
  public getInvincible(): boolean {
    return this.isInvincible;
  }

  /**
   * 更新玩家状态
   * - 检查是否在地面上
   * - 限制在屏幕范围内
   */
  public update() {
    // 检查是否在地面上
    const groundLevel = GAME_CONFIG.CANVAS.HEIGHT - GAME_CONFIG.PLAYER.HEIGHT / 2;
    if (this.body.position.y >= groundLevel) {
      Matter.Body.setPosition(this.body, {
        x: this.body.position.x,
        y: groundLevel,
      });
      this.isJumping = false;
    }

    // 如果按下向下键，增加下落速度
    if (this.isPressingDown && this.body.velocity.y > 0) {
      Matter.Body.setVelocity(this.body, {
        x: this.body.velocity.x,
        y: this.body.velocity.y * 1.1, // 增加下落速度
      });
    }

    // 限制在屏幕范围内
    const halfWidth = GAME_CONFIG.PLAYER.WIDTH / 2;
    if (this.body.position.x < halfWidth) {
      Matter.Body.setPosition(this.body, {
        x: halfWidth,
        y: this.body.position.y,
      });
    } else if (this.body.position.x > GAME_CONFIG.CANVAS.WIDTH - halfWidth) {
      Matter.Body.setPosition(this.body, {
        x: GAME_CONFIG.CANVAS.WIDTH - halfWidth,
        y: this.body.position.y,
      });
    }

    // 无敌状态闪烁效果
    if (this.isInvincible) {
      this.invincibilityBlinkTimer += 1;
      if (this.invincibilityBlinkTimer % 10 < 5) {
        this.body.render.opacity = 0.5;
      } else {
        this.body.render.opacity = 1;
      }
    } else {
      this.body.render.opacity = 1;
    }
  }
}
