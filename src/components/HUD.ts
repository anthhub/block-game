export class HUD {
  private scoreElement: HTMLElement;
  private livesElement: HTMLElement;
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    
    this.scoreElement = document.createElement('div');
    this.scoreElement.id = 'score';
    
    this.livesElement = document.createElement('div');
    this.livesElement.id = 'lives';
    
    this.container.appendChild(this.scoreElement);
    this.container.appendChild(this.livesElement);
    
    document.getElementById('game-container')?.appendChild(this.container);
  }

  public updateScore(score: number) {
    this.scoreElement.textContent = `Score: ${score}`;
  }

  public updateLives(lives: number) {
    this.livesElement.textContent = `Lives: ${lives}`;
  }

  public showGameOver(finalScore: number) {
    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over';
    gameOverDiv.innerHTML = `
      <h2>Game Over!</h2>
      <p>Final Score: ${finalScore}</p>
      <button onclick="window.location.reload()">Play Again</button>
    `;
    document.body.appendChild(gameOverDiv);
  }
}