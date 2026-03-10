class ParticleManager {
  constructor(game) {
    this.game = game;
    this.THREE = game.THREE;
    this.particleGroup = game.particleGroup;
    this.windowWidth = game.windowWidth;
    this.windowHeight = game.windowHeight;
  }

  createRingExplosion(x, y, color) {
    // 转换为正交坐标
    const orthoX = x - this.windowWidth / 2;
    const orthoY = this.windowHeight / 2 - y;
    
    // 简单的环形粒子
    const particleCount = 20;
    const geometry = new this.THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 / particleCount) * i;
        positions.push(orthoX, orthoY, 0);
        
        const speed = 3;
        velocities.push(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0
        );
    }
    
    if (geometry.setAttribute) {
        geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));
    } else {
        geometry.addAttribute('position', new this.THREE.BufferAttribute(new Float32Array(positions), 3));
    }
    
    const material = new this.THREE.PointsMaterial({
        color: color,
        size: 3,
        transparent: true,
        opacity: 1
    });
    
    const particles = new this.THREE.Points(geometry, material);
    particles.userData = {
        velocities: velocities,
        age: 0
    };
    
    this.particleGroup.add(particles);
  }

  createExplosion(x, y, color) {
    // 转换为正交坐标
    const orthoX = x - this.windowWidth / 2;
    const orthoY = this.windowHeight / 2 - y;
    
    const particleCount = 30;
    const geometry = new this.THREE.BufferGeometry();
    const positions = [];
    const velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions.push(orthoX, orthoY, 0);
      
      // 随机速度 (在屏幕平面上散开)
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 2; // 增加速度
      
      velocities.push(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 2
      );
    }
    
    // 手动构建 BufferAttribute
    const positionAttribute = new this.THREE.BufferAttribute(new Float32Array(positions), 3);
    
    // 兼容旧版本 Three.js (threejs-miniprogram 可能基于旧版本)
    if (geometry.setAttribute) {
        geometry.setAttribute('position', positionAttribute);
    } else {
        geometry.addAttribute('position', positionAttribute);
    }
    
    const material = new this.THREE.PointsMaterial({
      color: color,
      size: 4,
      sizeAttenuation: false, // UI层不需要随距离缩放
      transparent: true,
      opacity: 1
    });
    
    const particles = new this.THREE.Points(geometry, material);
    particles.userData = {
      velocities: velocities,
      age: 0
    };
    
    this.particleGroup.add(particles);
  }

  clearParticles() {
    if (this.particleGroup) {
      for (let i = this.particleGroup.children.length - 1; i >= 0; i--) {
        const particles = this.particleGroup.children[i];
        this.particleGroup.remove(particles);
        if (particles.geometry) particles.geometry.dispose();
        if (particles.material) particles.material.dispose();
      }
    }
  }

  updateParticles() {
    // 更新所有粒子系统
    for (let i = this.particleGroup.children.length - 1; i >= 0; i--) {
      const particles = this.particleGroup.children[i];
      const positions = particles.geometry.attributes.position.array;
      const velocities = particles.userData.velocities;
      
      particles.userData.age += 1;
      
      // 更新位置
      for (let j = 0; j < positions.length / 3; j++) {
        positions[j * 3] += velocities[j * 3];
        positions[j * 3 + 1] += velocities[j * 3 + 1];
        positions[j * 3 + 2] += velocities[j * 3 + 2];
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      
      // 渐隐
      particles.material.opacity = 1 - (particles.userData.age / 60); // 1秒后消失
      
      // 移除
      if (particles.userData.age >= 60) {
        this.particleGroup.remove(particles);
        particles.geometry.dispose();
        particles.material.dispose();
      }
    }
  }

  createTrailParticle(x, y, color) {
    // 简单的拖尾粒子，不移动，只渐隐
    const orthoX = x - this.windowWidth / 2;
    const orthoY = this.windowHeight / 2 - y;
    
    const geometry = new this.THREE.BufferGeometry();
    const positions = [orthoX, orthoY, 0];
    
    if (geometry.setAttribute) {
        geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(positions, 3));
    } else {
        geometry.addAttribute('position', new this.THREE.BufferAttribute(new Float32Array(positions), 3));
    }
    
    const material = new this.THREE.PointsMaterial({
        color: color,
        size: 2,
        transparent: true,
        opacity: 0.6
    });
    
    const particle = new this.THREE.Points(geometry, material);
    particle.userData = {
        velocities: [0, 0, 0], // 不移动
        age: 0,
        maxAge: 20 // 存活时间短
    };
    
    this.particleGroup.add(particle);
  }
}

module.exports = {
  default: ParticleManager
};