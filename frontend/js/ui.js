// UI管理
class UI {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.bindEvents();
  }
  
  bindEvents() {
    // 触摸事件处理
    canvas.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;
      
      this.handleTouch(x, y);
    });
  }
  
  handleTouch(x, y) {
    // 检测是否点击了功能按钮
    if (this.isTouchingFunctionButton(x, y)) return;
    
    // 检测是否点击了底部快捷操作
    if (this.isTouchingBottomAction(x, y)) return;
    
    // 检测是否点击了待消除槽
    if (this.isTouchingEliminationSlot(x, y)) return;
    
    // 检测是否点击了魔方区域
    if (this.isTouchingCubeArea(x, y)) {
      // 这里应该处理魔方的点击事件
    }
  }
  
  isTouchingFunctionButton(x, y) {
    const btnSize = 30;
    const btnStartX = 30;
    const btnStartY = 150;
    
    // 上
    if (x >= btnStartX + btnSize && x <= btnStartX + btnSize * 2 &&
        y >= btnStartY && y <= btnStartY + btnSize) {
      this.gameManager.cube.rotate('up');
      return true;
    }
    
    // 左
    if (x >= btnStartX && x <= btnStartX + btnSize &&
        y >= btnStartY + btnSize && y <= btnStartY + btnSize * 2) {
      this.gameManager.cube.rotate('left');
      return true;
    }
    
    // 右
    if (x >= btnStartX + btnSize * 2 && x <= btnStartX + btnSize * 3 &&
        y >= btnStartY + btnSize && y <= btnStartY + btnSize * 2) {
      this.gameManager.cube.rotate('right');
      return true;
    }
    
    // 下
    if (x >= btnStartX + btnSize && x <= btnStartX + btnSize * 2 &&
        y >= btnStartY + btnSize * 2 && y <= btnStartY + btnSize * 3) {
      this.gameManager.cube.rotate('down');
      return true;
    }
    
    return false;
  }
  
  isTouchingBottomAction(x, y) {
    const btnWidth = (canvas.width - 40) / 3;
    const btnStartY = canvas.height - 50;
    
    // 自动排序
    if (x >= 20 && x <= 20 + btnWidth &&
        y >= btnStartY && y <= btnStartY + 30) {
      this.gameManager.autoSort();
      return true;
    }
    
    // 高亮图案
    if (x >= 20 + btnWidth + 10 && x <= 20 + btnWidth * 2 + 10 &&
        y >= btnStartY && y <= btnStartY + 30) {
      this.gameManager.cube.highlightBlocks();
      return true;
    }
    
    // 使用道具
    if (x >= 20 + btnWidth * 2 + 20 && x <= 20 + btnWidth * 3 + 20 &&
        y >= btnStartY && y <= btnStartY + 30) {
      this.gameManager.useItem('bomb');
      return true;
    }
    
    return false;
  }
  
  isTouchingEliminationSlot(x, y) {
    const slotWidth = 60;
    const slotHeight = 60;
    const startX = (canvas.width - slotWidth * 7 - 10 * 6) / 2;
    const startY = 70;
    
    for (let i = 0; i < 7; i++) {
      const slotX = startX + i * (slotWidth + 10);
      if (x >= slotX && x <= slotX + slotWidth &&
          y >= startY && y <= startY + slotHeight) {
        // 点击了槽位，移除方块
        if (this.gameManager.eliminationSlots[i].block) {
          this.gameManager.eliminationSlots[i].block = null;
        }
        return true;
      }
    }
    
    return false;
  }
  
  isTouchingCubeArea(x, y) {
    const cubeAreaStartX = 10;
    const cubeAreaStartY = 140;
    const cubeAreaWidth = canvas.width - 20;
    const cubeAreaHeight = 200;
    
    return x >= cubeAreaStartX && x <= cubeAreaStartX + cubeAreaWidth &&
           y >= cubeAreaStartY && y <= cubeAreaStartY + cubeAreaHeight;
  }
  
  // 显示游戏结束界面
  showGameOver() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 游戏结束文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 50);
    
    // 显示分数
    ctx.font = '16px Arial';
    ctx.fillText(`收集晶体: ${this.gameManager.resources.crystal}/10`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`剩余步数: ${this.gameManager.levelInfo.maxSteps - this.gameManager.levelInfo.steps}`, canvas.width / 2, canvas.height / 2 + 30);
    
    // 重新开始按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(canvas.width / 2 - 80, canvas.height / 2 + 60, 160, 40);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 80, canvas.height / 2 + 60, 160, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('重新开始', canvas.width / 2, canvas.height / 2 + 80);
    
    ctx.restore();
  }
  
  // 显示暂停界面
  showPause() {
    const ctx = canvas.getContext('2d');
    ctx.save();
    
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 暂停文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2 - 30);
    
    // 继续按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(canvas.width / 2 - 80, canvas.height / 2, 160, 40);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 80, canvas.height / 2, 160, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('继续游戏', canvas.width / 2, canvas.height / 2 + 20);
    
    ctx.restore();
  }
}

export default UI;