class InputManager {
  constructor(game) {
    this.game = game;
    this.isDragging = false;
    this.previousTouchPosition = { x: 0, y: 0 };
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.mouseDown = false;
  }

  initEventListeners() {
    const canvas = (typeof window !== 'undefined' && window.canvas) ? window.canvas : GameGlobal.screencanvas;
    
    // 触摸事件处理
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));
    
    // 鼠标事件处理（用于调试）
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
  }

  handleTap(clientX, clientY) {
    // 检查是否点击了消除槽位
    if (this.checkEliminationSlots(clientX, clientY)) {
      return;
    }
    
    // 检查是否点击了功能按钮
    if (this.checkFunctionButtons(clientX, clientY)) {
      return;
    }
    
    // 检查是否点击了底部操作按钮
    if (this.checkBottomActions(clientX, clientY)) {
      return;
    }
    
    // 使用场景管理器处理点击事件
    this.game.sceneManager.handleTap(clientX, clientY);
  }

  checkEliminationSlots(x, y) {
    const slots = this.game.gameManager.eliminationSlots;
    const slotWidth = 40; // 缩小一点以放下8个
    const slotHeight = 40;
    const gap = 5;
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * gap;
    const startX = (this.game.windowWidth - totalWidth) / 2;
    // 调整到倒计时条上方
    const startY = this.game.windowHeight - 80 - 20 - slotHeight;
    
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
      if (this.game.gameManager.eliminationSlots[index].block) {
        // this.game.gameManager.removeBlockFromSlot(index);
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
    const startY = this.game.windowHeight - 80 - 10 - slotHeight - 10 - 60; // 在待消除槽上方
    
    const btnOffsetY = 0;
    const btnStartY = startY + btnOffsetY; // 按钮实际起始Y坐标
    
    // 上
    if (x >= btnStartX + btnSize && x <= btnStartX + btnSize * 2 && y >= btnStartY && y <= btnStartY + btnSize) {
      this.game.cubeManager.rotate('up');
      return true;
    }
    
    // 左
    if (x >= btnStartX && x <= btnStartX + btnSize && y >= btnStartY + btnSize && y <= btnStartY + btnSize * 2) {
      this.game.cubeManager.rotate('left');
      return true;
    }
    
    // 右
    if (x >= btnStartX + btnSize * 2 && x <= btnStartX + btnSize * 3 && y >= btnStartY + btnSize && y <= btnStartY + btnSize * 2) {
      this.game.cubeManager.rotate('right');
      return true;
    }
    
    // 下
    if (x >= btnStartX + btnSize && x <= btnStartX + btnSize * 2 && y >= btnStartY + btnSize * 2 && y <= btnStartY + btnSize * 3) {
      this.game.cubeManager.rotate('down');
      return true;
    }
    
    // 技能按钮已移除或移到底部，这里不再处理
    
    return false;
  }

  checkBottomActions(x, y) {
    const btnWidth = (this.game.windowWidth - 60) / 3;
    const btnHeight = 40;
    const btnY = this.game.windowHeight - 60;
    
    // 检查是否在按钮区域
    if (y < btnY || y > btnY + btnHeight) return false;
    
    // 回溯
    if (x >= 20 && x <= 20 + btnWidth) {
      this.game.gameManager.useSkill('undo');
      return true;
    }
    
    // 扫描
    if (x >= 20 + btnWidth + 10 && x <= 20 + btnWidth * 2 + 10) {
      this.game.gameManager.useSkill('scan');
      return true;
    }
    
    // 重组
    if (x >= 20 + btnWidth * 2 + 20 && x <= 20 + btnWidth * 3 + 20) {
      this.game.gameManager.useSkill('shuffle');
      return true;
    }
    
    return false;
  }

  onTouchStart(event) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isDragging = false;
    this.previousTouchPosition = { x: touch.clientX, y: touch.clientY };
    
    // 关卡选择场景处理滚动
    if (this.game.sceneManager && this.game.sceneManager.currentSceneName === 'levelSelect') {
      const levelSelectScene = this.game.sceneManager.scenes.levelSelect;
      if (levelSelectScene && levelSelectScene.handleTouchStart) {
        levelSelectScene.handleTouchStart(touch.clientX, touch.clientY);
      }
    }
  }
  
  onTouchMove(event) {
    const touch = event.touches[0];
    
    // 关卡选择场景处理滚动
    if (this.game.sceneManager && this.game.sceneManager.currentSceneName === 'levelSelect') {
      const levelSelectScene = this.game.sceneManager.scenes.levelSelect;
      if (levelSelectScene && levelSelectScene.handleTouchMove) {
        levelSelectScene.handleTouchMove(touch.clientX, touch.clientY);
        return; // 滚动时不旋转魔方
      }
    }
    
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
      
      this.game.cubeManager.cubeGroup.rotation.y += deltaMove.x * 0.01;
      this.game.cubeManager.cubeGroup.rotation.x += deltaMove.y * 0.01;
      
      this.previousTouchPosition = { x: touch.clientX, y: touch.clientY };
    }
  }
  
  onTouchEnd(event) {
    // 关卡选择场景处理滚动结束
    if (this.game.sceneManager && this.game.sceneManager.currentSceneName === 'levelSelect') {
      const levelSelectScene = this.game.sceneManager.scenes.levelSelect;
      if (levelSelectScene && levelSelectScene.handleTouchEnd) {
        levelSelectScene.handleTouchEnd();
      }
    }
    
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
        
        this.game.cubeManager.cubeGroup.rotation.y += deltaMove.x * 0.01;
        this.game.cubeManager.cubeGroup.rotation.x += deltaMove.y * 0.01;
        
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
}

module.exports = {
  default: InputManager
};