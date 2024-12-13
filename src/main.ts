import './styles.css';
import { Engine } from './game/Engine';
import { HUD } from './components/HUD';

// 创建 HUD
const hud = new HUD();

// 创建游戏引擎
const engine = new Engine(hud);

// 游戏循环
function gameLoop() {
  engine.update();
  requestAnimationFrame(gameLoop);
}

// 开始游戏循环
gameLoop();
