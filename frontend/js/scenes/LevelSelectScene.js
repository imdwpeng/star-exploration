// 关卡选择场景
class LevelSelectScene {
  constructor(game) {
    this.game = game;
    this.scrollOffset = 0;
    this.maxScrollOffset = 0;
    this.isScrolling = false;
    this.lastTouchY = 0;
  }

  // 进入场景
  enter() {
    console.log('进入关卡选择场景');
    this.scrollOffset = 0;
    this.calculateMaxScroll();
  }

  // 退出场景
  exit() {
    console.log('退出关卡选择场景');
  }

  // 计算最大滚动偏移量
  calculateMaxScroll() {
    const galaxies = [
      { name: '新星摇篮', levels: 8 },
      { name: '锈蚀星带', levels: 8 },
      { name: '星云迷雾', levels: 8 },
      { name: '重力熔炉', levels: 8 },
      { name: '数据洪流', levels: 8 },
      { name: '时裔圣所', levels: 8 },
      { name: '铸星熔炉', levels: 8 },
      { name: '终末奇点', levels: 8 }
    ];
    const topPadding = this.game.safeArea.top || 20;
    const headerHeight = 50;
    const galaxyHeight = 70;
    const totalHeight = topPadding + headerHeight + 30 + galaxies.length * galaxyHeight + 50;
    const maxScroll = Math.max(0, totalHeight - this.game.windowHeight);
    this.maxScrollOffset = maxScroll;
  }

  // 更新场景
  update(deltaTime) {
    // 关卡选择场景不需要更新逻辑
  }

  // 渲染场景
  render() {
    const ctx = this.game.uiCanvas.getContext('2d');
    
    ctx.save();
    // 缩放以匹配逻辑像素
    ctx.scale(this.game.pixelRatio, this.game.pixelRatio);

    // 考虑刘海屏高度
    const topPadding = this.game.safeArea.top || 20;
    const headerHeight = 50;
    const headerY = topPadding;

    // 绘制背景
    const bgGrad = ctx.createLinearGradient(0, 0, this.game.windowWidth, this.game.windowHeight);
    bgGrad.addColorStop(0, '#050510');
    bgGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.game.windowWidth, this.game.windowHeight);

    // 绘制顶部返回按钮
    const backButtonWidth = 60;
    const backButtonHeight = 30;
    const backButtonX = 15;
    const backButtonY = headerY + (headerHeight - backButtonHeight) / 2;

    // 按钮背景
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 2;
    this.game.uiManager.drawRoundedRect(ctx, backButtonX + backButtonWidth / 2, backButtonY + backButtonHeight / 2, backButtonWidth, 5, '#1a1a2e', '#00D4FF');

    // 返回箭头文字
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('←', backButtonX + backButtonWidth / 2, backButtonY + backButtonHeight / 2);

    // 绘制标题
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText('选择关卡', this.game.windowWidth / 2, headerY + headerHeight / 2);
    ctx.shadowBlur = 0;

    // 应用滚动偏移
    ctx.save();
    ctx.translate(0, -this.scrollOffset);

    // 绘制关卡列表
    const galaxies = [
      { name: '新星摇篮', levels: 8 },
      { name: '锈蚀星带', levels: 8 },
      { name: '星云迷雾', levels: 8 },
      { name: '重力熔炉', levels: 8 },
      { name: '数据洪流', levels: 8 },
      { name: '时裔圣所', levels: 8 },
      { name: '铸星熔炉', levels: 8 },
      { name: '终末奇点', levels: 8 }
    ];

    const startY = headerY + headerHeight + 30;
    const galaxyHeight = 70;
    const nameWidth = 100;
    const levelWidth = (this.game.windowWidth - nameWidth - 60) / 8;
    const levelHeight = 40;
    const levelGap = 5;

    galaxies.forEach((galaxy, galaxyIndex) => {
      const galaxyY = startY + galaxyIndex * galaxyHeight;

      // 绘制星系名称
      ctx.font = '18px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${galaxyIndex + 1}. ${galaxy.name}`, 20, galaxyY + 25);

      // 绘制关卡按钮
      for (let i = 0; i < galaxy.levels; i++) {
        const levelX = nameWidth + i * (levelWidth + levelGap);
        const levelY = galaxyY + 10;

        // 关卡按钮背景
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;

        // 使用兼容的方式绘制圆角矩形
        this.game.uiManager.drawRoundedRect(ctx, levelX + levelWidth / 2, levelY + levelHeight / 2, levelWidth, 5, '#1a1a2e', '#00D4FF');

        // 关卡数字
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${i + 1}`, levelX + levelWidth / 2, levelY + levelHeight / 2);
      }
    });

    ctx.restore();
    
    ctx.restore();
  }

  // 处理点击事件
  handleTap(x, y) {
    // 考虑刘海屏高度
    const topPadding = this.game.safeArea.top || 20;
    const headerHeight = 50;
    const headerY = topPadding;

    // 检查是否点击了返回按钮
    const backButtonWidth = 60;
    const backButtonHeight = 30;
    const backButtonX = 15;
    const backButtonY = headerY + (headerHeight - backButtonHeight) / 2;

    if (x >= backButtonX && x <= backButtonX + backButtonWidth &&
        y >= backButtonY && y <= backButtonY + backButtonHeight) {
      // 切换到开始场景
      this.game.sceneManager.switchScene('start');
      return;
    }

    // 检查是否点击了关卡按钮（需要考虑滚动偏移）
    const startY = headerY + headerHeight + 30;
    const galaxyHeight = 70;
    const nameWidth = 100;
    const levelWidth = (this.game.windowWidth - nameWidth - 60) / 8;
    const levelHeight = 40;
    const levelGap = 5;

    for (let galaxyIndex = 0; galaxyIndex < 8; galaxyIndex++) {
      const galaxyY = startY + galaxyIndex * galaxyHeight - this.scrollOffset;

      for (let levelIndex = 0; levelIndex < 8; levelIndex++) {
        const levelX = nameWidth + levelIndex * (levelWidth + levelGap);
        const levelY = galaxyY + 10;

        if (x >= levelX && x <= levelX + levelWidth &&
            y >= levelY && y <= levelY + levelHeight) {
          // 保存选择的星系和关卡信息
          this.game.selectedGalaxy = galaxyIndex + 1;
          this.game.selectedLevel = levelIndex + 1;
          
          // 切换到游戏场景
          this.game.sceneManager.switchScene('game');
          // 初始化游戏
          this.game.initManager.initGame();
          return;
        }
      }
    }
  }

  // 处理触摸开始
  handleTouchStart(x, y) {
    this.isScrolling = true;
    this.lastTouchY = y;
  }

  // 处理触摸移动
  handleTouchMove(x, y) {
    if (!this.isScrolling) return;
    
    const deltaY = y - this.lastTouchY;
    this.lastTouchY = y;
    
    // 更新滚动偏移
    this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset - deltaY));
  }

  // 处理触摸结束
  handleTouchEnd() {
    this.isScrolling = false;
  }
}

module.exports = {
  default: LevelSelectScene
};