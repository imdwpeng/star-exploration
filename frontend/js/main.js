// 游戏主逻辑
import Render from './render';
import Cube from './cube';
import GameManager from './gameManager';
import UI from './ui';

class Main {
  constructor() {
    this.render = new Render();
    this.cube = new Cube();
    this.gameManager = new GameManager();
    this.ui = new UI(this.gameManager);
    
    // 存储游戏管理器的魔方引用
    this.gameManager.cube = this.cube;
    
    this.lastTime = Date.now();
    this.animate();
  }
  
  animate() {
    const currentTime = Date.now();
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // 更新游戏状态
    this.gameManager.update(delta);
    
    // 清空画布
    this.render.clear();
    
    // 渲染3D场景
    this.render.render(this.cube.scene, this.cube.camera);
    
    // 绘制2D UI
    this.render.drawUI(this.gameManager);
    
    // 显示游戏结束或暂停界面
    if (this.gameManager.isGameOver) {
      this.ui.showGameOver();
    } else if (this.gameManager.isPaused) {
      this.ui.showPause();
    }
    
    // 请求下一帧
    requestAnimationFrame(this.animate.bind(this));
  }
}

export default Main;