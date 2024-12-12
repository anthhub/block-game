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

  constructor(engine: Matter.Engine) {
    this.engine = engine;
  }

  public createExplosion(x: number, y: number, color: string, particleCount: number = 10) {
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 5 + Math.random() * 5;
      const size = 3 + Math.random() * 5;

      const particle = Matter.Bodies.circle(x, y, size, {
        friction: 0,
        frictionAir: 0.02,
        restitution: 0.8,
        render: {
          fillStyle: color,
        },
      });

      // 设置初始速度
      Matter.Body.setVelocity(particle, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      });

      particles.push({
        body: particle,
        life: 60, // 粒子存活60帧
        maxLife: 60,
        color,
      });

      Matter.World.add(this.engine.world, particle);
    }

    this.particles.push(...particles);
  }

  public update() {
    this.particles = this.particles.filter(particle => {
      particle.life--;

      // 根据生命周期更新透明度
      const alpha = particle.life / particle.maxLife;
      if (particle.body.render) {
        particle.body.render.opacity = alpha;
      }

      if (particle.life <= 0) {
        Matter.World.remove(this.engine.world, particle.body);
        return false;
      }

      return true;
    });
  }

  public cleanup() {
    this.particles.forEach(particle => {
      Matter.World.remove(this.engine.world, particle.body);
    });
    this.particles = [];
  }
}
