// 游戏状态管理
class GameManager {
  constructor(levelConfig) {
    // 默认配置
    const defaultConfig = {
      name: '星际探索',
      target: '收集10个晶体',
      timeLimit: 150,
      galaxyName: '新星摇篮'
    };
    
    // 合并配置
    this.levelConfig = levelConfig || defaultConfig;
    
    // 关卡信息
    this.levelInfo = {
      level: `${this.levelConfig.galaxyName} - ${this.levelConfig.name}`,
      target: this.levelConfig.target,
      time: this.levelConfig.timeLimit > 0 ? `${Math.floor(this.levelConfig.timeLimit / 60)}:${(this.levelConfig.timeLimit % 60).toString().padStart(2, '0')}` : '无时限'
    };
    
    // 资源信息
    this.resources = {
      energy: 0,
      maxEnergy: 100,
      metal: 0,
      crystal: 0,
      ecology: 0
    };
    
    // 待消除槽 (改为8个)
    this.eliminationSlots = new Array(8).fill(null).map(() => ({ block: null, highlight: false }));
    
    // 倒计时 (单位: 秒)
    this.maxCountdown = this.levelConfig.timeLimit || 150;
    this.countdown = this.levelConfig.timeLimit || 150;
    
    // 技能进度
    this.skillProgress = 0.6;
    
    // 游戏状态
    this.isGameOver = false;
    this.isPaused = false;
    
    // 历史记录 (用于回溯)
    this.history = [];
    
    // 重力方向 (动态重力机制)
    this.gravityDirection = 'down';
    
    // 病毒清理进度 (数据超载机制)
    this.virusCleanupProgress = 0;
    
    // 时间冻结状态 (时之沙漏机制)
    this.isTimeFrozen = false;
    
    // 相位状态 (相位切换机制)
    this.currentPhase = 0; // 0 和 1 两个相位
  }
  
  // 添加方块到槽位
  addBlockToSlot(block) {
    // 1. 查找空槽位
    let slotIndex = -1;
    for (let i = 0; i < this.eliminationSlots.length; i++) {
      if (!this.eliminationSlots[i].block) {
        slotIndex = i;
        break;
      }
    }

    if (slotIndex === -1) return -1;

    // 2. 记录操作用于回溯 (包含槽位索引)
    this.history.push({
      type: 'addBlock',
      slotIndex: slotIndex,
      blockData: {
        color: block.userData.color,
        originalPosition: block.userData.position,
        originalBlock: block
      }
    });

    // 场上图案奖励检测 (在移除前检测)
    this.checkPatternReward(block);
    
    this.eliminationSlots[slotIndex].block = {
      color: '#' + block.userData.color.toString(16).padStart(6, '0'),
      originalBlock: block, // 保存原始引用以便后续可能的恢复
      visible: false // 初始不可见，等待动画结束
    };
    
    return slotIndex;
  }
  
  // 检测场上图案奖励
  checkPatternReward(targetBlock) {
    if (!this.cube || !this.cube.blocks) return;
    
    // 构建空间映射 (只包含场上剩余的方块)
    const activeBlocks = this.cube.cubeGroup.children; // 使用实际在场景中的方块
    const spatialMap = new Map();
    
    activeBlocks.forEach(block => {
      const { x, y, z } = block.userData.position;
      spatialMap.set(`${x},${y},${z}`, block);
    });
    
    const targetColor = targetBlock.userData.color;
    const { x, y, z } = targetBlock.userData.position;
    
    // 优先级：生态 > 晶体 > 金属
    
    // 1. 检测 L 型 (生态)
    if (this.checkLShape(x, y, z, targetColor, spatialMap)) {
      this.resources.ecology++;
      this.showRewardFeedback('生态 +1');
      return;
    }
    
    // 2. 检测 5连 (晶体)
    if (this.checkLine5(x, y, z, targetColor, spatialMap)) {
      this.resources.crystal++;
      this.showRewardFeedback('晶体 +1');
      return;
    }
    
    // 3. 检测 2x2 (金属)
    if (this.checkSquare2x2(x, y, z, targetColor, spatialMap)) {
      this.resources.metal++;
      this.showRewardFeedback('金属 +1');
      return;
    }
  }
  
  // 显示奖励反馈 (简单 log，后续对接 UI)
  showRewardFeedback(msg) {
    console.log('Reward:', msg);
    // TODO: 在屏幕上显示浮动文字
  }
  
