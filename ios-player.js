(function() {
    // 1. 攔截原始資料流 (找尋 m3u8 網址)
    let streamUrl = '';
    
    // 針對你之前提供的 zanpiancms 架構進行精準攔截
    if (window.player_aaaa && window.player_aaaa.url) {
        streamUrl = window.player_aaaa.url;
    } else if (typeof hlsUrl !== 'undefined') {
        streamUrl = hlsUrl;
    } else {
        // 如果找不到，試著去網頁原始碼裡面暴力搜尋 m3u8
        let html = document.documentElement.innerHTML;
        let match = html.match(/(https?:\/\/[^\s"'<>]*\.m3u8[^\s"'<>]*)/);
        if (match) streamUrl = match[1];
    }

    if (!streamUrl) {
        streamUrl = prompt('❌ 無法自動攔截串流網址！請手動貼上 m3u8 連結：');
        if (!streamUrl) return;
    }

    // 2. 毀滅原網頁 (物理超渡所有的原網站 DOM)
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0; padding:0; background:#000; overflow:hidden; width:100vw; height:100vh; display:flex; justify-content:center; align-items:center;';

    // 建立我們全新的播放器容器
    let container = document.createElement('div');
    container.style.cssText = 'position:relative; width:100%; height:100%; max-width:100%; max-height:100%;';
    document.body.appendChild(container);

    let v = document.createElement('video');
    v.style.cssText = 'width:100%; height:100%; object-fit:contain; background:#000; pointer-events:auto;';
    v.playsInline = true;
    container.appendChild(v);

    // 3. 注入純淨的 HLS 引擎並啟動
    let hlsScript = document.createElement('script');
    hlsScript.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
    hlsScript.onload = () => {
        if (Hls.isSupported()) {
            let hls = new Hls({ maxBufferSize: 0, maxBufferLength: 30 });
            hls.loadSource(streamUrl);
            hls.attachMedia(v);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                v.play().catch(e => console.log('自動播放被阻擋，等待手動點擊'));
            });
        } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari 的原生支援
            v.src = streamUrl;
            v.play();
        }
        
        // 4. 掛載你的自訂 UI (這裡沿用之前的 iOS 手勢控制列)
        mountCustomUI(v, container);
    };
    document.head.appendChild(hlsScript);

    // --- 以下是你專屬的 UI 組件 ---
    function mountCustomUI(videoElement, wrapper) {
        let bar = document.createElement('div');
        bar.style.cssText = 'position:absolute; bottom:30px; left:50%; transform:translateX(-50%); width:90%; max-width:500px; background:rgba(30,30,30,0.75); backdrop-filter:blur(15px); -webkit-backdrop-filter:blur(15px); border-radius:20px; display:flex; flex-direction:column; padding:15px 20px; z-index:9999; box-shadow:0 8px 32px rgba(0,0,0,0.5); transition:opacity 0.3s; user-select:none; font-family:sans-serif;';

        // 進度條
        let progRow = document.createElement('div');
        progRow.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:15px;';
        let timeLbl = document.createElement('span');
        timeLbl.style.cssText = 'color:white; font-size:12px; min-width:80px; text-align:center;';
        timeLbl.innerText = '00:00 / 00:00';
        let rng = document.createElement('input');
        rng.type = 'range'; rng.min = 0; rng.max = 100; rng.value = 0; rng.step = 0.1;
        rng.style.cssText = 'flex-grow:1; height:4px; accent-color:#fff;';
        progRow.appendChild(rng); progRow.appendChild(timeLbl);

        // 按鈕列
        let btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; justify-content:space-evenly; align-items:center;';
        let btnStyle = 'background:none; border:none; color:white; font-size:20px; padding:10px; cursor:pointer;';
        
        let btnRw = document.createElement('button'); btnRw.innerHTML = '↺15'; btnRw.style.cssText = btnStyle;
        let btnPlay = document.createElement('button'); btnPlay.innerHTML = '▶'; btnPlay.style.cssText = btnStyle + 'font-size:28px;';
        let btnFw = document.createElement('button'); btnFw.innerHTML = '↻15'; btnFw.style.cssText = btnStyle;
        let btnFS = document.createElement('button'); btnFS.innerHTML = '⛶'; btnFS.style.cssText = btnStyle;
        
        btnRow.appendChild(btnRw); btnRow.appendChild(btnPlay); btnRow.appendChild(btnFw); btnRow.appendChild(btnFS);
        bar.appendChild(progRow); bar.appendChild(btnRow);
        wrapper.appendChild(bar);

        // 綁定事件
        let fmt = s => {
            if(isNaN(s)) return '00:00';
            let m = Math.floor(s/60), sc = Math.floor(s%60);
            return `${m.toString().padStart(2,'0')}:${sc.toString().padStart(2,'0')}`;
        };

        let isDragging = false;
        videoElement.addEventListener('timeupdate', () => {
            if(!isDragging && videoElement.duration) {
                rng.value = (videoElement.currentTime / videoElement.duration) * 100;
                timeLbl.innerText = `${fmt(videoElement.currentTime)} / ${fmt(videoElement.duration)}`;
            }
        });

        rng.addEventListener('input', (e) => {
            isDragging = true;
            let target = (e.target.value / 100) * videoElement.duration;
            timeLbl.innerText = `${fmt(target)} / ${fmt(videoElement.duration)}`;
        });
        rng.addEventListener('change', (e) => {
            videoElement.currentTime = (e.target.value / 100) * videoElement.duration;
            isDragging = false;
        });

        btnRw.onclick = (e) => { e.stopPropagation(); videoElement.currentTime -= 15; };
        btnFw.onclick = (e) => { e.stopPropagation(); videoElement.currentTime += 15; };
        btnPlay.onclick = (e) => { e.stopPropagation(); videoElement.paused ? videoElement.play() : videoElement.pause(); };
        videoElement.addEventListener('play', () => btnPlay.innerHTML = '⏸');
        videoElement.addEventListener('pause', () => btnPlay.innerHTML = '▶');
        
        btnFS.onclick = (e) => {
            e.stopPropagation();
            if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
            else document.exitFullscreen();
        };

        // 觸控手勢
        let startX=0, startTime=0, isSwiping=false;
        videoElement.addEventListener('touchstart', (e) => {
            if(e.touches.length===1) { startX=e.touches[0].clientX; startTime=videoElement.currentTime; isSwiping=false; }
        });
        videoElement.addEventListener('touchmove', (e) => {
            if(e.touches.length===1) {
                let dx = e.touches[0].clientX - startX;
                if(Math.abs(dx)>10) {
                    isSwiping = true;
                    videoElement.currentTime = Math.max(0, Math.min(startTime + dx*0.3, videoElement.duration));
                    e.preventDefault();
                }
            }
        }, {passive: false});
        videoElement.addEventListener('touchend', () => {
            if(!isSwiping) bar.style.opacity = bar.style.opacity === '0' ? '1' : '0';
        });
    }
})();
