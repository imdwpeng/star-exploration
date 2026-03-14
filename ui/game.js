class StarExplorationGame {
    constructor() {
        this.currentView = 'home';
        this.selectedBlocks = [];
        this.eliminationSlots = [null, null, null, null, null];
        this.resources = {
            energy: 8320,
            metal: 1560,
            crystal: 2890,
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
        
        this.blockTypes = ['red', 'blue', 'green', 'yellow'];
        this.blockIcons = {
            red: '🔴',
            blue: '🔵',
            green: '🟢',
            yellow: '🟡'
        };
        
        this.init();
    }
    
    init() {
        this.simulateLoading();
        this.createStarfield();
        this.createGameBlocks();
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
    
    createGameBlocks() {
        const cubeGrid = document.getElementById('cube-grid');
        if (!cubeGrid) return;
        
        cubeGrid.innerHTML = '';
        this.gameState.blocksOnMap = [];
        
        const totalBlocks = 25;
        for (let i = 0; i < totalBlocks; i++) {
            const type = this.blockTypes[Math.floor(Math.random() * this.blockTypes.length)];
            const block = document.createElement('div');
            block.className = 'game-block';
            block.dataset.type = type;
            block.dataset.index = i;
            block.innerHTML = this.blockIcons[type];
            block.addEventListener('click', () => this.handleBlockClick(block));
            cubeGrid.appendChild(block);
            
            this.gameState.blocksOnMap.push({
                element: block,
                type: type,
                index: i
            });
        }
    }
    
    setupEventListeners() {
        window.switchPage = (page) => this.switchPage(page);
        window.scanRewards = () => this.scanRewards();
        window.undoMove = () => this.undoMove();
        window.rearrange = () => this.rearrange();
        window.usePowerUp = () => this.usePowerUp();
        window.toggleMenu = (side) => this.toggleMenu(side);
    }
    
    // 展开/收起菜单
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
            
            if (page === 'game' && !this.gameState.isPlaying) {
                this.startGame();
            }
        }
    }
    
    startGame() {
        this.gameState.isPlaying = true;
        this.gameState.countdown = 180;
        this.gameState.eliminatedCount = 0;
        this.selectedBlocks = [];
        this.eliminationSlots = [null, null, null, null, null];
        
        this.createGameBlocks();
        this.updateSlotsDisplay();
        this.startCountdown();
    }
    
    startCountdown() {
        const timerFill = document.getElementById('timer-fill');
        if (!timerFill) return;
        
        const interval = setInterval(() => {
            if (!this.gameState.isPlaying) {
                clearInterval(interval);
                return;
            }
            
            this.gameState.countdown--;
            const percentage = (this.gameState.countdown / 180) * 100;
            timerFill.style.width = percentage + '%';
            
            if (this.gameState.countdown <= 0) {
                clearInterval(interval);
                this.endGame(false);
            }
        }, 1000);
    }
    
    handleBlockClick(block) {
        if (!this.gameState.isPlaying) return;
        
        const blockData = this.gameState.blocksOnMap.find(b => b.element === block);
        if (!blockData) return;
        
        if (block.classList.contains('selected')) {
            this.deselectBlock(block);
        } else {
            if (this.selectedBlocks.length < 5) {
                this.selectBlock(block);
            } else {
                this.showWarning('槽位已满！请先消除或回溯');
            }
        }
    }
    
    selectBlock(block) {
        block.classList.add('selected');
        this.selectedBlocks.push(block);
        
        const blockData = this.gameState.blocksOnMap.find(b => b.element === block);
        if (blockData) {
            this.moveToSlot(blockData);
        }
    }
    
    deselectBlock(block) {
        block.classList.remove('selected');
        const index = this.selectedBlocks.indexOf(block);
        if (index > -1) {
            this.selectedBlocks.splice(index, 1);
            
            const slotIndex = this.eliminationSlots.findIndex(s => s && s.element === block);
            if (slotIndex > -1) {
                this.eliminationSlots[slotIndex] = null;
                this.updateSlotsDisplay();
            }
        }
    }
    
    moveToSlot(blockData) {
        const emptySlot = this.eliminationSlots.findIndex(s => s === null);
        if (emptySlot === -1) return;
        
        this.eliminationSlots[emptySlot] = blockData;
        this.updateSlotsDisplay();
        
        this.checkElimination();
    }
    
    updateSlotsDisplay() {
        const slots = document.querySelectorAll('.game-slot');
        slots.forEach((slot, index) => {
            slot.innerHTML = '';
            slot.classList.remove('filled', 'warning');
            
            const slotData = this.eliminationSlots[index];
            if (slotData) {
                slot.innerHTML = this.blockIcons[slotData.type];
                slot.classList.add('filled');
                
                if (index === 4) {
                    slot.classList.add('warning');
                }
            }
        });
    }
    
    checkElimination() {
        const filledSlots = this.eliminationSlots.filter(s => s !== null);
        if (filledSlots.length < 3) return;
        
        const typeCounts = {};
        filledSlots.forEach(slot => {
            typeCounts[slot.type] = (typeCounts[slot.type] || 0) + 1;
        });
        
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count >= 3) {
                this.eliminateBlocks(type, count);
                return;
            }
        }
    }
    
    eliminateBlocks(type, count) {
        const eliminatedBlocks = this.eliminationSlots.filter(s => s && s.type === type);
        
        eliminatedBlocks.forEach(blockData => {
            const block = blockData.element;
            block.style.transform = 'scale(0)';
            block.style.opacity = '0';
            
            setTimeout(() => {
                block.remove();
                this.gameState.blocksOnMap = this.gameState.blocksOnMap.filter(b => b.element !== block);
            }, 300);
        });
        
        this.eliminationSlots = this.eliminationSlots.map(s => {
            if (s && s.type === type) return null;
            return s;
        });
        
        this.selectedBlocks = this.selectedBlocks.filter(b => {
            const blockData = this.gameState.blocksOnMap.find(block => block.element === b);
            return blockData && blockData.type !== type;
        });
        
        this.showReward(type, count);
        this.gameState.eliminatedCount += count;
        
        setTimeout(() => {
            this.updateSlotsDisplay();
            
            if (this.gameState.eliminatedCount >= this.gameState.targetEliminations) {
                this.endGame(true);
            }
        }, 300);
    }
    
    clearSlots() {
        this.eliminationSlots = [null, null, null, null, null];
        this.selectedBlocks.forEach(block => {
            block.classList.remove('selected');
        });
        this.selectedBlocks = [];
        this.updateSlotsDisplay();
    }
    
    showReward(type, count) {
        const rewards = {
            red: { metal: 50, energy: 30 },
            blue: { energy: 50, crystal: 20 },
            green: { crystal: 40, metal: 30 },
            yellow: { coins: 100, energy: 20 }
        };
        
        const reward = rewards[type] || { coins: 50 };
        
        for (const [resource, amount] of Object.entries(reward)) {
            this.resources[resource] += amount * count;
        }
        
        this.showFloatingText(`+${count}x 消除！`, '#00ff88');
    }
    
    showFloatingText(text, color) {
        const floatingText = document.createElement('div');
        floatingText.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${color};
            font-family: 'Orbitron', sans-serif;
            font-size: 32px;
            font-weight: 700;
            text-shadow: 0 0 20px ${color};
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
        
        const blocks = document.querySelectorAll('.game-block:not(.selected)');
        blocks.forEach(block => {
            setTimeout(() => {
                block.classList.add('reward-highlight');
                setTimeout(() => {
                    block.classList.remove('reward-highlight');
                }, 1500);
            }, Math.random() * 500);
        });
        
        this.showFloatingText('扫描完成！', '#00d4ff');
    }
    
    getNeighbors(index) {
        const neighbors = [];
        const row = Math.floor(index / 5);
        const col = index % 5;
        
        if (row > 0) neighbors.push(index - 5);
        if (row < 4) neighbors.push(index + 5);
        if (col > 0) neighbors.push(index - 1);
        if (col < 4) neighbors.push(index + 1);
        
        return neighbors;
    }
    
    undoMove() {
        if (this.selectedBlocks.length === 0) {
            this.showWarning('没有可回溯的操作');
            return;
        }
        
        const lastBlock = this.selectedBlocks[this.selectedBlocks.length - 1];
        this.deselectBlock(lastBlock);
        this.showFloatingText('回溯成功', '#b24bff');
    }
    
    rearrange() {
        if (!this.gameState.isPlaying) return;
        
        const blocks = document.querySelectorAll('.game-block');
        const types = Array.from(blocks).map(block => block.dataset.type);
        
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        
        blocks.forEach((block, index) => {
            block.dataset.type = types[index];
            block.innerHTML = this.blockIcons[types[index]];
            
            setTimeout(() => {
                block.style.transform = 'scale(1.2) rotateY(180deg)';
                setTimeout(() => {
                    block.style.transform = '';
                }, 300);
            }, index * 50);
        });
        
        this.showFloatingText('重组完成！', '#00d4ff');
    }
    
    usePowerUp() {
        if (!this.gameState.isPlaying) return;
        
        const mostCommonType = this.getMostCommonType();
        if (!mostCommonType) return;
        
        const blocks = document.querySelectorAll('.game-block');
        blocks.forEach(block => {
            if (block.dataset.type === mostCommonType && !block.classList.contains('selected')) {
                setTimeout(() => {
                    block.style.transform = 'scale(1.3)';
                    block.style.boxShadow = '0 0 40px rgba(255, 107, 53, 0.8)';
                    setTimeout(() => {
                        block.style.transform = '';
                        block.style.boxShadow = '';
                    }, 500);
                }, Math.random() * 300);
            }
        });
        
        this.showFloatingText('能量激活！', '#ff6b35');
    }
    
    getMostCommonType() {
        const typeCounts = {};
        this.gameState.blocksOnMap.forEach(block => {
            typeCounts[block.type] = (typeCounts[block.type] || 0) + 1;
        });
        
        let mostCommon = null;
        let maxCount = 0;
        
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = type;
            }
        }
        
        return mostCommon;
    }
}

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

const game = new StarExplorationGame();