  // 辅助：获取指定位置的方块颜色
  getBlockColorAt(x, y, z, map) {
    const block = map.get(`${x},${y},${z}`);
    return block ? block.userData.color : null;
  }
  
  // 检测 2x2
  checkSquare2x2(x, y, z, color, map) {
    // 检查三个平面：XY, YZ, XZ
    // 每个平面有 4 个可能的 2x2 包含当前点
    
    const checkPlane = (dx1, dy1, dx2, dy2, plane) => {
      // 检查以 (x,y,z) 为基准的四个方向的 2x2
      // 偏移量组合：(0,0), (1,0), (0,1), (1,1) 等
      const offsets = [
        [[0,0], [1,0], [0,1], [1,1]],
        [[0,0], [-1,0], [0,1], [-1,1]],
        [[0,0], [1,0], [0,-1], [1,-1]],
        [[0,0], [-1,0], [0,-1], [-1,-1]]
      ];
      
      for (const group of offsets) {
        let match = true;
        for (const [u, v] of group) {
            let px = x, py = y, pz = z;
            if (plane === 'XY') { px += u; py += v; }
            if (plane === 'YZ') { py += u; pz += v; }
            if (plane === 'XZ') { px += u; pz += v; }
            
            if (this.getBlockColorAt(px, py, pz, map) !== color) {
                match = false;
                break;
            }
        }
        if (match) return true;
      }
      return false;
    };
    
    return checkPlane(1,0,0,1, 'XY') || checkPlane(0,1,0,1, 'YZ') || checkPlane(1,0,0,1, 'XZ');
  }
  
  // 检测 5连 (晶体) - 简单连通数 >= 5
  checkLine5(x, y, z, color, map) {
    const visited = new Set();
    const queue = [{x, y, z}];
    visited.add(`${x},${y},${z}`);
    let count = 0;
    
    while(queue.length > 0) {
        const curr = queue.shift();
        count++;
        if (count >= 5) return true;
        
        // 检查 6 个邻居
        const neighbors = [
            {x: curr.x+1, y: curr.y, z: curr.z},
            {x: curr.x-1, y: curr.y, z: curr.z},
            {x: curr.x, y: curr.y+1, z: curr.z},
            {x: curr.x, y: curr.y-1, z: curr.z},
            {x: curr.x, y: curr.y, z: curr.z+1},
            {x: curr.x, y: curr.y, z: curr.z-1}
        ];
        
        for (const n of neighbors) {
            const key = `${n.x},${n.y},${n.z}`;
            if (!visited.has(key) && this.getBlockColorAt(n.x, n.y, n.z, map) === color) {
                visited.add(key);
                queue.push(n);
            }
        }
    }
    return false;
  }
  
