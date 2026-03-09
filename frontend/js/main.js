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
      this.initRenderer(canvas);

      // 5. 初始化场景和相机
      this.initScene();

      // 5.1 初始化 UI 场景
      this.initUI();

      // 5.2 初始化飞行方块数组
      this.flyingBlocks = [];
      
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
    
    // 创建 UI 粒子组
    this.particleGroup = new this.THREE.Group();
    // 放在 UI 平面之上 (UI plane is at z=0, camera at z=10)
    this.particleGroup.position.z = 1; 
    this.uiScene.add(this.particleGroup);
  }
  
  initScene() {
    // 创建场景
    this.scene = new this.THREE.Scene();
    this.scene.background = new this.THREE.Color(0x050510); // 深空背景
    this.scene.fog = new this.THREE.FogExp2(0x050510, 0.002); // 添加雾效增强深邃感

    // 添加星系背景
    this.createGalaxy();
    
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
    const ambientLight = new this.THREE.AmbientLight(0xffffff, 0.7); // 提高环境光强度，改回纯白
    this.scene.add(ambientLight);
    
    // 主光源：日光 (模仿恒星)
    const sunLight = new this.THREE.DirectionalLight(0xffffff, 1.0); // 提高强度
    sunLight.position.set(10, 20, 10);
    this.scene.add(sunLight);

    // 补光：霓虹蓝 (星云感)
    const blueLight = new this.THREE.PointLight(0x00ffff, 0.8, 500); // 提高强度
    blueLight.position.set(-20, 10, 20);
    this.scene.add(blueLight);

    // 补光：霓虹粉 (赛博朋克感)
    const pinkLight = new this.THREE.PointLight(0xff00ff, 0.8, 500); // 提高强度
    pinkLight.position.set(20, -10, 20);
    this.scene.add(pinkLight);
  }

  createGalaxy() {
    // 创建星系容器
    this.galaxyGroup = new this.THREE.Group();
    this.galaxyGroup.position.set(0, 0, -450); // 稍微拉近一点，使其填充更多背景
    
    // 初始倾斜，匹配参考图中的扁平椭圆感
    this.galaxyGroup.rotation.x = Math.PI / 2.6; 
    this.galaxyGroup.rotation.z = Math.PI / 6;
    this.scene.add(this.galaxyGroup);

    // 1. 星系核 (Galactic Nucleus) - 极其明亮且有层次的核心
    const coreCount = 8000; // 增加核心粒子数
    const coreGeometry = new this.THREE.BufferGeometry();
    const corePositions = [];
    const coreColors = [];
    
    const coreWhite = new this.THREE.Color(0xffffff);
    const coreGold = new this.THREE.Color(0xffe066); 

    for (let i = 0; i < coreCount; i++) {
        // 中心极度密集
        const r = Math.pow(Math.random(), 3.0) * 80;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta) * 0.4; // 核心更扁平
        const z = r * Math.cos(phi);
        
        corePositions.push(x, y, z);
        
        const color = coreWhite.clone().lerp(coreGold, r / 80);
        coreColors.push(color.r, color.g, color.b);
    }
    
    if (coreGeometry.setAttribute) {
        coreGeometry.setAttribute('position', new this.THREE.Float32BufferAttribute(corePositions, 3));
        coreGeometry.setAttribute('color', new this.THREE.Float32BufferAttribute(coreColors, 3));
    } else {
        coreGeometry.addAttribute('position', new this.THREE.BufferAttribute(new Float32Array(corePositions), 3));
        coreGeometry.addAttribute('color', new this.THREE.BufferAttribute(new Float32Array(coreColors), 3));
    }
    
    const coreMaterial = new this.THREE.PointsMaterial({
        size: 3.0,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: this.THREE.AdditiveBlending
    });
    
    const nucleus = new this.THREE.Points(coreGeometry, coreMaterial);
    this.galaxyGroup.add(nucleus);

    // 2. 旋臂 (Spiral Arms) - 多层、交织、宏大
    const starCount = 100000; // 增加粒子数以支持更多旋臂的密度
    const armGeometry = new this.THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    
    const armCount = 12; // 增加到12条旋臂，实现极其细密且交织的效果
    const twist = 4.5;  
    
    const cyanColor = new this.THREE.Color(0x99ffff); 
    const blueColor = new this.THREE.Color(0x3366ff); 
    const deepBlue = new this.THREE.Color(0x001133);  
    const starWhite = new this.THREE.Color(0xffffff); 

    for (let i = 0; i < starCount; i++) {
        const armIndex = i % armCount;
        // 给不同旋臂一点初始相位偏移，使其看起来更自然交织
        const phaseOffset = (armIndex % 2 === 0) ? 0 : 0.2;
        const armAngle = ((armIndex / armCount) + phaseOffset) * Math.PI * 2;
        
        // 距离分布：范围更大，覆盖更多背景
        const distance = 40 + Math.pow(Math.random(), 1.1) * 750;
        const relDist = distance / 790;
        
        // 螺旋角度：参考图中旋臂非常紧凑且层叠
        const angle = armAngle + (distance / 400) * twist;
        
        // 散布逻辑：大幅增加旋臂宽度
        // 增大 spreadBase 并在 randomSpread 中使用较小的指数，使粒子向外扩散更多
        const densityFactor = Math.exp(-Math.pow((relDist - 0.3) * 2.5, 2)); 
        const spreadBase = (2.5 - densityFactor) * 150; // 从 80 增加到 150，大幅拓宽旋臂
        
        // 减小指数 power，让分布更均匀地向外扩展
        const randomSpread = Math.pow(Math.random(), 1.5); // 从 2.0 减小到 1.5
        const offX = (Math.random() - 0.5) * spreadBase * randomSpread;
        const offY = (Math.random() - 0.5) * (spreadBase * 0.2); // 稍微增加厚度感
        const offZ = (Math.random() - 0.5) * spreadBase * randomSpread;
        
        const x = Math.cos(angle) * distance + offX;
        const y = offY;
        const z = Math.sin(angle) * distance + offZ;
        
        positions.push(x, y, z);
        
        // 颜色映射：从中心向外
        let color;
        const rand = Math.random();
        
        if (relDist < 0.12) {
            color = coreGold.clone().lerp(cyanColor, relDist / 0.12);
        } else if (rand > 0.99) {
            color = starWhite; // 孤立的亮恒星
        } else if (rand > 0.4) {
            color = cyanColor.clone().lerp(blueColor, relDist);
        } else {
            color = blueColor.clone().lerp(deepBlue, relDist);
        }
        
        // 亮度梯度：旋臂主干区域更亮
        const brightness = 0.3 + densityFactor * 1.8 + (rand > 0.9 ? 0.5 : 0);
        colors.push(
            Math.min(1.0, color.r * brightness),
            Math.min(1.0, color.g * brightness),
            Math.min(1.0, color.b * brightness)
        );
    }
    
    if (armGeometry.setAttribute) {
        armGeometry.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));
        armGeometry.setAttribute('color', new this.THREE.Float32BufferAttribute(colors, 3));
    } else {
        armGeometry.addAttribute('position', new this.THREE.BufferAttribute(new Float32Array(positions), 3));
        armGeometry.addAttribute('color', new this.THREE.BufferAttribute(new Float32Array(colors), 3));
    }
    
    const armMaterial = new this.THREE.PointsMaterial({
        size: 1.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: this.THREE.AdditiveBlending
    });
    
    const spiralArms = new this.THREE.Points(armGeometry, armMaterial);
    this.galaxyGroup.add(spiralArms);

    // 3. 背景背景星星 (更远、更暗、增加空间感)
    this.createBackgroundStars(2000);
  }

  createBackgroundStars(count = 500) {
      const geometry = new this.THREE.BufferGeometry();
      const positions = [];
      
      for(let i=0; i<count; i++) {
          const r = 850 + Math.random() * 350;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos((Math.random() * 2) - 1);
          
          const x = r * Math.sin(phi) * Math.cos(theta);
          const y = r * Math.sin(phi) * Math.sin(theta);
          const z = r * Math.cos(phi);
          
          positions.push(x, y, z);
      }
      
      if (geometry.setAttribute) {
          geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));
      } else {
          geometry.addAttribute('position', new this.THREE.BufferAttribute(new Float32Array(positions), 3));
      }
      
      const material = new this.THREE.PointsMaterial({
          color: 0xffffff,
          size: 1.0,
          transparent: true,
          opacity: 0.3
      });
      
      this.scene.add(new this.THREE.Points(geometry, material));
  }
  
  initCube() {
    // 如果已存在，先移除
    if (this.cubeGroup) {
      this.scene.remove(this.cubeGroup);
      // 清理内存
      this.cubeGroup.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }

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
  
  createTexture(type) {
    const size = 256; // 提高分辨率以获得更好的细节
    const canvas = wx.createCanvas();
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // 1. 背景：深色金属底板 (加深背景，增加对比度)
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, '#151520'); // 更深的蓝灰
    bgGrad.addColorStop(0.5, '#0a0a12'); // 极深蓝
    bgGrad.addColorStop(1, '#050508'); // 接近纯黑
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);
    
    // 2. 增加一些科技感纹理 (网格线)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // 稍微提亮网格线
    ctx.lineWidth = 1;
    const gridSize = size / 8;
    for(let i=1; i<8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(size, i * gridSize);
        ctx.stroke();
    }
    ctx.restore();
    
    // 3. 3D 边框效果 (倒角)
    const borderWidth = 8;
    
    // 右下阴影 (模拟光源在左上)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(size, size);
    ctx.lineTo(0, size);
    ctx.lineTo(borderWidth, size - borderWidth);
    ctx.lineTo(size - borderWidth, size - borderWidth);
    ctx.lineTo(size - borderWidth, borderWidth);
    ctx.closePath();
    ctx.fill();
    
    // 左上高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.lineTo(size - borderWidth, borderWidth);
    ctx.lineTo(borderWidth, borderWidth);
    ctx.lineTo(borderWidth, size - borderWidth);
    ctx.closePath();
    ctx.fill();
    
    // 边框内侧细线 (增加精致感)
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)'; // 淡淡的霓虹蓝
    ctx.lineWidth = 2;
    ctx.strokeRect(borderWidth, borderWidth, size - borderWidth*2, size - borderWidth*2);
    
    // 4. 绘制中心图案 (增加投影使其悬浮)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 1.0)'; // 加深阴影
    ctx.shadowBlur = 20; // 增加阴影模糊半径
    ctx.shadowOffsetX = 0; // 居中阴影
    ctx.shadowOffsetY = 0;
    
    // 稍微缩小图案比例，留出更多呼吸空间
    this.drawPattern(ctx, size / 2, size / 2, size * 0.35, type);
    ctx.restore();
    
    // 5. 表面玻璃质感高光 (右上角光斑 - 减弱，避免遮挡图案)
    const glassGrad = ctx.createLinearGradient(0, 0, size/2, size/2);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)'); // 降低不透明度
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size/2, 0);
    ctx.lineTo(0, size/2);
    ctx.closePath();
    ctx.fill();
    
    const texture = new this.THREE.CanvasTexture(canvas);
    return texture;
  }

  drawPattern(ctx, cx, cy, r, type) {
    ctx.save();
    
    switch(type) {
        case 0: // 能量核心 (Energy Core)
            const grad0 = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r);
            grad0.addColorStop(0, '#ffffff');
            grad0.addColorStop(0.5, '#00ffff');
            grad0.addColorStop(1, 'transparent');
            ctx.fillStyle = grad0;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI*2);
            ctx.fill();
            break;
        case 1: { // 信号频谱 (Signal Spectrum)
            // 1. 绘制示波器背景网格 (淡绿色)
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.lineWidth = 1;
            const gridStep = r * 0.5;
            // 绘制一个简单的十字坐标
            ctx.beginPath();
            ctx.moveTo(cx, cy - r*0.8);
            ctx.lineTo(cx, cy + r*0.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - r*0.8, cy);
            ctx.lineTo(cx + r*0.8, cy);
            ctx.stroke();

            // 2. 绘制主波形 (模拟复杂的信号波)
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.shadowColor = '#00FF00';
            ctx.shadowBlur = 8;
            
            ctx.beginPath();
            const waveWidth = r * 1.6;
            const startX = cx - waveWidth / 2;
            
            for (let x = 0; x <= waveWidth; x += 3) {
                // 叠加两个正弦波，产生更具科技感的干涉波形
                const normalizedX = x / waveWidth;
                const angle = normalizedX * Math.PI * 6; // 3 periods
                
                // 主波 + 次波
                const yOffset = Math.sin(angle) * (r * 0.35) + Math.cos(angle * 2.5) * (r * 0.15);
                
                // 衰减系数 (两端低，中间高，模拟脉冲)
                const envelope = Math.sin(normalizedX * Math.PI);
                
                const y = cy + yOffset * envelope;
                
                if (x === 0) ctx.moveTo(startX + x, y);
                else ctx.lineTo(startX + x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // 3. 装饰：二进制数据点
            ctx.fillStyle = '#ccffcc'; // 亮绿白
            ctx.font = `${r*0.3}px Arial`; // 无衬线字体更现代
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 在波峰波谷附近添加数字
            ctx.fillText('1', cx - r*0.4, cy - r*0.5);
            ctx.fillText('0', cx + r*0.5, cy + r*0.5);
            
            // 添加几个随机的小方块点缀，增加数字感
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(cx + r*0.2, cy - r*0.3, 3, 3);
            ctx.fillRect(cx - r*0.3, cy + r*0.2, 3, 3);
            ctx.fillRect(cx + r*0.6, cy - r*0.1, 2, 2);
            break;
        }
        case 2: // 星际传送门 (Stargate)
            // 1. 外环结构
            ctx.strokeStyle = '#9C88FF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.9, 0, Math.PI*2);
            ctx.stroke();
            
            // 2. 内部事件视界 (漩涡感)
            const grad2 = ctx.createRadialGradient(cx, cy, r*0.1, cx, cy, r*0.8);
            grad2.addColorStop(0, '#ffffff');
            grad2.addColorStop(0.4, '#9C88FF');
            grad2.addColorStop(1, 'transparent');
            ctx.fillStyle = grad2;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.8, 0, Math.PI*2);
            ctx.fill();
            
            // 3. 锁定点 (Chevrons) - 7个方位
            ctx.fillStyle = '#E0E0E0';
            for(let i=0; i<7; i++) {
                const angle = i * (Math.PI*2 / 7) - Math.PI/2; // 从顶部开始
                const chevronR = r * 0.9;
                
                ctx.save();
                ctx.translate(cx + Math.cos(angle) * chevronR, cy + Math.sin(angle) * chevronR);
                ctx.rotate(angle + Math.PI/2); // 旋转以指向中心
                
                // 绘制三角形锁定块
                ctx.beginPath();
                ctx.moveTo(-r*0.15, 0);
                ctx.lineTo(r*0.15, 0);
                ctx.lineTo(0, r*0.2); // 指向外
                ctx.fill();
                
                ctx.restore();
            }
            break;
        case 3: // 全息飞船 (Holographic Ship)
            ctx.fillStyle = '#00D4FF';
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r*0.6, cy + r);
            ctx.lineTo(cx, cy + r*0.7);
            ctx.lineTo(cx - r*0.6, cy + r);
            ctx.fill();
            break;
        case 4: // 精密电路 (Precision Circuit)
            ctx.strokeStyle = '#00FFAB';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - r, cy);
            ctx.lineTo(cx - r*0.5, cy);
            ctx.lineTo(cx - r*0.5, cy - r*0.5);
            ctx.lineTo(cx + r*0.5, cy - r*0.5);
            ctx.lineTo(cx + r*0.5, cy + r*0.5);
            ctx.lineTo(cx + r, cy + r*0.5);
            ctx.stroke();
            ctx.fillStyle = '#00FFAB';
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.2, 0, Math.PI*2);
            ctx.fill();
            break;
        case 5: // 复合装甲 (Composite Armor)
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(cx - r*0.8, cy - r*0.8, r*1.6, r*1.6);
            ctx.fillStyle = '#bdc3c7'; // 铆钉
            ctx.beginPath();
            ctx.arc(cx - r*0.6, cy - r*0.6, r*0.1, 0, Math.PI*2);
            ctx.arc(cx + r*0.6, cy - r*0.6, r*0.1, 0, Math.PI*2);
            ctx.arc(cx - r*0.6, cy + r*0.6, r*0.1, 0, Math.PI*2);
            ctx.arc(cx + r*0.6, cy + r*0.6, r*0.1, 0, Math.PI*2);
            ctx.fill();
            break;
        case 6: // 相位水晶 (Phase Crystal)
            ctx.fillStyle = '#FF00FF';
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r*0.7, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r*0.7, cy);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx, cy + r);
            ctx.moveTo(cx - r*0.7, cy);
            ctx.lineTo(cx + r*0.7, cy);
            ctx.stroke();
            break;
        case 7: // 辐射警示 (Radiation Warning) -> Quantum Hazard
            // 绘制橙红色全息三角
            ctx.strokeStyle = '#FF4500'; // OrangeRed
            // 动态线宽
            const lw7 = Math.max(1, r * 0.03);
            ctx.lineWidth = lw7;
            ctx.shadowColor = '#FF4500';
            ctx.shadowBlur = 10;
            
            // 三角形路径
            const h = r * 0.8;
            ctx.beginPath();
            ctx.moveTo(cx, cy - h);
            ctx.lineTo(cx + h, cy + h);
            ctx.lineTo(cx - h, cy + h);
            ctx.closePath();
            ctx.stroke();
            
            // 内部感叹号
            ctx.fillStyle = '#FF4500';
            const rectW = Math.max(2, r * 0.06);
            ctx.beginPath();
            ctx.rect(cx - rectW/2, cy - h/2, rectW, h);
            ctx.fill();
            const dotR = Math.max(1.5, r * 0.04);
            ctx.beginPath();
            ctx.arc(cx, cy + h/2 + dotR*2, dotR, 0, Math.PI*2);
            ctx.fill();
            
            // Glitch 效果 (固定位置，不再随机，确保 UI 和 3D 一致)
            // 只有当尺寸足够大时才绘制 Glitch，或者绘制一个非常简单的固定 Glitch
            if (r > 10) {
                 const glitchY = cy + 0.2 * h; // 固定位置
                 const glitchW = r * 1.5;
                 const glitchH = Math.max(1, r * 0.05);
                 ctx.fillStyle = 'rgba(255, 69, 0, 0.5)';
                 ctx.fillRect(cx - glitchW/2, glitchY, glitchW, glitchH);
            }
            ctx.shadowBlur = 0;
            break;
        case 8: // 太阳能板 (Solar Panel) -> Photonic Array
            ctx.fillStyle = '#000080'; // Navy
            const hexR = r * 0.3;
            // 绘制蜂巢状阵列
            const offsets = [
                {x: 0, y: 0},
                {x: 0, y: -hexR*1.8},
                {x: 0, y: hexR*1.8},
                {x: -hexR*1.6, y: -hexR*0.9},
                {x: -hexR*1.6, y: hexR*0.9},
                {x: hexR*1.6, y: -hexR*0.9},
                {x: hexR*1.6, y: hexR*0.9}
            ];
            
            // 使用伪随机或固定索引来决定哪些点亮，确保 UI (每帧重绘) 和 3D (静态纹理) 一致
            offsets.forEach((pos, index) => {
                this.drawHexagon(ctx, cx + pos.x, cy + pos.y, hexR, '#000080', '#4169E1');
                
                // 固定亮点的逻辑：例如索引为 0, 3, 6 的板子上有亮点
                // 或者基于时间 (如果是 UI) -> 但为了 3D 一致性，最好是静态的
                // 这里我们选择固定的装饰，或者移除闪烁
                const shouldLightUp = (index % 3 === 0); 
                
                if (shouldLightUp) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // 稍微柔和一点
                    ctx.beginPath();
                    // 动态大小
                    const dotSize = Math.max(1, r * 0.05);
                    ctx.arc(cx + pos.x, cy + pos.y, dotSize, 0, Math.PI*2);
                    ctx.fill();
                }
            });
            break;
        case 9: // 扫描网格 (Scan Grid) -> Active Radar
            ctx.strokeStyle = '#00D4FF';
            const radarLW = Math.max(1, r * 0.03);
            ctx.lineWidth = radarLW;
            
            // 同心圆
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.3, 0, Math.PI*2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.6, 0, Math.PI*2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.9, 0, Math.PI*2);
            ctx.stroke();
            
            // 扫描线 (固定角度，UI和3D一致)
            const angle9 = Math.PI * 1.75; // -45度
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle9) * r, cy + Math.sin(angle9) * r);
            ctx.stroke();
            
            // 扫描扇区渐变
            const scanGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            scanGrad.addColorStop(0, 'rgba(0, 212, 255, 0.5)');
            scanGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = scanGrad;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, angle9 - Math.PI/4, angle9);
            ctx.lineTo(cx, cy);
            ctx.fill();
            break;
        case 10: // 虫洞视界 (Wormhole Horizon)
            const grad10 = ctx.createRadialGradient(cx, cy, r*0.3, cx, cy, r);
            grad10.addColorStop(0, '#000000');
            grad10.addColorStop(0.5, '#FF9A3C');
            grad10.addColorStop(1, '#9C88FF');
            ctx.fillStyle = grad10;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI*2);
            ctx.fill();
            break;
        case 11: // 信号波纹 (Signal Ripple) -> Hex-Pulse Sonar
            ctx.strokeStyle = '#00FFAB'; // Bright Cyan-Green
            ctx.lineWidth = Math.max(1, r * 0.03);
            
            // 绘制多层六边形波纹
            for(let i=1; i<=3; i++) {
                const hexR = r * i / 3.5;
                const alpha = 1.0 - (i * 0.2); // 外层渐淡
                
                ctx.globalAlpha = alpha;
                this.drawHexagon(ctx, cx, cy, hexR, null, '#00FFAB');
                
                // 每个角的数据节点
                if (i === 2 || i === 3) {
                    for(let j=0; j<6; j++) {
                        const angle = Math.PI / 3 * j;
                        const nx = cx + hexR * Math.cos(angle);
                        const ny = cy + hexR * Math.sin(angle);
                        
                        ctx.fillStyle = '#FFFFFF';
                        const dotR = Math.max(1, r * 0.02);
                        ctx.beginPath();
                        ctx.arc(nx, ny, dotR, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
            }
            ctx.globalAlpha = 1.0;
            
            // 中心发射源
            ctx.fillStyle = '#00FFAB';
            ctx.shadowColor = '#00FFAB';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.15, 0, Math.PI*2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            break;
        case 12: // 危险条纹 (Danger Stripe) -> Laser Barrier
            // 1. 深红背景
            ctx.fillStyle = '#300000';
            ctx.fillRect(cx - r, cy - r, r*2, r*2);
            
            // 2. 绘制水平激光束
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 10;
            
            for(let i=-2; i<=2; i++) {
                const beamY = cy + i * r * 0.6;
                
                // 激光核心 (白)
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - r, beamY);
                ctx.lineTo(cx + r, beamY);
                ctx.stroke();
                
                // 激光外晕 (红)
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(cx - r, beamY);
                ctx.lineTo(cx + r, beamY);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            break;
        case 13: // 加密矩阵 (Encryption Matrix)
            ctx.fillStyle = '#ffffff';
            const cellSize = r*2 / 4;
            // 使用伪随机数生成器，基于种子 (例如 cx, cy)
            // 简单哈希函数
            const seed = Math.floor(cx * cy);
            let random = function() {
                const x = Math.sin(seed++) * 10000;
                return x - Math.floor(x);
            };
            
            // 或者直接固定图案，不再随机
            // 为了美观，我们绘制一个固定的矩阵图案
            const matrixPattern = [
                [1, 0, 1, 1],
                [0, 1, 0, 1],
                [1, 1, 0, 0],
                [1, 0, 1, 0]
            ];
            
            for(let i=0; i<4; i++) {
                for(let j=0; j<4; j++) {
                    if (matrixPattern[j][i]) {
                        ctx.fillRect(cx - r + i*cellSize + 2, cy - r + j*cellSize + 2, cellSize-4, cellSize-4);
                    }
                }
            }
            break;
        case 14: // 推进尾焰 (Thruster Flame)
            const grad14 = ctx.createLinearGradient(cx, cy-r, cx, cy+r);
            grad14.addColorStop(0, '#3742FA');
            grad14.addColorStop(1, '#FF9A3C');
            ctx.fillStyle = grad14;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.quadraticCurveTo(cx + r, cy, cx, cy + r);
            ctx.quadraticCurveTo(cx - r, cy, cx, cy - r);
            ctx.fill();
            break;
        case 15: // 星际罗盘 (Star Compass) - 替代原来的星域图
            // 1. 深色背景圆盘
            ctx.fillStyle = '#0F0F2F';
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.9, 0, Math.PI*2);
            ctx.fill();
            
            // 2. 外圈刻度环
            ctx.strokeStyle = '#B0C4DE'; // LightSteelBlue
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.85, 0, Math.PI*2);
            ctx.stroke();
            
            // 刻度线
            for (let i = 0; i < 12; i++) {
                const angle = i * Math.PI / 6;
                const innerR = (i % 3 === 0) ? r * 0.7 : r * 0.8;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
                ctx.lineTo(cx + Math.cos(angle) * r * 0.85, cy + Math.sin(angle) * r * 0.85);
                ctx.stroke();
            }
            
            // 3. 内部旋转环 (金色)
            ctx.strokeStyle = '#FFD700'; // Gold
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 5;
            
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.5, 0, Math.PI*2);
            ctx.stroke();
            
            // 4. 指针 (菱形)
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.7); // 北
            ctx.lineTo(cx + r * 0.15, cy);
            ctx.lineTo(cx, cy + r * 0.3); // 南 (短)
            ctx.lineTo(cx - r * 0.15, cy);
            ctx.closePath();
            ctx.fill();
            
            // 中心轴
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.08, 0, Math.PI*2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            break;
        case 16: // 护盾力场 (Shield Field)
            ctx.strokeStyle = '#00D4FF';
            ctx.lineWidth = 1;
            this.drawHexagon(ctx, cx, cy, r*0.9, null, '#00D4FF');
            this.drawHexagon(ctx, cx, cy, r*0.5, null, '#00D4FF');
            break;
        case 17: // 异星生态 (Alien Ecology)
            ctx.strokeStyle = '#00D8D6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.bezierCurveTo(cx+r, cy-r, cx-r, cy-r, cx, cy-r*0.5);
            ctx.bezierCurveTo(cx+r, cy+r, cx-r, cy+r, cx, cy+r*0.5);
            ctx.stroke();
            break;
        case 18: // 像素星座 (Pixel Constellation)
            ctx.fillStyle = '#ffffff';
            const px = r*0.4;
            ctx.fillRect(cx - px, cy - px, px, px);
            ctx.fillRect(cx + px*0.5, cy, px, px);
            ctx.fillRect(cx - px*1.5, cy + px*0.5, px, px);
            break;
        case 19: // 电弧过载 (Arc Overload)
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - r*0.8, cy - r*0.8);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx - r*0.4, cy + r*0.4);
            ctx.lineTo(cx + r*0.8, cy + r*0.8);
            ctx.stroke();
            break;
        case 20: // 几何迷彩 (Geometric Camo)
            ctx.fillStyle = '#bdc3c7'; // 亮银灰
            ctx.beginPath();
            ctx.moveTo(cx - r, cy - r);
            ctx.lineTo(cx, cy - r);
            ctx.lineTo(cx - r, cy);
            ctx.fill();
            ctx.fillStyle = '#3498db'; // 亮蓝色
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx + r, cy + r);
            ctx.fill();
            break;
        case 21: // 外星腐蚀 (Alien Corrosion)
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(cx-r, cy-r, r*2, r*2);
            ctx.fillStyle = '#2ecc71'; // 腐蚀绿
            
            // 固定腐蚀点位置
            const corrosionSpots = [
                {x: 0, y: 0},
                {x: 0.3, y: -0.3},
                {x: -0.4, y: 0.2},
                {x: 0.2, y: 0.5},
                {x: -0.2, y: -0.4}
            ];
            
            corrosionSpots.forEach(pos => {
                ctx.beginPath();
                ctx.arc(cx + pos.x * r, cy + pos.y * r, r*0.2, 0, Math.PI*2);
                ctx.fill();
            });
            break;
        case 22: // 导航信标 (Navigation Beacon)
            ctx.fillStyle = '#FF4757';
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.4, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#FF4757';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.7, 0, Math.PI*2);
            ctx.stroke();
            break;
        case 23: // 势力徽章 (Faction Badge) -> Cosmic Insignia
            ctx.fillStyle = '#E6E6E6';
            ctx.shadowColor = '#FFD700'; // Gold glow
            ctx.shadowBlur = 10;
            
            // 绘制双翼/星形徽章
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.9); // Top tip
            ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 0.3, cx + r * 0.9, cy - r * 0.5); // Right wing tip
            ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.2, cx, cy + r * 0.8); // Bottom tip
            ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.2, cx - r * 0.9, cy - r * 0.5); // Left wing tip
            ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 0.3, cx, cy - r * 0.9); // Back to top
            ctx.closePath();
            
            // 填充渐变金银色
            const grad23 = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
            grad23.addColorStop(0, '#C0C0C0'); // Silver
            grad23.addColorStop(0.5, '#FFD700'); // Gold
            grad23.addColorStop(1, '#C0C0C0'); // Silver
            ctx.fillStyle = grad23;
            ctx.fill();
            
            // 内部细节
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            break;
        default:
            // 默认圆形
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.5, 0, Math.PI*2);
            ctx.fill();
    }
    ctx.restore();
  }
  
  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerRadius;
          y = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
  }

  createCube() {
    this.blocks = [];
    const blockSize = 25;
    const gap = 2;
    
    // 定义24种颜色 (对应 UI 设计文档)
    const colors = [
      0x00ffff, 0x00ff00, 0x9C88FF, 0x00D4FF, 0x00FFAB, 0x95a5a6,
      0xFF00FF, 0xFFD32A, 0x3742FA, 0x00D4FF, 0xFF9A3C, 0x00D8D6,
      0xFF4757, 0xffffff, 0xFF9A3C, 0x3B3B98, 0x00D4FF, 0x00D8D6,
      0xffffff, 0xFFFF00, 0x34495e, 0x2ecc71, 0xFF4757, 0xE6E6E6
    ];
    
    // 创建类型数组
    // 每次从24种随机选取9种，每种3个
    const allTypes = Array.from({length: 24}, (_, i) => i);
    const selectedTypes = [];
    
    // 随机选取9种
    while(selectedTypes.length < 9) {
        const randomIndex = Math.floor(Math.random() * allTypes.length);
        selectedTypes.push(allTypes[randomIndex]);
        allTypes.splice(randomIndex, 1);
    }
    
    // 生成27个方块 (9种 * 3个)
    let typeArray = [];
    selectedTypes.forEach(type => {
        for(let i=0; i<3; i++) {
            typeArray.push(type);
        }
    });
    
    // 打乱数组
    typeArray.sort(() => Math.random() - 0.5);
    
    // 缓存纹理
    if (!this.textureCache) {
        this.textureCache = [];
        for(let i=0; i<24; i++) {
            this.textureCache.push(this.createTexture(i));
        }
    }
    
    // 创建3x3x3的方块
    let typeIndex = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const type = typeArray[typeIndex++];
          const safeType = type % colors.length;
          const color = colors[safeType];
          
          const geometry = new this.THREE.BoxGeometry(blockSize, blockSize, blockSize);
          // 还原：使用材质 color 属性来染色
          const material = new this.THREE.MeshStandardMaterial({ 
              color: 0xffffff, // 保持白色，让纹理主导
              map: this.textureCache[type], 
              roughness: 0.2, // 降低粗糙度，让表面更光滑
              metalness: 0.5, // 降低金属度，减少环境反光对图案的干扰
              emissive: color, 
              emissiveIntensity: 0.5 // 稍微提高自发光，让颜色更透亮
          });
          
          const block = new this.THREE.Mesh(geometry, material);
          block.position.set(
            x * (blockSize + gap),
            y * (blockSize + gap),
            z * (blockSize + gap)
          );
          
          block.userData = {
            color: color,
            type: type,
            position: { x, y, z },
            initialY: block.position.y,
            initialScale: 1,
            randomOffset: Math.random() * 100 // 每个方块独立的随机偏移，用于呼吸动画
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
    this.touchStartX = 0;
    this.touchStartY = 0;
    
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));
    
    // 鼠标事件处理（用于调试）
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    
    // 点击事件处理 - 移除重复的监听，在 onTouchEnd 中统一处理
    // canvas.addEventListener('click', this.onClick.bind(this));
    // canvas.addEventListener('touchend', this.onTouchEndClick.bind(this));
  }
  
  handleTap(clientX, clientY) {
      // 如果游戏结束，检查是否点击了重新开始按钮
      if (this.gameManager.isGameOver) {
        const btnX = this.windowWidth / 2 - 80;
        const btnY = this.windowHeight / 2 + 60;
        const btnWidth = 160;
        const btnHeight = 40;
        
        if (clientX >= btnX && clientX <= btnX + btnWidth &&
            clientY >= btnY && clientY <= btnY + btnHeight) {
          // 重新开始游戏
          // 重新创建 GameManager 实例
          this.gameManager = new GameManager();
          
          // 重新初始化魔方
    this.initCube();
    
    // 清空粒子特效
    this.clearParticles();
    
    // 重新绑定引用
    this.gameManager.cube = this.cube;
    
    // 清空飞行方块
    this.flyingBlocks = [];
          this.gameManager.THREE = this.THREE;
          
          return;
        }
        return; // 游戏结束时不响应其他点击
      }

      // 如果游戏暂停，检查是否点击了继续按钮
      if (this.gameManager.isPaused) {
         const btnX = this.windowWidth / 2 - 80;
         const btnY = this.windowHeight / 2;
         const btnWidth = 160;
         const btnHeight = 40;
         
         if (clientX >= btnX && clientX <= btnX + btnWidth &&
             clientY >= btnY && clientY <= btnY + btnHeight) {
            this.gameManager.isPaused = false;
         }
         return;
      }

      // 检查是否点击了底部快捷操作按钮
      if (this.checkBottomActions(clientX, clientY)) {
        return;
      }
      
      // 检查是否点击了功能栏按钮
    // if (this.checkFunctionButtons && this.checkFunctionButtons(clientX, clientY)) {
    //   return;
    // }
    
    // 检查是否点击了待消除槽
    if (this.checkEliminationSlots && this.checkEliminationSlots(clientX, clientY)) {
      return;
    }
    
    // 检查是否点击了魔方方块
    // 需要将屏幕坐标转换为 normalized device coordinates (-1 to +1)
    const rect = { left: 0, top: 0, width: this.windowWidth, height: this.windowHeight };
    // 如果是在 web 环境，需要获取 canvas 的 rect
    if (typeof window !== 'undefined' && window.canvas && window.canvas.getBoundingClientRect) {
        const r = window.canvas.getBoundingClientRect();
        rect.left = r.left;
        rect.top = r.top;
        rect.width = r.width;
        rect.height = r.height;
    }

    const mouse = new this.THREE.Vector2();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    if (this.checkClick) {
      this.checkClick(mouse);
    }
  }

  // 移除旧的 onClick 和 onTouchEndClick
  // onClick(event) { ... }
  // onTouchEndClick(event) { ... }
  
  checkClick(mouse) {
    // 创建射线
    const raycaster = new this.THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    // 检测碰撞
    const intersects = raycaster.intersectObjects(this.cubeGroup.children);
    
    if (intersects.length > 0) {
      const clickedBlock = intersects[0].object;
      
      // 高亮效果
      if (Array.isArray(clickedBlock.material)) {
        clickedBlock.material.forEach(m => {
           m.emissive = new this.THREE.Color(0xffffff);
           m.emissiveIntensity = 0.8;
        });
      } else {
        clickedBlock.material.emissive = new this.THREE.Color(0xffffff);
        clickedBlock.material.emissiveIntensity = 0.8;
      }
      
      // 延迟移除并添加到槽位
      // setTimeout(() => {
        // 尝试添加到槽位 (返回索引)
        const slotIndex = this.gameManager.addBlockToSlot(clickedBlock);
        
        if (slotIndex !== -1) {
            // 动画效果 1: 方块缩小至80% (0.1s)
            // 我们通过一个简单的动画对象来管理这个过程
            
            // 计算起点 (3D -> 屏幕坐标)
            const worldPos = new this.THREE.Vector3();
            clickedBlock.getWorldPosition(worldPos);
            worldPos.project(this.camera);
            
            const startX = (worldPos.x + 1) * this.windowWidth / 2;
            const startY = (-worldPos.y + 1) * this.windowHeight / 2;
            
            // 计算终点 (UI 槽位坐标)
            const slotWidth = 40;
            const gap = 5;
            const slotHeight = 40;
            const totalWidth = 8 * slotWidth + 7 * gap;
            const slotStartX = (this.windowWidth - totalWidth) / 2;
            const slotStartY = this.windowHeight - 80 - 20 - slotHeight;
            
            const endX = slotStartX + slotIndex * (slotWidth + gap) + slotWidth / 2; // 中心点
            const endY = slotStartY + slotHeight / 2;
            
            // 边缘爆发环形光效 (在点击位置)
            this.createRingExplosion(startX, startY, clickedBlock.userData.color);
            
            // 从大正方体中移除 (但在动画结束前还需要显示)
            // 为了实现平滑过渡，我们立即创建 flyingBlock，并让它从当前状态开始变化
            this.cubeGroup.remove(clickedBlock);

            // 创建飞行方块动画对象
            this.flyingBlocks.push({
                startTime: Date.now(),
                shrinkDuration: 100, // 0.1s 缩小
                moveDuration: 300, // 总飞行时间 0.3s
                startX: startX,
                startY: startY,
                endX: endX,
                endY: endY,
                color: clickedBlock.userData.color,
                type: clickedBlock.userData.type,
                slotIndex: slotIndex,
                originalBlock: clickedBlock, // 必须保存引用以便匹配槽位
                
                // 控制点，用于贝塞尔曲线 (让轨迹弯曲)
                controlX: (startX + endX) / 2 + (Math.random() - 0.5) * 100,
                controlY: (startY + endY) / 2 - 100 // 向上弯曲
            });
        }
      // }, 300);
    }
  }

  onTouchStart(event) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isDragging = false; // 初始状态不视为拖动
    this.previousTouchPosition = { x: touch.clientX, y: touch.clientY };
  }
  
  onTouchMove(event) {
      const touch = event.touches[0];
      
      // 计算位移
      const moveX = touch.clientX - this.touchStartX;
      const moveY = touch.clientY - this.touchStartY;
      const distance = Math.sqrt(moveX * moveX + moveY * moveY);
      
      // 只有移动超过一定距离才视为拖动
      if (distance > 5) {
          this.isDragging = true;
      }

      if (this.isDragging) {
        const deltaMove = {
          x: touch.clientX - this.previousTouchPosition.x,
          y: touch.clientY - this.previousTouchPosition.y
        };
        
        this.cubeGroup.rotation.y += deltaMove.x * 0.01;
        this.cubeGroup.rotation.x += deltaMove.y * 0.01;
        
        this.previousTouchPosition = { x: touch.clientX, y: touch.clientY };
      }
  }
  
  onTouchEnd(event) {
    if (!this.isDragging) {
        // 如果没有发生拖动，则视为点击
        const touch = event.changedTouches[0];
        this.handleTap(touch.clientX, touch.clientY);
    }
    this.isDragging = false;
  }
  
  onMouseDown(event) {
    this.isDragging = false; // 重置
    this.touchStartX = event.clientX;
    this.touchStartY = event.clientY;
    this.previousTouchPosition = { x: event.clientX, y: event.clientY };
    this.mouseDown = true; // 标记鼠标按下
  }
  
  onMouseMove(event) {
    if (this.mouseDown) {
      const moveX = event.clientX - this.touchStartX;
      const moveY = event.clientY - this.touchStartY;
      const distance = Math.sqrt(moveX * moveX + moveY * moveY);
      
      if (distance > 5) {
          this.isDragging = true;
      }
      
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
  }
  
  onMouseUp(event) {
    if (this.mouseDown && !this.isDragging) {
        // 点击
        this.handleTap(event.clientX, event.clientY);
    }
    this.mouseDown = false;
    this.isDragging = false;
  }
  
  createRingExplosion(x, y, color) {
    // 转换为正交坐标
    const orthoX = x - this.windowWidth / 2;
    const orthoY = this.windowHeight / 2 - y;
    
    // 简单的环形粒子
    const particleCount = 20;
    const geometry = new this.THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i;
        positions.push(orthoX, orthoY, 0);
        
        const speed = 3;
        velocities.push(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0
        );
    }
    
    if (geometry.setAttribute) {
        geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));
    } else {
        geometry.addAttribute('position', new this.THREE.BufferAttribute(new Float32Array(positions), 3));
    }
    
    const material = new this.THREE.PointsMaterial({
        color: color,
        size: 3,
        transparent: true,
        opacity: 1
    });
    
    const particles = new this.THREE.Points(geometry, material);
    particles.userData = {
        velocities: velocities,
        age: 0
    };
    
    this.particleGroup.add(particles);
  }

  createExplosion(x, y, color) {
    // 转换为正交坐标
    const orthoX = x - this.windowWidth / 2;
    const orthoY = this.windowHeight / 2 - y;
    
    const particleCount = 30;
    const geometry = new this.THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions.push(orthoX, orthoY, 0);
      
      // 随机速度 (在屏幕平面上散开)
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2; // 增加速度
      
      velocities.push(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 2
      );
    }
    
    // 尝试直接使用 Float32BufferAttribute，如果报错可能是环境问题
    // geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));
    
    // 手动构建 BufferAttribute
    const positionAttribute = new this.THREE.BufferAttribute(new Float32Array(positions), 3);
    
    // 兼容旧版本 Three.js (threejs-miniprogram 可能基于旧版本)
    if (geometry.setAttribute) {
        geometry.setAttribute('position', positionAttribute);
    } else {
        geometry.addAttribute('position', positionAttribute);
    }
    
    const material = new this.THREE.PointsMaterial({
      color: color,
      size: 4,
      sizeAttenuation: false, // UI层不需要随距离缩放
      transparent: true,
      opacity: 1
    });
    
    const particles = new this.THREE.Points(geometry, material);
    particles.userData = {
      velocities: velocities,
      age: 0
    };
    
    this.particleGroup.add(particles);
  }
  
  clearParticles() {
    if (this.particleGroup) {
      for (let i = this.particleGroup.children.length - 1; i >= 0; i--) {
        const particles = this.particleGroup.children[i];
        this.particleGroup.remove(particles);
        if (particles.geometry) particles.geometry.dispose();
        if (particles.material) particles.material.dispose();
      }
    }
  }
  
  updateParticles() {
    // 更新所有粒子系统
    for (let i = this.particleGroup.children.length - 1; i >= 0; i--) {
      const particles = this.particleGroup.children[i];
      const positions = particles.geometry.attributes.position.array;
      const velocities = particles.userData.velocities;
      
      particles.userData.age += 1;
      
      // 更新位置
      for (let j = 0; j < positions.length / 3; j++) {
        positions[j * 3] += velocities[j * 3];
        positions[j * 3 + 1] += velocities[j * 3 + 1];
        positions[j * 3 + 2] += velocities[j * 3 + 2];
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      
      // 渐隐
      particles.material.opacity = 1 - (particles.userData.age / 60); // 1秒后消失
      
      // 移除
      if (particles.userData.age >= 60) {
        this.particleGroup.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
      }
    }
  }

  animate() {
    const currentTime = Date.now();
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    const time = currentTime * 0.001;

    // 1. 魔方悬浮动画
    if (this.cubeGroup && !this.isDragging) {
        // 上下轻微浮动 (振幅 2，频率 1)
        this.cubeGroup.position.y = Math.sin(time) * 2;
        // 缓慢自转 (增加一点动态感)
        this.cubeGroup.rotation.y += 0.001;
        this.cubeGroup.rotation.x += 0.0005;
        
        // 方块呼吸灯效果
        if (this.blocks) {
            this.blocks.forEach(block => {
                if (block.material && block.userData) {
                    const offset = block.userData.randomOffset || 0;
                    // 呼吸频率 2，范围 0.4 - 0.8
                    const intensity = 0.4 + (Math.sin(time * 2 + offset) + 1) * 0.2;
                    
                    if (Array.isArray(block.material)) {
                        block.material.forEach(m => m.emissiveIntensity = intensity);
                    } else {
                        block.material.emissiveIntensity = intensity;
                    }
                }
            });
        }
    } else if (this.blocks) {
        // 即使在拖拽时，也保持呼吸灯效果
         this.blocks.forEach(block => {
            if (block.material && block.userData) {
                const offset = block.userData.randomOffset || 0;
                // 呼吸频率 2，范围 0.4 - 0.8
                const intensity = 0.4 + (Math.sin(time * 2 + offset) + 1) * 0.2;
                
                if (Array.isArray(block.material)) {
                    block.material.forEach(m => m.emissiveIntensity = intensity);
                } else {
                    block.material.emissiveIntensity = intensity;
                }
            }
        });
    }

    // 2. 星系旋转 (沿着其自身中轴线)
    if (this.galaxyGroup) {
        this.galaxyGroup.children.forEach(child => {
            if (child.isPoints) {
                // 星系核和旋臂沿 Y 轴旋转
                child.rotation.y += 0.0005;
            }
        });
    }

    // 更新游戏状态
    const eliminationInfo = this.gameManager.update(delta);
    if (eliminationInfo && eliminationInfo.eliminated) {
        // 播放消除特效
        const slotWidth = 40;
        const gap = 5;
        const slotHeight = 40;
        const totalWidth = 8 * slotWidth + 7 * gap; // Fixed 8 slots
        const startX = (this.windowWidth - totalWidth) / 2;
        const startY = this.windowHeight - 80 - 20 - slotHeight; 
        
        // 计算消除中心位置
        const indices = eliminationInfo.indices;
        if (indices && indices.length > 0) {
            // 取中间的槽位索引
            const centerIndex = indices[Math.floor(indices.length / 2)];
            
            const centerX = startX + centerIndex * (slotWidth + gap) + slotWidth / 2;
            const centerY = startY + slotHeight / 2;
            
            // 获取颜色 (从 eliminationInfo 中获取，或者默认为白色)
            const color = eliminationInfo.color || 0xffffff;
            
            // 创建爆炸特效
            this.createExplosion(centerX, centerY, color);
        }
    }
    
    // 更新粒子
    this.updateParticles();
    
    // 更新飞行方块
    this.updateFlyingBlocks();

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
  
  checkEliminationSlots(x, y) {
    const slots = this.gameManager.eliminationSlots;
    const slotWidth = 40; // 缩小一点以放下8个
    const slotHeight = 40;
    const gap = 5;
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * gap;
    const startX = (this.windowWidth - totalWidth) / 2;
    // 调整到倒计时条上方
    const startY = this.windowHeight - 80 - 20 - slotHeight;
    
    // 检查是否在Y轴范围内
    if (y < startY || y > startY + slotHeight) {
      return false;
    }
    
    // 计算点击的是哪个槽位
    const relativeX = x - startX;
    if (relativeX < 0) return false;
    
    const index = Math.floor(relativeX / (slotWidth + gap));
    const offsetInSlot = relativeX % (slotWidth + gap);
    
    // 检查是否在槽位内（排除间隙）
    if (offsetInSlot > slotWidth) return false;
    
    // 检查索引是否有效
    if (index >= 0 && index < slots.length) {
      // 如果槽位有方块，也不允许点击移除
      if (this.gameManager.eliminationSlots[index].block) {
        // this.gameManager.removeBlockFromSlot(index);
        return true;
      }
    }
    
    return false;
  }

  checkFunctionButtons(x, y) {
    // 检查方向按钮
    const btnSize = 40;
    const btnStartX = 30;
    // 重新计算 startY
    const slotHeight = 40;
    const startY = this.windowHeight - 80 - 10 - slotHeight - 10 - 60; // 在待消除槽上方
    
    const btnOffsetY = 0;
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
    
    // 技能按钮已移除或移到底部，这里不再处理
    
    return false;
  }

  updateFlyingBlocks() {
    const now = Date.now();
    for (let i = this.flyingBlocks.length - 1; i >= 0; i--) {
        const fb = this.flyingBlocks[i];
        
        // 1. 缩小动画
        if (now - fb.startTime < fb.shrinkDuration) {
            // 只是标记状态，实际缩放在 drawFlyingBlocks 中处理
        }
        
        // 2. 移动动画
        const progress = (now - fb.startTime) / fb.moveDuration;
        
        // 3. 拖尾粒子 (每隔几帧生成一个)
        if (Math.random() > 0.5) {
            // 计算当前位置 (复用 draw 中的逻辑，这里简化)
            let t = progress;
            // Easing (Quadratic InOut)
            t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            
            // 二阶贝塞尔曲线插值
            const p0 = {x: fb.startX, y: fb.startY};
            const p1 = {x: fb.controlX, y: fb.controlY};
            const p2 = {x: fb.endX, y: fb.endY};
            
            const cx = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x;
            const cy = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y;
            
            this.createTrailParticle(cx, cy, fb.color);
        }
        
        if (progress >= 1) {
            // 动画结束
            this.flyingBlocks.splice(i, 1);
            
            // 找到对应的槽位方块并显示
            let found = false;
            for (let j = 0; j < this.gameManager.eliminationSlots.length; j++) {
                const slot = this.gameManager.eliminationSlots[j];
                if (slot.block && slot.block.originalBlock === fb.originalBlock) {
                    slot.block.visible = true;
                    // 到达时的弹跳效果可以在这里触发，或者在 slot.block 中增加动画状态
                    found = true;
                    break;
                }
            }
        }
    }
  }
  
  createTrailParticle(x, y, color) {
    // 简单的拖尾粒子，不移动，只渐隐
    const orthoX = x - this.windowWidth / 2;
    const orthoY = this.windowHeight / 2 - y;
    
    const geometry = new this.THREE.BufferGeometry();
    const positions = [orthoX, orthoY, 0];
    
    if (geometry.setAttribute) {
        geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));
    } else {
        geometry.addAttribute('position', new this.THREE.BufferAttribute(new Float32Array(positions), 3));
    }
    
    const material = new this.THREE.PointsMaterial({
        color: color,
        size: 2,
        transparent: true,
        opacity: 0.6
    });
    
    const particle = new this.THREE.Points(geometry, material);
    particle.userData = {
        velocities: [0, 0, 0], // 不移动
        age: 0,
        maxAge: 20 // 存活时间短
    };
    
    this.particleGroup.add(particle);
  }

  // 绘制全息风格面板辅助函数
  drawHolographicPanel(ctx, x, y, width, height, alpha = 0.8) {
    ctx.save();
    
    // 1. 磨砂玻璃背景 (rgba(26,26,62,0.8))
    ctx.fillStyle = `rgba(26, 26, 62, ${alpha})`;
    ctx.fillRect(x, y, width, height);
    
    // 2. 霓虹蓝细边框 (rgba(0, 212, 255, 0.5))
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // 3. 呼吸光效 (简单模拟)
    const time = Date.now() / 1000;
    const glowIntensity = (Math.sin(time * 2) + 1) / 2 * 10 + 5;
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = glowIntensity;
    ctx.strokeRect(x, y, width, height);
    ctx.shadowBlur = 0;
    
    ctx.restore();
  }
  
  // 绘制六边形辅助函数
  drawHexagon(ctx, x, y, r, fillColor, strokeColor) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i;
      const hx = x + r * Math.cos(angle);
      const hy = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();
    
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.stroke();
    }
  }

  // 绘制圆角矩形辅助函数 (替代六边形)
  drawRoundedRect(ctx, x, y, size, radius, color, strokeColor = null) {
    const halfSize = size / 2;
    const startX = x - halfSize;
    const startY = y - halfSize;
    
    ctx.beginPath();
    ctx.moveTo(startX + radius, startY);
    ctx.lineTo(startX + size - radius, startY);
    ctx.quadraticCurveTo(startX + size, startY, startX + size, startY + radius);
    ctx.lineTo(startX + size, startY + size - radius);
    ctx.quadraticCurveTo(startX + size, startY + size, startX + size - radius, startY + size);
    ctx.lineTo(startX + radius, startY + size);
    ctx.quadraticCurveTo(startX, startY + size, startX, startY + size - radius);
    ctx.lineTo(startX, startY + radius);
    ctx.quadraticCurveTo(startX, startY, startX + radius, startY);
    ctx.closePath();
    
    if (color) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  drawIconOnSquare(ctx, x, y, size, type) {
    // 绘制正方形背景
    const colors = [
      '#00ffff', '#00ff00', '#9C88FF', '#00D4FF', '#00FFAB', '#95a5a6',
      '#FF00FF', '#FFD32A', '#3742FA', '#00D4FF', '#FF9A3C', '#00D8D6',
      '#FF4757', '#ffffff', '#FF9A3C', '#3B3B98', '#00D4FF', '#00D8D6',
      '#ffffff', '#FFFF00', '#34495e', '#2ecc71', '#FF4757', '#E6E6E6'
    ];
    // 防止数组越界
    const color = colors[type % colors.length] || '#ffffff';
    
    // 1. 绘制统一的深色背景，与 3D 纹理底色一致 (增加渐变)
    const halfSize = size / 2;
    const bgGrad = ctx.createLinearGradient(x, y - halfSize, x, y + halfSize);
    bgGrad.addColorStop(0, '#2b323c');
    bgGrad.addColorStop(1, '#1a1a2e');
    
    this.drawRoundedRect(ctx, x, y, size, 5, null); // 仅路径
    ctx.fillStyle = bgGrad;
    ctx.fill();
    
    // 2. 模拟材质染色效果
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.3; // 降低透明度，避免颜色过重
    this.drawRoundedRect(ctx, x, y, size, 5, color);
    ctx.restore();
    
    // 3. 绘制图案 (增加投影)
    const r = size / 2 * 0.7; // 稍微缩小
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    this.drawPattern(ctx, x, y, r, type);
    ctx.restore();
    
    // 4. 绘制发光边框 (模拟 Emissive)
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, x, y, size, 5, null, color);
    ctx.restore();
    
    // 5. 玻璃高光
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const glassGrad = ctx.createLinearGradient(x - halfSize, y - halfSize, x + halfSize, y + halfSize);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    glassGrad.addColorStop(0.5, 'transparent');
    glassGrad.addColorStop(1, 'transparent');
    this.drawRoundedRect(ctx, x, y, size, 5, null);
    ctx.fillStyle = glassGrad;
    ctx.fill();
    ctx.restore();
  }

  drawUI() {
    const ctx = this.uiCanvas.getContext('2d');
    
    // 清除上一帧内容
    ctx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    
    ctx.save();
    // 缩放以匹配逻辑像素
    ctx.scale(this.pixelRatio, this.pixelRatio);
    
    // 绘制顶部资源栏
    this.drawTopBar(ctx);
    
    // 绘制倒计时进度条
    this.drawCountdownBar(ctx);
    
    // 绘制待消除槽
    this.drawEliminationSlots(ctx);
    
    // 绘制飞行方块
    this.drawFlyingBlocks(ctx);
    
    // 绘制底部快捷操作
    this.drawBottomActions(ctx);
    
    // 绘制功能栏按钮 - 移除
    // this.drawFunctionBars(ctx);
    
    ctx.restore();
    
    // 标记纹理需要更新
    this.uiTexture.needsUpdate = true;
  }
  
  drawFlyingBlocks(ctx) {
    const now = Date.now();
    this.flyingBlocks.forEach(fb => {
        const moveProgress = Math.min(1, (now - fb.startTime) / fb.moveDuration);
        const shrinkProgress = Math.min(1, (now - fb.startTime) / fb.shrinkDuration);
        
        // Easing (Quadratic InOut) for movement
        let t = moveProgress;
        t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        
        // 贝塞尔曲线轨迹
        const p0 = {x: fb.startX, y: fb.startY};
        const p1 = {x: fb.controlX, y: fb.controlY};
        const p2 = {x: fb.endX, y: fb.endY};
        
        const currentX = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x;
        const currentY = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y;
        
        // 缩小效果
        const initialSize = 40; // 假设初始大小
        const targetSize = 40; // 槽位大小，保持一致，不缩放
        let currentSize = initialSize;
        if (shrinkProgress < 1) {
            // 0.1s 内从 100% 缩放到 80% (这里取消，保持100%)
            // 或者我们可以做一个轻微的弹跳效果而不是缩小
            // 比如 1.0 -> 1.1 -> 1.0
            // currentSize = initialSize; 
            // 还是保持简单，不缩放
            currentSize = initialSize;
        } else {
            // 之后渐变到目标大小 (如果目标大小和初始大小一致，则无变化)
            currentSize = targetSize;
        }
        
        const size = currentSize;
        
        // 绘制方块 (圆角矩形)
        this.drawIconOnSquare(ctx, currentX, currentY, size, fb.type);
    });
  }
  
  drawTopBar(ctx) {
    const resources = this.gameManager.resources;
    const levelInfo = this.gameManager.levelInfo;
    
    // 考虑刘海屏高度
    const topPadding = this.safeArea.top || 20;
    // 增加高度以容纳两行信息
    const barHeight = 85 + topPadding;
    
    // 背景 - 磨砂玻璃面板
    this.drawHolographicPanel(ctx, 0, 0, this.windowWidth, barHeight, 0.8);
    
    // 文字发光效果
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 5;
    
    ctx.fillStyle = '#E6E6E6'; // 太空灰
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 第一行：仅关卡名 (注意刘海屏)
    const y1 = topPadding + 20;
    ctx.fillText(`${levelInfo.level}`, 20, y1);
    
    // 第二行：资源信息
    const y2 = topPadding + 55;
    const iconSize = 16;
    const spacing = (this.windowWidth - 10) / 4;
    
    ctx.font = '12px Arial'; // 稍微减小字体以适应名称+图标
    
    // 1. 能量 (Energy)
    this.drawResourceIcon(ctx, 10, y2, iconSize, 'energy');
    ctx.fillText(`能量: ${Math.floor(resources.energy)}`, 10 + iconSize + 2, y2);
    
    // 2. 金属 (Metal)
    this.drawResourceIcon(ctx, 10 + spacing, y2, iconSize, 'metal');
    ctx.fillText(`金属: ${resources.metal}`, 10 + spacing + iconSize + 2, y2);
    
    // 3. 晶体 (Crystal)
    this.drawResourceIcon(ctx, 10 + spacing * 2, y2, iconSize, 'crystal');
    ctx.fillText(`晶体: ${resources.crystal}`, 10 + spacing * 2 + iconSize + 2, y2);
    
    // 4. 生态 (Ecology)
    this.drawResourceIcon(ctx, 10 + spacing * 3, y2, iconSize, 'ecology');
    ctx.fillText(`生态: ${resources.ecology}`, 10 + spacing * 3 + iconSize + 2, y2);
    
    ctx.shadowBlur = 0;
  }

  drawResourceIcon(ctx, x, y, size, type) {
    ctx.save();
    // 将 x 视为图标左边界，y 视为中心
    ctx.translate(x + size / 2, y);
    const r = size / 2;
    
    switch(type) {
        case 'energy': // 能量核心 - 蓝白渐变球
            const gradE = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
            gradE.addColorStop(0, '#ffffff');
            gradE.addColorStop(0.5, '#00ffff');
            gradE.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = gradE;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI*2);
            ctx.fill();
            // 核心亮点
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r*0.3, 0, Math.PI*2);
            ctx.fill();
            break;
            
        case 'metal': // 金属资源 - 银灰色六边形
            ctx.fillStyle = '#A0A0A0';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<6; i++) {
                const angle = (Math.PI/3) * i;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if(i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 金属光泽线
            ctx.beginPath();
            ctx.moveTo(-r*0.5, -r*0.5);
            ctx.lineTo(r*0.5, r*0.5);
            ctx.stroke();
            break;
            
        case 'crystal': // 晶体资源 - 蓝色棱形
            ctx.fillStyle = '#00D4FF';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(r, 0);
            ctx.lineTo(0, r);
            ctx.lineTo(-r, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 晶体内部线条
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(0, r);
            ctx.moveTo(-r, 0);
            ctx.lineTo(r, 0);
            ctx.stroke();
            break;
            
        case 'ecology': // 生态资源 - 绿色叶片/双螺旋
            ctx.fillStyle = '#00FF88';
            ctx.shadowColor = '#00FF88';
            ctx.shadowBlur = 5;
            // 绘制一个简单的双叶片形状
            ctx.beginPath();
            ctx.ellipse(-r*0.3, 0, r*0.4, r*0.8, Math.PI/4, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(r*0.3, 0, r*0.4, r*0.8, -Math.PI/4, 0, Math.PI*2);
            ctx.fill();
            break;
    }
    ctx.restore();
  }
  
  drawCountdownBar(ctx) {
    const { countdown, maxCountdown } = this.gameManager;
    const progress = Math.max(0, countdown / maxCountdown);
    
    // 位置：在底部操作栏上方，待消除槽下方
    // 底部操作栏背景高60，y=H-70
    // 倒计时条留出间隔
    const barHeight = 8;
    const barY = this.windowHeight - 80; 
    
    // 绘制背景槽
    this.drawHolographicPanel(ctx, 20, barY, this.windowWidth - 40, barHeight, 0.3);
    
    // 绘制进度
    // 颜色随时间变化：金属蓝 -> 晶黄 -> 能量红
    // 初始(高能量)使用蓝色，代表平稳
    ctx.shadowBlur = 10; // 进度条发光
    if (progress > 0.5) {
        ctx.fillStyle = '#3742FA'; // 金属蓝
        ctx.shadowColor = '#3742FA';
    } else if (progress > 0.2) {
        ctx.fillStyle = '#FFD32A'; // 晶黄
        ctx.shadowColor = '#FFD32A';
    } else {
        ctx.fillStyle = '#FF4757'; // 能量红
        ctx.shadowColor = '#FF4757';
    }
    
    ctx.fillRect(20, barY, (this.windowWidth - 40) * progress, barHeight);
    
    // 恢复阴影
    ctx.shadowBlur = 0;
    
    // 绘制全屏红色闪烁警告
    if (progress <= 0.2) {
        // 使用相对时间以避免大数问题
        const time = Date.now() / 200; 
        const pulse = (Math.sin(time) + 1) / 2; // 0~1
        const alpha = pulse * 0.3; // 最大透明度 0.3
        
        ctx.save();
        // 确保重置变换矩阵，因为 drawCountdownBar 是在 scale 之后调用的
        // 我们需要全屏绘制，所以暂时忽略 scale，或者使用逻辑坐标
        // 这里的 context 已经被 scale 过了，所以使用逻辑宽高
        
        // 1. 全屏红色叠加 (模拟紧急状态)
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, this.windowWidth, this.windowHeight);
        
        // 2. 边缘晕影 (Vignette) - 增强压迫感
        // 创建径向渐变
        // 注意：gradient 的坐标是基于 canvas 坐标系的，如果 context 被 scale 了，需要调整
        const gradient = ctx.createRadialGradient(
            this.windowWidth / 2, this.windowHeight / 2, this.windowHeight / 3,
            this.windowWidth / 2, this.windowHeight / 2, this.windowHeight
        );
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)'); // 中心透明
        gradient.addColorStop(1, `rgba(255, 0, 0, ${pulse * 0.5})`); // 边缘更红
        
        ctx.fillStyle = gradient;
        // 覆盖全屏
        // 为了确保覆盖整个屏幕（包括可能的刘海区域），使用更大的矩形
        ctx.fillRect(-this.windowWidth/2, -this.windowHeight/2, this.windowWidth*2, this.windowHeight*2);
        
        ctx.restore();
    }

    // 绘制文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(countdown)}s`, this.windowWidth / 2, barY - 5);
  }
  
  drawLevelInfo(ctx) {
    // 关卡信息已合并到 TopBar，此方法不再需要或清空内容
  }
  
  drawEliminationSlots(ctx) {
    const slots = this.gameManager.eliminationSlots;
    const slotWidth = 40; // 缩小一点以放下8个
    const slotHeight = 40;
    const gap = 5;
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * gap;
    const startX = (this.windowWidth - totalWidth) / 2;
    // 调整到倒计时条上方
    // 倒计时条在 H-80，留出间隔 20
    const startY = this.windowHeight - 80 - 20 - slotHeight;
    
    // 绘制整体面板背景 (容纳所有槽位)
    const panelPadding = 5;
    this.drawHolographicPanel(
        ctx, 
        startX - panelPadding, 
        startY - panelPadding, 
        totalWidth + panelPadding * 2, 
        slotHeight + panelPadding * 2,
        0.5
    );
    
    for (let i = 0; i < slots.length; i++) {
      const x = startX + i * (slotWidth + gap) + slotWidth / 2;
      const y = startY + slotHeight / 2;
      const size = slotWidth; // 使用宽度作为尺寸
      
      // 绘制槽位边框 (正方形/圆角矩形)
      // 空槽：半透明白色边框 (rgba(255, 255, 255, 0.3))
      // 警告：红色闪烁
      let strokeColor = 'rgba(255, 255, 255, 0.3)';
      if (slots[i].highlight) {
          const time = Date.now() / 200;
          const alpha = (Math.sin(time) + 1) / 2;
          strokeColor = `rgba(255, 0, 0, ${alpha})`;
      }
      
      // 绘制空槽位
      this.drawRoundedRect(ctx, x, y, size, 5, null, strokeColor);
      
      // 绘制槽位中的方块 (缩略图)
      if (slots[i].block && slots[i].block.visible !== false) {
        // 重置阴影，避免干扰图案细节
        ctx.shadowBlur = 0;
        
        // 绘制图案 (复用 createTexture 中的逻辑，或者简化绘制)
        // 注意：slots[i].block 是 GameManager 创建的包装对象
        // slots[i].block.originalBlock 才是 Three.js Mesh 对象
        const mesh = slots[i].block.originalBlock;
        if (mesh && mesh.userData) {
            // 使用 drawIconOnSquare 替代 drawIconOnHexagon
            this.drawIconOnSquare(ctx, x, y, size, mesh.userData.type);
        }
        
        ctx.shadowBlur = 0;
      }
    }
  }
  
  drawFunctionBars(ctx) {
    // 绘制方向按钮 (仅保留方向控制)
    const btnSize = 40;
    const btnStartX = 30;
    // 待消除槽高度 40，底部按钮高度 60，间隔 10
    // 倒计时条高度 8，间隔 15
    // startY 在倒计时条上方
    const slotHeight = 40;
    const startY = this.windowHeight - 80 - 10 - slotHeight - 10 - 60; // 调整位置
    
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(10, startY, 150, 60);
    
    const btnOffsetY = 10;
    
    // 上
    this.drawControlButton(ctx, btnStartX + btnSize, startY + btnOffsetY, btnSize, btnSize, '↑');
    // 左
    this.drawControlButton(ctx, btnStartX, startY + btnOffsetY + btnSize, btnSize, btnSize, '←');
    // 右
    this.drawControlButton(ctx, btnStartX + btnSize * 2, startY + btnOffsetY + btnSize, btnSize, btnSize, '→');
    // 下
    this.drawControlButton(ctx, btnStartX + btnSize, startY + btnOffsetY + btnSize * 2, btnSize, btnSize, '↓');
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
    const btnWidth = (this.windowWidth - 60) / 3;
    const btnHeight = 40;
    const btnY = this.windowHeight - 60;
    
    // 移除底部的全息面板背景，直接绘制按钮
    
    this.drawButton(ctx, 20, btnY, btnWidth, btnHeight, '回溯');
    this.drawButton(ctx, 20 + btnWidth + 10, btnY, btnWidth, btnHeight, '扫描');
    this.drawButton(ctx, 20 + btnWidth * 2 + 20, btnY, btnWidth, btnHeight, '重组');
  }

  drawButton(ctx, x, y, width, height, text) {
    // 按钮背景 - 赛博粉 (#FF2E63)
    ctx.fillStyle = 'rgba(255, 46, 99, 0.3)'; // 默认半透明
    ctx.fillRect(x, y, width, height);
    
    // 按钮边框 - 霓虹蓝 (#00D4FF)
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // 按钮文字 - 太空灰
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 5;
    
    ctx.fillStyle = '#E6E6E6';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
    
    ctx.shadowBlur = 0;
  }
  
  checkBottomActions(x, y) {
    const btnWidth = (this.windowWidth - 60) / 3;
    const btnHeight = 40;
    const btnY = this.windowHeight - 60;
    
    // 检查是否在按钮区域
    if (y < btnY || y > btnY + btnHeight) return false;
    
    // 回溯
    if (x >= 20 && x <= 20 + btnWidth) {
      this.gameManager.useSkill('undo');
      return true;
    }
    
    // 扫描
    if (x >= 20 + btnWidth + 10 && x <= 20 + btnWidth * 2 + 10) {
      this.gameManager.useSkill('scan');
      return true;
    }
    
    // 重组
    if (x >= 20 + btnWidth * 2 + 20 && x <= 20 + btnWidth * 3 + 20) {
      this.gameManager.useSkill('shuffle');
      return true;
    }
    
    return false;
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
    
    let title = '游戏结束';
    if (this.gameManager.isVictory) {
        title = '恭喜通关！';
        ctx.fillStyle = '#00ff00';
    }
    
    ctx.fillText(title, this.windowWidth / 2, this.windowHeight / 2 - 50);
    
    // 显示分数
    ctx.font = '16px Arial';
    ctx.fillStyle = '#ffffff';
    if (this.gameManager.isVictory) {
        ctx.fillText(`通关用时: ${Math.floor(60 - this.gameManager.countdown)}s`, this.windowWidth / 2, this.windowHeight / 2);
    } else {
        ctx.fillText(`收集晶体: ${this.gameManager.resources.crystal}/10`, this.windowWidth / 2, this.windowHeight / 2);
    }
    
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