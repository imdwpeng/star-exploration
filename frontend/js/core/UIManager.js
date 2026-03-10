// UI管理器 - 负责游戏UI的绘制和管理
class UIManager {
  constructor(game) {
    this.game = game;
  }

  // 绘制UI
  drawUI() {
    const ctx = this.game.uiCanvas.getContext('2d');
    
    // 清除上一帧内容
    ctx.clearRect(0, 0, this.game.uiCanvas.width, this.game.uiCanvas.height);
    
    // 使用场景管理器渲染场景
    this.game.sceneManager.render();
    
    // 标记纹理需要更新
    this.game.uiTexture.needsUpdate = true;
  }

  // 绘制全息风格面板辅助函数
  drawHolographicPanel(ctx, x, y, width, height, alpha = 0.8) {
    this.game.canvasUtils.drawHolographicPanel(ctx, x, y, width, height, alpha);
  }
  
  // 绘制六边形辅助函数
  drawHexagon(ctx, x, y, r, fillColor, strokeColor) {
    this.game.canvasUtils.drawHexagon(ctx, x, y, r, fillColor, strokeColor);
  }

  // 绘制圆角矩形辅助函数 (替代六边形)
  drawRoundedRect(ctx, x, y, size, radius, color, strokeColor = null) {
    this.game.canvasUtils.drawRoundedRect(ctx, x, y, size, radius, color, strokeColor);
  }

  drawIconOnSquare(ctx, x, y, size, type) {
    // 绘制正方形背景
    const colors = [
      '#00ffff', '#00ff00', '#9C88FF', '#00D4FF', '#00FFAB', '#95a5a6',
      '#FF00FF', '#FFD32A', '#3742FA', '#00D4FF', '#FF9A3C', '#00D8D6',
      '#FF4757', '#ffffff', '#FF9A3C', '#3B3B98', '#00D4FF', '#00D8D6',
      '#ffffff', '#FFFF00', '#34495e', '#2ecc71', '#FF4757', '#E6E6E6'
    ];
    // 防止数组越界
    const color = colors[type % colors.length] || '#ffffff';
    
    // 1. 绘制统一的深色背景，与 3D 纹理底色一致 (增加渐变)
    const halfSize = size / 2;
    const bgGrad = ctx.createLinearGradient(x, y - halfSize, x, y + halfSize);
    bgGrad.addColorStop(0, '#2b323c');
    bgGrad.addColorStop(1, '#1a1a2e');
    
    this.drawRoundedRect(ctx, x, y, size, 5, null); // 仅路径
    ctx.fillStyle = bgGrad;
    ctx.fill();
    
    // 2. 模拟材质染色效果
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.3; // 降低透明度，避免颜色过重
    this.drawRoundedRect(ctx, x, y, size, 5, color);
    ctx.restore();
    
    // 3. 绘制图案 (增加投影)
    const r = size / 2 * 0.7; // 稍微缩小
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    this.game.canvasUtils.drawPattern(ctx, x, y, r, type);
    ctx.restore();
    
    // 4. 绘制发光边框 (模拟 Emissive)
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, x, y, size, 5, null, color);
    ctx.restore();
    
