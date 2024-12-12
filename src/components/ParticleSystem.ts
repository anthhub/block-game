import Matter from 'matter-js';

/**
 * 粒子系统类
 * 负责创建和管理游戏中的粒子效果，如爆炸、碰撞等视觉效果
 */
export class ParticleSystem {
  /** Matter.js 物理引擎实例 */
  private engine: Matter.Engine;
  /** 活跃的粒子列表 */
  private particles: Matter.Body[] = [];
  /** 粒子生命周期（毫秒） */
  private particleLifetime = 1000;

  /**
   * 创建粒子系统实例
   * @param engine - Matter.js 物理引擎实例
   */
  constructor(engine: Matter.Engine) {
    this.engine = engine;
  }

  /**
   * 创建爆炸效果
   * 在指定位置生成多个粒子，模拟爆炸效果
   * @param x - 爆炸中心x坐标
   * @param y - 爆炸中心y坐标
   * @param color - 粒子颜色
   * @param particleCount - 粒子数量，默认为8
   */
  public createExplosion(x: number, y: number, color: string, particleCount: number = 8) {
    for (let i = 0; i < particleCount; i++) {
      // 计算粒子的初始速度方向
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = {
        x: Math.cos(angle) * 5,
        y: Math.sin(angle) * 5
      };

      // 创建粒子
      const particle = this.createParticle(x, y, color);
      Matter.Body.setVelocity(particle, velocity);
      
      // 将粒子添加到物理引擎和粒子列表中
      Matter.World.add(this.engine.world, particle);
      this.particles.push(particle);

      // 设置粒子生命周期
      setTimeout(() => {
        Matter.World.remove(this.engine.world, particle);
        this.particles = this.particles.filter(p => p !== particle);
      }, this.particleLifetime);
    }
  }

  /**
   * 创建单个粒子
   * @param x - 粒子x坐标
   * @param y - 粒子y坐标
   * @param color - 粒子颜色
   * @returns Matter.js物理体
   */
  private createParticle(x: number, y: number, color: string): Matter.Body {
    return Matter.Bodies.circle(x, y, 3, {
      friction: 0,
      frictionAir: 0.02,
      restitution: 0.8,
      render: {
        fillStyle: color
      }
    });
  }

  /**
   * 清理所有粒子
   * 从物理引擎中移除所有活跃的粒子
   */
  public cleanup() {
    this.particles.forEach(particle => {
      Matter.World.remove(this.engine.world, particle);
    });
    this.particles = [];
  }
}