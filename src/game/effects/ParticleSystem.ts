import Matter from 'matter-js';

interface Particle {
  body: Matter.Body;
  life: number;
  maxLife: number;
  color: string;
}

export class ParticleSystem {
  private engine: Matter.Engine;
  private particles: Particle[] = [];
  private updateInterval: number | null = null;

  constructor(engine: Matter.Engine) {
    this.engine = engine;
    // 启动更新循环
    this.startUpdateLoop();
  }

  private startUpdateLoop() {
    // 确保只有一个更新循环在运行
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
    }
    
    // 每16ms（约60fps）更新一次
    this.updateInterval = window.setInterval(() => {
      this.update();
    }, 16);
  }

  public createExplosion(x: number, y: number, color: string, particleCount: number = 8) {
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 3 + Math.random() * 3; // 降低速度
      const size = 2 + Math.random() * 3;  // 减小粒子大小

      const particle = Matter.Bodies.circle(x, y, size, {
        friction: 0.1,      // 增加摩擦力
        frictionAir: 0.05,  // 增加空气阻力
        restitution: 0.5,   // 降低弹性
        isSensor: true,     // 防止与其他物体碰撞
        render: {
          fillStyle: color,
          opacity: 1
        },
      });

      // 设置初始速度
      Matter.Body.setVelocity(particle, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      });

      particles.push({
        body: particle,
        life: 30, // 减少生命周期到30帧
        maxLife: 30,
        color,
      });

      Matter.World.add(this.engine.world, particle);
    }

    this.particles.push(...particles);
  }

  public update() {
    const particlesToRemove: Matter.Body[] = [];
    
    this.particles = this.particles.filter(particle => {
      particle.life--;

      // 根据生命周期更新透明度
      const alpha = particle.life / particle.maxLife;
      if (particle.body.render) {
        (particle.body.render as any).opacity = alpha;
      }

      if (particle.life <= 0) {
        particlesToRemove.push(particle.body);
        return false;
      }

      return true;
    });

    // 批量移除粒子
    if (particlesToRemove.length > 0) {
      Matter.World.remove(this.engine.world, particlesToRemove);
    }
  }

  public cleanup() {
    // 清理所有粒子
    if (this.particles.length > 0) {
      const bodies = this.particles.map(p => p.body);
      Matter.World.remove(this.engine.world, bodies);
      this.particles = [];
    }

    // 停止更新循环
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}
