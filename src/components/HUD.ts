/**
 * 游戏HUD（平视显示器）类
 * 负责显示游戏状态信息，如分数、生命值和游戏结束画面
 */
export class HUD {
  /** 当前分数 */
  private score: number = 0;
  /** 当前生命值 */
  private lives: number = 3;
  /** 分数显示元素 */
  private scoreElement: HTMLElement;
  /** 生命值显示元素 */
  private livesElement: HTMLElement;
  /** 游戏结束画面元素 */
  private gameOverElement: HTMLElement;
  /** 网络状态显示元素 */
  private networkStatusElement: HTMLElement;

  /**
   * 创建HUD实例
   * 初始化所有UI元素
   */
  constructor() {
    this.createHUDElements();
  }

  /**
   * 创建HUD元素
   */
  private createHUDElements() {
    const hudContainer = document.createElement('div');
    hudContainer.style.position = 'fixed';
    hudContainer.style.top = '20px';
    hudContainer.style.left = '20px';
    hudContainer.style.zIndex = '1000';
    hudContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    hudContainer.style.fontSize = '16px';
    hudContainer.style.color = '#ffffff';
    hudContainer.style.textShadow = '0 2px 4px rgba(0,0,0,0.3)';

    // 分数显示
    this.scoreElement = document.createElement('div');
    this.scoreElement.style.marginBottom = '10px';
    this.updateScore(0);
    hudContainer.appendChild(this.scoreElement);

    // 生命值显示
    this.livesElement = document.createElement('div');
    this.updateLives(3);
    hudContainer.appendChild(this.livesElement);

    // 网络状态显示
    this.networkStatusElement = document.createElement('div');
    this.networkStatusElement.style.marginTop = '20px';
    this.networkStatusElement.style.fontSize = '14px';
    this.networkStatusElement.style.opacity = '0.8';
    hudContainer.appendChild(this.networkStatusElement);

    // 游戏结束显示
    this.gameOverElement = document.createElement('div');
    this.gameOverElement.style.position = 'fixed';
    this.gameOverElement.style.top = '50%';
    this.gameOverElement.style.left = '50%';
    this.gameOverElement.style.transform = 'translate(-50%, -50%)';
    this.gameOverElement.style.textAlign = 'center';
    this.gameOverElement.style.color = '#ffffff';
    this.gameOverElement.style.fontSize = '32px';
    this.gameOverElement.style.fontWeight = 'bold';
    this.gameOverElement.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
    this.gameOverElement.style.display = 'none';
    this.gameOverElement.style.zIndex = '2000';

    document.body.appendChild(hudContainer);
    document.body.appendChild(this.gameOverElement);
  }

  /**
   * 更新分数显示
   * @param score - 当前分数
   */
  public updateScore(score: number) {
    this.score = score;
    this.scoreElement.textContent = `分数: ${score}`;
  }

  /**
   * 更新生命值显示
   * @param lives - 当前生命值
   */
  public updateLives(lives: number) {
    this.lives = lives;
    this.livesElement.textContent = `生命: ${lives}`;
  }

  /**
   * 更新网络状态显示
   * @param state - 网络状态信息
   */
  public updateNetworkStatus(state: { gasPrice: number, pendingTxCount: number, congestionLevel: number }) {
    const congestionText = state.congestionLevel < 0.3 ? '流畅' :
                          state.congestionLevel < 0.7 ? '正常' : '拥堵';
    const congestionColor = state.congestionLevel < 0.3 ? '#4CAF50' :
                           state.congestionLevel < 0.7 ? '#FFA726' : '#F44336';

    this.networkStatusElement.innerHTML = `
      <div style="margin-bottom: 4px;">
        <span style="color: #9E9E9E;">Gas Price:</span> ${state.gasPrice.toFixed(1)} Gwei
      </div>
      <div style="margin-bottom: 4px;">
        <span style="color: #9E9E9E;">待处理交易:</span> ${state.pendingTxCount}
      </div>
      <div>
        <span style="color: #9E9E9E;">网络状态:</span> 
        <span style="color: ${congestionColor}; font-weight: 500;">${congestionText}</span>
      </div>
    `;
  }

  /**
   * 显示游戏结束画面
   * @param finalScore - 最终分数
   */
  public showGameOver(finalScore: number) {
    this.gameOverElement.style.display = 'block';
    this.gameOverElement.textContent = `Game Over\n最终分数: ${finalScore}`;
  }
}