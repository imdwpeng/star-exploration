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
    
    // 待消除槽
    this.eliminationSlots = [
      { block: null, highlight: false },
      { block: null, highlight: false },
      { block: null, highlight: false },
      { block: null, highlight: false },
      { block: null, highlight: false },
      { block: null, highlight: false },
      { block: null, highlight: false }
    ];
    
    // 技能进度
    this.skillProgress = 0.6;
    
    // 游戏状态
    this.isGameOver = false;
    this.isPaused = false;
  }
  
  // 添加方块到槽位
  addBlockToSlot(block) {
    for (let i = 0; i < this.eliminationSlots.length; i++) {
      if (!this.eliminationSlots[i].block) {
        this.eliminationSlots[i].block = {
          color: '#' + block.userData.color.toString(16).padStart(6, '0')
        };
        return true;
      }
    }
    return false;
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
        
        // 增加资源
        this.resources.crystal += 1;
        this.resources.energy = Math.min(this.resources.energy + 10, this.resources.maxEnergy);
        
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
      case 'hint':
        // 提示技能
        if (this.resources.energy >= 20) {
          this.resources.energy -= 20;
          return true;
        }
        break;
      case 'undo':
        // 撤回技能
        if (this.resources.energy >= 15) {
          this.resources.energy -= 15;
          return true;
        }
        break;
      case 'pause':
        // 暂停游戏
        this.isPaused = !this.isPaused;
        return true;
    }
    return false;
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