// 初始化管理器 - 负责游戏的初始化流程
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
    // 创建场景
    this.game.scene = new this.game.THREE.Scene();
    this.game.scene.background = new this.game.THREE.Color(0x050510); // 深空背景
    this.game.scene.fog = new this.game.THREE.FogExp2(0x050510, 0.002); // 添加雾效增强深邃感

    // 创建相机
    this.game.camera = new this.game.THREE.PerspectiveCamera(75, this.game.windowWidth / this.game.windowHeight, 0.1, 1000);
    
    // 计算合适的相机距离
    // 假设魔方最大尺寸约为 85 (3 * 25 + 2 * 2 + 额外空间)
    const cubeSize = 90;
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
        distance = (cubeSize / 2) / Math.tan(vFOV) / Math.min(aspect, visibleHeightRatio);
    } else {
        // 横屏模式
        distance = (cubeSize / 2) / Math.tan(vFOV);
    }
    
    this.game.camera.position.z = distance * 1.5; // 稍微拉远一点，留出操作空间
    this.game.camera.lookAt(0, 0, 0);
    
    // 添加灯光
    const ambientLight = new this.game.THREE.AmbientLight(0xffffff, 0.7); // 提高环境光强度，改回纯白
    this.game.scene.add(ambientLight);
    
    // 主光源：日光 (模仿恒星)
    const sunLight = new this.game.THREE.DirectionalLight(0xffffff, 1.0); // 提高强度
    sunLight.position.set(10, 20, 10);
    this.game.scene.add(sunLight);

    // 补光：霓虹蓝 (星云感)
    const blueLight = new this.game.THREE.PointLight(0x00ffff, 0.8, 500); // 提高强度
    blueLight.position.set(-20, 10, 20);
    this.game.scene.add(blueLight);

    // 补光：霓虹粉 (赛博朋克感)
    const pinkLight = new this.game.THREE.PointLight(0xff00ff, 0.8, 500); // 提高强度
    pinkLight.position.set(20, -10, 20);
    this.game.scene.add(pinkLight);

    // 添加星系背景
    this.game.galaxyManager.createGalaxy();
  }

  // 初始化游戏
  initGame() {
    // 重新创建 GameManager 实例
    this.game.gameManager = new this.GameManager();
    
    // 重新初始化魔方
    this.game.cubeManager.initCube();
    
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