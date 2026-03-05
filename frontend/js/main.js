// 游戏主逻辑
const { createScopedThreejs } = require('threejs-miniprogram');
const GameManager = require('./gameManager.js').default;

class Main {
  constructor() {
    // 1. 获取 Canvas（微信小游戏环境专用）
    const canvas = (typeof window !== 'undefined' && window.canvas) ? window.canvas : GameGlobal.screencanvas;

    // 2. 创建 THREE 作用域（传入 canvas，适配器会自动处理上下文）
    this.THREE = createScopedThreejs(canvas);

    // 3. 获取系统信息，用于适配屏幕尺寸
    const systemInfo = wx.getSystemInfoSync();
    this.windowWidth = systemInfo.windowWidth;
    this.windowHeight = systemInfo.windowHeight;
    this.pixelRatio = Math.min(systemInfo.pixelRatio, 2); // 限制像素比，优化性能

    // 4. 初始化渲染器
    this.initRenderer(canvas);

    // 5. 初始化场景和相机
    this.initScene();

    // 6. 初始化游戏管理器
    this.gameManager = new GameManager();
    
    // 7. 初始化魔方
    this.initCube();
    
    // 存储游戏管理器的魔方引用
    this.gameManager.cube = this.cube;
    this.gameManager.THREE = this.THREE;
    
    this.lastTime = Date.now();
    this.animate();
  }
  
