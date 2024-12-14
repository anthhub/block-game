import { useGameStore } from '../store/gameStore';

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
  /** 网络状态显示元素 */
  private networkStatusElement: HTMLElement;

  /**
   * 创建HUD实例
   * 初始化所有UI元素
   */
  constructor() {
    this.createHUDElements();

    // 订阅游戏状态变化
    useGameStore.subscribe(state => {
      this.updateScore(state.score);
      this.updateLives(state.lives);
    });
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
    hudContainer.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    hudContainer.style.fontSize = '16px';
    hudContainer.style.color = '#ffffff';
    hudContainer.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';

    // 分数和生命值显示
    this.scoreElement = document.createElement('div');
    this.scoreElement.style.fontSize = '24px';
    this.scoreElement.style.marginBottom = '8px';
    hudContainer.appendChild(this.scoreElement);

    this.livesElement = document.createElement('div');
    this.livesElement.style.display = 'flex';
    this.livesElement.style.gap = '4px';
    hudContainer.appendChild(this.livesElement);

    // 网络状态显示
    this.networkStatusElement = document.createElement('div');
    this.networkStatusElement.style.marginTop = '12px';
    this.networkStatusElement.style.fontSize = '14px';
    hudContainer.appendChild(this.networkStatusElement);

    // 游戏结束画面
    this.gameOverElement = document.createElement('div');
    this.gameOverElement.style.position = 'fixed';
    this.gameOverElement.style.top = '0';
    this.gameOverElement.style.left = '0';
    this.gameOverElement.style.width = '100%';
    this.gameOverElement.style.height = '100%';
    this.gameOverElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.gameOverElement.style.display = 'none';
    this.gameOverElement.style.justifyContent = 'center';
    this.gameOverElement.style.alignItems = 'center';
    this.gameOverElement.style.zIndex = '2000';
    this.gameOverElement.style.flexDirection = 'column';

    const gameOverText = document.createElement('div');
    gameOverText.textContent = '游戏结束';
    gameOverText.style.color = '#ffffff';
    gameOverText.style.fontSize = '48px';
    gameOverText.style.marginBottom = '20px';

    const finalScore = document.createElement('div');
    finalScore.style.color = '#ffffff';
    finalScore.style.fontSize = '24px';
    finalScore.style.marginBottom = '30px';

    const restartButton = document.createElement('button');
    restartButton.textContent = '重新开始';
    restartButton.style.padding = '12px 24px';
    restartButton.style.fontSize = '18px';
    restartButton.style.backgroundColor = '#4CAF50';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '4px';
    restartButton.style.cursor = 'pointer';

    restartButton.addEventListener('mouseover', () => {
      restartButton.style.backgroundColor = '#45a049';
    });

    restartButton.addEventListener('mouseout', () => {
      restartButton.style.backgroundColor = '#4CAF50';
    });

    restartButton.addEventListener('click', () => {
      useGameStore.getState().resetGame();
      this.hideGameOver();
      location.reload();
    });

    this.gameOverElement.appendChild(gameOverText);
    this.gameOverElement.appendChild(finalScore);
    this.gameOverElement.appendChild(restartButton);

    useGameStore.subscribe(state => {
      if (state.isGameOver) {
        finalScore.textContent = `最终得分: ${state.score}`;
        this.showGameOver();
      }
    });

    document.body.appendChild(hudContainer);
    document.body.appendChild(this.gameOverElement);

    const gameState = useGameStore.getState();
    this.updateScore(gameState.score);
    this.updateLives(gameState.lives);
  }

  public showGameOver() {
    this.gameOverElement.style.display = 'flex';
  }

  private hideGameOver() {
    this.gameOverElement.style.display = 'none';
  }

  public updateScore(score: number) {
    this.scoreElement.textContent = `分数: ${score}`;
  }

  public updateLives(lives: number) {
    this.livesElement.innerHTML = '';
    const heartIcon = '❤️';
    const emptyHeartIcon = '🖤';
    const maxLives = 2;

    for (let i = 0; i < lives; i++) {
      const heart = document.createElement('span');
      heart.textContent = heartIcon;
      heart.style.fontSize = '20px';
      this.livesElement.appendChild(heart);
    }

    for (let i = lives; i < maxLives; i++) {
      const heart = document.createElement('span');
      heart.textContent = emptyHeartIcon;
      heart.style.fontSize = '20px';
      heart.style.opacity = '0.5';
      this.livesElement.appendChild(heart);
    }
  }

  public updateNetworkStatus(state: {
    gasPrice: number;
    pendingTxCount: number;
    congestionLevel: number;
    blockchainGravity: number;
  }) {
    const congestionText =
      state.congestionLevel < 0.3 ? '流畅' : state.congestionLevel < 0.7 ? '正常' : '拥堵';
    const congestionColor =
      state.congestionLevel < 0.3 ? '#4CAF50' : state.congestionLevel < 0.7 ? '#FFA726' : '#F44336';

    this.networkStatusElement.innerHTML = `
      <div>
        <div style="margin-bottom: 4px;">
          <span style="color: #9E9E9E;">Gas:</span>
          <span>${state.gasPrice.toFixed(1)} Gwei</span>
        </div>
        <div>
          <span style="color: #9E9E9E;">待处理:</span>
          <span>${state.pendingTxCount}笔</span>
          <span style="margin-left: 12px; color: ${congestionColor};">${congestionText}</span>
        </div>
        <div>
          <span style="color: #9E9E9E;">重力:</span>
          <span>${Math.round((state?.blockchainGravity || 0) * 100)}%</span>
        </div>
      </div>
    `;
  }
}
