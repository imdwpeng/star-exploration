// 游戏状态管理
class GameManager {
  constructor() {
    // 关卡信息
    this.levelInfo = {
      level: '星际探索',
      target: '收集10个晶体',
      steps: 25,
      maxSteps: 50,
      time: '02:30'
    };
    
    // 资源信息
    this.resources = {
      energy: 75,
      maxEnergy: 100,
      metal: 12,
      crystal: 8,
      ecology: 5
    };
    
    // 待消除槽 (改为8个)
    this.eliminationSlots = new Array(8).fill(null).map(() => ({ block: null, highlight: false }));
    
    // 倒计时 (单位: 秒)
    this.maxCountdown = 60;
    this.countdown = 60;
    
    // 技能进度
    this.skillProgress = 0.6;
    
    // 游戏状态
    this.isGameOver = false;
    this.isPaused = false;
    
    // 历史记录 (用于回溯)
    this.history = [];
  }
  
  // 添加方块到槽位
  addBlockToSlot(block) {
    // 记录操作用于回溯
    this.history.push({
      type: 'addBlock',
      blockData: {
        color: block.userData.color,
        originalPosition: block.userData.position
      }
    });

    // 场上图案奖励检测 (在移除前检测)
    this.checkPatternReward(block);
    
    for (let i = 0; i < this.eliminationSlots.length; i++) {
      if (!this.eliminationSlots[i].block) {
        this.eliminationSlots[i].block = {
          color: '#' + block.userData.color.toString(16).padStart(6, '0'),
          originalBlock: block // 保存原始引用以便后续可能的恢复
        };
        return true;
      }
    }
    return false;
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
      return true;
    }
    return false;
  }
  
  // 检测消除
  checkElimination() {
    const slotBlocks = [];
    this.eliminationSlots.forEach(slot => {
      if (slot.block) {
        slotBlocks.push(slot.block.color);
      }
    });
    
    // 简单的三连检测
    for (let i = 0; i < slotBlocks.length - 2; i++) {
      if (slotBlocks[i] && slotBlocks[i] === slotBlocks[i+1] && slotBlocks[i] === slotBlocks[i+2]) {
        // 消除效果
        for (let j = i; j <= i+2; j++) {
          if (this.eliminationSlots[j].block) {
            this.eliminationSlots[j].block = null;
          }
        }
        
        // 整理槽位 (冒泡填补空缺)
        this.compactSlots();
        
        // 增加倒计时 (规则：增加倒计时)
        this.countdown = Math.min(this.countdown + 5, this.maxCountdown);
        
        // 增加能量 (规则：补充基础能量)
        this.resources.energy = Math.min(this.resources.energy + 10, this.resources.maxEnergy);
        
        // 消除发生，清空回溯历史 (防止状态不一致)
        this.history = [];
        
        return true;
      }
    }
    return false;
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
          // 1. 从槽位中移除方块
          // 需要找到对应的槽位 (这里有点麻烦，因为没有记录 slotIndex)
          // 但我们可以根据颜色和 originalBlock 引用来找
          // 或者简单的策略：从后往前找第一个非空的？
          // 更准确的是：在 addBlockToSlot 时记录 slotIndex
          
          // 遍历槽位找到对应的 block
          let targetSlotIndex = -1;
          for (let i = 0; i < this.eliminationSlots.length; i++) {
              if (this.eliminationSlots[i].block && 
                  this.eliminationSlots[i].block.originalBlock === action.blockData.originalBlock) { // 需要在 history 中保存引用吗？
                  // 注意：history 中保存的是 blockData，没有直接保存 originalBlock 引用
                  // 我们需要一种方式关联。
                  // 简单的做法：撤销最近一次放入的方块。
                  // 实际上消除游戏的撤销通常是撤销“最近一次操作”，如果发生了消除，可能无法撤销。
                  // 这里假设没有发生消除才能撤销，或者发生消除后 history 会被清空？
                  // 简化处理：倒序查找第一个非空槽位，假设就是刚才放入的。
                  // 实际上应该记录 slotIndex。
              }
          }
          
          // 重新实现：查找最后放入的一个方块
          // 实际上如果发生了消除，history 应该怎么处理？
          // 如果消除了，那几个方块已经没了，撤销变得很复杂。
          // 简化规则：一旦发生消除，清空 history，无法回溯。
          // 在 checkElimination 中清空 history。
          
          // 找到最后一个非空槽位（假设玩家是顺序放入的，或者按照某种逻辑）
          // 由于我们有 autoCompact，方块总是靠左。
          // 所以找最右边的方块。
          let lastSlotIndex = -1;
          for (let i = this.eliminationSlots.length - 1; i >= 0; i--) {
              if (this.eliminationSlots[i].block) {
                  lastSlotIndex = i;
                  break;
              }
          }
          
          if (lastSlotIndex >= 0) {
              const slotBlock = this.eliminationSlots[lastSlotIndex].block;
              this.eliminationSlots[lastSlotIndex].block = null;
              
              // 恢复到场景中
              if (slotBlock.originalBlock) {
                  this.cube.cubeGroup.add(slotBlock.originalBlock);
                  // 恢复位置和缩放 (addBlockToSlot 时可能有动画改变了它)
                  // 需要确保 originalBlock 的状态是正确的
                  slotBlock.originalBlock.scale.set(1, 1, 1);
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
      
      // 收集所有颜色
      const colors = activeBlocks.map(block => block.userData.color);
      
      // 洗牌
      for (let i = colors.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [colors[i], colors[j]] = [colors[j], colors[i]];
      }
      
      // 重新赋值
      activeBlocks.forEach((block, index) => {
          const newColor = colors[index];
          block.userData.color = newColor;
          if (Array.isArray(block.material)) {
               block.material.forEach(m => m.color.setHex(newColor));
          } else {
               block.material.color.setHex(newColor);
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
  
  // 检查游戏是否结束
  checkGameOver() {
    if (this.resources.crystal >= 10) {
      // 达成目标
      this.isGameOver = true;
      return true;
    }
    
    if (this.levelInfo.steps >= this.levelInfo.maxSteps) {
      // 步数用尽
      this.isGameOver = true;
      return true;
    }
    
    return false;
  }
  
  // 更新游戏状态
  update(delta) {
    if (this.isPaused || this.isGameOver) return;
    
    // 更新技能进度
    this.updateSkillProgress(delta * 0.01);
    
    // 检测消除
    this.checkElimination();
    
    // 检测槽位预警
    this.checkSlotWarning();
    
    // 检查游戏结束
    this.checkGameOver();
  }
}

export default GameManager;