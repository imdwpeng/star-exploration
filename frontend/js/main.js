// 游戏主逻辑
const { createScopedThreejs } = require('threejs-miniprogram');
const GameManager = require('./gameManager.js').default;
const SceneManager = require('./core/SceneManager.js').default;
const UIManager = require('./core/UIManager.js').default;
const GalaxyManager = require('./core/GalaxyManager.js').default;
const CubeManager = require('./core/CubeManager.js').default;
const ParticleManager = require('./core/ParticleManager.js').default;
const FlyingBlockManager = require('./core/FlyingBlockManager.js').default;
const InputManager = require('./core/InputManager.js').default;
const InitManager = require('./core/InitManager.js').default;
const StartScene = require('./scenes/StartScene.js').default;
const LevelSelectScene = require('./scenes/LevelSelectScene.js').default;
const GameScene = require('./scenes/GameScene.js').default;
const CanvasUtils = require('./utils/CanvasUtils.js').default;
const ResourceManager = require('./utils/ResourceManager.js').default;

class Main {
  constructor() {
    // 1. 检查是否在微信环境中
    this.isWechatEnv = typeof wx !== 'undefined' && typeof GameGlobal !== 'undefined';

    if (this.isWechatEnv) {
      // 微信环境，正常初始化
      // 1. 获取 Canvas（微信小游戏环境专用）
      const canvas = (typeof window !== 'undefined' && window.canvas) ? window.canvas : GameGlobal.screencanvas;

      // 2. 创建 THREE 作用域（传入 canvas，适配器会自动处理上下文）
      this.THREE = createScopedThreejs(canvas);

      // 3. 获取系统信息，用于适配屏幕尺寸
      const systemInfo = wx.getSystemInfoSync();
      this.windowWidth = systemInfo.windowWidth;
      this.windowHeight = systemInfo.windowHeight;
      this.pixelRatio = Math.min(systemInfo.pixelRatio, 2); // 限制像素比，优化性能
      
      // 获取安全区域信息（刘海屏适配）
      this.safeArea = systemInfo.safeArea || {
        top: 0,
        left: 0,
        right: systemInfo.windowWidth,
        bottom: systemInfo.windowHeight,
        width: systemInfo.windowWidth,
        height: systemInfo.windowHeight
      };

      // 4. 初始化渲染器
      this.initManager = new InitManager(this, GameManager, SceneManager, StartScene, LevelSelectScene, GameScene);
      this.initManager.initRenderer(canvas);

      // 5.1 初始化 UI 场景
      this.initManager.initUI();
      
      // 6. 初始化游戏管理器
      this.gameManager = new GameManager();
      
      // 7. 初始化工具类
      this.canvasUtils = new CanvasUtils(this);
      this.resourceManager = new ResourceManager(this);
      
      // 8. 初始化核心管理器
      this.galaxyManager = new GalaxyManager(this);
      this.cubeManager = new CubeManager(this);
      this.particleManager = new ParticleManager(this);
      this.flyingBlockManager = new FlyingBlockManager(this);
      this.inputManager = new InputManager(this);
      this.uiManager = new UIManager(this);
      
      // 9. 初始化场景和相机
      this.initManager.initScene();
      
      // 10. 初始化场景管理
      this.initManager.initSceneManager();
      
      // 10. 初始化事件处理
      this.inputManager.initEventListeners();
      
      this.lastTime = Date.now();
      this.animate();
    } else {
      // 非微信环境，输出提示信息
      console.log('当前环境不是微信小游戏环境，无法初始化游戏');
    }
  }

  animate() {
    const currentTime = Date.now();
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    const time = currentTime * 0.001;

    // 更新星系
    this.galaxyManager.update();

    // 更新粒子
    this.particleManager.updateParticles();

    // 更新飞行方块
    this.flyingBlockManager.updateFlyingBlocks();

    // 使用场景管理器更新场景
    this.sceneManager.update(delta);

    // 绘制2D UI
    this.uiManager.drawUI();
    
    // 渲染3D场景
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    
    // 渲染 UI 场景
    this.renderer.clearDepth();
    this.renderer.render(this.uiScene, this.uiCamera);
    
    // 请求下一帧
    if (canvas && canvas.requestAnimationFrame) {
      canvas.requestAnimationFrame(this.animate.bind(this));
    } else {
      requestAnimationFrame(this.animate.bind(this));
    }
  }
}

module.exports = Main;