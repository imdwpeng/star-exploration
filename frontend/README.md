# 星海迷航游戏

## 项目介绍

《星海迷航》是一款融合"三维消除"、"叙事探索"与"轻度社交"的休闲手游，为玩家提供沉浸式的宇宙探险体验。

## 源码目录介绍

```
├── js
│   ├── core/             # 核心游戏逻辑
│   │   ├── SceneManager.js      # 场景管理
│   │   ├── UIManager.js         # UI管理
│   │   ├── GalaxyManager.js     # 星系背景管理
│   │   ├── CubeManager.js       # 魔方管理
│   │   ├── ParticleManager.js   # 粒子效果管理
│   │   ├── FlyingBlockManager.js # 飞行方块管理
│   │   ├── InputManager.js      # 输入管理
│   │   └── InitManager.js       # 初始化管理
│   ├── scenes/           # 场景相关
│   │   ├── StartScene.js        # 开始游戏场景
│   │   ├── LevelSelectScene.js   # 关卡选择场景
│   │   └── GameScene.js         # 游戏场景
│   ├── utils/            # 工具函数
│   │   ├── CanvasUtils.js       # Canvas工具
│   │   └── ResourceManager.js   # 资源管理
│   ├── weapp-adapter/    # 微信小程序适配器
│   ├── game.js           # 游戏入口
│   ├── gameManager.js    # 游戏管理器
│   └── main.js           # 主文件
├── .eslintrc.js           # 代码规范
├── game.json             # 游戏配置
├── package.json          # 项目配置
└── project.config.json    # 项目配置
```

## 模块职责说明

| 模块 | 职责 | 文件位置 |
|------|------|----------|
| 主文件 | 初始化游戏、协调各模块 | js/main.js |
| 场景管理 | 场景切换、场景生命周期 | js/core/SceneManager.js |
| UI管理 | UI绘制和管理 | js/core/UIManager.js |
| 星系管理 | 星系背景创建和动画 | js/core/GalaxyManager.js |
| 魔方管理 | 魔方创建、旋转和点击处理 | js/core/CubeManager.js |
| 粒子管理 | 粒子效果创建和管理 | js/core/ParticleManager.js |
| 飞行方块管理 | 飞行方块动画和渲染 | js/core/FlyingBlockManager.js |
| 输入管理 | 事件处理和输入响应 | js/core/InputManager.js |
| 初始化管理 | 游戏初始化流程 | js/core/InitManager.js |
| 开始场景 | 开始游戏页面逻辑 | js/scenes/StartScene.js |
| 关卡选择场景 | 关卡选择逻辑 | js/scenes/LevelSelectScene.js |
| 游戏场景 | 游戏主逻辑 | js/scenes/GameScene.js |
| Canvas工具 | Canvas绘制工具方法 | js/utils/CanvasUtils.js |
| 资源管理 | 资源加载和缓存 | js/utils/ResourceManager.js |

## 游戏特色

1. **三维消除玩法**：独特的三维星图消除机制
2. **八大星系**：每个星系有独特的主题和机制
3. **社交功能**：支持异步合作和实时协作
4. **创意工坊**：玩家可自定义关卡
5. **科幻风格**：Low-Poly+霓虹光效的视觉风格

## 技术栈

- **核心引擎**：Three.js r160
- **平台**：微信小游戏
- **开发环境**：VS Code + 微信开发者工具

## 开始开发

1. 克隆项目到本地
2. 安装依赖：`npm install`
3. 在微信开发者工具中导入项目
4. 开始开发和调试

## 游戏流程

1. 启动游戏 → 进入开始游戏页面
2. 点击"开始游戏" → 进入关卡选择页面
3. 选择关卡 → 进入游戏页面
4. 完成游戏 → 返回关卡选择页面或重新开始

## 优化说明

### 已完成的优化

1. **模块化架构**：将原本集中在 `main.js` 的代码重构为模块化结构，按功能分离到不同目录
2. **场景管理系统**：实现了场景管理系统，支持场景的注册、切换和生命周期管理
3. **Canvas API 兼容性**：修复了微信小游戏环境中的 Canvas API 兼容性问题，确保游戏在微信平台正常运行
4. **代码结构清晰**：通过目录组织和模块分离，提高了代码的可读性和可维护性
5. **功能模块化**：将游戏功能分解为多个专门的管理器，每个管理器负责特定的功能
6. **依赖管理**：优化了模块间的依赖关系，确保初始化顺序正确

### 后续优化方向

1. 实现本地存储，保存游戏进度
2. 增加社交功能，支持好友互动
3. 开发创意工坊，支持用户自定义关卡
4. 优化性能，减少渲染开销
5. 增加更多游戏关卡和玩法
6. 实现资源预加载，提高游戏加载速度