// 游戏主逻辑
const { createScopedThreejs } = require('threejs-miniprogram');
const GameManager = require('./gameManager.js').default;

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

      // 4. 初始化渲染器
      this.initRenderer(canvas);

      // 5. 初始化场景和相机
      this.initScene();

      // 5.1 初始化 UI 场景
      this.initUI();

      // 6. 初始化游戏管理器
      this.gameManager = new GameManager();
      
      // 7. 初始化魔方
      this.initCube();
      
      // 存储游戏管理器的魔方引用
      this.gameManager.cube = this.cube;
      this.gameManager.THREE = this.THREE;
      
      // 8. 初始化事件处理
      this.initEventListeners();
      
      this.lastTime = Date.now();
      this.animate();
    } else {
      // 非微信环境，输出提示信息
      console.log('当前环境不是微信小游戏环境，无法初始化游戏');
    }
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
    this.renderer.autoClear = false; //以此支持多重渲染
  }
  
  initUI() {
    // 创建离屏 Canvas 用于 UI
    this.uiCanvas = wx.createCanvas();
    // 设置 Canvas 尺寸为物理像素尺寸
    this.uiCanvas.width = this.windowWidth * this.pixelRatio;
    this.uiCanvas.height = this.windowHeight * this.pixelRatio;
    
    // 创建 UI 场景
    this.uiScene = new this.THREE.Scene();
    // 创建正交相机，对应屏幕逻辑尺寸
    this.uiCamera = new this.THREE.OrthographicCamera(
      -this.windowWidth / 2, this.windowWidth / 2, 
      this.windowHeight / 2, -this.windowHeight / 2, 
      1, 10
    );
    this.uiCamera.position.z = 10;

    // 创建 UI 纹理
    this.uiTexture = new this.THREE.CanvasTexture(this.uiCanvas);
    this.uiTexture.minFilter = this.THREE.LinearFilter;
    this.uiTexture.magFilter = this.THREE.LinearFilter;
    
    // 创建全屏平面用于显示 UI
    const material = new this.THREE.MeshBasicMaterial({ 
      map: this.uiTexture, 
      transparent: true,
      depthTest: false, // UI 永远在最上层
      depthWrite: false
    });
    const geometry = new this.THREE.PlaneGeometry(this.windowWidth, this.windowHeight);
    const mesh = new this.THREE.Mesh(geometry, material);
    this.uiScene.add(mesh);
  }
  
  initScene() {
    // 创建场景
    this.scene = new this.THREE.Scene();
    this.scene.background = new this.THREE.Color(0x0a0a1a);
    
    // 创建相机
    this.camera = new this.THREE.PerspectiveCamera(75, this.windowWidth / this.windowHeight, 0.1, 1000);
    
    // 计算合适的相机距离
    // 假设魔方最大尺寸约为 85 (3 * 25 + 2 * 2 + 额外空间)
    const cubeSize = 90;
    // 视场角的一半转弧度
    const vFOV = this.camera.fov * Math.PI / 360; 
    // 根据屏幕宽高比计算水平视场角
    const aspect = this.windowWidth / this.windowHeight;
    
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
    
    this.camera.position.z = distance * 1.5; // 稍微拉远一点，留出操作空间
    this.camera.lookAt(0, 0, 0);
    
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
  

  
  initEventListeners() {
    const canvas = (typeof window !== 'undefined' && window.canvas) ? window.canvas : GameGlobal.screencanvas;
    
    // 触摸事件处理
    this.isDragging = false;
    this.previousTouchPosition = { x: 0, y: 0 };
    
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));
    
    // 鼠标事件处理（用于调试）
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    
    // 点击事件处理
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('touchend', this.onTouchEndClick.bind(this));
  }
  
  onClick(event) {
    // 计算点击位置
    const rect = event.target.getBoundingClientRect();
    const mouse = new this.THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.checkClick(mouse);
  }
  
  onTouchEndClick(event) {
    // 只有当不是拖动时才处理点击
    if (!this.isDragging) {
      const touch = event.changedTouches[0];
      const rect = event.target.getBoundingClientRect();
      const mouse = new this.THREE.Vector2();
      mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      
      // 检查是否点击了底部快捷操作按钮
      if (this.checkBottomActions(touch.clientX, touch.clientY)) {
        return;
      }
      
      // 检查是否点击了功能栏按钮
    if (this.checkFunctionButtons(touch.clientX, touch.clientY)) {
      return;
    }
    
    // 检查是否点击了待消除槽
    if (this.checkEliminationSlots(touch.clientX, touch.clientY)) {
      return;
    }
    
    // 检查是否点击了魔方方块
    this.checkClick(mouse);
    }
  }
  
  onClick(event) {
    // 计算点击位置
    const rect = event.target.getBoundingClientRect();
    const mouse = new this.THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // 检查是否点击了底部快捷操作按钮
    if (this.checkBottomActions(event.clientX, event.clientY)) {
      return;
    }
    
    // 检查是否点击了功能栏按钮
    if (this.checkFunctionButtons(event.clientX, event.clientY)) {
      return;
    }
    
    // 检查是否点击了待消除槽
    if (this.checkEliminationSlots(event.clientX, event.clientY)) {
      return;
    }
    
    // 检查是否点击了魔方方块
    this.checkClick(mouse);
  }
  
  checkBottomActions(x, y) {
    const btnWidth = (this.windowWidth - 40) / 3;
    const startY = this.windowHeight - 60;
    
    // 自动排序
    if (x >= 20 && x <= 20 + btnWidth && y >= startY + 10 && y <= startY + 40) {
      this.gameManager.autoSort();
      return true;
    }
    
    // 高亮图案
    if (x >= 20 + btnWidth + 10 && x <= 20 + btnWidth * 2 + 10 && y >= startY + 10 && y <= startY + 40) {
      this.highlightPatterns();
      return true;
    }
    
    // 使用道具
    if (x >= 20 + btnWidth * 2 + 20 && x <= 20 + btnWidth * 3 + 20 && y >= startY + 10 && y <= startY + 40) {
      this.useItem();
      return true;
    }
    
    return false;
  }
  
  checkFunctionButtons(x, y) {
    // 检查方向按钮
    const btnSize = 40;
    const btnStartX = 30;
    // 重新计算 startY，与 drawFunctionBars 保持一致
    const barHeight = 80;
    const startY = this.windowHeight - 60 - 10 - 60 - 10 - barHeight;
    const btnOffsetY = 10;
    const btnStartY = startY + btnOffsetY; // 按钮实际起始Y坐标
    
    // 上
    if (x >= btnStartX + btnSize && x <= btnStartX + btnSize * 2 && y >= btnStartY && y <= btnStartY + btnSize) {
      this.rotate('up');
      return true;
    }
    
    // 左
    if (x >= btnStartX && x <= btnStartX + btnSize && y >= btnStartY + btnSize && y <= btnStartY + btnSize * 2) {
      this.rotate('left');
      return true;
    }
    
    // 右
    if (x >= btnStartX + btnSize * 2 && x <= btnStartX + btnSize * 3 && y >= btnStartY + btnSize && y <= btnStartY + btnSize * 2) {
      this.rotate('right');
      return true;
    }
    
    // 下
    if (x >= btnStartX + btnSize && x <= btnStartX + btnSize * 2 && y >= btnStartY + btnSize * 2 && y <= btnStartY + btnSize * 3) {
      this.rotate('down');
      return true;
    }
    
    // 提示技能
    if (x >= btnStartX + btnSize * 3 + 20 && x <= btnStartX + btnSize * 4 + 20 && y >= btnStartY && y <= btnStartY + btnSize) {
      this.gameManager.useSkill('hint');
      return true;
    }
    
    // 撤回技能
    if (x >= btnStartX + btnSize * 3 + 20 && x <= btnStartX + btnSize * 4 + 20 && y >= btnStartY + 50 && y <= btnStartY + 50 + btnSize) {
      this.gameManager.useSkill('undo');
      return true;
    }
    
    // 暂停
    if (x >= btnStartX + btnSize * 4 + 30 && x <= btnStartX + btnSize * 5 + 30 && y >= btnStartY + 25 && y <= btnStartY + 25 + btnSize) {
      this.gameManager.useSkill('pause');
      return true;
    }
    
    return false;
  }
  
  checkEliminationSlots(x, y) {
    const slotWidth = 60;
    const slotHeight = 60;
    const startX = (this.windowWidth - slotWidth * 7 - 10 * 6) / 2;
    // 调整到底部按钮上方 (底部按钮高50，padding 10，再加上一些间距)
    const startY = this.windowHeight - 60 - 10 - slotHeight;
    
    // 检查是否在Y轴范围内
    if (y < startY || y > startY + slotHeight) {
      return false;
    }
    
    // 计算点击的是哪个槽位
    const relativeX = x - startX;
    if (relativeX < 0) return false;
    
    const index = Math.floor(relativeX / (slotWidth + 10));
    const offsetInSlot = relativeX % (slotWidth + 10);
    
    // 检查是否在槽位内（排除间隙）
    if (offsetInSlot > slotWidth) return false;
    
    // 检查索引是否有效
    if (index >= 0 && index < 7) {
      // 如果槽位有方块，则移除
      if (this.gameManager.eliminationSlots[index].block) {
        this.gameManager.removeBlockFromSlot(index);
        return true;
      }
    }
    
    return false;
  }
  
  highlightPatterns() {
    // 高亮魔方方块
    this.cubeGroup.children.forEach(block => {
      block.material.emissive = new this.THREE.Color(0xffffff);
      block.material.emissiveIntensity = 0.5;
    });
    
    // 1秒后取消高亮
    setTimeout(() => {
      this.cubeGroup.children.forEach(block => {
        block.material.emissive = new this.THREE.Color(0x000000);
        block.material.emissiveIntensity = 0;
      });
    }, 1000);
  }
  
  useItem() {
    // 简单的道具选择
    if (this.gameManager.resources.metal >= 5) {
      this.gameManager.useItem('bomb');
    } else if (this.gameManager.resources.ecology >= 3) {
      this.gameManager.useItem('colorChange');
    }
  }
  
  checkClick(mouse) {
    // 创建射线
    const raycaster = new this.THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    // 检测碰撞
    const intersects = raycaster.intersectObjects(this.cubeGroup.children);
    
    if (intersects.length > 0) {
      const clickedBlock = intersects[0].object;
      
      // 高亮效果
      clickedBlock.material.emissive = new this.THREE.Color(0xffffff);
      clickedBlock.material.emissiveIntensity = 0.8;
      
      // 延迟移除并添加到槽位
      setTimeout(() => {
        // 从大正方体中移除
        this.cubeGroup.remove(clickedBlock);
        
        // 添加到待消除槽
        this.gameManager.addBlockToSlot(clickedBlock);
        
        // 增加步数
        this.gameManager.levelInfo.steps++;
      }, 300);
    }
  }
  
  onTouchStart(event) {
    this.isDragging = true;
    const touch = event.touches[0];
    this.previousTouchPosition = { x: touch.clientX, y: touch.clientY };
  }
  
  onTouchMove(event) {
    if (this.isDragging) {
      const touch = event.touches[0];
      const deltaMove = {
        x: touch.clientX - this.previousTouchPosition.x,
        y: touch.clientY - this.previousTouchPosition.y
      };
      
      this.cubeGroup.rotation.y += deltaMove.x * 0.01;
      this.cubeGroup.rotation.x += deltaMove.y * 0.01;
      
      this.previousTouchPosition = { x: touch.clientX, y: touch.clientY };
    }
  }
  
  onTouchEnd() {
    this.isDragging = false;
  }
  
  onMouseDown(event) {
    this.isDragging = true;
    this.previousTouchPosition = { x: event.clientX, y: event.clientY };
  }
  
  onMouseMove(event) {
    if (this.isDragging) {
      const deltaMove = {
        x: event.clientX - this.previousTouchPosition.x,
        y: event.clientY - this.previousTouchPosition.y
      };
      
      this.cubeGroup.rotation.y += deltaMove.x * 0.01;
      this.cubeGroup.rotation.x += deltaMove.y * 0.01;
      
      this.previousTouchPosition = { x: event.clientX, y: event.clientY };
    }
  }
  
  onMouseUp() {
    this.isDragging = false;
  }
  
  animate() {
    const currentTime = Date.now();
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // 更新游戏状态
    this.gameManager.update(delta);
    
    // 绘制2D UI
    this.drawUI();
    
    // 显示游戏结束或暂停界面
    if (this.gameManager.isGameOver) {
      this.showGameOver();
    } else if (this.gameManager.isPaused) {
      this.showPause();
    }
    
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
  
  drawUI() {
    const ctx = this.uiCanvas.getContext('2d');
    
    // 清除上一帧内容
    ctx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    
    ctx.save();
    // 缩放以匹配逻辑像素
    ctx.scale(this.pixelRatio, this.pixelRatio);
    
    // 绘制关卡信息
    this.drawLevelInfo(ctx);
    
    // 绘制待消除槽
    this.drawEliminationSlots(ctx);
    
    // 绘制功能栏
    this.drawFunctionBars(ctx);
    
    // 绘制底部快捷操作
    this.drawBottomActions(ctx);
    
    ctx.restore();
    
    // 标记纹理需要更新
    this.uiTexture.needsUpdate = true;
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
    // 调整到底部按钮上方 (底部按钮高50，padding 10，再加上一些间距)
    const startY = this.windowHeight - 60 - 10 - slotHeight;
    
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, startY + 2, slotWidth - 4, slotHeight - 4);
      }
    }
  }
  
  drawFunctionBars(ctx) {
    const resources = this.gameManager.resources;
    
    // 调整到待消除槽上方
    // 待消除槽高度 60，底部按钮高度 60，间隔 10
    // 所以 startY 大约在 windowHeight - 130 左右往上
    // 功能栏高度 80
    const barHeight = 80;
    const startY = this.windowHeight - 60 - 10 - 60 - 10 - barHeight;

    // 左侧功能按钮
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.fillRect(10, startY, this.windowWidth / 2 - 15, barHeight);
    
    // 绘制方向按钮
    const btnSize = 40;
    const btnStartX = 30;
    // 按钮相对功能栏顶部的偏移
    const btnOffsetY = 10; 
    
    // 上
    this.drawControlButton(ctx, btnStartX + btnSize, startY + btnOffsetY, btnSize, btnSize, '↑');
    // 左
    this.drawControlButton(ctx, btnStartX, startY + btnOffsetY + btnSize, btnSize, btnSize, '←');
    // 右
    this.drawControlButton(ctx, btnStartX + btnSize * 2, startY + btnOffsetY + btnSize, btnSize, btnSize, '→');
    // 下
    this.drawControlButton(ctx, btnStartX + btnSize, startY + btnOffsetY + btnSize * 2, btnSize, btnSize, '↓');
    
    // 绘制技能按钮
    // 技能按钮放到右侧或者其他位置，这里暂时先不画或者调整位置
    // 由于空间有限，我们简化一下布局，只画几个核心按钮
    // 提示技能
    this.drawButton(ctx, btnStartX + btnSize * 3 + 20, startY + btnOffsetY, 40, 40, '💡');
    // 撤回技能
    this.drawButton(ctx, btnStartX + btnSize * 3 + 20, startY + btnOffsetY + 50, 40, 40, '↩');
    // 暂停
    this.drawButton(ctx, btnStartX + btnSize * 4 + 30, startY + btnOffsetY + 25, 40, 40, '⏸');
    
    // 右侧资源栏
    ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
    ctx.fillRect(this.windowWidth / 2 + 5, startY, this.windowWidth / 2 - 15, barHeight);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    
    let textY = startY + 15;
    ctx.fillText(`当前能量: ${resources.energy}/${resources.maxEnergy}`, this.windowWidth / 2 + 20, textY);
    textY += 20;
    ctx.fillText(`金属: ${resources.metal}`, this.windowWidth / 2 + 20, textY);
    textY += 20;
    ctx.fillText(`晶体: ${resources.crystal}`, this.windowWidth / 2 + 20, textY);
    textY += 20;
    ctx.fillText(`生态: ${resources.ecology}`, this.windowWidth / 2 + 20, textY);
    
    // 技能冷却条
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(this.windowWidth / 2 + 20, startY + barHeight - 15, this.windowWidth / 2 - 35, 10);
    
    ctx.fillStyle = '#00ff00';
    const skillProgress = this.gameManager.skillProgress;
    ctx.fillRect(this.windowWidth / 2 + 20, startY + barHeight - 15, (this.windowWidth / 2 - 35) * skillProgress, 10);
  }
  
  drawControlButton(ctx, x, y, width, height, text) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
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
    const ctx = this.uiCanvas.getContext('2d');
    ctx.save();
    ctx.scale(this.pixelRatio, this.pixelRatio);
    
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
    const ctx = this.uiCanvas.getContext('2d');
    ctx.save();
    ctx.scale(this.pixelRatio, this.pixelRatio);
    
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