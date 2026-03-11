// 场景管理器
class SceneManager {
  constructor(game) {
    this.game = game;
    this.currentScene = null;
    this.currentSceneName = '';
    this.scenes = {};
  }

  // 注册场景
  registerScene(name, scene) {
    this.scenes[name] = scene;
  }

  // 切换场景
  switchScene(name) {
    if (this.currentScene) {
      this.currentScene.exit();
    }
    this.currentSceneName = name;
    this.currentScene = this.scenes[name];
    this.currentScene.enter();
  }

  // 更新场景
  update(deltaTime) {
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
  }

  // 渲染场景
  render() {
    if (this.currentScene) {
      this.currentScene.render();
    }
  }

  // 处理点击事件
  handleTap(x, y) {
    if (this.currentScene) {
      this.currentScene.handleTap(x, y);
    }
  }

  // 获取当前场景
  getCurrentScene() {
    return this.currentScene;
  }
}

module.exports = {
  default: SceneManager
};