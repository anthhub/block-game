import Matter from 'matter-js';

export class ParticleSystem {
  private particles: Matter.Body[] = [];
  private engine: Matter.Engine;

  constructor(engine: Matter.Engine) {
    this.engine = engine;
  }

  public createExplosion(x: number, y: number, color: string) {
    const particleCount = 8;
    const speed = 5;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const particle = Matter.Bodies.circle(x, y, 2, {
        render: { fillStyle: color },
        frictionAir: 0.05,
        isStatic: false,
      });

      Matter.Body.setVelocity(particle, {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      });

      this.particles.push(particle);
      Matter.Composite.add(this.engine.world, particle);
    }

    setTimeout(() => this.removeParticles(), 1000);
  }

  private removeParticles() {
    this.particles.forEach(particle => {
      Matter.Composite.remove(this.engine.world, particle);
    });
    this.particles = [];
  }
}