const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');


const bgImage = new Image();
bgImage.src = 'back.jpg';

const playerImage = new Image();
playerImage.src = 'ksiezniczka.jpg';

let processedPlayer = null; 


playerImage.onload = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = playerImage.naturalWidth;
    tempCanvas.height = playerImage.naturalHeight;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(playerImage, 0, 0);
    
    try {
        const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {

            if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
                data[i+3] = 0;
            }
        }
        tCtx.putImageData(imgData, 0, 0);
        processedPlayer = tempCanvas; 
    } catch(e) {
        processedPlayer = playerImage;
    }
};

let gameState = 'loading'; 
const keys = {};

let worldWidth = window.innerWidth;
let worldHeight = window.innerHeight;
let cameraY = 0;
const gravity = 0.5;

const player = {
    x: 0, y: 0, width: 100, height: 100,
    dx: 0, dy: 0, speed: 6, jumpPower: -13, grounded: false
};

const platforms = [];
const goal = { x: 0, y: 0, size: 40 };

const fireworks = [];
const fwColors = ['#ff1493', '#00ffff', '#ffff00', '#ffb6c1', '#00ff00'];

function createFirework() {
    let x = Math.random() * canvas.width;
    let y = Math.random() * (canvas.height / 2);
    let color = fwColors[Math.floor(Math.random() * fwColors.length)];
    
    for (let i = 0; i < 100; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 6 + 2;
        fireworks.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: color,
            life: 1.0,
            decay: Math.random() * 0.02 + 0.015
        });
    }
}


function generateLevel() {
    worldWidth = canvas.width;
    const bgRatio = bgImage.naturalHeight / bgImage.naturalWidth;

    worldHeight = (worldWidth * bgRatio) * 2; 

    platforms.length = 0;
    platforms.push({ x: 0, y: worldHeight - 50, w: worldWidth, h: 50 });

    let floorSpacing = 130; 
    let pWidth = worldWidth * 0.45; 
    let currentY = worldHeight - 50 - floorSpacing;
    let isLeft = true; 

    while (currentY > 100) {
        let pX = isLeft ? 10 : worldWidth - pWidth - 10;
        platforms.push({ x: pX, y: currentY, w: pWidth, h: 20 });
        currentY -= floorSpacing;
        isLeft = !isLeft; 
    }

    const lastP = platforms[platforms.length - 1];
    goal.x = lastP.x + lastP.w / 2 - 20;
    goal.y = lastP.y - 45;

    player.x = worldWidth / 2 - player.width / 2;
    player.y = worldHeight - 150;
    cameraY = worldHeight - canvas.height;
    
    gameState = 'playing';
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (bgImage.complete && bgImage.naturalWidth > 0) {
        generateLevel();
    }
}
window.addEventListener('resize', resize);
resize(); 

bgImage.onload = () => {
    generateLevel();
};


window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

function bindTouch(btnId, keyCode) {
    const btn = document.getElementById(btnId);
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); keys[keyCode] = true; });
    btn.addEventListener('pointerup', (e) => { e.preventDefault(); keys[keyCode] = false; });
    btn.addEventListener('pointerleave', (e) => { e.preventDefault(); keys[keyCode] = false; });
}

bindTouch('btnLeft', 'ArrowLeft');
bindTouch('btnRight', 'ArrowRight');
bindTouch('btnJump', 'ArrowUp');


