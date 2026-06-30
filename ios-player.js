(function() {
    let uiKillList = ['.plyr__controls', '.plyr__ads', '.plyr__poster', '.plyr__preview-scrubbing', '.vjs-control-bar', '.vjs-poster', '.dplayer-controller', '.dplayer-mask', '.jw-controls', '.jw-overlays'];

    // 註：因為要改用自訂 UI，你可能需要幫我把這個強制原生控制列顯示的 injectStyle 邏輯移除或修改
    function injectStyle(doc) {
        if (!doc || doc.getElementById('force-controls')) return;
        let s = doc.createElement('style');
        s.id = 'force-controls';
        s.innerHTML = 'video::-webkit-media-controls,video::-webkit-media-controls-enclosure,video::-webkit-media-controls-panel{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}';
        if (doc.head) doc.head.appendChild(s);
    }

    function nukeUI(root) {
        try {
            if (root.nodeType === 9) injectStyle(root);
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

    allVideos.forEach(v => {
        v.controls = true; // 請幫我改成 false，並實作自訂 UI
        v.style.setProperty('width', '100%', 'important');
        v.style.setProperty('height', '100%', 'important');
        v.style.setProperty('object-fit', 'contain', 'important');
        v.style.setProperty('pointer-events', 'auto', 'important');
        v.style.setProperty('display', 'block', 'important');
        v.style.setProperty('visibility', 'visible', 'important');
        v.style.setProperty('opacity', '1', 'important');
        v.style.setProperty('z-index', '2147483647', 'important');
        v.style.setProperty('position', 'relative', 'important');
        
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
    });

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
    
    // 請在此處接續寫入 UI 注入與事件綁定的邏輯
    showToast('✅ 影片已接管，請準備注入自訂 UI！');
})();
