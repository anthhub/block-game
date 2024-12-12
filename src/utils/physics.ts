import Matter from 'matter-js';
import { GAME_CONFIG } from '../config/constants';

export const createPhysicsEngine = () => {
  const engine = Matter.Engine.create();
  return engine;
};

export const createRenderer = (engine: Matter.Engine, container: HTMLElement, canvas: HTMLCanvasElement) => {
  return Matter.Render.create({
    element: container,
    engine: engine,
    canvas: canvas,
    options: {
      width: GAME_CONFIG.CANVAS.WIDTH,
      height: GAME_CONFIG.CANVAS.HEIGHT,
      wireframes: false,
      background: GAME_CONFIG.CANVAS.BACKGROUND_COLOR
    }
  });
};

export const isOutOfBounds = (body: Matter.Body, height: number) => {
  return body.position.y > height + 100;
};