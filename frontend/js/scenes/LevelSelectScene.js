// 关卡选择场景
class LevelSelectScene {
  constructor(game) {
    this.game = game;
  }

  // 进入场景
  enter() {
    console.log('进入关卡选择场景');
  }

  // 退出场景
  exit() {
    console.log('退出关卡选择场景');
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

    // 绘制背景
    const bgGrad = ctx.createLinearGradient(0, 0, this.game.windowWidth, this.game.windowHeight);
    bgGrad.addColorStop(0, '#050510');
    bgGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.game.windowWidth, this.game.windowHeight);

    // 绘制标题
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText('选择关卡', this.game.windowWidth / 2, 60);
    ctx.shadowBlur = 0;

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

    const startY = 120;
    const galaxyHeight = 80;
    const levelWidth = 40;
    const levelHeight = 40;
    const levelGap = 10;

    galaxies.forEach((galaxy, galaxyIndex) => {
      const galaxyY = startY + galaxyIndex * galaxyHeight;

      // 绘制星系名称
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${galaxyIndex + 1}. ${galaxy.name}`, 40, galaxyY + 25);

      // 绘制关卡按钮
      for (let i = 0; i < galaxy.levels; i++) {
        const levelX = 200 + i * (levelWidth + levelGap);
        const levelY = galaxyY + 10;

        // 关卡按钮背景
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;

        // 使用兼容的方式绘制圆角矩形
        this.game.uiManager.drawRoundedRect(ctx, levelX + levelWidth / 2, levelY + levelHeight / 2, levelWidth, 5, '#1a1a2e', '#00D4FF');

        // 关卡数字
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${i + 1}`, levelX + levelWidth / 2, levelY + levelHeight / 2 + 4);
      }
    });

    // 绘制返回按钮
    const backButtonWidth = 120;
    const backButtonHeight = 40;
    const backButtonX = 40;
    const backButtonY = this.game.windowHeight - 60;

    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 2;

    // 使用兼容的方式绘制圆角矩形
    this.game.uiManager.drawRoundedRect(ctx, backButtonX + backButtonWidth / 2, backButtonY + backButtonHeight / 2, backButtonWidth, 5, '#1a1a2e', '#00D4FF');

    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('返回', backButtonX + backButtonWidth / 2, backButtonY + backButtonHeight / 2 + 4);
    
    ctx.restore();
  }

  // 处理点击事件
  handleTap(x, y) {
    // 检查是否点击了返回按钮
    const backButtonWidth = 120;
    const backButtonHeight = 40;
    const backButtonX = 40;
    const backButtonY = this.game.windowHeight - 60;

    if (x >= backButtonX && x <= backButtonX + backButtonWidth &&
        y >= backButtonY && y <= backButtonY + backButtonHeight) {
      // 切换到开始场景
      this.game.sceneManager.switchScene('start');
      return;
    }

    // 检查是否点击了关卡按钮
    const startY = 120;
    const galaxyHeight = 80;
    const levelWidth = 40;
    const levelHeight = 40;
    const levelGap = 10;

    for (let galaxyIndex = 0; galaxyIndex < 8; galaxyIndex++) {
      const galaxyY = startY + galaxyIndex * galaxyHeight;

      for (let levelIndex = 0; levelIndex < 8; levelIndex++) {
        const levelX = 200 + levelIndex * (levelWidth + levelGap);
        const levelY = galaxyY + 10;

        if (x >= levelX && x <= levelX + levelWidth &&
            y >= levelY && y <= levelY + levelHeight) {
          // 切换到游戏场景
          this.game.sceneManager.switchScene('game');
          // 初始化游戏
          this.game.initManager.initGame();
          return;
        }
      }
    }
  }
}

module.exports = {
  default: LevelSelectScene
};