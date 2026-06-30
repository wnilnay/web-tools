(function() {
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
        alert('❌ 找不到影片！');
        return;
    }

    let v = allVideos[0];
    v.controls = false; // 關閉原生控制列，準備實作自訂 UI
    v.style.setProperty('width', '100%', 'important');
    v.style.setProperty('height', '100%', 'important');
    v.style.setProperty('object-fit', 'contain', 'important');
    
    // 解決部分框架阻擋點擊的問題
    let p = v.parentElement;
    while (p && p !== document.body) {
        if (p.classList && (p.classList.contains('plyr__video-wrapper') || p.classList.contains('plyr'))) {
            p.style.setProperty('padding-bottom', '0', 'important');
            p.style.setProperty('height', 'auto', 'important');
        }
        p = p.parentElement;
    }

    function showToast(msg) {
        let t = document.createElement('div');
        t.innerText = msg;
        t.style.cssText = 'position:fixed;bottom:10%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 24px;border-radius:24px;z-index:2147483647;font-size:14px;pointer-events:none;transition:opacity 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.3);text-align:center;white-space:pre-wrap;';
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            setTimeout(() => t.remove(), 300)
        }, 2500);
    }
    
    // 請在此處接續寫入「透明防護罩」與「iOS 風格 UI 注入」的邏輯
    showToast('✅ 準備就緒，啟動防護罩與自訂播放器！');
})();
