class StarExplorationGame {
    constructor() {
        this.currentView = 'home';
        this.selectedBlocks = [];
        this.eliminationSlots = [null, null, null, null, null, null, null, null];
        this.resources = {
            energy: 8320,
            metal: 1560,
            crystal: 2890,
            eco: 450,
            coins: 12450
        };
        this.gameState = {
            isPlaying: false,
            countdown: 180,
            blocksOnMap: [],
            currentLevel: 3,
            targetEliminations: 50,
            eliminatedCount: 0
        };
        
        // Three.js 相关
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cubeGroup = null;
        this.raycaster = null;
        this.mouse = null;
        this.blocks3D = [];
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.targetRotation = { x: 0.3, y: 0 };
        this.currentRotation = { x: 0.3, y: 0 };
        
        // 方块类型和颜色配置
        this.blockTypes = ['red', 'blue', 'green', 'yellow'];
        this.blockColors = {
            red: 0xff2a6d,
            blue: 0x00d4ff,
            green: 0x00ff88,
            yellow: 0xffd700
        };
        this.blockEmissive = {
            red: 0x440011,
            blue: 0x002244,
            green: 0x004411,
            yellow: 0x443300
        };
        
        this.init();
    }
    
    init() {
        this.simulateLoading();
        this.createStarfield();
        this.setupEventListeners();
    }
    
