// 初始化管理器 - 负责游戏的初始化流程
const LevelConfig = require('./LevelConfig.js').default;

class InitManager {
  constructor(game, GameManager, SceneManager, StartScene, LevelSelectScene, GameScene) {
    this.game = game;
    this.GameManager = GameManager;
    this.SceneManager = SceneManager;
    this.StartScene = StartScene;
    this.LevelSelectScene = LevelSelectScene;
    this.GameScene = GameScene;
  }

  // 初始化渲染器
  initRenderer(canvas) {
    // 创建渲染器
    this.game.renderer = new this.game.THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      powerPreference: 'low-power'
    });
    this.game.renderer.setSize(this.game.windowWidth, this.game.windowHeight);
    this.game.renderer.setPixelRatio(this.game.pixelRatio);
    this.game.renderer.autoClear = false; //以此支持多重渲染
  }
  
  // 初始化UI
  initUI() {
    // 创建离屏 Canvas 用于 UI
    this.game.uiCanvas = wx.createCanvas();
    // 设置 Canvas 尺寸为物理像素尺寸
    this.game.uiCanvas.width = this.game.windowWidth * this.game.pixelRatio;
    this.game.uiCanvas.height = this.game.windowHeight * this.game.pixelRatio;
    
    // 创建 UI 场景
    this.game.uiScene = new this.game.THREE.Scene();
    // 创建正交相机，对应屏幕逻辑尺寸
    this.game.uiCamera = new this.game.THREE.OrthographicCamera(
      -this.game.windowWidth / 2, this.game.windowWidth / 2, 
      this.game.windowHeight / 2, -this.game.windowHeight / 2, 
      1, 10
    );
    this.game.uiCamera.position.z = 10;

    // 创建 UI 纹理
    this.game.uiTexture = new this.game.THREE.CanvasTexture(this.game.uiCanvas);
    this.game.uiTexture.minFilter = this.game.THREE.LinearFilter;
    this.game.uiTexture.magFilter = this.game.THREE.LinearFilter;
    
    // 创建全屏平面用于显示 UI
    const material = new this.game.THREE.MeshBasicMaterial({ 
      map: this.game.uiTexture, 
      transparent: true,
      depthTest: false, // UI 永远在最上层
      depthWrite: false
    });
    const geometry = new this.game.THREE.PlaneGeometry(this.game.windowWidth, this.game.windowHeight);
    const mesh = new this.game.THREE.Mesh(geometry, material);
    this.game.uiScene.add(mesh);
    
    // 创建 UI 粒子组
    this.game.particleGroup = new this.game.THREE.Group();
    // 放在 UI 平面之上 (UI plane is at z=0, camera at z=10)
    this.game.particleGroup.position.z = 1;
    this.game.uiScene.add(this.game.particleGroup);
  }
  
  // 初始化场景
  initScene() {
    // 获取当前选择的星系，默认为第一个星系
    const galaxyId = this.game.selectedGalaxy || 1;
    const levelConfig = LevelConfig.getLevelConfig(galaxyId, 1);
    const galaxyTheme = levelConfig ? levelConfig.galaxyTheme : 'soft';
    
    // 根据星系主题设置背景颜色
    let backgroundColor, fogColor;
    switch(galaxyTheme) {
      case 'soft': // 新星摇篮
        backgroundColor = 0x050510;
        fogColor = 0x050510;
        break;
      case 'steampunk': // 锈蚀星带
        backgroundColor = 0x1a1a1a;
        fogColor = 0x1a1a1a;
        break;
      case 'fog': // 星云迷雾
        backgroundColor = 0x001144;
        fogColor = 0x001144;
        break;
      case 'gravity': // 重力熔炉
        backgroundColor = 0x001133;
        fogColor = 0x001133;
        break;
      case 'cyber': // 数据洪流
        backgroundColor = 0x001111;
        fogColor = 0x001111;
        break;
      case 'time': // 时裔圣所
        backgroundColor = 0x1a1a2e;
        fogColor = 0x1a1a2e;
        break;
      case 'forge': // 铸星熔炉
        backgroundColor = 0x1a1a1a;
        fogColor = 0x1a1a1a;
        break;
      case 'singularity': // 终末奇点
        backgroundColor = 0x001133;
        fogColor = 0x001133;
        break;
      default:
        backgroundColor = 0x050510;
        fogColor = 0x050510;
    }

    // 创建场景
    this.game.scene = new this.game.THREE.Scene();
    this.game.scene.background = new this.game.THREE.Color(backgroundColor); // 深空背景
    this.game.scene.fog = new this.game.THREE.FogExp2(fogColor, 0.002); // 添加雾效增强深邃感

    // 创建相机
    this.game.camera = new this.game.THREE.PerspectiveCamera(75, this.game.windowWidth / this.game.windowHeight, 0.1, 1000);
    
    // 计算合适的相机距离
    // 动态计算魔方尺寸，考虑最大可能的方块数量
    const maxBlockSize = 30; // 最大方块大小
    const maxCubeSize = 6 * (maxBlockSize + 2); // 6x6x6 魔方的最大尺寸
    // 视场角的一半转弧度
    const vFOV = this.game.camera.fov * Math.PI / 360; 
    // 根据屏幕宽高比计算水平视场角
    const aspect = this.game.windowWidth / this.game.windowHeight;
    
    // 确保魔方在任何屏幕比例下都能完全显示
    // 并在上下留出 UI 空间 (约占屏幕高度的 40%)
    let distance;
    if (aspect < 1) {
        // 竖屏模式：以宽度为基准，并考虑上下 UI 遮挡
        // 可视高度减少 40%
        const visibleHeightRatio = 0.6;
        distance = (maxCubeSize / 2) / Math.tan(vFOV) / Math.min(aspect, visibleHeightRatio);
    } else {
        // 横屏模式
        distance = (maxCubeSize / 2) / Math.tan(vFOV);
    }
    
    this.game.camera.position.z = distance * 1.5; // 稍微拉远一点，留出操作空间
    this.game.camera.lookAt(0, 0, 0);
    
    // 根据星系主题设置灯光
    const ambientLight = new this.game.THREE.AmbientLight(0xffffff, 2.0); // 提高环境光强度
    this.game.scene.add(ambientLight);
    
    // 主光源：日光 (模仿恒星)
    const sunLight = new this.game.THREE.DirectionalLight(0xffffff, 3.0); // 提高强度
    sunLight.position.set(10, 20, 10);
    this.game.scene.add(sunLight);

    // 根据星系主题设置补光
    let light1Color, light2Color;
    switch(galaxyTheme) {
      case 'soft': // 新星摇篮
        light1Color = 0x00ffff;
        light2Color = 0x9C88FF;
        break;
      case 'steampunk': // 锈蚀星带
        light1Color = 0xFF9A3C;
        light2Color = 0x3B3B98;
        break;
      case 'fog': // 星云迷雾
        light1Color = 0x9C88FF;
        light2Color = 0x00D4FF;
        break;
      case 'gravity': // 重力熔炉
        light1Color = 0x00D4FF;
        light2Color = 0x2ecc71;
        break;
      case 'cyber': // 数据洪流
        light1Color = 0x00ff00;
        light2Color = 0x00D4FF;
        break;
      case 'time': // 时裔圣所
        light1Color = 0xFFD32A;
        light2Color = 0x00D8D6;
        break;
      case 'forge': // 铸星熔炉
        light1Color = 0xFF4757;
        light2Color = 0xFF9A3C;
        break;
      case 'singularity': // 终末奇点
        light1Color = 0xFF00FF;
        light2Color = 0x9C88FF;
        break;
      default:
        light1Color = 0x00ffff;
        light2Color = 0xff00ff;
    }

    // 补光1
    const light1 = new this.game.THREE.PointLight(light1Color, 2.0, 500);
    light1.position.set(-20, 10, 20);
    this.game.scene.add(light1);

    // 补光2
    const light2 = new this.game.THREE.PointLight(light2Color, 2.0, 500);
    light2.position.set(20, -10, 20);
    this.game.scene.add(light2);

    // 添加星系背景
    this.game.galaxyManager.createGalaxy(galaxyTheme);
  }

  // 初始化游戏
  initGame() {
    // 获取当前选择的星系和关卡，默认为第一个星系的第一关
    const galaxyId = this.game.selectedGalaxy || 1;
    const levelId = this.game.selectedLevel || 1;
    
    // 获取关卡配置
    const levelConfig = LevelConfig.getLevelConfig(galaxyId, levelId);
    
    // 重新创建 GameManager 实例，并传入关卡配置
    this.game.gameManager = new this.GameManager(levelConfig);
    
    // 重新初始化魔方，传入关卡配置
    this.game.cubeManager.initCube(levelConfig);
    
    // 清空粒子特效
    this.game.particleManager.clearParticles();
    
    // 重新绑定引用
    this.game.gameManager.cube = this.game.cubeManager.cube;
    this.game.gameManager.THREE = this.game.THREE;
    
    // 清空飞行方块
    this.game.flyingBlockManager.clearFlyingBlocks();
  }

  // 初始化场景管理器
  initSceneManager() {
    this.game.sceneManager = new this.SceneManager(this.game);
    
    // 注册场景
    this.game.sceneManager.registerScene('start', new this.StartScene(this.game));
    this.game.sceneManager.registerScene('levelSelect', new this.LevelSelectScene(this.game));
    this.game.sceneManager.registerScene('game', new this.GameScene(this.game));
    
    // 初始场景
    this.game.sceneManager.switchScene('start');
  }
}

module.exports = {
  default: InitManager
};