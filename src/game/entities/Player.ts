import Matter from 'matter-js';

export class Player {
  public body: Matter.Body;
  private jumpForce = -10;
  private moveSpeed = 5;
  private canJump = false;

  constructor(engine: Matter.Engine) {
    this.body = Matter.Bodies.rectangle(
      window.innerWidth / 2,
      window.innerHeight - 50,
      30,
      30,
      {
        label: 'player',
        render: {
          fillStyle: '#00ff00'
        }
      }
    );

    Matter.Composite.add(engine.world, this.body);
    this.setupControls();
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          Matter.Body.setVelocity(this.body, {
            x: -this.moveSpeed,
            y: this.body.velocity.y
          });
          break;
        case 'ArrowRight':
          Matter.Body.setVelocity(this.body, {
            x: this.moveSpeed,
            y: this.body.velocity.y
          });
          break;
        case ' ':
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

  public update() {
    // Keep player within bounds
    if (this.body.position.x < 0) {
      Matter.Body.setPosition(this.body, {
        x: 0,
        y: this.body.position.y
      });
    }
    if (this.body.position.x > window.innerWidth) {
      Matter.Body.setPosition(this.body, {
        x: window.innerWidth,
        y: this.body.position.y
      });
    }

    // Check if player can jump
    if (this.body.position.y >= window.innerHeight - 50) {
      this.canJump = true;
    }
  }
}