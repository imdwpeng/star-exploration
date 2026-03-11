// 游戏场景
class GameScene {
  constructor(game) {
    this.game = game;
  }

  // 进入场景
  enter() {
    console.log('进入游戏场景');
  }

  // 退出场景
  exit() {
    console.log('退出游戏场景');
  }

  // 更新场景
  update(deltaTime) {
    const time = Date.now() * 0.001;

    // 1. 魔方悬浮动画
    if (this.game.cubeGroup && !this.game.isDragging) {
        // 上下轻微浮动 (振幅 2，频率 1)
        this.game.cubeGroup.position.y = Math.sin(time) * 2;
        // 缓慢自转 (增加一点动态感)
        this.game.cubeGroup.rotation.y += 0.001;
        this.game.cubeGroup.rotation.x += 0.0005;
        
        // 方块呼吸灯效果
        if (this.game.blocks) {
            this.game.blocks.forEach(block => {
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
    } else if (this.game.blocks) {
        // 即使在拖拽时，也保持呼吸灯效果
         this.game.blocks.forEach(block => {
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

    // 更新游戏状态
    const eliminationInfo = this.game.gameManager.update(deltaTime);
    if (eliminationInfo && eliminationInfo.eliminated) {
        // 播放消除特效
        const slotCount = 8;
        const padding = 20;
        const gap = 5;
        const availableWidth = this.game.windowWidth - padding * 2;
        const slotWidth = Math.floor((availableWidth - (slotCount - 1) * gap) / slotCount);
        const slotHeight = slotWidth;
        const totalWidth = slotCount * slotWidth + (slotCount - 1) * gap;
        const startX = (this.game.windowWidth - totalWidth) / 2;
        const startY = this.game.windowHeight - 80 - 20 - slotHeight; 
        
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
            this.game.particleManager.createExplosion(centerX, centerY, color);
        }
    }
    
    // 更新粒子
    this.game.particleManager.updateParticles();
    
    // 更新飞行方块
    this.game.flyingBlockManager.updateFlyingBlocks();
  }

  // 渲染场景
  render() {
    const ctx = this.game.uiCanvas.getContext('2d');
    
    ctx.save();
    // 缩放以匹配逻辑像素
    ctx.scale(this.game.pixelRatio, this.game.pixelRatio);
    
    // 绘制顶部资源栏
    this.game.uiManager.drawTopBar(ctx);
    
    // 绘制倒计时进度条
    this.game.uiManager.drawCountdownBar(ctx);
    
    // 绘制待消除槽
    this.game.uiManager.drawEliminationSlots(ctx);
    
    // 绘制飞行方块
    this.game.uiManager.drawFlyingBlocks(ctx);
    
    // 绘制底部快捷操作
    this.game.uiManager.drawBottomActions(ctx);
    
    // 显示游戏结束或暂停界面
    if (this.game.gameManager.isGameOver) {
      this.game.uiManager.showGameOver();
    } else if (this.game.gameManager.isPaused) {
      this.game.uiManager.showPause();
    }
    
    ctx.restore();
  }

  // 处理点击事件
  handleTap(x, y) {
    // 如果游戏结束，检查是否点击了重新开始按钮
    if (this.game.gameManager.isGameOver) {
      const btnX = this.game.windowWidth / 2 - 80;
      const btnY = this.game.windowHeight / 2 + 60;
      const btnWidth = 160;
      const btnHeight = 40;
      
      if (x >= btnX && x <= btnX + btnWidth &&
          y >= btnY && y <= btnY + btnHeight) {
        // 重新开始游戏
        this.game.initGame();
        return;
      }
      return; // 游戏结束时不响应其他点击
    }

    // 如果游戏暂停，检查是否点击了继续按钮
    if (this.game.gameManager.isPaused) {
       const btnX = this.game.windowWidth / 2 - 80;
       const btnY = this.game.windowHeight / 2;
       const btnWidth = 160;
       const btnHeight = 40;
       
       if (x >= btnX && x <= btnX + btnWidth &&
           y >= btnY && y <= btnY + btnHeight) {
          this.game.gameManager.isPaused = false;
       }
       return;
    }

    // 检查是否点击了底部快捷操作按钮
    if (this.game.inputManager.checkBottomActions(x, y)) {
      return;
    }
    
    // 检查是否点击了待消除槽
    if (this.game.inputManager.checkEliminationSlots && this.game.inputManager.checkEliminationSlots(x, y)) {
      return;
    }
    
    // 检查是否点击了魔方方块
    // 需要将屏幕坐标转换为 normalized device coordinates (-1 to +1)
    const rect = { left: 0, top: 0, width: this.game.windowWidth, height: this.game.windowHeight };
    // 如果是在 web 环境，需要获取 canvas 的 rect
    if (typeof window !== 'undefined' && window.canvas && window.canvas.getBoundingClientRect) {
        const r = window.canvas.getBoundingClientRect();
        rect.left = r.left;
        rect.top = r.top;
        rect.width = r.width;
        rect.height = r.height;
    }

    const mouse = new this.game.THREE.Vector2();
    mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

    if (this.game.cubeManager && this.game.cubeManager.checkClick) {
      this.game.cubeManager.checkClick(mouse);
    }
  }
}

module.exports = {
  default: GameScene
};