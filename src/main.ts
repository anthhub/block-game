import './styles.css';
import { Engine } from './game/Engine';
import { useGameStore } from './store/gameStore';
import { HUD } from './components/HUD';

const gameState = useGameStore.getState();
const hud = new HUD();
const game = new Engine(gameState, hud);

function gameLoop() {
  game.update();
  requestAnimationFrame(gameLoop);
}

gameLoop();