  // 检测 L 型 (生态) - 3x2 缺一角 (5个)
  checkLShape(x, y, z, color, map) {
    // 简化检测：枚举包含当前点的所有 3x2 和 2x3 区域
    // 检查区域内同色方块数量是否 == 5
    
    const checkRect = (width, height, plane) => {
        // 枚举矩形左上角的所有可能位置
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                // 假设当前点是矩形内的 (i, j)
                // 矩形原点
                let ox = x, oy = y, oz = z;
                if (plane === 'XY') { ox -= i; oy -= j; }
                if (plane === 'YZ') { oy -= i; oz -= j; }
                if (plane === 'XZ') { ox -= i; oz -= j; }
                
                let count = 0;
                // 遍历矩形内所有点
                for (let u = 0; u < width; u++) {
                    for (let v = 0; v < height; v++) {
                         let px = ox, py = oy, pz = oz;
                         if (plane === 'XY') { px += u; py += v; }
                         if (plane === 'YZ') { py += u; pz += v; }
                         if (plane === 'XZ') { px += u; pz += v; }
                         
                         if (this.getBlockColorAt(px, py, pz, map) === color) {
                             count++;
                         }
                    }
                }
                
                if (count === 5) return true;
            }
        }
        return false;
    };
    
    return checkRect(3, 2, 'XY') || checkRect(2, 3, 'XY') ||
           checkRect(3, 2, 'YZ') || checkRect(2, 3, 'YZ') ||
           checkRect(3, 2, 'XZ') || checkRect(2, 3, 'XZ');
  }
  
  // 移除槽位中的方块
  removeBlockFromSlot(index) {
    if (index >= 0 && index < this.eliminationSlots.length) {
      this.eliminationSlots[index].block = null;
      // 移除后立即整理，防止产生空隙导致消除逻辑错误
      this.compactSlots();
      return true;
    }
    return false;
  }
  
  // 检测消除
  checkElimination(deltaTime) {
    // 检查是否有3个相同颜色的方块
    const slotBlocks = [];
    this.eliminationSlots.forEach(slot => {
      // 只有可见（已到达）的方块才参与消除判定
      if (slot.block && slot.block.visible !== false) {
        slotBlocks.push(slot.block.color);
      } else {
        slotBlocks.push(null); // 未到达或空槽位视为 null
      }
    });
    
    // 遍历检查是否有连续3个相同颜色
    // 注意：这里假设 compactSlots 已经保证了方块是紧凑排列的
    // 如果没有 compactSlots，逻辑会更复杂
    for (let i = 0; i <= slotBlocks.length - 3; i++) {
      if (slotBlocks[i] && slotBlocks[i] === slotBlocks[i+1] && slotBlocks[i] === slotBlocks[i+2]) {
        // 找到3个相同颜色
        
        // 触发消除前的闪烁高亮
        // 我们给这些槽位标记一个 highlightElimination 属性，并设置一个短暂的计时器
        if (!this.eliminationSlots[i].highlightElimination) {
            // 开始闪烁
            const highlightDuration = 100; // 0.1s 闪烁
            this.eliminationSlots[i].highlightElimination = true;
            this.eliminationSlots[i+1].highlightElimination = true;
            this.eliminationSlots[i+2].highlightElimination = true;
            
            // 记录定时器，以便在撤销时取消
            this.eliminationTimer = setTimeout(() => {
                this.performElimination(i);
                this.eliminationTimer = null;
            }, highlightDuration);
            
            // 返回等待消除状态，告知主循环暂停其他操作（可选）
            return { eliminated: false, waitingForElimination: true };
        }
        
        // 如果已经在闪烁中，则等待
        return { eliminated: false, waitingForElimination: true };
      }
    }
    return { eliminated: false };
  }
  
  performElimination(startIndex) {
      // 执行真正的消除
      // 增加安全检查：确保 startIndex 处的方块依然存在（可能被回溯移除了）
      if (!this.eliminationSlots[startIndex] || !this.eliminationSlots[startIndex].block) {
          this.eliminationSlots.forEach(slot => slot.highlightElimination = false);
          return;
      }
      
      const color = this.eliminationSlots[startIndex].block.color;
      
      this.removeBlockFromSlot(startIndex);
      this.removeBlockFromSlot(startIndex); // 再次移除当前位置（因为后面的补上来了）
      this.removeBlockFromSlot(startIndex);
      
      // 清除高亮标记
      this.eliminationSlots[startIndex].highlightElimination = false;
      // 注意：由于 removeBlockFromSlot 会调用 compactSlots，索引可能会变
      // 但这里我们已经移除了三个，compactSlots 会自动处理剩下的
      // 只需要确保所有槽位的高亮标记都被重置（或者只重置被消除的，但这里它们已经没了）
      // 为了安全，重置所有
      this.eliminationSlots.forEach(slot => slot.highlightElimination = false);
      
      // 增加倒计时 (规则：增加倒计时)
      this.countdown = Math.min(this.countdown + 5, this.maxCountdown);
      
      // 增加能量 (规则：补充基础能量)
      this.resources.energy = Math.min(this.resources.energy + 10, this.resources.maxEnergy);
      
      // 消除发生，清空回溯历史 (防止状态不一致)
      this.history = [];
      
      // 通知主循环播放特效（这里通过回调或者事件，简单起见我们设置一个标志位供主循环下一帧读取，或者直接返回）
      // 但由于这是在 setTimeout 中执行的，无法直接返回值给 update
      // 我们可以在 GameManager 中存储一个 "最近一次消除信息"
      this.lastEliminationInfo = { eliminated: true, indices: [startIndex, startIndex+1, startIndex+2], color: color };
  }
  
  // 整理槽位 (冒泡填补空缺)
  compactSlots() {
    const slots = this.eliminationSlots;
    const filledSlots = [];
    
    // 收集所有非空方块
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].block) {
        filledSlots.push(slots[i].block);
        slots[i].block = null;
      }
    }
    
    // 重新填入
    for (let i = 0; i < filledSlots.length; i++) {
      slots[i].block = filledSlots[i];
    }
  }

  // 检测槽位预警
  checkSlotWarning() {
    let filledSlots = 0;
    this.eliminationSlots.forEach(slot => {
      if (slot.block) {
        filledSlots++;
      }
    });
    
    if (filledSlots >= 6) {
      this.eliminationSlots.forEach(slot => {
        slot.highlight = true;
      });
    } else {
      this.eliminationSlots.forEach(slot => {
        slot.highlight = false;
      });
    }
  }
  
  // 更新技能进度
  updateSkillProgress(delta) {
    this.skillProgress = (this.skillProgress + delta) % 1;
  }
  
  // 使用技能
  useSkill(type) {
    switch(type) {
      case 'scan': // 扫描
        // 高亮奖励图案
        this.scanPatterns();
        return true;
      case 'undo': // 回溯 (撤销)
        if (this.history.length > 0) {
          this.undoLastAction();
          return true;
        }
        break;
      case 'shuffle': // 重组
        this.shuffleBlocks();
        return true;
    }
    return false;
  }
  
  // 撤销上一步
  undoLastAction() {
      const action = this.history.pop();
      if (!action) return;
      
      if (action.type === 'addBlock') {
          // 1. 如果有待触发的消除，先取消它 (因为回溯破坏了消除条件)
          if (this.eliminationTimer) {
              clearTimeout(this.eliminationTimer);
              this.eliminationTimer = null;
              this.eliminationSlots.forEach(slot => slot.highlightElimination = false);
          }

          // 2. 根据记录的 slotIndex 查找方块
          // 如果该位置为空，说明可能已经发生了消除 (理论上 history 应该在消除时清空)
          const slotIndex = action.slotIndex;
          if (slotIndex !== undefined && this.eliminationSlots[slotIndex].block) {
              const slotBlock = this.eliminationSlots[slotIndex].block;
              this.eliminationSlots[slotIndex].block = null;
              
              // 3. 整理槽位 (由于我们移除了一个中间的或最后的，需要重新对齐)
              this.compactSlots();
              
              // 4. 恢复到场景中
              if (slotBlock.originalBlock) {
                  this.cube.cubeGroup.add(slotBlock.originalBlock);
                  // 恢复原始状态
                  slotBlock.originalBlock.scale.set(1, 1, 1);
                  slotBlock.originalBlock.visible = true;
                  // 恢复原始发光颜色和强度 (参考 createCube 中的设置)
                  const originalColor = slotBlock.originalBlock.userData.color;
                  if (Array.isArray(slotBlock.originalBlock.material)) {
                      slotBlock.originalBlock.material.forEach(m => {
                          m.emissive.setHex(originalColor);
                          m.emissiveIntensity = 0.5;
                      });
                  } else {
                      slotBlock.originalBlock.material.emissive.setHex(originalColor);
                      slotBlock.originalBlock.material.emissiveIntensity = 0.5;
                  }
              }
          }
      }
  }
  
  // 扫描图案
  scanPatterns() {
      if (!this.cube || !this.cube.blocks) return;
      const activeBlocks = this.cube.cubeGroup.children;
      const spatialMap = new Map();
      activeBlocks.forEach(block => {
        const { x, y, z } = block.userData.position;
        spatialMap.set(`${x},${y},${z}`, block);
      });
      
      activeBlocks.forEach(block => {
          const color = block.userData.color;
          const { x, y, z } = block.userData.position;
          
          let highlightColor = null;
          
          // 优先级检测
          if (this.checkLShape(x, y, z, color, spatialMap)) highlightColor = 0x00ff00; // 生态-绿
          else if (this.checkLine5(x, y, z, color, spatialMap)) highlightColor = 0x0000ff; // 晶体-蓝
          else if (this.checkSquare2x2(x, y, z, color, spatialMap)) highlightColor = 0xffff00; // 金属-黄
          
          if (highlightColor) {
              // 高亮
              if (Array.isArray(block.material)) {
                   block.material.forEach(m => {
                       m.emissive.setHex(highlightColor);
                       m.emissiveIntensity = 0.8;
                   });
              } else {
                   block.material.emissive.setHex(highlightColor);
                   block.material.emissiveIntensity = 0.8;
              }
              
              // 3秒后取消
              setTimeout(() => {
                  if (Array.isArray(block.material)) {
                       block.material.forEach(m => {
                           m.emissive.setHex(0x000000);
                           m.emissiveIntensity = 0;
                       });
                  } else {
                       block.material.emissive.setHex(0x000000);
                       block.material.emissiveIntensity = 0;
                  }
              }, 3000);
          }
      });
  }
  
  // 重组 (洗牌)
  shuffleBlocks() {
      if (!this.cube || !this.cube.cubeGroup) return;
      const activeBlocks = this.cube.cubeGroup.children;
      
      // 1. 收集所有方块的原始属性 (类型和颜色)
      const properties = activeBlocks.map(block => ({
          type: block.userData.type,
          color: block.userData.color
      }));
      
      // 2. 随机洗牌属性数组
      for (let i = properties.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [properties[i], properties[j]] = [properties[j], properties[i]];
      }
      
      // 3. 将洗牌后的属性重新应用到场上所有的方块
      activeBlocks.forEach((block, index) => {
          const newProp = properties[index];
          
          // 更新逻辑数据
          block.userData.type = newProp.type;
          block.userData.color = newProp.color;
          
          // 更新视觉表现 (材质)
          // 这里的 Main.js 实例已经通过 this.cube 传入，可以直接访问其 textureCache
          // 注意：GameManager 本身没有 textureCache，它在 Main 实例中
          if (block.material) {
              const materials = Array.isArray(block.material) ? block.material : [block.material];
              materials.forEach(m => {
                  // 更新纹理 (从 Main 实例的 textureCache 中获取)
                  if (this.cube.textureCache && this.cube.textureCache[newProp.type]) {
                      m.map = this.cube.textureCache[newProp.type];
                      m.needsUpdate = true;
                  }
                  // 更新发光颜色
                  m.emissive.setHex(newProp.color);
                  m.emissiveIntensity = 0.5;
              });
          }
      });
  }
  
  // 自动排序
  autoSort() {
    // 简单的排序逻辑
    const blocks = this.eliminationSlots.filter(slot => slot.block).map(slot => slot.block);
    const emptySlots = this.eliminationSlots.filter(slot => !slot.block);
    
    // 按颜色排序
    blocks.sort((a, b) => a.color.localeCompare(b.color));
    
    // 重新填充槽位
    this.eliminationSlots.forEach((slot, index) => {
      if (index < blocks.length) {
        slot.block = blocks[index];
      } else {
        slot.block = null;
      }
    });
  }
  
  // 使用道具
  useItem(type) {
    switch(type) {
      case 'bomb':
        // 炸弹道具
        if (this.resources.metal >= 5) {
          this.resources.metal -= 5;
          // 清空所有槽位
          this.eliminationSlots.forEach(slot => {
            slot.block = null;
          });
          return true;
        }
        break;
      case 'colorChange':
        // 变色道具
        if (this.resources.ecology >= 3) {
          this.resources.ecology -= 3;
          // 随机改变一个方块的颜色
          const filledSlots = this.eliminationSlots.filter(slot => slot.block);
          if (filledSlots.length > 0) {
            const randomSlot = filledSlots[Math.floor(Math.random() * filledSlots.length)];
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
            randomSlot.block.color = colors[Math.floor(Math.random() * colors.length)];
          }
          return true;
        }
        break;
    }
    return false;
  }
  
  // 增加病毒清理进度
  increaseVirusCleanupProgress() {
    // 每次消除增加10%的进度
    this.virusCleanupProgress += 10;
    if (this.virusCleanupProgress > 100) {
      this.virusCleanupProgress = 100;
    }
  }
  
  // 切换时间冻结状态
  toggleTimeFreeze() {
    this.isTimeFrozen = !this.isTimeFrozen;
    console.log('Time freeze toggled:', this.isTimeFrozen);
    
    // 时间冻结时，停止倒计时和资源生成
    // 时间解冻时，恢复正常
  }
  
  // 切换相位状态
  togglePhase() {
    this.currentPhase = 1 - this.currentPhase;
    console.log('Phase toggled to:', this.currentPhase);
    
    // 相位切换时，可以改变方块的可见性、颜色或其他属性
  }
  
  // 检查游戏是否结束
  checkGameOver() {
    // 根据关卡配置检查胜利条件
    if (this.levelConfig) {
      // 检查是否完成关卡目标
      if (this.checkLevelGoal()) {
        this.isGameOver = true;
        this.isVictory = true; // 标记为胜利
        return true;
      }
    } else {
      // 默认胜利条件
      if (this.resources.crystal >= 10) {
        this.isGameOver = true;
        this.isVictory = true; // 标记为胜利
        return true;
      }
    }
    
    // 检查是否所有方块都已消除（胜利条件）
    // 1. 检查场景中是否还有方块
    let hasBlocksInScene = false;
    if (this.cube && this.cube.cubeGroup && this.cube.cubeGroup.children.length > 0) {
        // 排除引力环等非方块对象
        for (let child of this.cube.cubeGroup.children) {
          if (child.userData && !child.userData.isGravityRing) {
            hasBlocksInScene = true;
            break;
          }
        }
    }
    
    // 2. 检查消除槽中是否还有方块
    let hasBlocksInSlots = false;
    this.eliminationSlots.forEach(slot => {
        if (slot.block) {
            hasBlocksInSlots = true;
        }
    });
    
    // 如果场景和槽位都空了，且没有正在飞行的方块（这里简化判断，槽位空即无飞行，因为addBlockToSlot会先占位）
    // 实际上 flyingBlocks 在 main.js 中维护，gameManager 无法直接访问，
    // 但 addBlockToSlot 会立即在 slots 中占位，所以只要 slots 空了，就说明没有飞行方块或者都消除了。
    if (!hasBlocksInScene && !hasBlocksInSlots) {
        this.isGameOver = true;
        this.isVictory = true; // 标记为胜利
        return true;
    }
    
    if (this.countdown <= 0) {
        // 倒计时结束
        this.isGameOver = true;
        return true;
    }

    // 检查卡槽是否已满且没有可消除的
    let filledSlots = 0;
    let hasFlyingBlocks = false; // 是否有正在飞行的方块
    
    this.eliminationSlots.forEach(slot => {
      if (slot.block) {
        filledSlots++;
        // 如果方块还没显示(正在飞行中)，则不应该触发失败判定
        if (slot.block.visible === false) {
          hasFlyingBlocks = true;
        }
      }
    });

    // 如果有方块还在飞行，暂时不判负，等待飞行结束进行消除判定
    if (hasFlyingBlocks) {
      return false;
    }

    if (filledSlots >= this.eliminationSlots.length) {
        // 再次确认没有可消除的 (理论上 checkElimination 会在 update 中先调用)
        // 但为了保险，可以检查一下
        // 如果已满且没有发生消除，则游戏结束
        this.isGameOver = true;
        return true;
    }
    
    return false;
  }
  
  // 检查关卡目标是否完成
  checkLevelGoal() {
    if (!this.levelConfig) return false;
    
    const target = this.levelConfig.target;
    
    // 根据不同的关卡目标进行检查
    if (target.includes('收集')) {
      // 收集资源类型的目标
      if (target.includes('晶体')) {
        const match = target.match(/收集(\d+)个晶体/);
        if (match) {
          const required = parseInt(match[1]);
          return this.resources.crystal >= required;
        }
      } else if (target.includes('金属')) {
        const match = target.match(/收集(\d+)个金属/);
        if (match) {
          const required = parseInt(match[1]);
          return this.resources.metal >= required;
        }
      } else if (target.includes('生态')) {
        const match = target.match(/收集(\d+)个生态/);
        if (match) {
          const required = parseInt(match[1]);
          return this.resources.ecology >= required;
        }
      }
    } else if (target.includes('时间')) {
      // 时间类型的目标
      if (target.includes('存活')) {
        // 只要倒计时还没结束，就继续游戏
        return false;
      }
    }
    
    return false;
  }
  
  // 更新游戏状态
  update(deltaTime) {
      if (this.isPaused || this.isGameOver || this.isTimeFrozen) return { eliminated: false };
      
      // 检查是否需要返回上次的消除信息
      if (this.lastEliminationInfo) {
          const info = this.lastEliminationInfo;
          this.lastEliminationInfo = null;
          return info;
      }
      
      // 更新技能进度
      this.updateSkillProgress(deltaTime * 0.01);
      
      // 更新倒计时 (delta 是毫秒)
      this.countdown = Math.max(0, this.countdown - deltaTime / 1000);
      
      // 检测消除
      const eliminationInfo = this.checkElimination(deltaTime);
      
      // 检测槽位预警
      this.checkSlotWarning();
      
      // 检查游戏结束
      this.checkGameOver();
      
      return eliminationInfo;
  }
}

module.exports = {
  default: GameManager
};