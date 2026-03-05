// 渲染管理
class Render {
  constructor() {
    // 获取微信小游戏的Canvas
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    
    // 初始化WebGL渲染器
    this.initWebGLRenderer();
    
    // 游戏尺寸
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }
  
  initWebGLRenderer() {
    // 创建WebGL渲染器
    this.webglRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      canvas: this.canvas
    });
    this.webglRenderer.setSize(this.width, this.height);
  }
  
  render(scene, camera) {
    // 渲染3D场景
    if (scene && camera) {
      this.webglRenderer.render(scene, camera);
    }
  }
  
  clear() {
    // 清空Canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
  
  // 绘制2D UI
  drawUI(gameManager) {
    this.ctx.save();
    
    // 绘制关卡信息
    this.drawLevelInfo(gameManager);
    
    // 绘制待消除槽
    this.drawEliminationSlots(gameManager);
    
    // 绘制功能栏
    this.drawFunctionBars(gameManager);
    
    // 绘制底部快捷操作
    this.drawBottomActions();
    
    this.ctx.restore();
  }
  
  drawLevelInfo(gameManager) {
    const levelInfo = gameManager.levelInfo;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(10, 10, this.width - 20, 40);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    
    this.ctx.fillText(`关卡：${levelInfo.level}`, 20, 35);
    this.ctx.fillText(`目标：${levelInfo.target}`, 120, 35);
    this.ctx.fillText(`步数：${levelInfo.steps}/${levelInfo.maxSteps}`, 240, 35);
    this.ctx.fillText(`时间：${levelInfo.time}`, 360, 35);
  }
  
  drawEliminationSlots(gameManager) {
    const slots = gameManager.eliminationSlots;
    const slotWidth = 60;
    const slotHeight = 60;
    const startX = (this.width - slotWidth * 7 - 10 * 6) / 2;
    const startY = 70;
    
    for (let i = 0; i < slots.length; i++) {
      const x = startX + i * (slotWidth + 10);
      
      // 绘制槽位边框
      this.ctx.strokeStyle = slots[i].highlight ? '#ff0000' : 'rgba(255, 255, 255, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, startY, slotWidth, slotHeight);
      
      // 绘制槽位编号
      this.ctx.fillStyle = '#ff6600';
      this.ctx.beginPath();
      this.ctx.arc(x + slotWidth - 10, startY + 10, 10, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(i + 1, x + slotWidth - 10, startY + 10);
      
      // 绘制槽位中的方块
      if (slots[i].block) {
        this.ctx.fillStyle = slots[i].block.color;
        this.ctx.fillRect(x + 2, startY + 2, slotWidth - 4, slotHeight - 4);
      }
    }
  }
  
  drawFunctionBars(gameManager) {
    const resources = gameManager.resources;
    
    // 左侧功能按钮
    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    this.ctx.fillRect(10, 140, this.width / 2 - 15, 80);
    
    // 绘制方向按钮
    const btnSize = 30;
    const btnStartX = 30;
    const btnStartY = 150;
    
    // 上
    this.drawButton(btnStartX + btnSize, btnStartY, btnSize, btnSize, '↑');
    // 左
    this.drawButton(btnStartX, btnStartY + btnSize, btnSize, btnSize, '←');
    // 右
    this.drawButton(btnStartX + btnSize * 2, btnStartY + btnSize, btnSize, btnSize, '→');
    // 下
    this.drawButton(btnStartX + btnSize, btnStartY + btnSize * 2, btnSize, btnSize, '↓');
    
    // 右侧资源栏
    this.ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
    this.ctx.fillRect(this.width / 2 + 5, 140, this.width / 2 - 15, 80);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    
    let y = 155;
    this.ctx.fillText(`当前能量: ${resources.energy}/${resources.maxEnergy}`, this.width / 2 + 20, y);
    y += 20;
    this.ctx.fillText(`金属: ${resources.metal}`, this.width / 2 + 20, y);
    y += 20;
    this.ctx.fillText(`晶体: ${resources.crystal}`, this.width / 2 + 20, y);
    y += 20;
    this.ctx.fillText(`生态: ${resources.ecology}`, this.width / 2 + 20, y);
    
    // 技能冷却条
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(this.width / 2 + 20, 200, this.width / 2 - 35, 10);
    
    this.ctx.fillStyle = '#00ff00';
    const skillProgress = gameManager.skillProgress;
    this.ctx.fillRect(this.width / 2 + 20, 200, (this.width / 2 - 35) * skillProgress, 10);
  }
  
  drawBottomActions() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fillRect(10, this.height - 60, this.width - 20, 50);
    
    const btnWidth = (this.width - 40) / 3;
    
    this.drawButton(20, this.height - 50, btnWidth, 30, '自动排序');
    this.drawButton(20 + btnWidth + 10, this.height - 50, btnWidth, 30, '高亮图案');
    this.drawButton(20 + btnWidth * 2 + 20, this.height - 50, btnWidth, 30, '使用道具');
  }
  
  drawButton(x, y, width, height, text) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(x, y, width, height);
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x + width / 2, y + height / 2);
  }
}

export default Render;