    simulateLoading() {
        const loadingProgress = document.getElementById('loading-progress');
        const loadingScreen = document.getElementById('loading-screen');
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                setTimeout(() => {
                    loadingScreen.style.opacity = '0';
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                    }, 500);
                }, 500);
            }
            loadingProgress.style.width = progress + '%';
        }, 200);
    }
    
    createStarfield() {
        const starfield = document.getElementById('starfield');
        const gameStarfield = document.getElementById('game-starfield');
        
        [starfield, gameStarfield].forEach(field => {
            if (!field) return;
            
            for (let i = 0; i < 100; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.animationDelay = Math.random() * 3 + 's';
                star.style.width = Math.random() * 2 + 1 + 'px';
                star.style.height = star.style.width;
                field.appendChild(star);
            }
        });
    }
    
    // 初始化Three.js 3D场景
    initThreeJS() {
        const container = document.getElementById('three-container');
        if (!container) return;
        
        // 清除之前的渲染器
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        // 场景
        this.scene = new THREE.Scene();
        
        // 相机
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.z = 18;
        this.camera.position.y = 2;
        
        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        container.appendChild(this.renderer.domElement);
        
        // 光照系统
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);
        
        const pointLight1 = new THREE.PointLight(0x00d4ff, 0.5, 50);
        pointLight1.position.set(-10, 5, 10);
        this.scene.add(pointLight1);
        
        const pointLight2 = new THREE.PointLight(0xff2a6d, 0.5, 50);
        pointLight2.position.set(10, -5, 10);
        this.scene.add(pointLight2);
        
        // 射线检测器
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // 创建3D方块组
        this.create3DCubes();
        
        // 添加事件监听
        this.setupThreeJSEvents(container);
        
        // 开始渲染循环
        this.animate();
    }
    
    // 创建3D方块立方体空间
    create3DCubes() {
        // 清除旧的方块
        this.blocks3D = [];
        this.gameState.blocksOnMap = [];
        
        if (this.cubeGroup) {
            this.scene.remove(this.cubeGroup);
        }
        
        this.cubeGroup = new THREE.Group();
        
        // 创建立方体边框（装饰）
        this.createCubeFrame();
        
        // 在3D空间中创建方块
        // 使用3x3x3的立方体空间布局
        const gridSize = 3;
        const spacing = 2.2;
        const offset = (gridSize - 1) * spacing / 2;
        
        let blockIndex = 0;
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                for (let z = 0; z < gridSize; z++) {
                    // 随机决定是否在这个位置生成方块（80%概率）
                    if (Math.random() > 0.2) {
                        const type = this.blockTypes[Math.floor(Math.random() * this.blockTypes.length)];
                        const block = this.createSingleBlock(type, blockIndex);
                        
                        block.position.set(
                            x * spacing - offset,
                            y * spacing - offset,
                            z * spacing - offset
                        );
                        
                        // 添加轻微的随机偏移，让布局更自然
                        block.position.x += (Math.random() - 0.5) * 0.3;
                        block.position.y += (Math.random() - 0.5) * 0.3;
                        block.position.z += (Math.random() - 0.5) * 0.3;
                        
                        // 添加入场动画
                        block.scale.set(0, 0, 0);
                        this.animateBlockEntrance(block, blockIndex * 30);
                        
                        this.cubeGroup.add(block);
                        this.blocks3D.push({
                            mesh: block,
                            type: type,
                            index: blockIndex,
                            originalPosition: block.position.clone(),
                            isSelected: false
                        });
                        
                        blockIndex++;
                    }
                }
            }
        }
        
        // 添加多层结构 - 外围装饰环
        this.createDecorativeRings();
        
        this.scene.add(this.cubeGroup);
        this.gameState.blocksOnMap = [...this.blocks3D];
    }
    
    // 创建单个3D方块
    createSingleBlock(type, index) {
        const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
        
        // 创建带发光效果的材质
        const material = new THREE.MeshPhysicalMaterial({
            color: this.blockColors[type],
            emissive: this.blockEmissive[type],
            emissiveIntensity: 0.2,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.95,
            transmission: 0.1,
            thickness: 0.5
        });
        
        const block = new THREE.Mesh(geometry, material);
        block.userData = { type: type, index: index, isBlock: true };
        
        // 添加边框线框
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.3 
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        block.add(wireframe);
        
        // 添加内部发光核心
        const coreGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: this.blockColors[type],
            transparent: true,
            opacity: 0.6
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        block.add(core);
        
        return block;
    }
    
    // 方块入场动画
    animateBlockEntrance(block, delay) {
        setTimeout(() => {
            let scale = 0;
            const targetScale = 1;
            const duration = 400;
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // 弹性缓动
                const easeOutBack = 1 + 2.70158 * Math.pow(progress - 1, 3) + 
                                   1.70158 * Math.pow(progress - 1, 2);
                scale = targetScale * easeOutBack;
                
                block.scale.set(scale, scale, scale);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }, delay);
    }
    
    // 创建立方体边框
    createCubeFrame() {
        const frameSize = 7;
        const frameGeometry = new THREE.BoxGeometry(frameSize, frameSize, frameSize);
        const edges = new THREE.EdgesGeometry(frameGeometry);
        const frameMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00d4ff, 
            transparent: true, 
            opacity: 0.15 
        });
        const frame = new THREE.LineSegments(edges, frameMaterial);
        this.cubeGroup.add(frame);
        
        // 添加角落装饰
        const cornerGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const cornerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00d4ff, 
            transparent: true, 
            opacity: 0.5 
        });
        
        const corners = [
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
            [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1]
        ];
        
        corners.forEach(corner => {
            const sphere = new THREE.Mesh(cornerGeometry, cornerMaterial);
            sphere.position.set(
                corner[0] * frameSize / 2,
                corner[1] * frameSize / 2,
                corner[2] * frameSize / 2
            );
            this.cubeGroup.add(sphere);
        });
    }
    
    // 创建装饰环
    createDecorativeRings() {
        const ringGeometry = new THREE.RingGeometry(5, 5.2, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xb24bff,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
            ring.rotation.x = Math.PI / 2;
            ring.rotation.z = i * Math.PI / 3;
            ring.userData = { 
                rotationSpeed: 0.005 * (i + 1),
                axis: i % 2 === 0 ? 'y' : 'x'
            };
            this.cubeGroup.add(ring);
        }
    }
    
    // 设置Three.js事件
    setupThreeJSEvents(container) {
        // 鼠标/触摸事件
        container.addEventListener('mousedown', (e) => this.onPointerDown(e));
        container.addEventListener('mousemove', (e) => this.onPointerMove(e));
        container.addEventListener('mouseup', () => this.onPointerUp());
        container.addEventListener('mouseleave', () => this.onPointerUp());
        
        // 触摸事件
        container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        container.addEventListener('touchend', () => this.onPointerUp());
        
        // 滚轮缩放
        container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
        
        // 窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    onPointerDown(event) {
        this.isDragging = true;
        this.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
        
        // 检测点击的方块
        this.updateMousePosition(event);
        this.checkBlockClick();
    }
    
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.isDragging = true;
            this.previousMousePosition = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
            
            this.updateMousePosition(event.touches[0]);
            this.checkBlockClick();
        }
    }
    
    onPointerMove(event) {
        this.updateMousePosition(event);
        
        if (this.isDragging) {
            const deltaX = event.clientX - this.previousMousePosition.x;
            const deltaY = event.clientY - this.previousMousePosition.y;
            
            this.targetRotation.y += deltaX * 0.01;
            this.targetRotation.x += deltaY * 0.01;
            
            // 限制垂直旋转角度
            this.targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotation.x));
            
            this.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
        
        // 悬停效果
        this.checkHover();
    }
    
    onTouchMove(event) {
        if (event.touches.length === 1 && this.isDragging) {
            const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
            const deltaY = event.touches[0].clientY - this.previousMousePosition.y;
            
            this.targetRotation.y += deltaX * 0.01;
            this.targetRotation.x += deltaY * 0.01;
            this.targetRotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotation.x));
            
            this.previousMousePosition = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }
    }
    
    onPointerUp() {
        this.isDragging = false;
    }
    
    onWheel(event) {
        event.preventDefault();
        const zoomSpeed = 0.1;
        this.camera.position.z += event.deltaY * zoomSpeed * 0.01;
        this.camera.position.z = Math.max(10, Math.min(30, this.camera.position.z));
    }
    
    updateMousePosition(event) {
        const container = document.getElementById('three-container');
        const rect = container.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    // 检测方块点击
    checkBlockClick() {
        if (!this.raycaster || !this.camera) return;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubeGroup.children, true);
        
        for (let intersect of intersects) {
            let object = intersect.object;
            // 找到父级方块对象
            while (object && !object.userData.isBlock && object.parent) {
                object = object.parent;
            }
            
            if (object && object.userData.isBlock && !object.userData.isSelected) {
                this.handleBlockClick3D(object);
                break;
            }
        }
    }
    
    // 检测悬停效果
    checkHover() {
        if (!this.raycaster || !this.camera || this.isDragging) return;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubeGroup.children, true);
        
        // 重置所有方块悬停状态
        this.blocks3D.forEach(blockData => {
            if (!blockData.isSelected && blockData.mesh) {
                blockData.mesh.material.emissiveIntensity = 0.2;
                blockData.mesh.scale.set(1, 1, 1);
            }
        });
        
        // 设置悬停方块
        for (let intersect of intersects) {
            let object = intersect.object;
            while (object && !object.userData.isBlock && object.parent) {
                object = object.parent;
            }
            
            if (object && object.userData.isBlock && !object.userData.isSelected) {
                object.material.emissiveIntensity = 0.5;
                object.scale.set(1.05, 1.05, 1.05);
                break;
            }
        }
    }
    
    // 处理3D方块点击
    handleBlockClick3D(blockMesh) {
        if (!this.gameState.isPlaying) return;
        
        const blockData = this.blocks3D.find(b => b.mesh === blockMesh);
        if (!blockData || blockData.isSelected) return;
        
        // 检查槽位是否已满
        const filledSlots = this.eliminationSlots.filter(s => s !== null).length;
        if (filledSlots >= 8) {
            this.showWarning('槽位已满！请先消除或回溯');
            return;
        }
        
        // 标记为已选中
        blockData.isSelected = true;
        blockMesh.userData.isSelected = true;
        
        // 方块飞入槽位的动画
        this.animateBlockToSlot(blockData, filledSlots);
    }
    
    // 方块飞入槽位动画
    animateBlockToSlot(blockData, slotIndex) {
        const block = blockData.mesh;
        
        // 高亮效果
        block.material.emissiveIntensity = 0.8;
        
        // 缩小并移动动画
        const startScale = block.scale.x;
        const targetScale = 0;
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const scale = startScale * (1 - progress);
            block.scale.set(scale, scale, scale);
            block.rotation.y += 0.2;
            block.rotation.x += 0.1;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                block.visible = false;
                this.addToSlot(blockData);
            }
        };
        animate();
    }
    
    // 添加到槽位
    addToSlot(blockData) {
        const emptySlotIndex = this.eliminationSlots.findIndex(s => s === null);
        if (emptySlotIndex === -1) return;
        
        this.eliminationSlots[emptySlotIndex] = blockData;
        this.updateSlotsDisplay();
        this.checkElimination();
    }
    
    // 更新槽位显示
    updateSlotsDisplay() {
        const slots = document.querySelectorAll('.game-slot');
        slots.forEach((slot, index) => {
            slot.innerHTML = '';
            slot.classList.remove('filled', 'warning', 'type-red', 'type-blue', 'type-green', 'type-yellow');
            
            const slotData = this.eliminationSlots[index];
            if (slotData) {
                // 创建彩色方块指示器
                const indicator = document.createElement('div');
                indicator.className = `slot-block-indicator type-${slotData.type}`;
                slot.appendChild(indicator);
                
                slot.classList.add('filled', `type-${slotData.type}`);
                
                // 槽位快满时警告
                if (index >= 6) {
                    slot.classList.add('warning');
                }
            }
        });
    }
    
    // 检查消除
    checkElimination() {
        const filledSlots = this.eliminationSlots.filter(s => s !== null);
        if (filledSlots.length < 3) return;
        
        // 统计各类型数量
        const typeCounts = {};
        this.eliminationSlots.forEach((slot, index) => {
            if (slot) {
                if (!typeCounts[slot.type]) {
                    typeCounts[slot.type] = { count: 0, indices: [] };
                }
                typeCounts[slot.type].count++;
                typeCounts[slot.type].indices.push(index);
            }
        });
        
        // 检查是否有3个或更多相同类型
        for (const [type, data] of Object.entries(typeCounts)) {
            if (data.count >= 3) {
                // 只消除3个
                const indicesToRemove = data.indices.slice(0, 3);
                this.eliminateBlocks(type, indicesToRemove);
                return;
            }
        }
    }
    
    // 消除方块
    eliminateBlocks(type, indices) {
        // 播放消除特效
        this.playEliminationEffect(type);
        
        // 从槽位中移除
        indices.forEach(index => {
            this.eliminationSlots[index] = null;
        });
        
        // 显示奖励
        this.showReward(type, 3);
        this.gameState.eliminatedCount += 3;
        
        // 更新槽位显示
        setTimeout(() => {
            this.updateSlotsDisplay();
            this.checkWinCondition();
        }, 300);
    }
    
    // 播放消除特效
    playEliminationEffect(type) {
        const color = this.blockColors[type];
        const hexColor = '#' + color.toString(16).padStart(6, '0');
        
        // 创建粒子爆发效果
        this.showFloatingText('消除 x3!', hexColor);
        
        // 添加倒计时
        this.gameState.countdown = Math.min(180, this.gameState.countdown + 15);
        this.updateTimerDisplay();
    }
    
    // 更新计时器显示
    updateTimerDisplay() {
        const timerFill = document.getElementById('timer-fill');
        if (timerFill) {
            const percentage = (this.gameState.countdown / 180) * 100;
            timerFill.style.width = percentage + '%';
        }
    }
    
    // 检查胜利条件
    checkWinCondition() {
        // 检查是否所有方块都被消除
        const remainingBlocks = this.blocks3D.filter(b => !b.isSelected).length;
        
        if (remainingBlocks === 0) {
            this.endGame(true);
        }
    }
    
    // 渲染循环
    animate() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        requestAnimationFrame(() => this.animate());
        
        // 平滑旋转插值
        if (this.cubeGroup) {
            this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
            this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;
            
            this.cubeGroup.rotation.x = this.currentRotation.x;
            this.cubeGroup.rotation.y = this.currentRotation.y;
            
            // 装饰环自动旋转
            this.cubeGroup.children.forEach(child => {
                if (child.userData && child.userData.rotationSpeed) {
                    if (child.userData.axis === 'y') {
                        child.rotation.y += child.userData.rotationSpeed;
                    } else {
                        child.rotation.x += child.userData.rotationSpeed;
                    }
                }
            });
            
            // 方块浮动动画
            const time = Date.now() * 0.001;
            this.blocks3D.forEach((blockData, index) => {
                if (blockData.mesh && !blockData.isSelected && blockData.mesh.visible) {
                    blockData.mesh.position.y = blockData.originalPosition.y + 
                        Math.sin(time + index * 0.5) * 0.1;
                }
            });
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    // 窗口大小调整
    onWindowResize() {
        const container = document.getElementById('three-container');
        if (!container || !this.camera || !this.renderer) return;
        
        const aspect = container.clientWidth / container.clientHeight;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    setupEventListeners() {
        window.switchPage = (page) => this.switchPage(page);
        window.scanRewards = () => this.scanRewards();
        window.undoMove = () => this.undoMove();
        window.rearrange = () => this.rearrange();
        window.usePowerUp = () => this.usePowerUp();
        window.toggleMenu = (side) => this.toggleMenu(side);
    }
    
    toggleMenu(side) {
        const menu = document.querySelector(`.${side}-menu`);
        if (menu) {
            menu.classList.toggle('collapsed');
        }
    }
    
    switchPage(page) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(p => p.classList.remove('active'));
        
        const targetPage = document.getElementById(page + '-page');
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentView = page;
            
            if (page === 'game') {
                setTimeout(() => {
                    this.initThreeJS();
                    this.startGame();
                }, 100);
            }
        }
    }
    
    startGame() {
        this.gameState.isPlaying = true;
        this.gameState.countdown = 180;
        this.gameState.eliminatedCount = 0;
        this.selectedBlocks = [];
        this.eliminationSlots = [null, null, null, null, null, null, null, null];
        this.updateSlotsDisplay();
        this.startCountdown();
    }
    
    startCountdown() {
        const interval = setInterval(() => {
            if (!this.gameState.isPlaying) {
                clearInterval(interval);
                return;
            }
            
            this.gameState.countdown--;
            this.updateTimerDisplay();
            
            if (this.gameState.countdown <= 0) {
                clearInterval(interval);
                this.endGame(false);
            }
        }, 1000);
    }
    
    showReward(type, count) {
        const rewards = {
            red: { metal: 50, energy: 30 },
            blue: { energy: 50, crystal: 20 },
            green: { crystal: 40, eco: 30 },
            yellow: { coins: 100, energy: 20 }
        };
        
        const reward = rewards[type] || { coins: 50 };
        
        for (const [resource, amount] of Object.entries(reward)) {
            if (this.resources[resource] !== undefined) {
                this.resources[resource] += amount * count;
            }
        }
        
        // 更新HUD显示
        this.updateResourceHUD();
    }
    
    updateResourceHUD() {
        // 这里可以更新顶部资源显示
    }
    
    showFloatingText(text, color) {
        const floatingText = document.createElement('div');
        floatingText.style.cssText = `
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${color};
            font-family: 'Orbitron', sans-serif;
            font-size: 36px;
            font-weight: 700;
            text-shadow: 0 0 30px ${color};
            z-index: 10000;
            animation: floatUp 1.5s ease-out forwards;
            pointer-events: none;
        `;
        floatingText.textContent = text;
        document.body.appendChild(floatingText);
        
        setTimeout(() => {
            floatingText.remove();
        }, 1500);
    }
    
    showWarning(message) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 42, 109, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 0 20px rgba(255, 42, 109, 0.5);
            animation: slideDown 0.3s ease-out;
        `;
        warning.textContent = message;
        document.body.appendChild(warning);
        
        setTimeout(() => {
            warning.style.opacity = '0';
            setTimeout(() => warning.remove(), 300);
        }, 2000);
    }
    
    endGame(won) {
        this.gameState.isPlaying = false;
        
        const message = won ? '🎉 任务完成！' : '⏰ 时间到！';
        const color = won ? '#00ff88' : '#ff2a6d';
        
        this.showFloatingText(message, color);
        
        setTimeout(() => {
            if (confirm(message + '\n\n是否返回主菜单？')) {
                this.switchPage('home');
            }
        }, 2000);
    }
    
    scanRewards() {
        if (!this.gameState.isPlaying) return;
        
        // 高亮所有可消除的方块组合
        this.blocks3D.forEach((blockData, index) => {
            if (!blockData.isSelected && blockData.mesh) {
                setTimeout(() => {
                    blockData.mesh.material.emissiveIntensity = 0.8;
                    setTimeout(() => {
                        if (!blockData.isSelected) {
                            blockData.mesh.material.emissiveIntensity = 0.2;
                        }
                    }, 1500);
                }, index * 30);
            }
        });
        
        this.showFloatingText('扫描中...', '#00d4ff');
    }
    
    undoMove() {
        // 找到最后一个放入槽位的方块
        let lastFilledIndex = -1;
        for (let i = this.eliminationSlots.length - 1; i >= 0; i--) {
            if (this.eliminationSlots[i] !== null) {
                lastFilledIndex = i;
                break;
            }
        }
        
        if (lastFilledIndex === -1) {
            this.showWarning('没有可回溯的操作');
            return;
        }
        
        const blockData = this.eliminationSlots[lastFilledIndex];
        
        // 恢复方块
        blockData.isSelected = false;
        blockData.mesh.userData.isSelected = false;
        blockData.mesh.visible = true;
        
        // 恢复动画
        const duration = 300;
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const scale = progress;
            blockData.mesh.scale.set(scale, scale, scale);
            blockData.mesh.rotation.set(0, 0, 0);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
        
        // 从槽位移除
        this.eliminationSlots[lastFilledIndex] = null;
        this.updateSlotsDisplay();
        
        this.showFloatingText('回溯成功', '#b24bff');
    }
    
    rearrange() {
        if (!this.gameState.isPlaying) return;
        
        // 重新随机排列未选中的方块类型
        const unselectedBlocks = this.blocks3D.filter(b => !b.isSelected);
        const types = unselectedBlocks.map(b => b.type);
        
        // 洗牌
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        
        // 应用新类型
        unselectedBlocks.forEach((blockData, index) => {
            const newType = types[index];
            blockData.type = newType;
            blockData.mesh.userData.type = newType;
            
            // 更新材质颜色
            blockData.mesh.material.color.setHex(this.blockColors[newType]);
            blockData.mesh.material.emissive.setHex(this.blockEmissive[newType]);
            
            // 旋转动画
            setTimeout(() => {
                const duration = 300;
                const startTime = Date.now();
                const startRotation = blockData.mesh.rotation.y;
                
                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    blockData.mesh.rotation.y = startRotation + progress * Math.PI * 2;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        blockData.mesh.rotation.y = 0;
                    }
                };
                animate();
            }, index * 30);
        });
        
        this.showFloatingText('重组完成！', '#00d4ff');
    }
    
    usePowerUp() {
        if (!this.gameState.isPlaying) return;
        
        // 高亮数量最多的类型
        const typeCounts = {};
        this.blocks3D.forEach(block => {
            if (!block.isSelected) {
                typeCounts[block.type] = (typeCounts[block.type] || 0) + 1;
            }
        });
        
        let mostCommonType = null;
        let maxCount = 0;
        
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonType = type;
            }
        }
        
        if (!mostCommonType) return;
        
        // 高亮该类型的所有方块
        this.blocks3D.forEach(blockData => {
            if (blockData.type === mostCommonType && !blockData.isSelected) {
                setTimeout(() => {
                    blockData.mesh.material.emissiveIntensity = 1;
                    blockData.mesh.scale.set(1.15, 1.15, 1.15);
                    setTimeout(() => {
                        if (!blockData.isSelected) {
                            blockData.mesh.material.emissiveIntensity = 0.2;
                            blockData.mesh.scale.set(1, 1, 1);
                        }
                    }, 800);
                }, Math.random() * 300);
            }
        });
        
        this.showFloatingText('能量激活！', '#ff6b35');
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, -150%) scale(1.5);
        }
    }
    
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);

// 初始化游戏
const game = new StarExplorationGame();
