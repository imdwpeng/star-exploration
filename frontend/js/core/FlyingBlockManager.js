class FlyingBlockManager {
  constructor(game) {
    this.game = game;
    this.flyingBlocks = [];
  }

  addFlyingBlock(block) {
    this.flyingBlocks.push(block);
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
            
            this.game.particleManager.createTrailParticle(cx, cy, fb.color);
        }
        
        if (progress >= 1) {
            // 动画结束
            this.flyingBlocks.splice(i, 1);
            
            // 找到对应的槽位方块并显示
            let found = false;
            for (let j = 0; j < this.game.gameManager.eliminationSlots.length; j++) {
                const slot = this.game.gameManager.eliminationSlots[j];
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
        this.game.uiManager.drawIconOnSquare(ctx, currentX, currentY, size, fb.type);
    });
  }

  clearFlyingBlocks() {
    this.flyingBlocks = [];
  }
}

module.exports = {
  default: FlyingBlockManager
};