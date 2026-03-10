// Canvas 工具类
class CanvasUtils {
  constructor(game) {
    this.game = game;
  }

  // 绘制全息面板
  drawHolographicPanel(ctx, x, y, width, height, alpha = 0.8) {
    // 半透明背景
    ctx.fillStyle = `rgba(26, 26, 46, ${alpha})`;
    ctx.fillRect(x, y, width, height);
    
    // 边框发光效果
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // 顶部渐变光效
    const topGrad = ctx.createLinearGradient(x, y, x, y + 20);
    topGrad.addColorStop(0, 'rgba(0, 212, 255, 0.6)');
    topGrad.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(x, y, width, 20);
  }

  // 绘制六边形
  drawHexagon(ctx, x, y, r, fillColor, strokeColor) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i;
      const nx = x + r * Math.cos(angle);
      const ny = y + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(nx, ny);
      } else {
        ctx.lineTo(nx, ny);
      }
    }
    ctx.closePath();
    
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // 绘制圆角矩形
  drawRoundedRect(ctx, x, y, size, radius, color, strokeColor = null) {
    const halfSize = size / 2;
    const left = x - halfSize;
    const top = y - halfSize;
    const right = x + halfSize;
    const bottom = y + halfSize;
    
    ctx.beginPath();
    ctx.moveTo(left + radius, top);
    ctx.lineTo(right - radius, top);
    ctx.quadraticCurveTo(right, top, right, top + radius);
    ctx.lineTo(right, bottom - radius);
    ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
    ctx.lineTo(left + radius, bottom);
    ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
    ctx.lineTo(left, top + radius);
    ctx.quadraticCurveTo(left, top, left + radius, top);
    ctx.closePath();
    
    if (color) {
      ctx.fillStyle = color;
      ctx.fill();
    }
    
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // 绘制带图标的方块
  drawIconOnSquare(ctx, x, y, size, type) {
    const r = size / 2 - 5;
    
    // 绘制方块背景
    this.drawRoundedRect(ctx, x, y, size, 5, null);
    
    // 绘制图案
    this.drawPattern(ctx, x, y, r, type);
    
    // 绘制边框
    this.drawRoundedRect(ctx, x, y, size, 5, null, '#00D4FF');
  }

  // 绘制图案
  drawPattern(ctx, cx, cy, r, type) {
    ctx.save();
    
    switch(type) {
        case 0: // 能量核心 (Energy Core)
            const grad0 = ctx.createRadialGradient(cx, cy, r*0.2, cx, cy, r);
            grad0.addColorStop(0, '#ffffff');
            grad0.addColorStop(0.5, '#00ffff');
            grad0.addColorStop(1, 'transparent');
            ctx.fillStyle = grad0;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI*2);
            ctx.fill();
            break;
        case 1: { // 信号频谱 (Signal Spectrum)
            // 1. 绘制示波器背景网格 (淡绿色)
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.lineWidth = 1;
            const gridStep = r * 0.5;
            // 绘制一个简单的十字坐标
            ctx.beginPath();
            ctx.moveTo(cx, cy - r*0.8);
            ctx.lineTo(cx, cy + r*0.8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx - r*0.8, cy);
            ctx.lineTo(cx + r*0.8, cy);
            ctx.stroke();

            // 2. 绘制主波形 (模拟复杂的信号波)
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.shadowColor = '#00FF00';
            ctx.shadowBlur = 8;
            
            ctx.beginPath();
            const waveWidth = r * 1.6;
            const startX = cx - waveWidth / 2;
            
            for (let x = 0; x <= waveWidth; x += 3) {
                // 叠加两个正弦波，产生更具科技感的干涉波形
                const normalizedX = x / waveWidth;
                const angle = normalizedX * Math.PI * 6; // 3 periods
                
                // 主波 + 次波
                const yOffset = Math.sin(angle) * (r * 0.35) + Math.cos(angle * 2.5) * (r * 0.15);
                
                // 衰减系数 (两端低，中间高，模拟脉冲)
                const envelope = Math.sin(normalizedX * Math.PI);
                
                const y = cy + yOffset * envelope;
                
                if (x === 0) ctx.moveTo(startX + x, y);
                else ctx.lineTo(startX + x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // 3. 装饰：二进制数据点
            ctx.fillStyle = '#ccffcc'; // 亮绿白
            ctx.font = `${r*0.3}px Arial`; // 无衬线字体更现代
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 在波峰波谷附近添加数字
            ctx.fillText('1', cx - r*0.4, cy - r*0.5);
            ctx.fillText('0', cx + r*0.5, cy + r*0.5);
            
            // 添加几个随机的小方块点缀，增加数字感
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(cx + r*0.2, cy - r*0.3, 3, 3);
            ctx.fillRect(cx - r*0.3, cy + r*0.2, 3, 3);
            ctx.fillRect(cx + r*0.6, cy - r*0.1, 2, 2);
            break;
        }
        case 2: // 星际传送门 (Stargate)
            // 1. 外环结构
            ctx.strokeStyle = '#9C88FF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.9, 0, Math.PI*2);
            ctx.stroke();
            
            // 2. 内部事件视界 (漩涡感)
            const grad2 = ctx.createRadialGradient(cx, cy, r*0.1, cx, cy, r*0.8);
            grad2.addColorStop(0, '#ffffff');
            grad2.addColorStop(0.4, '#9C88FF');
            grad2.addColorStop(1, 'transparent');
            ctx.fillStyle = grad2;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.8, 0, Math.PI*2);
            ctx.fill();
            
            // 3. 锁定点 (Chevrons) - 7个方位
            ctx.fillStyle = '#E0E0E0';
            for(let i=0; i<7; i++) {
                const angle = i * (Math.PI*2 / 7) - Math.PI/2; // 从顶部开始
                const chevronR = r * 0.9;
                
                ctx.save();
                ctx.translate(cx + Math.cos(angle) * chevronR, cy + Math.sin(angle) * chevronR);
                ctx.rotate(angle + Math.PI/2); // 旋转以指向中心
                
                // 绘制三角形锁定块
                ctx.beginPath();
                ctx.moveTo(-r*0.15, 0);
                ctx.lineTo(r*0.15, 0);
                ctx.lineTo(0, r*0.2); // 指向外
                ctx.fill();
                
                ctx.restore();
            }
            break;
        case 3: // 全息飞船 (Holographic Ship)
            ctx.fillStyle = '#00D4FF';
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r*0.6, cy + r);
            ctx.lineTo(cx, cy + r*0.7);
            ctx.lineTo(cx - r*0.6, cy + r);
            ctx.fill();
            break;
        case 4: // 精密电路 (Precision Circuit)
            ctx.strokeStyle = '#00FFAB';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - r, cy);
            ctx.lineTo(cx - r*0.5, cy);
            ctx.lineTo(cx - r*0.5, cy - r*0.5);
            ctx.lineTo(cx + r*0.5, cy - r*0.5);
            ctx.lineTo(cx + r*0.5, cy + r*0.5);
            ctx.lineTo(cx + r, cy + r*0.5);
            ctx.stroke();
            ctx.fillStyle = '#00FFAB';
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.2, 0, Math.PI*2);
            ctx.fill();
            break;
        case 5: // 复合装甲 (Composite Armor)
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(cx - r*0.8, cy - r*0.8, r*1.6, r*1.6);
            ctx.fillStyle = '#bdc3c7'; // 铆钉
            ctx.beginPath();
            ctx.arc(cx - r*0.6, cy - r*0.6, r*0.1, 0, Math.PI*2);
            ctx.arc(cx + r*0.6, cy - r*0.6, r*0.1, 0, Math.PI*2);
            ctx.arc(cx - r*0.6, cy + r*0.6, r*0.1, 0, Math.PI*2);
            ctx.arc(cx + r*0.6, cy + r*0.6, r*0.1, 0, Math.PI*2);
            ctx.fill();
            break;
        case 6: // 相位水晶 (Phase Crystal)
            ctx.fillStyle = '#FF00FF';
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r*0.7, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r*0.7, cy);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx, cy + r);
            ctx.moveTo(cx - r*0.7, cy);
            ctx.lineTo(cx + r*0.7, cy);
            ctx.stroke();
            break;
        case 7: // 辐射警示 (Radiation Warning) -> Quantum Hazard
            // 绘制橙红色全息三角
            ctx.strokeStyle = '#FF4500'; // OrangeRed
            // 动态线宽
            const lw7 = Math.max(1, r * 0.03);
            ctx.lineWidth = lw7;
            ctx.shadowColor = '#FF4500';
            ctx.shadowBlur = 10;
            
            // 三角形路径
            const h = r * 0.8;
            ctx.beginPath();
            ctx.moveTo(cx, cy - h);
            ctx.lineTo(cx + h, cy + h);
            ctx.lineTo(cx - h, cy + h);
            ctx.closePath();
            ctx.stroke();
            
            // 内部感叹号
            ctx.fillStyle = '#FF4500';
            const rectW = Math.max(2, r * 0.06);
            ctx.beginPath();
            ctx.rect(cx - rectW/2, cy - h/2, rectW, h);
            ctx.fill();
            const dotR = Math.max(1.5, r * 0.04);
            ctx.beginPath();
            ctx.arc(cx, cy + h/2 + dotR*2, dotR, 0, Math.PI*2);
            ctx.fill();
            
            // Glitch 效果 (固定位置，不再随机，确保 UI 和 3D 一致)
            // 只有当尺寸足够大时才绘制 Glitch，或者绘制一个非常简单的固定 Glitch
            if (r > 10) {
                 const glitchY = cy + 0.2 * h; // 固定位置
                 const glitchW = r * 1.5;
                 const glitchH = Math.max(1, r * 0.05);
                 ctx.fillStyle = 'rgba(255, 69, 0, 0.5)';
                 ctx.fillRect(cx - glitchW/2, glitchY, glitchW, glitchH);
            }
            ctx.shadowBlur = 0;
            break;
        case 8: // 太阳能板 (Solar Panel) -> Photonic Array
            ctx.fillStyle = '#000080'; // Navy
            const hexR = r * 0.3;
            // 绘制蜂巢状阵列
            const offsets = [
                {x: 0, y: 0},
                {x: 0, y: -hexR*1.8},
                {x: 0, y: hexR*1.8},
                {x: -hexR*1.6, y: -hexR*0.9},
                {x: -hexR*1.6, y: hexR*0.9},
                {x: hexR*1.6, y: -hexR*0.9},
                {x: hexR*1.6, y: hexR*0.9}
            ];
            
            // 使用伪随机或固定索引来决定哪些点亮，确保 UI (每帧重绘) 和 3D (静态纹理) 一致
            offsets.forEach((pos, index) => {
                this.drawHexagon(ctx, cx + pos.x, cy + pos.y, hexR, '#000080', '#4169E1');
                
                // 固定亮点的逻辑：例如索引为 0, 3, 6 的板子上有亮点
                // 或者基于时间 (如果是 UI) -> 但为了 3D 一致性，最好是静态的
                // 这里我们选择固定的装饰，或者移除闪烁
                const shouldLightUp = (index % 3 === 0); 
                
                if (shouldLightUp) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // 稍微柔和一点
                    ctx.beginPath();
                    // 动态大小
                    const dotSize = Math.max(1, r * 0.05);
                    ctx.arc(cx + pos.x, cy + pos.y, dotSize, 0, Math.PI*2);
                    ctx.fill();
                }
            });
            break;
        case 9: // 扫描网格 (Scan Grid) -> Active Radar
            ctx.strokeStyle = '#00D4FF';
            const radarLW = Math.max(1, r * 0.03);
            ctx.lineWidth = radarLW;
            
            // 同心圆
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.3, 0, Math.PI*2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.6, 0, Math.PI*2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.9, 0, Math.PI*2);
            ctx.stroke();
            
            // 扫描线 (固定角度，UI和3D一致)
            const angle9 = Math.PI * 1.75; // -45度
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle9) * r, cy + Math.sin(angle9) * r);
            ctx.stroke();
            
            // 扫描扇区渐变
            const scanGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            scanGrad.addColorStop(0, 'rgba(0, 212, 255, 0.5)');
            scanGrad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = scanGrad;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, angle9 - Math.PI/4, angle9);
            ctx.lineTo(cx, cy);
            ctx.fill();
            break;
        case 10: // 虫洞视界 (Wormhole Horizon)
            const grad10 = ctx.createRadialGradient(cx, cy, r*0.3, cx, cy, r);
            grad10.addColorStop(0, '#000000');
            grad10.addColorStop(0.5, '#FF9A3C');
            grad10.addColorStop(1, '#9C88FF');
            ctx.fillStyle = grad10;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI*2);
            ctx.fill();
            break;
        case 11: // 信号波纹 (Signal Ripple) -> Hex-Pulse Sonar
            ctx.strokeStyle = '#00FFAB'; // Bright Cyan-Green
            ctx.lineWidth = Math.max(1, r * 0.03);
            
            // 绘制多层六边形波纹
            for(let i=1; i<=3; i++) {
                const hexR = r * i / 3.5;
                const alpha = 1.0 - (i * 0.2); // 外层渐淡
                
                ctx.globalAlpha = alpha;
                this.drawHexagon(ctx, cx, cy, hexR, null, '#00FFAB');
                
                // 每个角的数据节点
                if (i === 2 || i === 3) {
                    for(let j=0; j<6; j++) {
                        const angle = Math.PI / 3 * j;
                        const nx = cx + hexR * Math.cos(angle);
                        const ny = cy + hexR * Math.sin(angle);
                        
                        ctx.fillStyle = '#FFFFFF';
                        const dotR = Math.max(1, r * 0.02);
                        ctx.beginPath();
                        ctx.arc(nx, ny, dotR, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
            }
            ctx.globalAlpha = 1.0;
            
            // 中心发射源
            ctx.fillStyle = '#00FFAB';
            ctx.shadowColor = '#00FFAB';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.15, 0, Math.PI*2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            break;
        case 12: // 危险条纹 (Danger Stripe) -> Laser Barrier
            // 1. 深红背景
            ctx.fillStyle = '#300000';
            ctx.fillRect(cx - r, cy - r, r*2, r*2);
            
            // 2. 绘制水平激光束
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 10;
            
            for(let i=-2; i<=2; i++) {
                const beamY = cy + i * r * 0.6;
                
                // 激光核心 (白)
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx - r, beamY);
                ctx.lineTo(cx + r, beamY);
                ctx.stroke();
                
                // 激光外晕 (红)
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(cx - r, beamY);
                ctx.lineTo(cx + r, beamY);
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
            break;
        case 13: // 加密矩阵 (Encryption Matrix)
            ctx.fillStyle = '#ffffff';
            const cellSize = r*2 / 4;
            // 使用伪随机数生成器，基于种子 (例如 cx, cy)
            // 简单哈希函数
            const seed = Math.floor(cx * cy);
            let random = function() {
                const x = Math.sin(seed++) * 10000;
                return x - Math.floor(x);
            };
            
            // 或者直接固定图案，不再随机
            // 为了美观，我们绘制一个固定的矩阵图案
            const matrixPattern = [
                [1, 0, 1, 1],
                [0, 1, 0, 1],
                [1, 1, 0, 0],
                [1, 0, 1, 0]
            ];
            
            for(let i=0; i<4; i++) {
                for(let j=0; j<4; j++) {
                    if (matrixPattern[j][i]) {
                        ctx.fillRect(cx - r + i*cellSize + 2, cy - r + j*cellSize + 2, cellSize-4, cellSize-4);
                    }
                }
            }
            break;
        case 14: // 推进尾焰 (Thruster Flame)
            const grad14 = ctx.createLinearGradient(cx, cy-r, cx, cy+r);
            grad14.addColorStop(0, '#3742FA');
            grad14.addColorStop(1, '#FF9A3C');
            ctx.fillStyle = grad14;
            ctx.beginPath();
            ctx.moveTo(cx, cy - r);
            ctx.quadraticCurveTo(cx + r, cy, cx, cy + r);
            ctx.quadraticCurveTo(cx - r, cy, cx, cy - r);
            ctx.fill();
            break;
        case 15: // 星际罗盘 (Star Compass) - 替代原来的星域图
            // 1. 深色背景圆盘
            ctx.fillStyle = '#0F0F2F';
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.9, 0, Math.PI*2);
            ctx.fill();
            
            // 2. 外圈刻度环
            ctx.strokeStyle = '#B0C4DE'; // LightSteelBlue
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.85, 0, Math.PI*2);
            ctx.stroke();
            
            // 刻度线
            for (let i = 0; i < 12; i++) {
                const angle = i * Math.PI / 6;
                const innerR = (i % 3 === 0) ? r * 0.7 : r * 0.8;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
                ctx.lineTo(cx + Math.cos(angle) * r * 0.85, cy + Math.sin(angle) * r * 0.85);
                ctx.stroke();
            }
            
            // 3. 内部旋转环 (金色)
            ctx.strokeStyle = '#FFD700'; // Gold
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 5;
            
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.5, 0, Math.PI*2);
            ctx.stroke();
            
            // 4. 指针 (菱形)
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.7); // 北
            ctx.lineTo(cx + r * 0.15, cy);
            ctx.lineTo(cx, cy + r * 0.3); // 南 (短)
            ctx.lineTo(cx - r * 0.15, cy);
            ctx.closePath();
            ctx.fill();
            
            // 中心轴
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.08, 0, Math.PI*2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            break;
        case 16: // 护盾力场 (Shield Field)
            ctx.strokeStyle = '#00D4FF';
            ctx.lineWidth = 1;
            this.drawHexagon(ctx, cx, cy, r*0.9, null, '#00D4FF');
            this.drawHexagon(ctx, cx, cy, r*0.5, null, '#00D4FF');
            break;
        case 17: // 异星生态 (Alien Ecology)
            ctx.strokeStyle = '#00D8D6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.bezierCurveTo(cx+r, cy-r, cx-r, cy-r, cx, cy-r*0.5);
            ctx.bezierCurveTo(cx+r, cy+r, cx-r, cy+r, cx, cy+r*0.5);
            ctx.stroke();
            break;
        case 18: // 像素星座 (Pixel Constellation)
            ctx.fillStyle = '#ffffff';
            const px = r*0.4;
            ctx.fillRect(cx - px, cy - px, px, px);
            ctx.fillRect(cx + px*0.5, cy, px, px);
            ctx.fillRect(cx - px*1.5, cy + px*0.5, px, px);
            break;
        case 19: // 电弧过载 (Arc Overload)
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - r*0.8, cy - r*0.8);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx - r*0.4, cy + r*0.4);
            ctx.lineTo(cx + r*0.8, cy + r*0.8);
            ctx.stroke();
            break;
        case 20: // 几何迷彩 (Geometric Camo)
            ctx.fillStyle = '#bdc3c7'; // 亮银灰
            ctx.beginPath();
            ctx.moveTo(cx - r, cy - r);
            ctx.lineTo(cx, cy - r);
            ctx.lineTo(cx - r, cy);
            ctx.fill();
            ctx.fillStyle = '#3498db'; // 亮蓝色
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + r, cy);
            ctx.lineTo(cx + r, cy + r);
            ctx.fill();
            break;
        case 21: // 外星腐蚀 (Alien Corrosion)
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(cx-r, cy-r, r*2, r*2);
            ctx.fillStyle = '#2ecc71'; // 腐蚀绿
            
            // 固定腐蚀点位置
            const corrosionSpots = [
                {x: 0, y: 0},
                {x: 0.3, y: -0.3},
                {x: -0.4, y: 0.2},
                {x: 0.2, y: 0.5},
                {x: -0.2, y: -0.4}
            ];
            
            corrosionSpots.forEach(pos => {
                ctx.beginPath();
                ctx.arc(cx + pos.x * r, cy + pos.y * r, r*0.2, 0, Math.PI*2);
                ctx.fill();
            });
            break;
        case 22: // 导航信标 (Navigation Beacon)
            ctx.fillStyle = '#FF4757';
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.4, 0, Math.PI*2);
            ctx.fill();
            ctx.strokeStyle = '#FF4757';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.7, 0, Math.PI*2);
            ctx.stroke();
            break;
        case 23: // 势力徽章 (Faction Badge) -> Cosmic Insignia
            ctx.fillStyle = '#E6E6E6';
            ctx.shadowColor = '#FFD700'; // Gold glow
            ctx.shadowBlur = 10;
            
            // 绘制双翼/星形徽章
            ctx.beginPath();
            ctx.moveTo(cx, cy - r * 0.9); // Top tip
            ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 0.3, cx + r * 0.9, cy - r * 0.5); // Right wing tip
            ctx.quadraticCurveTo(cx + r * 0.4, cy + r * 0.2, cx, cy + r * 0.8); // Bottom tip
            ctx.quadraticCurveTo(cx - r * 0.4, cy + r * 0.2, cx - r * 0.9, cy - r * 0.5); // Left wing tip
            ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 0.3, cx, cy - r * 0.9); // Back to top
            ctx.closePath();
            
            // 填充渐变金银色
            const grad23 = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
            grad23.addColorStop(0, '#C0C0C0'); // Silver
            grad23.addColorStop(0.5, '#FFD700'); // Gold
            grad23.addColorStop(1, '#C0C0C0'); // Silver
            ctx.fillStyle = grad23;
            ctx.fill();
            
            // 内部细节
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            break;
        default:
            // 默认圆形
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx, cy, r*0.5, 0, Math.PI*2);
            ctx.fill();
    }
    ctx.restore();
  }

  // 绘制星星
  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
      let rot = Math.PI / 2 * 3;
      let x = cx;
      let y = cy;
      let step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
          x = cx + Math.cos(rot) * outerRadius;
          y = cy + Math.sin(rot) * outerRadius;
          ctx.lineTo(x, y);
          rot += step;

          x = cx + Math.cos(rot) * innerRadius;
          y = cy + Math.sin(rot) * innerRadius;
          ctx.lineTo(x, y);
          rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
  }
}

module.exports = {
  default: CanvasUtils
};