function update() {
    if (gameState === 'won') {

        if (Math.random() < 0.15) createFirework();
        
        for (let i = fireworks.length - 1; i >= 0; i--) {
            let p = fireworks[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life -= p.decay;
            if (p.life <= 0) fireworks.splice(i, 1);
        }
        return;
    }

    if (gameState !== 'playing') return;

    if (keys['ArrowLeft'] || keys['KeyA']) player.dx = -player.speed;
    else if (keys['ArrowRight'] || keys['KeyD']) player.dx = player.speed;
    else player.dx = 0;

    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && player.grounded) {
        player.dy = player.jumpPower;
        player.grounded = false;
    }

    player.dy += gravity;
    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > worldWidth) player.x = worldWidth - player.width;

    player.grounded = false;
    for (let p of platforms) {
        if (player.dy > 0 &&
            player.x < p.x + p.w && player.x + player.width > p.x &&
            player.y + player.height > p.y && player.y + player.height < p.y + player.dy + 2) {
            player.grounded = true;
            player.dy = 0;
            player.y = p.y - player.height;
        }
    }

    if (player.y > worldHeight) {
        player.y = worldHeight - 150;
        player.dy = 0;
    }

    if (player.x < goal.x + goal.size && player.x + player.width > goal.x &&
        player.y < goal.y + goal.size && player.y + player.height > goal.y) {
        gameState = 'won';
        createFirework();
    }

    let targetCameraY = player.y - canvas.height / 2;
    cameraY += (targetCameraY - cameraY) * 0.1;

    if (cameraY < 0) cameraY = 0; 
    if (cameraY > worldHeight - canvas.height) cameraY = worldHeight - canvas.height;
}


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'loading') {
        ctx.fillStyle = '#ff69b4';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '24px Courier New';
        ctx.fillText('Wczytywanie mapy...', canvas.width/2, canvas.height/2);
        return;
    }

    ctx.save();
    ctx.translate(0, -cameraY);

    const singleBgHeight = worldWidth * (bgImage.naturalHeight / bgImage.naturalWidth);
    ctx.drawImage(bgImage, 0, worldHeight - singleBgHeight, worldWidth, singleBgHeight); 
    ctx.drawImage(bgImage, 0, worldHeight - (singleBgHeight * 2), worldWidth, singleBgHeight);

    for (let p of platforms) {
        ctx.fillStyle = '#fff0f5'; 
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#ff1493'; 
        ctx.fillRect(p.x, p.y, p.w, 4);
        ctx.strokeStyle = '#c71585';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, p.y, p.w, p.h);
    }

    ctx.font = '45px Arial';
    ctx.fillText('🎂', goal.x, goal.y + 40);

    if (gameState === 'playing' || gameState === 'won') {
        if (processedPlayer) {
            ctx.drawImage(processedPlayer, player.x, player.y, player.width, player.height);
        } else {
            ctx.fillStyle = 'yellow';
            ctx.fillRect(player.x, player.y, player.width, player.height);
        }
    }

    ctx.restore(); 

    if (gameState === 'won') {
        ctx.fillStyle = 'rgba(255, 105, 180, 0.7)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let p of fireworks) {
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 6, 6); 
        }
        ctx.globalAlpha = 1.0; 

        ctx.textAlign = 'center';
        ctx.strokeStyle = '#c71585'; 
        ctx.lineWidth = Math.max(2, Math.floor(canvas.width * 0.01));
        ctx.fillStyle = '#fff'; 
        
        let fontSmall = Math.max(14, Math.floor(canvas.width * 0.05));
        let fontBig = Math.max(24, Math.floor(canvas.width * 0.09));

        ctx.font = `bold ${fontSmall}px Courier New`;
        ctx.strokeText('WSZYSTKIEGO NAJLEPSZEGO', canvas.width/2, canvas.height/2 - fontBig);
        ctx.fillText('WSZYSTKIEGO NAJLEPSZEGO', canvas.width/2, canvas.height/2 - fontBig);
        
        ctx.font = `bold ${fontBig}px Courier New`;
        ctx.strokeText('Amelka ❤️🎂 !', canvas.width/2, canvas.height/2 + 10);
        ctx.fillText('Amelka ❤️🎂 !', canvas.width/2, canvas.height/2 + 10);
        
        ctx.font = `bold ${fontSmall}px Courier New`;
        ctx.strokeText('W DNIU 20 URODZIN', canvas.width/2, canvas.height/2 + fontBig + 10);
        ctx.fillText('W DNIU 20 URODZIN', canvas.width/2, canvas.height/2 + fontBig + 10);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();