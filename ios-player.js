(function() {
    // --- 1. UI 清除模組 (炸毀干擾物) ---
    function showToast(msg) {
        let t = document.createElement('div');
        t.innerText = msg;
        t.style.cssText = 'position:fixed;bottom:10%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 24px;border-radius:24px;z-index:2147483647;font-size:14px;pointer-events:none;transition:opacity 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.3);text-align:center;white-space:pre-wrap;';
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 300);
        }, 2500);
    }

    let uiKillList = ['.plyr__controls', '.plyr__ads', '.plyr__poster', '.plyr__preview-scrubbing', '.vjs-control-bar', '.vjs-poster', '.dplayer-controller', '.dplayer-mask', '.jw-controls', '.jw-overlays'];
    
    function nukeUI(root) {
        try {
            root.querySelectorAll(uiKillList.join(',')).forEach(el => el.remove());
            root.querySelectorAll('iframe').forEach(ifr => {
                try {
                    let doc = ifr.contentDocument || ifr.contentWindow.document;
                    if (doc) nukeUI(doc);
                } catch (e) {}
            });
        } catch (e) {}
    }
    nukeUI(document);

    // --- 2. 深度搜尋影片模組 ---
    function findVideos(root) {
        let vids = [];
        try {
            vids.push(...root.querySelectorAll('video'));
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) vids.push(...findVideos(el.shadowRoot));
            });
            root.querySelectorAll('iframe').forEach(ifr => {
                try {
                    let doc = ifr.contentDocument || ifr.contentWindow.document;
                    if (doc) vids.push(...findVideos(doc));
                } catch (e) {}
            });
        } catch (e) {}
        return vids;
    }

    let allVideos = findVideos(document);
    if (allVideos.length === 0) {
        showToast('❌ 找不到影片！可能被跨網域阻擋。');
        return;
    }

    // --- 3. 影片接管與樣式重置 ---
    let v = allVideos[0];
    v.controls = false;
    v.style.setProperty('width', '100%', 'important');
    v.style.setProperty('height', '100%', 'important');
    v.style.setProperty('object-fit', 'contain', 'important');
    v.style.setProperty('pointer-events', 'auto', 'important');

    let p = v.parentElement;
    while (p && p !== document.body) {
        if (window.getComputedStyle(p).pointerEvents === 'none') {
            p.style.setProperty('pointer-events', 'auto', 'important');
        }
        if (p.classList && (p.classList.contains('plyr__video-wrapper') || p.classList.contains('plyr'))) {
            p.style.setProperty('padding-bottom', '0', 'important');
            p.style.setProperty('height', 'auto', 'important');
        }
        p = p.parentElement;
    }

    // --- 4. 構建 iOS 風格控制列 ---
    let oldBar = document.getElementById('my-ios-bar');
    if (oldBar) oldBar.remove();

    let bar = document.createElement('div');
    bar.id = 'my-ios-bar';
    bar.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);width:90%;max-width:500px;background:rgba(30,30,30,0.75);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);border-radius:20px;display:flex;flex-direction:column;padding:15px 20px;z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,0.5);transition:opacity 0.3s;user-select:none;font-family:sans-serif;';

    // 進度條區塊
    let progRow = document.createElement('div');
    progRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:15px;';
    let timeLbl = document.createElement('span');
    timeLbl.style.cssText = 'color:white;font-size:12px;min-width:80px;text-align:center;';
    timeLbl.innerText = '00:00 / 00:00';
    let rng = document.createElement('input');
    rng.type = 'range'; rng.min = 0; rng.max = 100; rng.value = 0; rng.step = 0.1;
    rng.style.cssText = 'flex-grow:1;height:4px;accent-color:#fff;';
    progRow.appendChild(rng);
    progRow.appendChild(timeLbl);

    // 控制按鈕區塊
    let btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:space-evenly;align-items:center;';
    let btnStyle = 'background:none;border:none;color:white;font-size:20px;padding:10px;cursor:pointer;';
    
    let btnRw = document.createElement('button'); btnRw.innerHTML = '↺15'; btnRw.style.cssText = btnStyle;
    let btnPlay = document.createElement('button'); btnPlay.innerHTML = v.paused ? '▶' : '⏸'; btnPlay.style.cssText = btnStyle + 'font-size:28px;';
    let btnFw = document.createElement('button'); btnFw.innerHTML = '↻15'; btnFw.style.cssText = btnStyle;
    let btnFS = document.createElement('button'); btnFS.innerHTML = '⛶'; btnFS.style.cssText = btnStyle;
    
    btnRow.appendChild(btnRw); btnRow.appendChild(btnPlay); btnRow.appendChild(btnFw); btnRow.appendChild(btnFS);
    bar.appendChild(progRow); bar.appendChild(btnRow);
    document.body.appendChild(bar);

    // --- 5. 綁定播放與進度條事件 ---
    let fmt = (s) => {
        if (isNaN(s)) return '00:00';
        let m = Math.floor(s / 60), sc = Math.floor(s % 60);
        return `${m.toString().padStart(2, '0')}:${sc.toString().padStart(2, '0')}`;
    };

    let isDragging = false;
    v.addEventListener('timeupdate', () => {
        if (!isDragging && v.duration) {
            rng.value = (v.currentTime / v.duration) * 100;
            timeLbl.innerText = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
        }
    });

    rng.addEventListener('input', (e) => {
        isDragging = true;
        let target = (e.target.value / 100) * v.duration;
        timeLbl.innerText = `${fmt(target)} / ${fmt(v.duration)}`;
    });

    rng.addEventListener('change', (e) => {
        v.currentTime = (e.target.value / 100) * v.duration;
        isDragging = false;
    });

    btnRw.onclick = (e) => { e.stopPropagation(); v.currentTime -= 15; };
    btnFw.onclick = (e) => { e.stopPropagation(); v.currentTime += 15; };
    btnPlay.onclick = (e) => { e.stopPropagation(); if (v.paused) v.play(); else v.pause(); };
    v.addEventListener('play', () => btnPlay.innerHTML = '⏸');
    v.addEventListener('pause', () => btnPlay.innerHTML = '▶');
    
    btnFS.onclick = (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => {});
        else document.exitFullscreen();
    };

    // --- 6. 綁定觸控滑動手勢 (Swipe to Seek) ---
    let startX = 0, startTime = 0, isSwiping = false;
    v.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            startX = e.touches[0].clientX;
            startTime = v.currentTime;
            isSwiping = false;
        }
    });

    v.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            let deltaX = e.touches[0].clientX - startX;
            if (Math.abs(deltaX) > 10) {
                isSwiping = true;
                // 0.3 是靈敏度，滑動 1 像素等於 0.3 秒，可自行微調
                let newT = startTime + (deltaX * 0.3);
                v.currentTime = Math.max(0, Math.min(newT, v.duration));
                e.preventDefault(); 
            }
        }
    }, { passive: false });

    v.addEventListener('touchend', (e) => {
        if (!isSwiping) {
            // 單點擊螢幕，切換控制列顯示/隱藏
            bar.style.opacity = bar.style.opacity === '0' ? '1' : '0';
            bar.style.pointerEvents = bar.style.opacity === '0' ? 'none' : 'auto';
        }
    });

    showToast('✅ iOS 播放器與手勢已啟用！\n(點擊畫面可隱藏/顯示控制列)');
})();
