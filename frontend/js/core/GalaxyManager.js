class GalaxyManager {
  constructor(game) {
    this.game = game;
    this.THREE = game.THREE;
    this.galaxyGroup = null;
  }

  createGalaxy(galaxyTheme = 'soft') {
    // 创建星系容器
    this.galaxyGroup = new this.THREE.Group();
    this.galaxyGroup.position.set(0, 0, -450); // 稍微拉近一点，使其填充更多背景
    
    // 初始倾斜，匹配参考图中的扁平椭圆感
    this.galaxyGroup.rotation.x = Math.PI / 2.6; 
    this.galaxyGroup.rotation.z = Math.PI / 6;
    this.game.scene.add(this.galaxyGroup);

    // 根据星系主题设置颜色和参数
    let coreWhite, coreColor, armColors, armCount, twist, starCount;
    
    switch(galaxyTheme) {
      case 'soft': // 新星摇篮
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0x00ffff);
        armColors = {
          primary: new this.THREE.Color(0x99ffff),
          secondary: new this.THREE.Color(0x9C88FF),
          deep: new this.THREE.Color(0x001133),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 8;
        twist = 3.0;
        starCount = 80000;
        break;
      case 'steampunk': // 锈蚀星带
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0xFF9A3C);
        armColors = {
          primary: new this.THREE.Color(0xFF9A3C),
          secondary: new this.THREE.Color(0x3B3B98),
          deep: new this.THREE.Color(0x1a1a1a),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 6;
        twist = 2.5;
        starCount = 60000;
        break;
      case 'fog': // 星云迷雾
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0x9C88FF);
        armColors = {
          primary: new this.THREE.Color(0x9C88FF),
          secondary: new this.THREE.Color(0x00D4FF),
          deep: new this.THREE.Color(0x001144),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 10;
        twist = 4.0;
        starCount = 90000;
        break;
      case 'gravity': // 重力熔炉
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0x00D4FF);
        armColors = {
          primary: new this.THREE.Color(0x00D4FF),
          secondary: new this.THREE.Color(0x2ecc71),
          deep: new this.THREE.Color(0x001133),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 7;
        twist = 3.5;
        starCount = 70000;
        break;
      case 'cyber': // 数据洪流
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0x00ff00);
        armColors = {
          primary: new this.THREE.Color(0x00ff00),
          secondary: new this.THREE.Color(0x00D4FF),
          deep: new this.THREE.Color(0x001111),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 12;
        twist = 5.0;
        starCount = 120000;
        break;
      case 'time': // 时裔圣所
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0xFFD32A);
        armColors = {
          primary: new this.THREE.Color(0xFFD32A),
          secondary: new this.THREE.Color(0x00D8D6),
          deep: new this.THREE.Color(0x1a1a2e),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 9;
        twist = 3.0;
        starCount = 80000;
        break;
      case 'forge': // 铸星熔炉
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0xFF4757);
        armColors = {
          primary: new this.THREE.Color(0xFF4757),
          secondary: new this.THREE.Color(0xFF9A3C),
          deep: new this.THREE.Color(0x1a1a1a),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 6;
        twist = 2.0;
        starCount = 60000;
        break;
      case 'singularity': // 终末奇点
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0xFF00FF);
        armColors = {
          primary: new this.THREE.Color(0xFF00FF),
          secondary: new this.THREE.Color(0x9C88FF),
          deep: new this.THREE.Color(0x001133),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 15;
        twist = 6.0;
        starCount = 150000;
        break;
      default:
        coreWhite = new this.THREE.Color(0xffffff);
        coreColor = new this.THREE.Color(0x00ffff);
        armColors = {
          primary: new this.THREE.Color(0x99ffff),
          secondary: new this.THREE.Color(0x3366ff),
          deep: new this.THREE.Color(0x001133),
          star: new this.THREE.Color(0xffffff)
        };
        armCount = 12;
        twist = 4.5;
        starCount = 100000;
    }

    // 1. 星系核 (Galactic Nucleus) - 极其明亮且有层次的核心
    const coreCount = 8000; // 增加核心粒子数
    const coreGeometry = new this.THREE.BufferGeometry();
    const corePositions = [];
    const coreColors = [];

    for (let i = 0; i < coreCount; i++) {
        // 中心极度密集
        const r = Math.pow(Math.random(), 3.0) * 80;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta) * 0.4; // 核心更扁平
        const z = r * Math.cos(phi);
        
        corePositions.push(x, y, z);
        
        const color = coreWhite.clone().lerp(coreColor, r / 80);
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
    const armGeometry = new this.THREE.BufferGeometry();
    const positions = [];
    const colors = [];

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
            color = coreColor.clone().lerp(armColors.primary, relDist / 0.12);
        } else if (rand > 0.99) {
            color = armColors.star; // 孤立的亮恒星
        } else if (rand > 0.4) {
            color = armColors.primary.clone().lerp(armColors.secondary, relDist);
        } else {
            color = armColors.secondary.clone().lerp(armColors.deep, relDist);
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
    this.createBackgroundStars(2000, galaxyTheme);
  }

  createBackgroundStars(count = 500, galaxyTheme = 'soft') {
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
      
      // 根据星系主题设置星星颜色
      let starColor = 0xffffff;
      switch(galaxyTheme) {
        case 'steampunk':
          starColor = 0xFFD32A;
          break;
        case 'cyber':
          starColor = 0x00ff00;
          break;
        case 'forge':
          starColor = 0xFFFF00;
          break;
        case 'singularity':
          starColor = 0xFF00FF;
          break;
      }
      
      const material = new this.THREE.PointsMaterial({
          color: starColor,
          size: 1.0,
          transparent: true,
          opacity: 0.3
      });
      
      this.game.scene.add(new this.THREE.Points(geometry, material));
  }

  update() {
    // 星系旋转 (沿着其自身中轴线)
    if (this.galaxyGroup) {
        this.galaxyGroup.children.forEach(child => {
            if (child.isPoints) {
                // 星系核和旋臂沿 Y 轴旋转
                child.rotation.y += 0.0005;
            }
        });
    }
  }
}

module.exports = {
  default: GalaxyManager
};