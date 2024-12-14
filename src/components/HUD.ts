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
    hudContainer.style.fontSize = '24px';
    hudContainer.style.color = '#ffffff';
    hudContainer.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';

    // 分数显示
    this.scoreElement = document.createElement('div');
    this.scoreElement.style.marginBottom = '10px';
    hudContainer.appendChild(this.scoreElement);

    // 生命值显示
    this.livesElement = document.createElement('div');
    this.livesElement.style.display = 'flex';
    this.livesElement.style.alignItems = 'center';
    this.livesElement.style.gap = '5px';
    hudContainer.appendChild(this.livesElement);

    // 网络状态显示
    this.networkStatusElement = document.createElement('div');
    this.networkStatusElement.style.marginTop = '10px';
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
    restartButton.style.padding = '15px 30px';
    restartButton.style.fontSize = '20px';
    restartButton.style.backgroundColor = '#4CAF50';
    restartButton.style.color = 'white';
    restartButton.style.border = 'none';
    restartButton.style.borderRadius = '5px';
    restartButton.style.cursor = 'pointer';
    restartButton.style.transition = 'background-color 0.3s';

    restartButton.addEventListener('mouseover', () => {
      restartButton.style.backgroundColor = '#45a049';
    });

    restartButton.addEventListener('mouseout', () => {
      restartButton.style.backgroundColor = '#4CAF50';
    });

    restartButton.addEventListener('click', () => {
      useGameStore.getState().resetGame();
      this.hideGameOver();
      location.reload(); // 重新加载页面以重置游戏状态
    });

    this.gameOverElement.appendChild(gameOverText);
    this.gameOverElement.appendChild(finalScore);
    this.gameOverElement.appendChild(restartButton);

    // 订阅游戏状态变化
    useGameStore.subscribe(state => {
      if (state.isGameOver) {
        finalScore.textContent = `最终得分: ${state.score}`;
        this.showGameOver();
      }
    });

    document.body.appendChild(hudContainer);
    document.body.appendChild(this.gameOverElement);

    // 初始化显示
    const gameState = useGameStore.getState();
    this.updateScore(gameState.score);
    this.updateLives(gameState.lives);
  }

  /**
   * 显示游戏结束画面
   */
  public showGameOver() {
    this.gameOverElement.style.display = 'flex';
  }

  /**
   * 隐藏游戏结束画面
   */
  private hideGameOver() {
    this.gameOverElement.style.display = 'none';
  }

  /**
   * 更新分数显示
   */
  public updateScore(score: number) {
    this.scoreElement.textContent = `分数: ${score}`;
  }

  /**
   * 更新生命值显示
   */
  public updateLives(lives: number) {
    this.livesElement.innerHTML = '';
    const heartIcon = '❤️';
    const emptyHeartIcon = '🖤';
    const maxLives = 2;

    // 显示当前生命值
    for (let i = 0; i < lives; i++) {
      const heart = document.createElement('span');
      heart.textContent = heartIcon;
      heart.style.fontSize = '28px';
      this.livesElement.appendChild(heart);
    }

    // 显示失去的生命值
    for (let i = lives; i < maxLives; i++) {
      const heart = document.createElement('span');
      heart.textContent = emptyHeartIcon;
      heart.style.fontSize = '28px';
      heart.style.opacity = '0.5';
      this.livesElement.appendChild(heart);
    }
  }

  /**
   * 更新网络状态显示
   */
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
    const congestionPercentage = Math.round(state.congestionLevel * 100);
    const gravityPercentage = Math.round(state.blockchainGravity * 100);
    const gravityLevel = Math.min(Math.round(state.blockchainGravity * 5), 5);
    const gravityColor = '#2196F3';

    this.networkStatusElement.innerHTML = `
      <div style="
        background: rgba(0, 0, 0, 0.4);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 14px;
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        ">
          <div>
            <span style="color: #9E9E9E;">Gas</span>
            <span style="color: #fff; margin-left: 4px;">${state.gasPrice.toFixed(1)} Gwei</span>
          </div>
          <div>
            <span style="color: #9E9E9E;">待处理</span>
            <span style="color: #fff; margin-left: 4px;">${state.pendingTxCount}笔</span>
          </div>
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span style="
              width: 6px;
              height: 6px;
              background: ${congestionColor};
              border-radius: 50%;
              display: inline-block;
              box-shadow: 0 0 4px ${congestionColor};
            "></span>
            <span style="color: ${congestionColor};">${congestionText}</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <div style="
              width: 100%;
              height: 2px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 1px;
              overflow: hidden;
            ">
              <div style="
                width: ${congestionPercentage}%;
                height: 100%;
                background: ${congestionColor};
                transition: all 0.3s ease;
              "></div>
            </div>
            <div style="
              display: flex;
              justify-content: space-between;
              margin-top: 4px;
              font-size: 12px;
              color: #9E9E9E;
            ">
              <span>拥堵度 ${congestionPercentage}%</span>
              <span>${Math.max(5, Math.round(15 * state.congestionLevel))}秒确认</span>
            </div>
          </div>

          <div style="
            width: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 0 4px;
          "></div>

          <div style="flex: 1;">
            <div style="
              width: 100%;
              height: 2px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 1px;
              overflow: hidden;
            ">
              <div style="
                width: ${gravityPercentage}%;
                height: 100%;
                background: ${gravityColor};
                transition: all 0.3s ease;
              "></div>
            </div>
            <div style="
              display: flex;
              justify-content: space-between;
              margin-top: 4px;
              font-size: 12px;
            ">
              <span style="color: ${gravityColor};">
                ${'●'.repeat(gravityLevel)}${'○'.repeat(5 - gravityLevel)}
              </span>
              <span style="color: #9E9E9E;">重力 ${gravityPercentage}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
