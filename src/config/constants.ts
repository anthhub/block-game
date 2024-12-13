export const GAME_CONFIG = {
  CANVAS: {
    WIDTH: window.innerWidth,
    HEIGHT: window.innerHeight,
    BACKGROUND_COLOR: '#1a1a1a'
  },
  PLAYER: {
    WIDTH: 30,
    HEIGHT: 30,
    JUMP_FORCE: -10,
    MOVE_SPEED: 5,
    INITIAL_LIVES: 3,
    COLOR: '#00ff00'
  },
  PHYSICS: {
    GRAVITY: {
      BASE: 0.001,      // 基础重力
      MAX: 0.003,       // 最大重力（高拥堵时）
      MIN: 0.0005,      // 最小重力（低拥堵时）
      SCALE_FACTOR: 2,  // 重力缩放因子
    },
    NETWORK: {
      MAX_GAS_PRICE: 500,           // 最大 gas 价格 (Gwei)
      MAX_PENDING_TX: 5000,         // 最大待处理交易数
      UPDATE_INTERVAL: 5000,        // 网络状态更新间隔 (ms)
      CONGESTION_WEIGHTS: {
        GAS_PRICE: 0.7,             // gas 价格权重
        PENDING_TX: 0.3             // 待处理交易权重
      }
    },
    DEFAULT_GRAVITY: 0.5,
    LOW_GRAVITY: 0.2,
    MIN_FALLING_SPEED: 1, // 最小下落速度，低于这个速度不算碰撞
  },
  POWER_UPS: {
    SIZE: 15,
    SPAWN_CHANCE: 0.8,
    MAX_POWER_UPS: 2, // 改为最多2个道具
    DURATIONS: {
      LOW_GRAVITY: 5000,
      SMALL_SIZE: 3000,
      INVINCIBILITY: 2000
    }
  },
  BLOCK: {
    MIN_SIZE: 30,
    MAX_SIZE: 100,
    INITIAL_Y: -50,
    SPAWN_INTERVAL: {
      BASE: 1000,      // 基础生成间隔 (ms)
      MIN: 500,        // 最小生成间隔
      MAX: 2000,       // 最大生成间隔
      VARIANCE: 0.3    // 随机变化范围 (±30%)
    },
    GAS_PRICE_THRESHOLDS: {
      HIGH: 100,
      MEDIUM: 50
    },
    COLORS: {
      CONTRACT_CREATION: 'hsl(280, 80%, 50%)',    // 紫色
      ERC20_TRANSFER: 'hsl(200, 75%, 50%)',       // 蓝色
      HIGH_VALUE: 'hsl(45, 90%, 60%)',            // 金色
      HIGH_GAS: 'hsl(0, 80%, 50%)',               // 红色
      MEDIUM_GAS: 'hsl(40, 80%, 50%)',            // 橙色
      LOW_GAS: 'hsl(200, 60%, 70%)'               // 淡蓝色
    }
  }
};