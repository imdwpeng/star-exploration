// 魔方逻辑
class Cube {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    
    this.camera = null;
    this.cubeGroup = new THREE.Group();
    this.blocks = [];
    
    this.blockSize = 25;
    this.gap = 2;
    this.cubeSize = this.blockSize * 3 + this.gap * 2;
    
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    
    this.init();
  }
  
  init() {
    // 创建相机
    this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    this.camera.position.z = this.cubeSize * 2;
    
    // 添加魔方组
    this.scene.add(this.cubeGroup);
    
    // 创建魔方
    this.createCube();
    
    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // 绑定事件
    this.bindEvents();
  }
  
  createCube() {
    // 定义9种颜色
    const colors = [
      0xff0000, // 红色
      0x00ff00, // 绿色
      0x0000ff, // 蓝色
      0xffff00, // 黄色
      0xff00ff, // 洋红色
      0x00ffff, // 青色
      0xffa500, // 橙色
      0x800080, // 紫色
      0x008000  // 深绿色
    ];
    
    // 创建颜色数组，每种颜色重复3次
    let colorArray = [];
    colors.forEach(color => {
      for (let i = 0; i < 3; i++) {
        colorArray.push(color);
      }
    });
    
    // 打乱颜色数组
    colorArray.sort(() => Math.random() - 0.5);
    
    // 创建3x3x3的方块
    let colorIndex = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const color = colorArray[colorIndex++];
          const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
          const material = new THREE.MeshPhongMaterial({ color: color });
          
          const block = new THREE.Mesh(geometry, material);
          block.position.set(
            x * (this.blockSize + this.gap),
            y * (this.blockSize + this.gap),
            z * (this.blockSize + this.gap)
          );
          
          // 存储方块颜色信息
          block.userData = {
            color: color,
            position: { x, y, z }
          };
          
          this.cubeGroup.add(block);
          this.blocks.push(block);
        }
      }
    }
  }
  
  bindEvents() {
    // 触摸事件
    canvas.addEventListener('touchstart', (event) => {
      this.isDragging = true;
      const touch = event.touches[0];
      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
    });
    
    canvas.addEventListener('touchmove', (event) => {
      if (this.isDragging) {
        const touch = event.touches[0];
        const deltaMove = {
          x: touch.clientX - this.previousMousePosition.x,
          y: touch.clientY - this.previousMousePosition.y
        };
        
        this.cubeGroup.rotation.y += deltaMove.x * 0.01;
        this.cubeGroup.rotation.x += deltaMove.y * 0.01;
        
        this.previousMousePosition = { x: touch.clientX, y: touch.clientY };
      }
    });
    
    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });
    
    canvas.addEventListener('touchcancel', () => {
      this.isDragging = false;
    });
  }
  
  rotate(direction) {
    switch(direction) {
      case 'up':
        this.cubeGroup.rotation.x -= Math.PI / 2;
        break;
      case 'left':
        this.cubeGroup.rotation.y += Math.PI / 2;
        break;
      case 'right':
        this.cubeGroup.rotation.y -= Math.PI / 2;
        break;
      case 'down':
        this.cubeGroup.rotation.x += Math.PI / 2;
        break;
    }
  }
  
  getBlockAt(position) {
    // 简化的射线检测
    // 实际项目中应该使用Three.js的射线检测
    for (let block of this.blocks) {
      if (block.userData.position.x === position.x && 
          block.userData.position.y === position.y && 
          block.userData.position.z === position.z) {
        return block;
      }
    }
    return null;
  }
  
  removeBlock(block) {
    const index = this.blocks.indexOf(block);
    if (index > -1) {
      this.blocks.splice(index, 1);
      this.cubeGroup.remove(block);
      return true;
    }
    return false;
  }
  
  highlightBlocks() {
    this.blocks.forEach(block => {
      block.material.emissive = new THREE.Color(0xffffff);
      block.material.emissiveIntensity = 0.5;
    });
    
    setTimeout(() => {
      this.blocks.forEach(block => {
        block.material.emissive = new THREE.Color(0x000000);
        block.material.emissiveIntensity = 0;
      });
    }, 1000);
  }
}

export default Cube;