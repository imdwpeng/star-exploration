// 星系和关卡配置
const LevelConfig = {
  // 星系配置
  galaxies: [
    {
      id: 1,
      name: '新星摇篮',
      theme: 'soft',
      coreMechanic: 'gravity',
      description: '探险起点，协助AI重启观测站。',
      artStyle: '柔和明亮，低饱和度星云，方块带温和光晕。',
      levels: [
        { id: 1, name: '初次接触', target: '零风险教学基础操作', timeLimit: 0, blockCount: 72, blockTypes: 4, layout: '3层(5x5x3 - 3)' },
        { id: 2, name: '引力路径', target: '理解操作顺序性', timeLimit: 0, blockCount: 78, blockTypes: 4, layout: '3层(5x5x3 + 3)' },
        { id: 3, name: '选择之重', target: '基于槽内状态做决策', timeLimit: 0, blockCount: 84, blockTypes: 5, layout: '3层(5x6x3 - 6)' },
        { id: 4, name: '立体收割', target: '高效获取资源', timeLimit: 0, blockCount: 90, blockTypes: 5, layout: '3层(5x6x3)' },
        { id: 5, name: '障碍初现', target: '固定障碍下的运用', timeLimit: 0, blockCount: 96, blockTypes: 6, layout: '4层(5x5x4 - 4)' },
        { id: 6, name: '引力风暴', target: '时间压力下运用', timeLimit: 60, blockCount: 102, blockTypes: 6, layout: '4层(5x5x4 + 2)' },
        { id: 7, name: '精密架构', target: '多步精密规划解谜', timeLimit: 0, blockCount: 108, blockTypes: 7, layout: '4层(5x5x4 + 8)' },
        { id: 8, name: '核心重启', target: '综合运用本章技巧', timeLimit: 75, blockCount: 114, blockTypes: 7, layout: '4层(5x6x4 - 6)' }
      ]
    },
    {
      id: 2,
      name: '锈蚀星带',
      theme: 'steampunk',
      coreMechanic: 'energyNode',
      description: '探索被废弃的工业星系，修复工厂。',
      artStyle: '蒸汽朋克与锈蚀感，黄铜、铁锈色调，机械元素。',
      levels: [
        { id: 1, name: '能量节点', target: '认识节点与充能', timeLimit: 0, blockCount: 120, blockTypes: 7, layout: '4层(5x6x4)' },
        { id: 2, name: '目标规划', target: '学习为节点创造条件', timeLimit: 0, blockCount: 126, blockTypes: 7, layout: '4层(5x6x4 + 6)' },
        { id: 3, name: '双芯共鸣', target: '管理多个节点目标', timeLimit: 0, blockCount: 132, blockTypes: 8, layout: '4层(5x7x4 - 8)' },
        { id: 4, name: '节点与资源', target: '将机制与资源结合', timeLimit: 0, blockCount: 138, blockTypes: 8, layout: '4层(6x6x4 - 6)' },
        { id: 5, name: '屏障节点', target: '增加达成步骤', timeLimit: 0, blockCount: 144, blockTypes: 9, layout: '4层(6x6x4)' },
        { id: 6, name: '超载协议', target: '时间压力下的管理', timeLimit: 75, blockCount: 150, blockTypes: 9, layout: '4层(6x6x4 + 6)' },
        { id: 7, name: '节点矩阵', target: '复杂解谜连锁', timeLimit: 0, blockCount: 156, blockTypes: 10, layout: '4层(6x7x4 - 12)' },
        { id: 8, name: '工厂重启', target: '综合挑战', timeLimit: 90, blockCount: 162, blockTypes: 10, layout: '4层(6x7x4 - 6)' }
      ]
    },
    {
      id: 3,
      name: '星云迷雾',
      theme: 'fog',
      coreMechanic: 'fogExploration',
      description: '穿越未知的星云区域，绘制星图。',
      artStyle: '星云迷雾，深空紫与星云蓝，发光方块穿透迷雾。',
      levels: [
        { id: 1, name: '迷雾初现', target: '理解三维探索机制与视角锁定', timeLimit: 0, blockCount: 168, blockTypes: 10, layout: '5层(6x6x5 - 12)' },
        { id: 2, name: '扩展视野', target: '学习规划探索路径', timeLimit: 0, blockCount: 174, blockTypes: 10, layout: '5层(6x6x5 - 6)' },
        { id: 3, name: '三维路径', target: '理解三维空间的探索复杂性', timeLimit: 0, blockCount: 180, blockTypes: 11, layout: '5层(6x7x5 - 12)' },
        { id: 4, name: '探索与消除', target: '平衡探索新区域和消除已有方块', timeLimit: 0, blockCount: 186, blockTypes: 11, layout: '5层(6x7x5)' },
        { id: 5, name: '迷雾障碍', target: '不可移动障碍下的探索', timeLimit: 0, blockCount: 192, blockTypes: 12, layout: '5层(6x7x5 - 6)' },
        { id: 6, name: '迷雾风暴', target: '时间压力下的快速探索', timeLimit: 60, blockCount: 198, blockTypes: 12, layout: '5层(6x7x5 + 6)' },
        { id: 7, name: '星图绘制', target: '复杂三维迷雾解谜', timeLimit: 0, blockCount: 204, blockTypes: 12, layout: '5层(6x7x5 - 6)' },
        { id: 8, name: '星云穿越', target: '综合挑战', timeLimit: 75, blockCount: 210, blockTypes: 12, layout: '5层(6x7x5)' }
      ]
    },
    {
      id: 4,
      name: '重力熔炉',
      theme: 'gravity',
      coreMechanic: 'dynamicGravity',
      description: '操控动态重力，调整方块排列。',
      artStyle: '机械重力场，银灰与深蓝，动态箭头指示重力方向，方块有坠落动画。',
      levels: [
        { id: 1, name: '重力初识', target: '认识四个方向重力与可点击性', timeLimit: 0, blockCount: 168, blockTypes: 10, layout: '5层(6x6x5 - 12)' },
        { id: 2, name: '重力切换', target: '理解重力变化与方块坠落', timeLimit: 0, blockCount: 174, blockTypes: 10, layout: '5层(6x6x5 - 6)' },
        { id: 3, name: '左右重力', target: '理解水平方向重力与视角限制', timeLimit: 0, blockCount: 180, blockTypes: 11, layout: '5层(6x7x5 - 12)' },
        { id: 4, name: '动态重力管理', target: '预判重力变化时机', timeLimit: 0, blockCount: 186, blockTypes: 11, layout: '5层(6x7x5)' },
        { id: 5, name: '重力与消除', target: '利用重力创造消除机会', timeLimit: 0, blockCount: 192, blockTypes: 12, layout: '5层(6x7x5 - 6)' },
        { id: 6, name: '重力风暴', target: '快速重力切换下的操作', timeLimit: 0, blockCount: 198, blockTypes: 12, layout: '5层(6x7x5 + 6)' },
        { id: 7, name: '重力迷宫', target: '复杂三维重力解谜', timeLimit: 0, blockCount: 204, blockTypes: 12, layout: '5层(6x7x5 - 6)' },
        { id: 8, name: '熔炉重铸', target: '综合挑战', timeLimit: 75, blockCount: 210, blockTypes: 12, layout: '5层(6x7x5)' }
      ]
    },
    {
      id: 5,
      name: '数据洪流',
      theme: 'cyber',
      coreMechanic: 'dataOverload',
      description: '连接到纯粹的信息流网络，修复协议。',
      artStyle: '赛博空间，绿色数据流网格，方块为流动代码的数据立方体。',
      levels: [
        { id: 1, name: '病毒预警', target: '认识病毒与进度', timeLimit: 0, blockCount: 264, blockTypes: 16, layout: '6层(6x7x6 + 12)' },
        { id: 2, name: '效率清除', target: '鼓励高效操作', timeLimit: 0, blockCount: 270, blockTypes: 16, layout: '6层(6x8x6 - 18)' },
        { id: 3, name: '优先级抉择', target: '引入风险决策', timeLimit: 0, blockCount: 276, blockTypes: 17, layout: '6层(6x8x6 - 12)' },
        { id: 4, name: '多波次防御', target: '进度资源管理', timeLimit: 0, blockCount: 282, blockTypes: 17, layout: '6层(6x8x6 - 6)' },
        { id: 5, name: '顽固病毒', target: '增加障碍强度', timeLimit: 0, blockCount: 288, blockTypes: 18, layout: '6层(6x8x6)' },
        { id: 6, name: '极限净化', target: '高压生存测试', timeLimit: 0, blockCount: 294, blockTypes: 18, layout: '6层(7x7x6)' },
        { id: 7, name: '净化矩阵', target: '病毒作为核心', timeLimit: 0, blockCount: 300, blockTypes: 19, layout: '6层(7x7x6 + 6)' },
        { id: 8, name: '核心协议', target: '综合挑战', timeLimit: 0, blockCount: 306, blockTypes: 19, layout: '6层(7x8x6 - 30)' }
      ]
    },
    {
      id: 6,
      name: '时裔圣所',
      theme: 'time',
      coreMechanic: 'hourglass',
      description: '造访崇拜"时流"的古老文明遗迹。',
      artStyle: '永恒钟楼，齿轮、沙漏等时间元素，古金与石青色。',
      levels: [
        { id: 1, name: '时之砂', target: '理解双刃剑特性', timeLimit: 0, blockCount: 312, blockTypes: 20, layout: '6层(7x7x6 + 18)' },
        { id: 2, name: '救急之用', target: '教学解围用途', timeLimit: 0, blockCount: 318, blockTypes: 20, layout: '6层(7x8x6 - 18)' },
        { id: 3, name: '规划之用', target: '教学规划用途', timeLimit: 0, blockCount: 324, blockTypes: 21, layout: '6层(7x8x6 - 12)' },
        { id: 4, name: '抉择时刻', target: '简单决策权衡', timeLimit: 0, blockCount: 330, blockTypes: 21, layout: '6层(7x8x6 - 6)' },
        { id: 5, name: '多重时机', target: '进阶时机把握', timeLimit: 0, blockCount: 336, blockTypes: 22, layout: '6层(7x8x6)' },
        { id: 6, name: '资源与时间', target: '高风险决策', timeLimit: 0, blockCount: 342, blockTypes: 22, layout: '6层(7x8x6 + 6)' },
        { id: 7, name: '精密时计', target: '极限规划解谜', timeLimit: 0, blockCount: 348, blockTypes: 23, layout: '6层(8x8x6 - 36)' },
        { id: 8, name: '时流仪式', target: '综合挑战', timeLimit: 0, blockCount: 354, blockTypes: 23, layout: '6层(8x8x6 - 30)' }
      ]
    },
    {
      id: 7,
      name: '铸星熔炉',
      theme: 'forge',
      coreMechanic: 'moduleCombination',
      description: '深入星系核心的锻造熔炉，调整产线。',
      artStyle: '熔岩与锻铁，炽热熔岩，红、橙、黑色调。',
      levels: [
        { id: 1, name: '组合锻件', target: '认识模块整体性', timeLimit: 0, blockCount: 360, blockTypes: 24, layout: '7层(7x7x7 + 17)' },
        { id: 2, name: '空间规划', target: '规划槽位空间', timeLimit: 0, blockCount: 366, blockTypes: 24, layout: '7层(7x7x7 + 23)' },
        { id: 3, name: '模块拼图', target: '管理不同模块', timeLimit: 0, blockCount: 372, blockTypes: 25, layout: '7层(7x8x7 - 20)' },
        { id: 4, name: '模块与消除', target: '利用模块创机会', timeLimit: 0, blockCount: 378, blockTypes: 25, layout: '7层(7x8x7 - 14)' },
        { id: 5, name: '铸造成型', target: '复杂模块形状', timeLimit: 0, blockCount: 384, blockTypes: 26, layout: '7层(7x8x7 - 8)' },
        { id: 6, name: '熔炉压力', target: '时压下的管理', timeLimit: 0, blockCount: 390, blockTypes: 26, layout: '7层(7x8x7 - 2)' },
        { id: 7, name: '锻炉核心', target: '复杂空间解谜', timeLimit: 0, blockCount: 396, blockTypes: 27, layout: '7层(7x8x7 + 4)' },
        { id: 8, name: '重铸星核', target: '综合挑战', timeLimit: 0, blockCount: 402, blockTypes: 27, layout: '7层(7x8x7 + 10)' }
      ]
    },
    {
      id: 8,
      name: '终末奇点',
      theme: 'singularity',
      coreMechanic: 'phaseSwitch',
      description: '直面吞噬规则的"虚空之眼"，最终决战。',
      artStyle: '抽象与混沌，扭曲的不可能图形，色彩流动变幻。',
      levels: [
        { id: 1, name: '相位初识', target: '认识切换与变化', timeLimit: 0, blockCount: 408, blockTypes: 28, layout: '8层(7x7x8 + 16)' },
        { id: 2, name: '视角选择', target: '主动切换寻找优势', timeLimit: 0, blockCount: 414, blockTypes: 28, layout: '8层(7x7x8 + 22)' },
        { id: 3, name: '双相解谜', target: '协作解谜', timeLimit: 0, blockCount: 420, blockTypes: 29, layout: '8层(7x8x8 - 28)' },
        { id: 4, name: '相位共振', target: '与过往机制结合', timeLimit: 0, blockCount: 426, blockTypes: 29, layout: '8层(7x8x8 - 22)' },
        { id: 5, name: '动态视图', target: '高频快速切换', timeLimit: 0, blockCount: 432, blockTypes: 30, layout: '8层(7x8x8 - 16)' },
        { id: 6, name: '时相困境', target: '切换与时间压力', timeLimit: 0, blockCount: 438, blockTypes: 30, layout: '8层(7x8x8 - 10)' },
        { id: 7, name: '奇点迷宫', target: '极致逻辑解谜', timeLimit: 0, blockCount: 444, blockTypes: 31, layout: '8层(7x8x8 - 4)' },
        { id: 8, name: '归零终点', target: '终极综合挑战', timeLimit: 0, blockCount: 450, blockTypes: 32, layout: '8层(7x8x8 + 2)' }
      ]
    }
  ],

  // 根据星系ID和关卡ID获取关卡配置
  getLevelConfig(galaxyId, levelId) {
    const galaxy = this.galaxies.find(g => g.id === galaxyId);
    if (!galaxy) return null;
    
    const level = galaxy.levels.find(l => l.id === levelId);
    if (!level) return null;
    
    return {
      ...level,
      galaxyName: galaxy.name,
      galaxyTheme: galaxy.theme,
      galaxyCoreMechanic: galaxy.coreMechanic,
      galaxyDescription: galaxy.description,
      galaxyArtStyle: galaxy.artStyle
    };
  }
};

module.exports = {
  default: LevelConfig
};