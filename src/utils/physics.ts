import Matter from 'matter-js';

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
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false,
      background: '#1a1a1a'
    }
  });
};

export const isOutOfBounds = (body: Matter.Body, height: number) => {
  return body.position.y > height + 100;
};