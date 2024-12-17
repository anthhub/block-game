export const GAME_CONFIG = {
  CANVAS: {
    WIDTH: window.innerWidth,
    HEIGHT: window.innerHeight,
    BACKGROUND_COLOR: '#1a1a1a',
  },
  PLAYER: {
    WIDTH: 30,
    HEIGHT: 30,
    JUMP_FORCE: -18, // 继续增加跳跃力度
    MOVE_SPEED: 5,
    INITIAL_LIVES: 3,
    COLOR: '#00ff00',
  },
  PHYSICS: {
    GRAVITY: {
      BASE: 0.002, // 降低基础重力
      MAX: 0.004, // 降低最大重力
      MIN: 0.001, // 降低最小重力
      SCALE_FACTOR: 1.5, // 降低重力缩放因子
    },
    NETWORK: {
      MAX_GAS_PRICE: 500, // 最大 gas 价格 (Gwei)
      MAX_PENDING_TX: 5000, // 最大待处理交易数
      UPDATE_INTERVAL: 5000, // 网络状态更新间隔 (ms)
      CONGESTION_WEIGHTS: {
        GAS_PRICE: 0.7, // gas 价格权重
        PENDING_TX: 0.3, // 待处理交易权重
      },
    },
    DEFAULT_GRAVITY: 0.4, // 降低默认重力
    LOW_GRAVITY: 0.15, // 降低低重力值
    MIN_FALLING_SPEED: 0.15, // 降低最小下落速度
  },
  POWER_UPS: {
    SIZE: 15,
    SPAWN_CHANCE: 0.6, // 增加道具出现概率
    MAX_POWER_UPS: 3, // 保持最大道具数量为3
    DURATIONS: {
      LOW_GRAVITY: 8000, // 增加到8秒
      SMALL_SIZE: 6000, // 增加到6秒
      INVINCIBILITY: 4000, // 增加到4秒
    },
    BLACK_HOLE: {
      CONGESTION_THRESHOLD: 100, // 降低触发阈值到5%，让黑洞更容易出现
      SPACE_CLICKS_REQUIRED: 1, // 减少所需点击次数到1次
      CLICK_TIMEOUT: 3000, // 增加超时时间到1秒，给玩家更多反应时间
    },
  },
  BLOCK: {
    MIN_SIZE: 20, // 减小最小尺寸
    MAX_SIZE: 60, // 减小最大尺寸
    INITIAL_Y: -50,
    SPAWN_INTERVAL: {
      BASE: 300, // 增加基础生成间隔
      MIN: 200, // 增加最小生成间隔
      MAX: 500, // 增加最大生成间隔
      VARIANCE: 0.8, // 增加随机变化范围
    },
    DIFFICULTY: {
      SPEED_SCALE_BASE: 1.0, // 基础速度系数
      SPEED_SCALE_PER_SCORE: 0.05, // 每得一分增加的速度系数
      MAX_SPEED_SCALE: 5.0, // 最大速度系数
      SCORE_INTERVAL: 1, // 每多少分增加一次难度
    },
    STATUS_UPDATE_INTERVAL: 5000, // 区块状态更新间隔 (ms)
    GAS_PRICE_THRESHOLDS: {
      HIGH: 100,
      MEDIUM: 50,
    },
    COLORS: {
      CONTRACT_CREATION: 'hsl(280, 80%, 50%)', // 紫色
      ERC20_TRANSFER: 'hsl(200, 75%, 50%)', // 蓝色
      HIGH_VALUE: 'hsl(45, 90%, 60%)', // 金色
      HIGH_GAS: 'hsl(0, 80%, 50%)', // 红色
      MEDIUM_GAS: 'hsl(40, 80%, 50%)', // 橙色
      LOW_GAS: 'hsl(200, 60%, 70%)', // 淡蓝色
    },
  },
};