  initRenderer(canvas) {
    // 创建渲染器
    this.renderer = new this.THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      powerPreference: 'low-power'
    });
    this.renderer.setSize(this.windowWidth, this.windowHeight);
    this.renderer.setPixelRatio(this.pixelRatio);
  }
  
  initScene() {
    // 创建场景
    this.scene = new this.THREE.Scene();
    this.scene.background = new this.THREE.Color(0x0a0a1a);
    
    // 创建相机
    this.camera = new this.THREE.PerspectiveCamera(75, this.windowWidth / this.windowHeight, 0.1, 1000);
    this.camera.position.z = 100;
    
    // 添加灯光
    const ambientLight = new this.THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new this.THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }
  
  initCube() {
    // 创建魔方组
    this.cubeGroup = new this.THREE.Group();
    this.scene.add(this.cubeGroup);
    
    // 创建立方体
    this.createCube();
    
    // 存储魔方信息
    this.cube = {
      scene: this.scene,
      camera: this.camera,
      cubeGroup: this.cubeGroup,
      blocks: this.blocks,
      THREE: this.THREE,
      rotate: this.rotate.bind(this)
    };
  }
  
  createCube() {
    this.blocks = [];
    const blockSize = 25;
    const gap = 2;
    
    // 定义9种颜色
    const colors = [
      0xff0000, // 红色
      0x00ff00, // 绿色
      0x0000ff, // 蓝色
      0xffff00, // 黄色
      0xff00ff, // 洋红色
      0x00ffff, // 青色
      0xffa500, // 橙色
      0x800080, // 紫色
      0x008000  // 深绿色
    ];
    
    // 创建颜色数组，每种颜色重复3次
    let colorArray = [];
    colors.forEach(color => {
      for (let i = 0; i < 3; i++) {
        colorArray.push(color);
      }
    });
    
    // 打乱颜色数组
    colorArray.sort(() => Math.random() - 0.5);
    
    // 创建3x3x3的方块
    let colorIndex = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const color = colorArray[colorIndex++];
          const geometry = new this.THREE.BoxGeometry(blockSize, blockSize, blockSize);
          const material = new this.THREE.MeshPhongMaterial({ color: color });
          
          const block = new this.THREE.Mesh(geometry, material);
          block.position.set(
            x * (blockSize + gap),
            y * (blockSize + gap),
            z * (blockSize + gap)
          );
          
          // 存储方块颜色信息
          block.userData = {
            color: color,
            position: { x, y, z }
          };
          
          this.cubeGroup.add(block);
          this.blocks.push(block);
        }
      }
    }
  }
  
  rotate(direction) {
    switch(direction) {
      case 'up':
        this.cubeGroup.rotation.x -= Math.PI / 2;
        break;
      case 'left':
        this.cubeGroup.rotation.y += Math.PI / 2;
        break;
      case 'right':
        this.cubeGroup.rotation.y -= Math.PI / 2;
        break;
      case 'down':
        this.cubeGroup.rotation.x += Math.PI / 2;
        break;
    }
  }
  
  animate() {
    const currentTime = Date.now();
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // 更新游戏状态
    this.gameManager.update(delta);
    
    // 渲染3D场景
    this.renderer.render(this.scene, this.camera);
    
    // 绘制2D UI
    this.drawUI();
    
    // 显示游戏结束或暂停界面
    if (this.gameManager.isGameOver) {
      this.showGameOver();
    } else if (this.gameManager.isPaused) {
      this.showPause();
    }
    
    // 请求下一帧
    if (canvas && canvas.requestAnimationFrame) {
      canvas.requestAnimationFrame(this.animate.bind(this));
    } else {
      requestAnimationFrame(this.animate.bind(this));
    }
  }
  
  drawUI() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    
    // 绘制关卡信息
    this.drawLevelInfo(ctx);
    
    // 绘制待消除槽
    this.drawEliminationSlots(ctx);
    
    // 绘制功能栏
    this.drawFunctionBars(ctx);
    
    // 绘制底部快捷操作
    this.drawBottomActions(ctx);
    
    ctx.restore();
  }
  
  drawLevelInfo(ctx) {
    const levelInfo = this.gameManager.levelInfo;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(10, 10, this.windowWidth - 20, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    
    ctx.fillText(`关卡：${levelInfo.level}`, 20, 35);
    ctx.fillText(`目标：${levelInfo.target}`, 120, 35);
    ctx.fillText(`步数：${levelInfo.steps}/${levelInfo.maxSteps}`, 240, 35);
    ctx.fillText(`时间：${levelInfo.time}`, 360, 35);
  }
  
  drawEliminationSlots(ctx) {
    const slots = this.gameManager.eliminationSlots;
    const slotWidth = 60;
    const slotHeight = 60;
    const startX = (this.windowWidth - slotWidth * 7 - 10 * 6) / 2;
    const startY = 70;
    
    for (let i = 0; i < slots.length; i++) {
      const x = startX + i * (slotWidth + 10);
      
      // 绘制槽位边框
      ctx.strokeStyle = slots[i].highlight ? '#ff0000' : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, startY, slotWidth, slotHeight);
      
      // 绘制槽位编号
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(x + slotWidth - 10, startY + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, x + slotWidth - 10, startY + 10);
      
      // 绘制槽位中的方块
      if (slots[i].block) {
        ctx.fillStyle = slots[i].block.color;
        ctx.fillRect(x + 2, startY + 2, slotWidth - 4, slotHeight - 4);
      }
    }
  }
  
  drawFunctionBars(ctx) {
    const resources = this.gameManager.resources;
    
    // 左侧功能按钮
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fillRect(10, 140, this.windowWidth / 2 - 15, 80);
    
    // 绘制方向按钮
    const btnSize = 30;
    const btnStartX = 30;
    const btnStartY = 150;
    
    // 上
    this.drawButton(ctx, btnStartX + btnSize, btnStartY, btnSize, btnSize, '↑');
    // 左
    this.drawButton(ctx, btnStartX, btnStartY + btnSize, btnSize, btnSize, '←');
    // 右
    this.drawButton(ctx, btnStartX + btnSize * 2, btnStartY + btnSize, btnSize, btnSize, '→');
    // 下
    this.drawButton(ctx, btnStartX + btnSize, btnStartY + btnSize * 2, btnSize, btnSize, '↓');
    
    // 右侧资源栏
    ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
    ctx.fillRect(this.windowWidth / 2 + 5, 140, this.windowWidth / 2 - 15, 80);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    
    let y = 155;
    ctx.fillText(`当前能量: ${resources.energy}/${resources.maxEnergy}`, this.windowWidth / 2 + 20, y);
    y += 20;
    ctx.fillText(`金属: ${resources.metal}`, this.windowWidth / 2 + 20, y);
    y += 20;
    ctx.fillText(`晶体: ${resources.crystal}`, this.windowWidth / 2 + 20, y);
    y += 20;
    ctx.fillText(`生态: ${resources.ecology}`, this.windowWidth / 2 + 20, y);
    
    // 技能冷却条
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(this.windowWidth / 2 + 20, 200, this.windowWidth / 2 - 35, 10);
    
    ctx.fillStyle = '#00ff00';
    const skillProgress = this.gameManager.skillProgress;
    ctx.fillRect(this.windowWidth / 2 + 20, 200, (this.windowWidth / 2 - 35) * skillProgress, 10);
  }
  
  drawBottomActions(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(10, this.windowHeight - 60, this.windowWidth - 20, 50);
    
    const btnWidth = (this.windowWidth - 40) / 3;
    
    this.drawButton(ctx, 20, this.windowHeight - 50, btnWidth, 30, '自动排序');
    this.drawButton(ctx, 20 + btnWidth + 10, this.windowHeight - 50, btnWidth, 30, '高亮图案');
    this.drawButton(ctx, 20 + btnWidth * 2 + 20, this.windowHeight - 50, btnWidth, 30, '使用道具');
  }
  
  drawButton(ctx, x, y, width, height, text) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x, y, width, height);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
  }
  
  showGameOver() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.windowWidth, this.windowHeight);
    
    // 游戏结束文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', this.windowWidth / 2, this.windowHeight / 2 - 50);
    
    // 显示分数
    ctx.font = '16px Arial';
    ctx.fillText(`收集晶体: ${this.gameManager.resources.crystal}/10`, this.windowWidth / 2, this.windowHeight / 2);
    ctx.fillText(`剩余步数: ${this.gameManager.levelInfo.maxSteps - this.gameManager.levelInfo.steps}`, this.windowWidth / 2, this.windowHeight / 2 + 30);
    
    // 重新开始按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(this.windowWidth / 2 - 80, this.windowHeight / 2 + 60, 160, 40);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.windowWidth / 2 - 80, this.windowHeight / 2 + 60, 160, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('重新开始', this.windowWidth / 2, this.windowHeight / 2 + 80);
    
    ctx.restore();
  }
  
  showPause() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.windowWidth, this.windowHeight);
    
    // 暂停文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏暂停', this.windowWidth / 2, this.windowHeight / 2 - 30);
    
    // 继续按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(this.windowWidth / 2 - 80, this.windowHeight / 2, 160, 40);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.windowWidth / 2 - 80, this.windowHeight / 2, 160, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('继续游戏', this.windowWidth / 2, this.windowHeight / 2 + 20);
    
    ctx.restore();
  }
}

module.exports = Main;