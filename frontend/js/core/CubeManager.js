class CubeManager {
  constructor(game) {
    this.game = game;
    this.THREE = game.THREE;
    this.cubeGroup = null;
    this.blocks = [];
    this.cube = null;
    this.textureCache = null;
  }

  initCube() {
    // 如果已存在，先移除
    if (this.cubeGroup) {
      this.game.scene.remove(this.cubeGroup);
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
    this.game.scene.add(this.cubeGroup);
    
    // 创建立方体
    this.createCube();
    
    // 存储魔方信息
    this.cube = {
      scene: this.game.scene,
      camera: this.game.camera,
      cubeGroup: this.cubeGroup,
      blocks: this.blocks,
      THREE: this.THREE,
      rotate: this.rotate.bind(this)
    };

    // 更新游戏管理器的魔方引用
    if (this.game.gameManager) {
      this.game.gameManager.cube = this.cube;
      this.game.gameManager.THREE = this.THREE;
    }
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

  createTexture(type) {
    return this.game.resourceManager.createTexture(type);
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

  checkClick(mouse) {
    // 创建射线
    const raycaster = new this.THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.game.camera);
    
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
      
      // 尝试添加到槽位 (返回索引)
      const slotIndex = this.game.gameManager.addBlockToSlot(clickedBlock);
      
      if (slotIndex !== -1) {
          // 计算起点 (3D -> 屏幕坐标)
          const worldPos = new this.THREE.Vector3();
          clickedBlock.getWorldPosition(worldPos);
          worldPos.project(this.game.camera);
          
          const startX = (worldPos.x + 1) * this.game.windowWidth / 2;
          const startY = (-worldPos.y + 1) * this.game.windowHeight / 2;
          
          // 计算终点 (UI 槽位坐标)
          const slotWidth = 40;
          const gap = 5;
          const slotHeight = 40;
          const totalWidth = 8 * slotWidth + 7 * gap;
          const slotStartX = (this.game.windowWidth - totalWidth) / 2;
          const slotStartY = this.game.windowHeight - 80 - 20 - slotHeight;
          
          const endX = slotStartX + slotIndex * (slotWidth + gap) + slotWidth / 2; // 中心点
          const endY = slotStartY + slotHeight / 2;
          
          // 边缘爆发环形光效 (在点击位置)
          this.game.particleManager.createRingExplosion(startX, startY, clickedBlock.userData.color);
          
          // 从大正方体中移除 (但在动画结束前还需要显示)
          // 为了实现平滑过渡，我们立即创建 flyingBlock，并让它从当前状态开始变化
          this.cubeGroup.remove(clickedBlock);

          // 创建飞行方块动画对象
          this.game.flyingBlockManager.addFlyingBlock({
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
    }
  }
}

module.exports = {
  default: CubeManager
};