    // 5. 玻璃高光
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const glassGrad = ctx.createLinearGradient(x - halfSize, y - halfSize, x + halfSize, y + halfSize);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    glassGrad.addColorStop(0.5, 'transparent');
    glassGrad.addColorStop(1, 'transparent');
    this.drawRoundedRect(ctx, x, y, size, 5, null);
    ctx.fillStyle = glassGrad;
    ctx.fill();
    ctx.restore();
  }

  drawFlyingBlocks(ctx) {
    this.game.flyingBlockManager.drawFlyingBlocks(ctx);
  }
  
  drawTopBar(ctx) {
    const resources = this.game.gameManager.resources;
    const levelInfo = this.game.gameManager.levelInfo;
    
    // 考虑刘海屏高度
    const topPadding = this.game.safeArea.top || 20;
    // 增加高度以容纳两行信息
    const barHeight = 85 + topPadding;
    
    // 背景 - 磨砂玻璃面板
    this.drawHolographicPanel(ctx, 0, 0, this.game.windowWidth, barHeight, 0.8);
    
    // 文字发光效果
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 5;
    
    ctx.fillStyle = '#E6E6E6'; // 太空灰
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // 第一行：仅关卡名 (注意刘海屏)
    const y1 = topPadding + 20;
    ctx.fillText(`${levelInfo.level}`, 20, y1);
    
    // 第二行：资源信息
    const y2 = topPadding + 55;
    const iconSize = 16;
    const spacing = (this.game.windowWidth - 10) / 4;
    
    ctx.font = '12px Arial'; // 稍微减小字体以适应名称+图标
    
    // 1. 能量 (Energy)
    this.drawResourceIcon(ctx, 10, y2, iconSize, 'energy');
    ctx.fillText(`能量: ${Math.floor(resources.energy)}`, 10 + iconSize + 2, y2);
    
    // 2. 金属 (Metal)
    this.drawResourceIcon(ctx, 10 + spacing, y2, iconSize, 'metal');
    ctx.fillText(`金属: ${resources.metal}`, 10 + spacing + iconSize + 2, y2);
    
    // 3. 晶体 (Crystal)
    this.drawResourceIcon(ctx, 10 + spacing * 2, y2, iconSize, 'crystal');
    ctx.fillText(`晶体: ${resources.crystal}`, 10 + spacing * 2 + iconSize + 2, y2);
    
    // 4. 生态 (Ecology)
    this.drawResourceIcon(ctx, 10 + spacing * 3, y2, iconSize, 'ecology');
    ctx.fillText(`生态: ${resources.ecology}`, 10 + spacing * 3 + iconSize + 2, y2);
    
    ctx.shadowBlur = 0;
  }

  drawResourceIcon(ctx, x, y, size, type) {
    ctx.save();
    // 将 x 视为图标左边界，y 视为中心
    ctx.translate(x + size / 2, y);
    const r = size / 2;
    
    switch(type) {
        case 'energy': // 能量核心 - 蓝白渐变球
            const gradE = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r);
            gradE.addColorStop(0, '#ffffff');
            gradE.addColorStop(0.5, '#00ffff');
            gradE.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = gradE;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI*2);
            ctx.fill();
            // 核心亮点
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r*0.3, 0, Math.PI*2);
            ctx.fill();
            break;
            
        case 'metal': // 金属资源 - 银灰色六边形
            ctx.fillStyle = '#A0A0A0';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for(let i=0; i<6; i++) {
                const angle = (Math.PI/3) * i;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if(i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 金属光泽线
            ctx.beginPath();
            ctx.moveTo(-r*0.5, -r*0.5);
            ctx.lineTo(r*0.5, r*0.5);
            ctx.stroke();
            break;
            
        case 'crystal': // 晶体资源 - 蓝色棱形
            ctx.fillStyle = '#00D4FF';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(r, 0);
            ctx.lineTo(0, r);
            ctx.lineTo(-r, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // 晶体内部线条
            ctx.beginPath();
            ctx.moveTo(0, -r);
            ctx.lineTo(0, r);
            ctx.moveTo(-r, 0);
            ctx.lineTo(r, 0);
            ctx.stroke();
            break;
            
        case 'ecology': // 生态资源 - 绿色叶片/双螺旋
            ctx.fillStyle = '#00FF88';
            ctx.shadowColor = '#00FF88';
            ctx.shadowBlur = 5;
            // 绘制一个简单的双叶片形状
            ctx.beginPath();
            ctx.ellipse(-r*0.3, 0, r*0.4, r*0.8, Math.PI/4, 0, Math.PI*2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(r*0.3, 0, r*0.4, r*0.8, -Math.PI/4, 0, Math.PI*2);
            ctx.fill();
            break;
    }
    ctx.restore();
  }
  
  drawCountdownBar(ctx) {
    const { countdown, maxCountdown } = this.game.gameManager;
    const progress = Math.max(0, countdown / maxCountdown);
    
    // 位置：在底部操作栏上方，待消除槽下方
    // 底部操作栏背景高60，y=H-70
    // 倒计时条留出间隔
    const barHeight = 8;
    const barY = this.game.windowHeight - 80; 
    
    // 绘制背景槽
    this.drawHolographicPanel(ctx, 20, barY, this.game.windowWidth - 40, barHeight, 0.3);
    
    // 绘制进度
    // 颜色随时间变化：金属蓝 -> 晶黄 -> 能量红
    // 初始(高能量)使用蓝色，代表平稳
    ctx.shadowBlur = 10; // 进度条发光
    if (progress > 0.5) {
        ctx.fillStyle = '#3742FA'; // 金属蓝
        ctx.shadowColor = '#3742FA';
    } else if (progress > 0.2) {
        ctx.fillStyle = '#FFD32A'; // 晶黄
        ctx.shadowColor = '#FFD32A';
    } else {
        ctx.fillStyle = '#FF4757'; // 能量红
        ctx.shadowColor = '#FF4757';
    }
    
    ctx.fillRect(20, barY, (this.game.windowWidth - 40) * progress, barHeight);
    
    // 恢复阴影
    ctx.shadowBlur = 0;
    
    // 绘制全屏红色闪烁警告
    if (progress <= 0.2) {
        // 使用相对时间以避免大数问题
        const time = Date.now() / 200; 
        const pulse = (Math.sin(time) + 1) / 2; // 0~1
        const alpha = pulse * 0.3; // 最大透明度 0.3
        
        ctx.save();
        // 确保重置变换矩阵，因为 drawCountdownBar 是在 scale 之后调用的
        // 我们需要全屏绘制，所以暂时忽略 scale，或者使用逻辑坐标
        // 这里的 context 已经被 scale 过了，所以使用逻辑宽高
        
        // 1. 全屏红色叠加 (模拟紧急状态)
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, this.game.windowWidth, this.game.windowHeight);
        
        // 2. 边缘晕影 (Vignette) - 增强压迫感
        // 创建径向渐变
        // 注意：gradient 的坐标是基于 canvas 坐标系的，如果 context 被 scale 了，需要调整
        const gradient = ctx.createRadialGradient(
            this.game.windowWidth / 2, this.game.windowHeight / 2, this.game.windowHeight / 3,
            this.game.windowWidth / 2, this.game.windowHeight / 2, this.game.windowHeight
        );
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)'); // 中心透明
        gradient.addColorStop(1, `rgba(255, 0, 0, ${pulse * 0.5})`); // 边缘更红
        
        ctx.fillStyle = gradient;
        // 覆盖全屏
        // 为了确保覆盖整个屏幕（包括可能的刘海区域），使用更大的矩形
        ctx.fillRect(-this.game.windowWidth/2, -this.game.windowHeight/2, this.game.windowWidth*2, this.game.windowHeight*2);
        
        ctx.restore();
    }

    // 绘制文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(countdown)}s`, this.game.windowWidth / 2, barY - 5);
  }
  
  drawLevelInfo(ctx) {
    // 关卡信息已合并到 TopBar，此方法不再需要或清空内容
  }
  
  drawEliminationSlots(ctx) {
    const slots = this.game.gameManager.eliminationSlots;
    const slotWidth = 40; // 缩小一点以放下8个
    const slotHeight = 40;
    const gap = 5;
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * gap;
    const startX = (this.game.windowWidth - totalWidth) / 2;
    // 调整到倒计时条上方
    // 倒计时条在 H-80，留出间隔 20
    const startY = this.game.windowHeight - 80 - 20 - slotHeight;
    
    // 绘制整体面板背景 (容纳所有槽位)
    const panelPadding = 5;
    this.drawHolographicPanel(
        ctx, 
        startX - panelPadding, 
        startY - panelPadding, 
        totalWidth + panelPadding * 2, 
        slotHeight + panelPadding * 2,
        0.5
    );
    
    for (let i = 0; i < slots.length; i++) {
      const x = startX + i * (slotWidth + gap) + slotWidth / 2;
      const y = startY + slotHeight / 2;
      const size = slotWidth; // 使用宽度作为尺寸
      
      // 绘制槽位边框 (正方形/圆角矩形)
      // 空槽：半透明白色边框 (rgba(255, 255, 255, 0.3))
      // 警告：红色闪烁
      let strokeColor = 'rgba(255, 255, 255, 0.3)';
      if (slots[i].highlight) {
          const time = Date.now() / 200;
          const alpha = (Math.sin(time) + 1) / 2;
          strokeColor = `rgba(255, 0, 0, ${alpha})`;
      }
      
      // 绘制空槽位
      this.drawRoundedRect(ctx, x, y, size, 5, null, strokeColor);
      
      // 绘制槽位中的方块 (缩略图)
      if (slots[i].block && slots[i].block.visible !== false) {
        // 重置阴影，避免干扰图案细节
        ctx.shadowBlur = 0;
        
        // 绘制图案 (复用 createTexture 中的逻辑，或者简化绘制)
        // 注意：slots[i].block 是 GameManager 创建的包装对象
        // slots[i].block.originalBlock 才是 Three.js Mesh 对象
        const mesh = slots[i].block.originalBlock;
        if (mesh && mesh.userData) {
            // 使用 drawIconOnSquare 替代 drawIconOnHexagon
            this.drawIconOnSquare(ctx, x, y, size, mesh.userData.type);
        }
        
        ctx.shadowBlur = 0;
      }
    }
  }
  
  drawFunctionBars(ctx) {
    // 绘制方向按钮 (仅保留方向控制)
    const btnSize = 40;
    const btnStartX = 30;
    // 待消除槽高度 40，底部按钮高度 60，间隔 10
    // 倒计时条高度 8，间隔 15
    // startY 在倒计时条上方
    const slotHeight = 40;
    const startY = this.game.windowHeight - 80 - 10 - slotHeight - 10 - 60; // 调整位置
    
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(10, startY, 150, 60);
    
    const btnOffsetY = 10;
    
    // 上
    this.drawControlButton(ctx, btnStartX + btnSize, startY + btnOffsetY, btnSize, btnSize, '↑');
    // 左
    this.drawControlButton(ctx, btnStartX, startY + btnOffsetY + btnSize, btnSize, btnSize, '←');
    // 右
    this.drawControlButton(ctx, btnStartX + btnSize * 2, startY + btnOffsetY + btnSize, btnSize, btnSize, '→');
    // 下
    this.drawControlButton(ctx, btnStartX + btnSize, startY + btnOffsetY + btnSize * 2, btnSize, btnSize, '↓');
  }
  
  drawControlButton(ctx, x, y, width, height, text) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
  }
  
  drawBottomActions(ctx) {
    const btnWidth = (this.game.windowWidth - 60) / 3;
    const btnHeight = 40;
    const btnY = this.game.windowHeight - 60;
    
    // 移除底部的全息面板背景，直接绘制按钮
    
    this.drawButton(ctx, 20, btnY, btnWidth, btnHeight, '回溯');
    this.drawButton(ctx, 20 + btnWidth + 10, btnY, btnWidth, btnHeight, '扫描');
    this.drawButton(ctx, 20 + btnWidth * 2 + 20, btnY, btnWidth, btnHeight, '重组');
  }

  drawButton(ctx, x, y, width, height, text) {
    // 按钮背景 - 赛博粉 (#FF2E63)
    ctx.fillStyle = 'rgba(255, 46, 99, 0.3)'; // 默认半透明
    ctx.fillRect(x, y, width, height);
    
    // 按钮边框 - 霓虹蓝 (#00D4FF)
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    
    // 按钮文字 - 太空灰
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 5;
    
    ctx.fillStyle = '#E6E6E6';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
    
    ctx.shadowBlur = 0;
  }

  showGameOver() {
    const ctx = this.game.uiCanvas.getContext('2d');
    ctx.save();
    ctx.scale(this.game.pixelRatio, this.game.pixelRatio);
    
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.game.windowWidth, this.game.windowHeight);
    
    // 游戏结束文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let title = '游戏结束';
    if (this.game.gameManager.isVictory) {
        title = '恭喜通关！';
        ctx.fillStyle = '#00ff00';
    }
    
    ctx.fillText(title, this.game.windowWidth / 2, this.game.windowHeight / 2 - 50);
    
    // 显示分数
    ctx.font = '16px Arial';
    ctx.fillStyle = '#ffffff';
    if (this.game.gameManager.isVictory) {
        ctx.fillText(`通关用时: ${Math.floor(60 - this.game.gameManager.countdown)}s`, this.game.windowWidth / 2, this.game.windowHeight / 2);
    } else {
        ctx.fillText(`收集晶体: ${this.game.gameManager.resources.crystal}/10`, this.game.windowWidth / 2, this.game.windowHeight / 2);
    }
    
    // 重新开始按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(this.game.windowWidth / 2 - 80, this.game.windowHeight / 2 + 60, 160, 40);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.game.windowWidth / 2 - 80, this.game.windowHeight / 2 + 60, 160, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('重新开始', this.game.windowWidth / 2, this.game.windowHeight / 2 + 80);
    
    ctx.restore();
  }
  
  showPause() {
    const ctx = this.game.uiCanvas.getContext('2d');
    ctx.save();
    ctx.scale(this.game.pixelRatio, this.game.pixelRatio);
    
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, this.game.windowWidth, this.game.windowHeight);
    
    // 暂停文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏暂停', this.game.windowWidth / 2, this.game.windowHeight / 2 - 30);
    
    // 继续按钮
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(this.game.windowWidth / 2 - 80, this.game.windowHeight / 2, 160, 40);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.game.windowWidth / 2 - 80, this.game.windowHeight / 2, 160, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText('继续游戏', this.game.windowWidth / 2, this.game.windowHeight / 2 + 20);
    
    ctx.restore();
  }
}

module.exports = {
  default: UIManager
};