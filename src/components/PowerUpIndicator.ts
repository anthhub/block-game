export class PowerUpIndicator {
  private element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'power-up-indicator';
    document.getElementById('game-container')?.appendChild(this.element);
    this.hide();
  }

  public show(type: string, duration: number) {
    this.element.textContent = `${type} Active!`;
    this.element.style.display = 'block';
    
    setTimeout(() => this.hide(), duration);
  }

  private hide() {
    this.element.style.display = 'none';
  }
}