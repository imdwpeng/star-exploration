// 开始游戏场景
class StartScene {
  constructor(game) {
    this.game = game;
  }

  // 进入场景
  enter() {
    console.log('进入开始游戏场景');
  }

  // 退出场景
  exit() {
    console.log('退出开始游戏场景');
  }

  // 更新场景
  update(deltaTime) {
    // 开始场景不需要更新逻辑
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
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillText('星海迷航', this.game.windowWidth / 2, this.game.windowHeight / 2 - 100);
    ctx.shadowBlur = 0;

    // 绘制副标题
    ctx.font = '24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('探索宇宙的奥秘', this.game.windowWidth / 2, this.game.windowHeight / 2 - 50);

    // 绘制开始游戏按钮
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = (this.game.windowWidth - buttonWidth) / 2;
    const buttonY = this.game.windowHeight / 2 + 50;

    // 按钮背景
    const buttonGrad = ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
    buttonGrad.addColorStop(0, '#00D4FF');
    buttonGrad.addColorStop(1, '#0099CC');
    ctx.fillStyle = buttonGrad;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;

    // 使用兼容的方式绘制圆角矩形
    this.game.uiManager.drawRoundedRect(ctx, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2, buttonWidth, 10, null, '#00ffff');
    ctx.fillStyle = buttonGrad;
    ctx.fill();

    // 按钮文字
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('开始游戏', this.game.windowWidth / 2, this.game.windowHeight / 2 + 80);
    
    ctx.restore();
  }

  // 处理点击事件
  handleTap(x, y) {
    // 检查是否点击了开始游戏按钮
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = (this.game.windowWidth - buttonWidth) / 2;
    const buttonY = this.game.windowHeight / 2 + 50;

    if (x >= buttonX && x <= buttonX + buttonWidth &&
        y >= buttonY && y <= buttonY + buttonHeight) {
      // 切换到关卡选择场景
      this.game.sceneManager.switchScene('levelSelect');
    }
  }
}

module.exports = {
  default: StartScene
};