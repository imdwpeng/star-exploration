class CubeManager {
  constructor(game) {
    this.game = game;
    this.THREE = game.THREE;
    this.cubeGroup = null;
    this.blocks = [];
    this.cube = null;
    this.textureCache = null;
  }

  initCube(levelConfig) {
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
    
    // 创建立方体，传入关卡配置
    this.createCube(levelConfig);
    
    // 存储魔方信息
    this.cube = {
      scene: this.game.scene,
      camera: this.game.camera,
      cubeGroup: this.cubeGroup,
      blocks: this.blocks,
      THREE: this.THREE,
      rotate: this.rotate.bind(this),
      levelConfig: levelConfig
    };

    // 更新游戏管理器的魔方引用
    if (this.game.gameManager) {
      this.game.gameManager.cube = this.cube;
      this.game.gameManager.THREE = this.THREE;
    }
  }

  createCube(levelConfig) {
    this.blocks = [];
    const gap = 2;
    
    // 根据关卡配置获取方块数量和类型
    const blockCount = levelConfig ? levelConfig.blockCount : 27;
    const blockTypes = levelConfig ? levelConfig.blockTypes : 9;
    const galaxyTheme = levelConfig ? levelConfig.galaxyTheme : 'soft';
    
    // 根据星系主题定义颜色
    let colors = [];
    switch(galaxyTheme) {
      case 'soft': // 新星摇篮
        colors = [0x00ffff, 0x00ffab, 0x9C88FF, 0x00D4FF, 0xffffff, 0xE6E6E6];
        break;
      case 'steampunk': // 锈蚀星带
        colors = [0xFF9A3C, 0x95a5a6, 0x3B3B98, 0x34495e, 0xffffff, 0xE6E6E6];
        break;
      case 'fog': // 星云迷雾
        colors = [0x9C88FF, 0x00D4FF, 0x3742FA, 0x00D8D6, 0xffffff, 0xE6E6E6];
        break;
      case 'gravity': // 重力熔炉
        colors = [0x00D4FF, 0x34495e, 0x2ecc71, 0x00D8D6, 0xffffff, 0xE6E6E6];
        break;
      case 'cyber': // 数据洪流
        colors = [0x00ff00, 0x00D4FF, 0x00D8D6, 0x34495e, 0xffffff, 0xE6E6E6];
        break;
      case 'time': // 时裔圣所
        colors = [0xFFD32A, 0x00D8D6, 0x3B3B98, 0x34495e, 0xffffff, 0xE6E6E6];
        break;
      case 'forge': // 铸星熔炉
        colors = [0xFF4757, 0xFF9A3C, 0xFFFF00, 0x34495e, 0xffffff, 0xE6E6E6];
        break;
      case 'singularity': // 终末奇点
        colors = [0xFF00FF, 0x9C88FF, 0x00D4FF, 0x00D8D6, 0xffffff, 0xE6E6E6];
        break;
      default:
        colors = [0x00ffff, 0x00ff00, 0x9C88FF, 0x00D4FF, 0x00FFAB, 0x95a5a6, 0xFF00FF, 0xFFD32A, 0x3742FA];
    }
    
    // 创建类型数组
    // 从颜色数组中选取指定数量的类型，每种3个
    const allTypes = Array.from({length: colors.length}, (_, i) => i);
    const selectedTypes = [];
    
    // 随机选取指定数量的类型
    while(selectedTypes.length < blockTypes && allTypes.length > 0) {
        const randomIndex = Math.floor(Math.random() * allTypes.length);
        selectedTypes.push(allTypes[randomIndex]);
        allTypes.splice(randomIndex, 1);
    }
    
    // 生成方块类型数组 (确保每种类型的数量是3的倍数)
    let typeArray = [];
    selectedTypes.forEach(type => {
        // 计算每种类型需要的数量
        const count = Math.floor(blockCount / selectedTypes.length);
        // 确保是3的倍数
        const adjustedCount = Math.floor(count / 3) * 3;
        for(let i=0; i<adjustedCount; i++) {
            typeArray.push(type);
        }
    });
    
    // 补充剩余的方块，确保总数是3的倍数
    while(typeArray.length < blockCount) {
        const randomType = selectedTypes[Math.floor(Math.random() * selectedTypes.length)];
        typeArray.push(randomType);
    }
    
    // 打乱数组
    typeArray.sort(() => Math.random() - 0.5);
    
    // 缓存纹理
    if (!this.textureCache) {
        this.textureCache = [];
        for(let i=0; i<24; i++) {
            this.textureCache.push(this.createTexture(i));
        }
    }
    
    // 根据屏幕宽度计算方块大小，确保横向能显示6个方块
    const cubeWidthBlocks = 6;
    const padding = 40;
    const availableWidth = this.game.windowWidth - padding * 2;
    const blockSize = Math.floor(availableWidth / cubeWidthBlocks);
    
    // 固定魔方尺寸为6x6x6，确保横向显示6个方块
    let size = 6;
    // 确保魔方宽度不超过可用宽度
    const cubeWidth = size * (blockSize + gap) - gap;
    if (cubeWidth > availableWidth) {
        size = cubeWidthBlocks;
    }
    
    // 调整相机距离，确保能看到整个魔方
    const actualCubeSize = size * (blockSize + gap);
    const vFOV = this.game.camera.fov * Math.PI / 360;
    const aspect = this.game.windowWidth / this.game.windowHeight;
    let distance;
    if (aspect < 1) {
        const visibleHeightRatio = 0.6;
        distance = (actualCubeSize / 2) / Math.tan(vFOV) / Math.min(aspect, visibleHeightRatio);
    } else {
        distance = (actualCubeSize / 2) / Math.tan(vFOV);
    }
    this.game.camera.position.z = distance * 1.5;
    this.game.camera.lookAt(0, 0, 0);
    
    // 创建方块
    let typeIndex = 0;
    
    // 检查是否有布局数据
    if (levelConfig && levelConfig.layoutData) {
      // 使用自定义布局
      const layoutData = levelConfig.layoutData;
      for (let y = 0; y < layoutData.length; y++) {
        const row = layoutData[y].split(' ');
        for (let z = 0; z < row.length; z++) {
          const col = row[z];
          for (let x = 0; x < col.length; x++) {
            if (typeIndex >= typeArray.length) break;
            if (col[x] === '1') {
              const type = typeArray[typeIndex++];
              const safeType = type % colors.length;
              const color = colors[safeType];
              
              const geometry = new this.THREE.BoxGeometry(blockSize, blockSize, blockSize);
              // 根据星系主题调整材质
              let materialOptions = {
                  color: 0xffffff,
                  map: this.textureCache[type],
                  roughness: 0.2,
                  metalness: 0.5,
                  emissive: color,
                  emissiveIntensity: 1.0
              };
              
              // 根据星系主题调整材质属性
              switch(galaxyTheme) {
                case 'soft':
                  materialOptions.emissiveIntensity = 1.0; // 柔和的发光
                  break;
                case 'steampunk':
                  materialOptions.roughness = 0.8; // 粗糙的金属感
                  materialOptions.metalness = 0.8;
                  materialOptions.emissiveIntensity = 1.2;
                  break;
                case 'fog':
                  materialOptions.emissiveIntensity = 1.5; // 强烈的发光穿透迷雾
                  break;
                case 'gravity':
                  materialOptions.roughness = 0.4; // 金属质感
                  materialOptions.metalness = 0.7;
                  materialOptions.emissiveIntensity = 1.2;
                  break;
                case 'cyber':
                  materialOptions.emissiveIntensity = 1.8; // 强烈的霓虹光
                  break;
                case 'time':
                  materialOptions.roughness = 0.6; // 古老的石质感
                  materialOptions.metalness = 0.3;
                  materialOptions.emissiveIntensity = 1.2;
                  break;
                case 'forge':
                  materialOptions.emissiveIntensity = 2.0; // 炽热的熔岩效果
                  break;
                case 'singularity':
                  materialOptions.emissiveIntensity = 2.0; // 强烈的能量效果
                  break;
              }
              
              const material = new this.THREE.MeshStandardMaterial(materialOptions);
              
              const block = new this.THREE.Mesh(geometry, material);
              const centerOffset = (size - 1) * (blockSize + gap) / 2;
              block.position.set(
                (x * (blockSize + gap)) - centerOffset,
                (y * (blockSize + gap)) - centerOffset,
                (z * (blockSize + gap)) - centerOffset
              );
              
              // 检查是否需要添加引力方块
              let isGravityBlock = false;
              if (levelConfig && levelConfig.galaxyCoreMechanic === 'gravity') {
                // 为第一个星系的关卡添加引力方块
                // 简单规则：每10个方块中随机选择一个作为引力方块
                if (Math.random() < 0.1) {
                  isGravityBlock = true;
                }
              }
              
              block.userData = {
                color: color,
                type: type,
                position: { x, y, z },
                initialY: block.position.y,
                initialScale: 1,
                randomOffset: Math.random() * 100, // 每个方块独立的随机偏移，用于呼吸动画
                galaxyTheme: galaxyTheme,
                isGravityBlock: isGravityBlock
              };
              
              // 如果是引力方块，添加特殊效果
              if (isGravityBlock) {
                // 添加旋转箭头光环效果
                const ringGeometry = new this.THREE.TorusGeometry(blockSize * 0.6, 2, 16, 100);
                const ringMaterial = new this.THREE.MeshBasicMaterial({
                  color: 0x00ffff,
                  transparent: true,
                  opacity: 0.7,
                  side: this.THREE.DoubleSide
                });
                const ring = new this.THREE.Mesh(ringGeometry, ringMaterial);
                const centerOffset = (size - 1) * (blockSize + gap) / 2;
                ring.position.set(
                  (x * (blockSize + gap)) - centerOffset,
                  (y * (blockSize + gap)) - centerOffset,
                  (z * (blockSize + gap)) - centerOffset
                );
                ring.rotation.x = Math.PI / 2;
                ring.userData = { isGravityRing: true };
                this.cubeGroup.add(ring);
              }
              
              // 检查是否需要添加能量节点
              if (levelConfig && levelConfig.galaxyCoreMechanic === 'energyNode') {
                // 为第二个星系的关卡添加能量节点
                // 简单规则：每15个方块中随机选择一个位置作为能量节点
                if (Math.random() < 0.07) {
                  this.createEnergyNode(x, y, z, blockSize, gap);
                }
              }
              
              // 检查是否需要添加病毒方块
              if (levelConfig && levelConfig.galaxyCoreMechanic === 'dataOverload') {
                // 为第五个星系的关卡添加病毒方块
                // 简单规则：每10个方块中随机选择一个位置作为病毒方块
                if (Math.random() < 0.1) {
                  this.createVirusBlock(x, y, z, blockSize, gap);
                }
              }
              
              // 检查是否需要添加沙漏方块
              if (levelConfig && levelConfig.galaxyCoreMechanic === 'hourglass') {
                // 为第六个星系的关卡添加沙漏方块
                // 简单规则：每15个方块中随机选择一个位置作为沙漏方块
                if (Math.random() < 0.07) {
                  this.createHourglassBlock(x, y, z, blockSize, gap);
                }
              }
              
              // 检查是否需要添加模块方块
              if (levelConfig && levelConfig.galaxyCoreMechanic === 'moduleCombination') {
                // 为第七个星系的关卡添加模块方块
                // 简单规则：每12个方块中随机选择一个位置作为模块方块
                if (Math.random() < 0.08) {
                  this.createModuleBlock(x, y, z, blockSize, gap);
                }
              }
              
              // 检查是否需要添加相位方块
              if (levelConfig && levelConfig.galaxyCoreMechanic === 'phaseSwitch') {
                // 为第八个星系的关卡添加相位方块
                // 简单规则：每10个方块中随机选择一个位置作为相位方块
                if (Math.random() < 0.1) {
                  this.createPhaseBlock(x, y, z, blockSize, gap);
                }
              }
              
              this.cubeGroup.add(block);
              this.blocks.push(block);
            }
          }
          if (typeIndex >= typeArray.length) break;
        }
        if (typeIndex >= typeArray.length) break;
      }
    } else {
      // 使用默认立方体布局
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          for (let z = 0; z < size; z++) {
            if (typeIndex >= typeArray.length) break;
            
            const type = typeArray[typeIndex++];
            const safeType = type % colors.length;
            const color = colors[safeType];
            
            const geometry = new this.THREE.BoxGeometry(blockSize, blockSize, blockSize);
            // 根据星系主题调整材质
            let materialOptions = {
                color: 0xffffff,
                map: this.textureCache[type],
                roughness: 0.2,
                metalness: 0.5,
                emissive: color,
                emissiveIntensity: 1.0
            };
            
            // 根据星系主题调整材质属性
            switch(galaxyTheme) {
              case 'soft':
                materialOptions.emissiveIntensity = 1.0; // 柔和的发光
                break;
              case 'steampunk':
                materialOptions.roughness = 0.8; // 粗糙的金属感
                materialOptions.metalness = 0.8;
                materialOptions.emissiveIntensity = 1.2;
                break;
              case 'fog':
                materialOptions.emissiveIntensity = 1.5; // 强烈的发光穿透迷雾
                break;
              case 'gravity':
                materialOptions.roughness = 0.4; // 金属质感
                materialOptions.metalness = 0.7;
                materialOptions.emissiveIntensity = 1.2;
                break;
              case 'cyber':
                materialOptions.emissiveIntensity = 1.8; // 强烈的霓虹光
                break;
              case 'time':
                materialOptions.roughness = 0.6; // 古老的石质感
                materialOptions.metalness = 0.3;
                materialOptions.emissiveIntensity = 1.2;
                break;
              case 'forge':
                materialOptions.emissiveIntensity = 2.0; // 炽热的熔岩效果
                break;
              case 'singularity':
                materialOptions.emissiveIntensity = 2.0; // 强烈的能量效果
                break;
            }
            
            const material = new this.THREE.MeshStandardMaterial(materialOptions);
            
            const block = new this.THREE.Mesh(geometry, material);
            const centerOffset = (size - 1) * (blockSize + gap) / 2;
            block.position.set(
              (x * (blockSize + gap)) - centerOffset,
              (y * (blockSize + gap)) - centerOffset,
              (z * (blockSize + gap)) - centerOffset
            );
            
            // 检查是否需要添加引力方块
            let isGravityBlock = false;
            if (levelConfig && levelConfig.galaxyCoreMechanic === 'gravity') {
              // 为第一个星系的关卡添加引力方块
              // 简单规则：每10个方块中随机选择一个作为引力方块
              if (Math.random() < 0.1) {
                isGravityBlock = true;
              }
            }
            
            block.userData = {
              color: color,
              type: type,
              position: { x, y, z },
              initialY: block.position.y,
              initialScale: 1,
              randomOffset: Math.random() * 100, // 每个方块独立的随机偏移，用于呼吸动画
              galaxyTheme: galaxyTheme,
              isGravityBlock: isGravityBlock
            };
            
            // 如果是引力方块，添加特殊效果
            if (isGravityBlock) {
              // 添加旋转箭头光环效果
              const ringGeometry = new this.THREE.TorusGeometry(blockSize * 0.6, 2, 16, 100);
              const ringMaterial = new this.THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.7,
                side: this.THREE.DoubleSide
              });
              const ring = new this.THREE.Mesh(ringGeometry, ringMaterial);
              const centerOffset = (size - 1) * (blockSize + gap) / 2;
              ring.position.set(
                (x * (blockSize + gap)) - centerOffset,
                (y * (blockSize + gap)) - centerOffset,
                (z * (blockSize + gap)) - centerOffset
              );
              ring.rotation.x = Math.PI / 2;
              ring.userData = { isGravityRing: true };
              this.cubeGroup.add(ring);
            }
            
            // 检查是否需要添加能量节点
            if (levelConfig && levelConfig.galaxyCoreMechanic === 'energyNode') {
              // 为第二个星系的关卡添加能量节点
              // 简单规则：每15个方块中随机选择一个位置作为能量节点
              if (Math.random() < 0.07) {
                this.createEnergyNode(x, y, z, blockSize, gap);
              }
            }
            
            // 检查是否需要添加病毒方块
            if (levelConfig && levelConfig.galaxyCoreMechanic === 'dataOverload') {
              // 为第五个星系的关卡添加病毒方块
              // 简单规则：每10个方块中随机选择一个位置作为病毒方块
              if (Math.random() < 0.1) {
                this.createVirusBlock(x, y, z, blockSize, gap);
              }
            }
            
            // 检查是否需要添加沙漏方块
            if (levelConfig && levelConfig.galaxyCoreMechanic === 'hourglass') {
              // 为第六个星系的关卡添加沙漏方块
              // 简单规则：每15个方块中随机选择一个位置作为沙漏方块
              if (Math.random() < 0.07) {
                this.createHourglassBlock(x, y, z, blockSize, gap);
              }
            }
            
            // 检查是否需要添加模块方块
            if (levelConfig && levelConfig.galaxyCoreMechanic === 'moduleCombination') {
              // 为第七个星系的关卡添加模块方块
              // 简单规则：每12个方块中随机选择一个位置作为模块方块
              if (Math.random() < 0.08) {
                this.createModuleBlock(x, y, z, blockSize, gap);
              }
            }
            
            // 检查是否需要添加相位方块
            if (levelConfig && levelConfig.galaxyCoreMechanic === 'phaseSwitch') {
              // 为第八个星系的关卡添加相位方块
              // 简单规则：每10个方块中随机选择一个位置作为相位方块
              if (Math.random() < 0.1) {
                this.createPhaseBlock(x, y, z, blockSize, gap);
              }
            }
            
            this.cubeGroup.add(block);
            this.blocks.push(block);
          }
          if (typeIndex >= typeArray.length) break;
        }
        if (typeIndex >= typeArray.length) break;
      }
    }
    
    // 检查是否需要初始化迷雾
    if (levelConfig && levelConfig.galaxyCoreMechanic === 'fogExploration') {
      this.initFog();
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
      
      // 检查是否有核心机制需要处理
      const levelConfig = this.cube.levelConfig;
      if (levelConfig && levelConfig.galaxyCoreMechanic) {
        switch(levelConfig.galaxyCoreMechanic) {
          case 'gravity': // 引力场机制
            this.handleGravityMechanic(clickedBlock);
            return;
          case 'energyNode': // 传导链接机制
            this.handleEnergyNodeMechanic(clickedBlock);
            return;
          case 'fogExploration': // 迷雾探索机制
            this.handleFogExplorationMechanic(clickedBlock);
            return;
          case 'dynamicGravity': // 动态重力机制
            this.handleDynamicGravityMechanic(clickedBlock);
            return;
          case 'dataOverload': // 数据超载机制
            this.handleDataOverloadMechanic(clickedBlock);
            return;
          case 'hourglass': // 时之沙漏机制
            this.handleHourglassMechanic(clickedBlock);
            return;
          case 'moduleCombination': // 模块组合机制
            this.handleModuleCombinationMechanic(clickedBlock);
            return;
          case 'phaseSwitch': // 相位切换机制
            this.handlePhaseSwitchMechanic(clickedBlock);
            return;
          // 其他核心机制可以在这里添加
        }
      }
      
      // 常规点击处理
      this.handleRegularClick(clickedBlock);
    }
  }
  
  // 处理引力场机制
  handleGravityMechanic(clickedBlock) {
    // 检查是否是引力方块
    if (clickedBlock.userData.isGravityBlock) {
      // 查找正上方的方块
      const { x, y, z } = clickedBlock.userData.position;
      const upperBlock = this.findBlockAt(x, y + 1, z);
      
      if (upperBlock) {
        // 先处理上方的方块
        this.handleRegularClick(upperBlock);
        // 然后处理当前的引力方块
        setTimeout(() => {
          this.handleRegularClick(clickedBlock);
        }, 150); // 稍微延迟，让动画更流畅
      } else {
        // 没有上方方块，只处理当前方块
        this.handleRegularClick(clickedBlock);
      }
    } else {
      // 不是引力方块，按常规处理
      this.handleRegularClick(clickedBlock);
    }
  }
  
  // 处理传导链接机制
  handleEnergyNodeMechanic(clickedBlock) {
    // 查找相邻的能量节点
    const { x, y, z } = clickedBlock.userData.position;
    const adjacentNodes = this.findAdjacentEnergyNodes(x, y, z);
    
    if (adjacentNodes.length > 0) {
      // 为相邻的能量节点充能
      adjacentNodes.forEach(node => {
        node.energy += 1;
        // 检查是否充能满
        if (node.energy >= node.maxEnergy) {
          // 激活能量节点效果
          this.activateEnergyNode(node);
        }
      });
    }
    
    // 常规处理点击的方块
    this.handleRegularClick(clickedBlock);
  }
  
  // 查找相邻的能量节点
  findAdjacentEnergyNodes(x, y, z) {
    const directions = [
      { dx: 1, dy: 0, dz: 0 },
      { dx: -1, dy: 0, dz: 0 },
      { dx: 0, dy: 1, dz: 0 },
      { dx: 0, dy: -1, dz: 0 },
      { dx: 0, dy: 0, dz: 1 },
      { dx: 0, dy: 0, dz: -1 }
    ];
    
    const nodes = [];
    
    for (const dir of directions) {
      const node = this.findEnergyNodeAt(x + dir.dx, y + dir.dy, z + dir.dz);
      if (node) {
        nodes.push(node);
      }
    }
    
    return nodes;
  }
  
  // 查找指定位置的能量节点
  findEnergyNodeAt(x, y, z) {
    for (let child of this.cubeGroup.children) {
      if (child.userData && child.userData.isEnergyNode &&
          child.userData.position.x === x &&
          child.userData.position.y === y &&
          child.userData.position.z === z) {
        return child.userData;
      }
    }
    return null;
  }
  
  // 激活能量节点效果
  activateEnergyNode(node) {
    // 重置能量
    node.energy = 0;
    
    // 这里可以添加激活效果，比如高亮全场同色方块
    console.log('Energy node activated!');
  }
  
  // 创建能量节点
  createEnergyNode(x, y, z, blockSize, gap) {
    const nodeSize = blockSize * 0.8;
    
    // 创建能量节点几何体
    const geometry = new this.THREE.BoxGeometry(nodeSize, nodeSize, nodeSize);
    
    // 创建能量节点材质
    const material = new this.THREE.MeshStandardMaterial({
      color: 0xFFD32A,
      emissive: 0xFFD32A,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2
    });
    
    const node = new this.THREE.Mesh(geometry, material);
    const centerOffset = (size - 1) * (blockSize + gap) / 2;
    node.position.set(
      (x * (blockSize + gap)) - centerOffset,
      (y * (blockSize + gap)) - centerOffset,
      (z * (blockSize + gap)) - centerOffset
    );
    
    // 设置能量节点的用户数据
    node.userData = {
      isEnergyNode: true,
      position: { x, y, z },
      energy: 0,
      maxEnergy: 3 // 能量节点需要3点能量才能激活
    };
    
    // 添加能量节点到场景
    this.cubeGroup.add(node);
  }
  
  // 处理迷雾探索机制
  handleFogExplorationMechanic(clickedBlock) {
    // 揭示周围的迷雾
    const { x, y, z } = clickedBlock.userData.position;
    this.revealFog(x, y, z);
    
    // 常规处理点击的方块
    this.handleRegularClick(clickedBlock);
  }
  
  // 揭示迷雾
  revealFog(x, y, z) {
    // 计算周围曼哈顿距离≤1的所有位置
    const directions = [
      { dx: 0, dy: 0, dz: 0 }, // 中心
      { dx: 1, dy: 0, dz: 0 },
      { dx: -1, dy: 0, dz: 0 },
      { dx: 0, dy: 1, dz: 0 },
      { dx: 0, dy: -1, dz: 0 },
      { dx: 0, dy: 0, dz: 1 },
      { dx: 0, dy: 0, dz: -1 }
    ];
    
    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      const nz = z + dir.dz;
      
      // 标记该位置为已探索
      this.markAsExplored(nx, ny, nz);
    }
  }
  
  // 标记位置为已探索
  markAsExplored(x, y, z) {
    // 查找该位置的方块
    const block = this.findBlockAt(x, y, z);
    if (block) {
      // 设置方块为可见
      block.visible = true;
      block.userData.explored = true;
    }
  }
  
  // 初始化迷雾
  initFog() {
    // 初始时只有中心3x3x2区域可见
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 0; y++) { // 只显示两层
        for (let z = -1; z <= 1; z++) {
          this.markAsExplored(x, y, z);
        }
      }
    }
    
    // 隐藏其他所有方块
    for (let block of this.cubeGroup.children) {
      if (block.userData && !block.userData.explored) {
        block.visible = false;
      }
    }
  }
  
  // 处理动态重力机制
  handleDynamicGravityMechanic(clickedBlock) {
    // 检查是否是重力方向最前端的方块
    if (this.isFrontBlock(clickedBlock)) {
      // 常规处理点击的方块
      this.handleRegularClick(clickedBlock);
      
      // 重力改变时，方块会坠落重组
      // 这里简化处理，实际游戏中应该有重力切换的逻辑
      this.updateGravity();
    }
  }
  
  // 检查是否是重力方向最前端的方块
  isFrontBlock(block) {
    // 获取当前重力方向
    const gravityDirection = this.game.gameManager.gravityDirection || 'down';
    const { x, y, z } = block.userData.position;
    
    switch(gravityDirection) {
      case 'down':
        // 最下方的方块
        return this.isLowestBlock(x, z, y);
      case 'up':
        // 最上方的方块
        return this.isHighestBlock(x, z, y);
      case 'left':
        // 最左侧的方块
        return this.isLeftmostBlock(y, z, x);
      case 'right':
        // 最右侧的方块
        return this.isRightmostBlock(y, z, x);
      default:
        return true;
    }
  }
  
  // 检查是否是最下方的方块
  isLowestBlock(x, z, y) {
    let lowestY = y;
    for (let block of this.cubeGroup.children) {
      if (block.userData && block.userData.position &&
          block.userData.position.x === x &&
          block.userData.position.z === z) {
        if (block.userData.position.y < lowestY) {
          lowestY = block.userData.position.y;
        }
      }
    }
    return y === lowestY;
  }
  
  // 检查是否是最上方的方块
  isHighestBlock(x, z, y) {
    let highestY = y;
    for (let block of this.cubeGroup.children) {
      if (block.userData && block.userData.position &&
          block.userData.position.x === x &&
          block.userData.position.z === z) {
        if (block.userData.position.y > highestY) {
          highestY = block.userData.position.y;
        }
      }
    }
    return y === highestY;
  }
  
  // 检查是否是最左侧的方块
  isLeftmostBlock(y, z, x) {
    let leftmostX = x;
    for (let block of this.cubeGroup.children) {
      if (block.userData && block.userData.position &&
          block.userData.position.y === y &&
          block.userData.position.z === z) {
        if (block.userData.position.x < leftmostX) {
          leftmostX = block.userData.position.x;
        }
      }
    }
    return x === leftmostX;
  }
  
  // 检查是否是最右侧的方块
  isRightmostBlock(y, z, x) {
    let rightmostX = x;
    for (let block of this.cubeGroup.children) {
      if (block.userData && block.userData.position &&
          block.userData.position.y === y &&
          block.userData.position.z === z) {
        if (block.userData.position.x > rightmostX) {
          rightmostX = block.userData.position.x;
        }
      }
    }
    return x === rightmostX;
  }
  
  // 更新重力
  updateGravity() {
    // 这里简化处理，实际游戏中应该有重力切换的逻辑
    // 重力方向：down, up, left, right
    const directions = ['down', 'up', 'left', 'right'];
    const currentDirection = this.game.gameManager.gravityDirection || 'down';
    const currentIndex = directions.indexOf(currentDirection);
    const nextIndex = (currentIndex + 1) % directions.length;
    this.game.gameManager.gravityDirection = directions[nextIndex];
    
    // 方块坠落重组的逻辑可以在这里实现
    console.log('Gravity direction changed to:', this.game.gameManager.gravityDirection);
  }
  
  // 处理数据超载机制
  handleDataOverloadMechanic(clickedBlock) {
    // 检查是否是病毒方块
    if (clickedBlock.userData.isVirus) {
      // 病毒方块不能直接消除，需要通过积累进度来清理
      console.log('Cannot eliminate virus block directly!');
      return;
    }
    
    // 常规处理点击的方块
    this.handleRegularClick(clickedBlock);
    
    // 增加清理进度
    this.game.gameManager.increaseVirusCleanupProgress();
    
    // 检查是否可以清理病毒
    if (this.game.gameManager.virusCleanupProgress >= 100) {
      this.cleanupViruses();
    }
  }
  
  // 清理所有病毒方块
  cleanupViruses() {
    // 查找所有病毒方块
    const viruses = [];
    for (let block of this.cubeGroup.children) {
      if (block.userData && block.userData.isVirus) {
        viruses.push(block);
      }
    }
    
    // 移除所有病毒方块
    viruses.forEach(virus => {
      this.cubeGroup.remove(virus);
      // 清理内存
      if (virus.geometry) virus.geometry.dispose();
      if (virus.material) {
        if (Array.isArray(virus.material)) {
          virus.material.forEach(m => m.dispose());
        } else {
          virus.material.dispose();
        }
      }
    });
    
    // 重置清理进度
    this.game.gameManager.virusCleanupProgress = 0;
    console.log('All viruses cleaned up!');
  }
  
  // 创建病毒方块
  createVirusBlock(x, y, z, blockSize, gap) {
    const virusSize = blockSize * 0.9;
    
    // 创建病毒方块几何体
    const geometry = new this.THREE.BoxGeometry(virusSize, virusSize, virusSize);
    
    // 创建病毒方块材质
    const material = new this.THREE.MeshStandardMaterial({
      color: 0xFF4757,
      emissive: 0xFF4757,
      emissiveIntensity: 0.8,
      metalness: 0.3,
      roughness: 0.7
    });
    
    const virus = new this.THREE.Mesh(geometry, material);
    const centerOffset = (size - 1) * (blockSize + gap) / 2;
    virus.position.set(
      (x * (blockSize + gap)) - centerOffset,
      (y * (blockSize + gap)) - centerOffset,
      (z * (blockSize + gap)) - centerOffset
    );
    
    // 设置病毒方块的用户数据
    virus.userData = {
      isVirus: true,
      position: { x, y, z }
    };
    
    // 添加病毒方块到场景
    this.cubeGroup.add(virus);
  }
  
  // 查找指定位置的方块
  findBlockAt(x, y, z) {
    for (let block of this.cubeGroup.children) {
      if (block.userData.position && 
          block.userData.position.x === x && 
          block.userData.position.y === y && 
          block.userData.position.z === z) {
        return block;
      }
    }
    return null;
  }
  
  // 处理时之沙漏机制
  handleHourglassMechanic(clickedBlock) {
    // 检查是否是沙漏方块
    if (clickedBlock.userData.isHourglass) {
      // 触发时间冻结效果
      this.game.gameManager.toggleTimeFreeze();
    }
    
    // 常规处理点击的方块
    this.handleRegularClick(clickedBlock);
  }
  
  // 创建沙漏方块
  createHourglassBlock(x, y, z, blockSize, gap) {
    const hourglassSize = blockSize * 0.8;
    
    // 创建沙漏方块几何体
    const geometry = new this.THREE.BoxGeometry(hourglassSize, hourglassSize, hourglassSize);
    
    // 创建沙漏方块材质
    const material = new this.THREE.MeshStandardMaterial({
      color: 0xFFD32A,
      emissive: 0xFFD32A,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2
    });
    
    const hourglass = new this.THREE.Mesh(geometry, material);
    const centerOffset = (size - 1) * (blockSize + gap) / 2;
    hourglass.position.set(
      (x * (blockSize + gap)) - centerOffset,
      (y * (blockSize + gap)) - centerOffset,
      (z * (blockSize + gap)) - centerOffset
    );
    
    // 设置沙漏方块的用户数据
    hourglass.userData = {
      isHourglass: true,
      position: { x, y, z }
    };
    
    // 添加沙漏方块到场景
    this.cubeGroup.add(hourglass);
  }
  
  // 处理模块组合机制
  handleModuleCombinationMechanic(clickedBlock) {
    // 检查是否是模块方块
    if (clickedBlock.userData.isModule) {
      // 触发模块组合效果
      console.log('Module block clicked!');
      // 这里可以添加模块组合的具体逻辑
    }
    
    // 常规处理点击的方块
    this.handleRegularClick(clickedBlock);
  }
  
  // 创建模块方块
  createModuleBlock(x, y, z, blockSize, gap) {
    const moduleSize = blockSize * 0.8;
    
    // 创建模块方块几何体
    const geometry = new this.THREE.BoxGeometry(moduleSize, moduleSize, moduleSize);
    
    // 创建模块方块材质
    const material = new this.THREE.MeshStandardMaterial({
      color: 0xFF4757,
      emissive: 0xFF4757,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2
    });
    
    const module = new this.THREE.Mesh(geometry, material);
    const centerOffset = (size - 1) * (blockSize + gap) / 2;
    module.position.set(
      (x * (blockSize + gap)) - centerOffset,
      (y * (blockSize + gap)) - centerOffset,
      (z * (blockSize + gap)) - centerOffset
    );
    
    // 设置模块方块的用户数据
    module.userData = {
      isModule: true,
      position: { x, y, z },
      moduleType: Math.floor(Math.random() * 3) // 0, 1, 2 三种模块类型
    };
    
    // 添加模块方块到场景
    this.cubeGroup.add(module);
  }
  
  // 处理相位切换机制
  handlePhaseSwitchMechanic(clickedBlock) {
    // 检查是否是相位方块
    if (clickedBlock.userData.isPhase) {
      // 触发相位切换效果
      this.game.gameManager.togglePhase();
    }
    
    // 常规处理点击的方块
    this.handleRegularClick(clickedBlock);
  }
  
  // 创建相位方块
  createPhaseBlock(x, y, z, blockSize, gap) {
    const phaseSize = blockSize * 0.8;
    
    // 创建相位方块几何体
    const geometry = new this.THREE.BoxGeometry(phaseSize, phaseSize, phaseSize);
    
    // 创建相位方块材质
    const material = new this.THREE.MeshStandardMaterial({
      color: 0xFF00FF,
      emissive: 0xFF00FF,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.2
    });
    
    const phase = new this.THREE.Mesh(geometry, material);
    const centerOffset = (size - 1) * (blockSize + gap) / 2;
    phase.position.set(
      (x * (blockSize + gap)) - centerOffset,
      (y * (blockSize + gap)) - centerOffset,
      (z * (blockSize + gap)) - centerOffset
    );
    
    // 设置相位方块的用户数据
    phase.userData = {
      isPhase: true,
      position: { x, y, z }
    };
    
    // 添加相位方块到场景
    this.cubeGroup.add(phase);
  }
  
  // 常规点击处理
  handleRegularClick(clickedBlock) {
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
        const slotCount = 8;
        const padding = 20;
        const gap = 5;
        const availableWidth = this.game.windowWidth - padding * 2;
        const slotWidth = Math.floor((availableWidth - (slotCount - 1) * gap) / slotCount);
        const slotHeight = slotWidth;
        const totalWidth = slotCount * slotWidth + (slotCount - 1) * gap;
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

module.exports = {
  default: CubeManager
};