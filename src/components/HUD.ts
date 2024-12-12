/**
 * 游戏HUD（平视显示器）类
 * 负责显示游戏状态信息，如分数、生命值和游戏结束画面
 */
export class HUD {
  /** 分数显示元素 */
  private scoreElement: HTMLElement;
  /** 生命值显示元素 */
  private livesElement: HTMLElement;
  /** 游戏结束画面元素 */
  private gameOverElement: HTMLElement;
  /** 最终分数显示元素 */
  private finalScoreElement: HTMLElement;
  /** 容器元素 */
  private container: HTMLElement;

  /**
   * 创建HUD实例
   * 初始化所有UI元素
   */
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    
    // 获取或创建分数显示元素
    this.scoreElement = document.getElementById('score') || this.createScoreElement();
    // 获取或创建生命值显示元素
    this.livesElement = document.getElementById('lives') || this.createLivesElement();
    // 获取或创建游戏结束画面元素
    this.gameOverElement = document.getElementById('game-over') || this.createGameOverElement();
    // 获取或创建最终分数显示元素
    this.finalScoreElement = document.getElementById('final-score') || this.createFinalScoreElement();
    
    this.container.appendChild(this.scoreElement);
    this.container.appendChild(this.livesElement);
    
    document.getElementById('game-container')?.appendChild(this.container);
  }

  /**
   * 创建分数显示元素
   * @returns 新创建的分数显示元素
   */
  private createScoreElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'score';
    element.style.position = 'absolute';
    element.style.top = '20px';
    element.style.left = '20px';
    element.style.color = 'white';
    element.style.fontSize = '24px';
    return element;
  }

  /**
   * 创建生命值显示元素
   * @returns 新创建的生命值显示元素
   */
  private createLivesElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'lives';
    element.style.position = 'absolute';
    element.style.top = '50px';
    element.style.left = '20px';
    element.style.color = 'white';
    element.style.fontSize = '24px';
    return element;
  }

  /**
   * 创建游戏结束画面元素
   * @returns 新创建的游戏结束画面元素
   */
  private createGameOverElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'game-over';
    element.style.position = 'absolute';
    element.style.top = '50%';
    element.style.left = '50%';
    element.style.transform = 'translate(-50%, -50%)';
    element.style.color = 'white';
    element.style.fontSize = '48px';
    element.style.display = 'none';
    element.textContent = 'Game Over';
    return element;
  }

  /**
   * 创建最终分数显示元素
   * @returns 新创建的最终分数显示元素
   */
  private createFinalScoreElement(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'final-score';
    element.style.position = 'absolute';
    element.style.top = '60%';
    element.style.left = '50%';
    element.style.transform = 'translate(-50%, -50%)';
    element.style.color = 'white';
    element.style.fontSize = '24px';
    element.style.display = 'none';
    return element;
  }

  /**
   * 更新分数显示
   * @param score - 当前分数
   */
  public updateScore(score: number) {
    this.scoreElement.textContent = `分数: ${score}`;
  }

  /**
   * 更新生命值显示
   * @param lives - 当前生命值
   */
  public updateLives(lives: number) {
    this.livesElement.textContent = `生命: ${lives}`;
  }

  /**
   * 显示游戏结束画面
   * @param finalScore - 最终分数
   */
  public showGameOver(finalScore: number) {
    this.gameOverElement.style.display = 'block';
    this.finalScoreElement.style.display = 'block';
    this.finalScoreElement.textContent = `最终分数: ${finalScore}`;
  }
}