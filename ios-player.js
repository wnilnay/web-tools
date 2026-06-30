(function() {
    // Remove third-party player UI elements
    var kill = ['.plyr__controls','.plyr__ads','.plyr__poster','.plyr__preview-scrubbing','.vjs-control-bar','.vjs-poster','.dplayer-controller','.dplayer-mask','.jw-controls','.jw-overlays'];
    function nuke(r) {
        try {
            r.querySelectorAll(kill.join(',')).forEach(function(e) { e.remove(); });
            r.querySelectorAll('iframe').forEach(function(f) {
                try { var d = f.contentDocument || f.contentWindow.document; if (d) nuke(d); } catch(e) {}
            });
        } catch(e) {}
    }
    nuke(document);

    // Aggressive cleanup: keep nuking player UI for 5s (handles dynamic re-renders)
    var cleanupTimer = setInterval(function() { nuke(document); }, 800);
    setTimeout(function() { clearInterval(cleanupTimer); }, 5000);

    // Find all video elements (including shadow DOM & iframes)
    function findVids(r) {
        var v = [];
        try {
            v.push.apply(v, r.querySelectorAll('video'));
            r.querySelectorAll('*').forEach(function(e) { if (e.shadowRoot) v.push.apply(v, findVids(e.shadowRoot)); });
            r.querySelectorAll('iframe').forEach(function(f) {
                try { var d = f.contentDocument || f.contentWindow.document; if (d) v.push.apply(v, findVids(d)); } catch(e) {}
            });
        } catch(e) {}
        return v;
    }

    var videos = findVids(document);
    if (videos.length === 0) { alert('找不到影片！'); return; }

    // Inject global CSS
    (function() {
        var id = 'ios-plyr-style';
        if (document.getElementById(id)) return;
        var s = document.createElement('style');
        s.id = id;
        s.textContent = [
            '.ios-shield{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;z-index:2147483646!important;background:transparent!important;touch-action:none!important}',
            '.ios-ctrl{position:absolute!important;bottom:0!important;left:0!important;right:0!important;z-index:2147483647!important;padding:30px 16px 12px!important;background:linear-gradient(transparent,rgba(0,0,0,.7))!important;-webkit-backdrop-filter:blur(20px)!important;backdrop-filter:blur(20px)!important;transition:opacity .3s,transform .3s!important}',
            '.ios-ctrl.hide{opacity:0!important;transform:translateY(100%)!important;pointer-events:none!important}',
            '.ios-time{color:rgba(255,255,255,.8)!important;font-size:12px!important;font-family:-apple-system,Helvetica,sans-serif!important;text-align:center!important;margin-bottom:8px!important}',
            '.ios-bar{-webkit-appearance:none!important;appearance:none!important;width:100%!important;height:3px!important;border-radius:2px!important;background:rgba(255,255,255,.25)!important;outline:none!important;margin-bottom:12px!important;cursor:pointer!important}',
            '.ios-bar::-webkit-slider-thumb{-webkit-appearance:none!important;width:14px!important;height:14px!important;border-radius:50%!important;background:#fff!important;border:none!important;box-shadow:0 1px 4px rgba(0,0,0,.3)!important}',
            '.ios-bar::-moz-range-thumb{width:14px!important;height:14px!important;border-radius:50%!important;background:#fff!important;border:none!important}',
            '.ios-row{display:flex!important;align-items:center!important;justify-content:space-between!important}',
            '.ios-btn{background:none!important;border:none!important;color:#fff!important;font-size:18px!important;padding:8px!important;min-width:44px!important;min-height:44px!important;cursor:pointer!important;-webkit-tap-highlight-color:transparent!important;user-select:none!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:50%!important}',
            '.ios-btn:active{background:rgba(255,255,255,.15)!important}',
            '.ios-play{font-size:32px!important}',
            '.ios-label{font-size:12px!important;font-weight:600!important}'
        ].join('');
        document.head.appendChild(s);
    })();

    videos.forEach(function(v) {
        // Prevent double-wrapping
        if (v._iosDone) return;
        v._iosDone = true;

        // ---- Step 1: Disable native controls and style video ----
        v.controls = false;
        v.style.setProperty('width','100%','important');
        v.style.setProperty('height','100%','important');
        v.style.setProperty('object-fit','contain','important');
        v.style.setProperty('pointer-events','none','important'); // All events go to shield
        v.style.setProperty('display','block','important');
        v.style.setProperty('visibility','visible','important');
        v.style.setProperty('opacity','1','important');
        v.style.setProperty('position','relative','important');
        v.style.setProperty('z-index','0','important');

        // Fix ancestor pointer-events
        var p = v.parentElement;
        while (p && p !== document.body) {
            if (window.getComputedStyle(p).pointerEvents === 'none') {
                p.style.setProperty('pointer-events','auto','important');
            }
            if (p.classList && (p.classList.contains('plyr__video-wrapper') || p.classList.contains('plyr'))) {
                p.style.setProperty('padding-bottom','0','important');
                p.style.setProperty('height','auto','important');
            }
            p = p.parentElement;
        }

        // ---- Step 2: Create wrapper container ----
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;display:block;width:100%;height:100%;z-index:2147483645;';
        v.parentNode.insertBefore(wrap, v);
        wrap.appendChild(v);

        // ---- Step 3: Create Event Shield (transparent overlay) ----
        var shield = document.createElement('div');
        shield.className = 'ios-shield';
        wrap.appendChild(shield);

        // ---- Step 4: Create iOS-style Controls Bar ----
        var ctrl = document.createElement('div');
        ctrl.className = 'ios-ctrl';
        ctrl.innerHTML = [
            '<div class="ios-time">0:00 / 0:00</div>',
            '<input type="range" class="ios-bar" min="0" max="1000" value="0">',
            '<div class="ios-row">',
                '<button class="ios-btn" data-a="rw"><span class="ios-label">\u21BA 15</span></button>',
                '<button class="ios-btn ios-play" data-a="pp">\u25B6</button>',
                '<button class="ios-btn" data-a="ff"><span class="ios-label">15 \u21BB</span></button>',
                '<button class="ios-btn" data-a="fs">\u26F6</button>',
            '</div>'
        ].join('');
        wrap.appendChild(ctrl);

        // ---- Step 5: Cache DOM refs for the controls ----
        var tm = ctrl.querySelector('.ios-time');
        var bar = ctrl.querySelector('.ios-bar');
        var playBtn = ctrl.querySelector('[data-a="pp"]');

        // ---- Step 6: Helper functions ----
        function fmt(t) {
            if (isNaN(t) || !isFinite(t)) return '0:00';
            var m = Math.floor(t / 60);
            var s = Math.floor(t % 60);
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        function upd() {
            if (!v || v._dead) return;
            var d = v.duration || 0;
            var ct = v.currentTime || 0;
            if (d) bar.value = (ct / d * 1000);
            tm.textContent = fmt(ct) + ' / ' + fmt(d);
        }

        // ---- Step 7: Show / hide controls with auto-hide timer ----
        var hideTimer = null;
        function showCtrl() { ctrl.classList.remove('hide'); resetTimer(); }
        function hideCtrl() { ctrl.classList.add('hide'); }
        function resetTimer() { if (hideTimer) clearTimeout(hideTimer); hideTimer = setTimeout(hideCtrl, 4000); }
        function toggleCtrl() { if (ctrl.classList.contains('hide')) showCtrl(); else { hideCtrl(); if (hideTimer) clearTimeout(hideTimer); } }

        // ---- Step 8: Touch / click events on the Shield (NOT on video) ----
        var tX = 0, tY = 0, tT = 0, swiping = false;

        shield.addEventListener('touchstart', function(e) {
            tX = e.touches[0].clientX;
            tY = e.touches[0].clientY;
            tT = Date.now();
            swiping = false;
            e.stopPropagation(); e.preventDefault();
        }, { passive: false });

        shield.addEventListener('touchmove', function(e) {
            var dx = e.touches[0].clientX - tX;
            var dy = e.touches[0].clientY - tY;
            if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swiping = true;
            e.stopPropagation(); e.preventDefault();
        }, { passive: false });

        shield.addEventListener('touchend', function(e) {
            var dx = e.changedTouches[0].clientX - tX;
            var dt = Date.now() - tT;
            if (swiping && Math.abs(dx) > 30) {
                // Swipe-based seek: full screen width = 30 seconds
                var sec = (dx / window.innerWidth) * 30;
                var nt = Math.max(0, Math.min((v.duration || 0), (v.currentTime || 0) + sec));
                v.currentTime = nt;
                upd();
                toast((sec > 0 ? '\u23E9 ' : '\u23EA ') + Math.abs(Math.round(sec)) + 's');
            } else if (!swiping && Math.abs(dx) < 10 && dt < 300) {
                toggleCtrl();
            }
            swiping = false;
            e.stopPropagation(); e.preventDefault();
        }, { passive: false });

        shield.addEventListener('click', function(e) {
            toggleCtrl();
            e.stopPropagation(); e.preventDefault();
        });

        // ---- Step 9: Controls button click handling ----
        ctrl.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-a]');
            if (!btn) return;
            switch (btn.getAttribute('data-a')) {
                case 'pp':
                    if (v.paused) { v.play().catch(function(){}); playBtn.textContent = '\u23F8'; }
                    else { v.pause(); playBtn.textContent = '\u25B6'; }
                    break;
                case 'rw':
                    v.currentTime = Math.max(0, (v.currentTime || 0) - 15);
                    upd(); toast('\u23EA 15s');
                    break;
                case 'ff':
                    v.currentTime = Math.min(v.duration || 0, (v.currentTime || 0) + 15);
                    upd(); toast('\u23E9 15s');
                    break;
                case 'fs':
                    if (v.requestFullscreen) { if (document.fullscreenElement) document.exitFullscreen(); else wrap.requestFullscreen(); }
                    else if (v.webkitRequestFullscreen) { if (document.webkitFullscreenElement) document.webkitExitFullscreen(); else wrap.webkitRequestFullscreen(); }
                    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
                    break;
            }
            e.stopPropagation();
            resetTimer();
        });

        // ---- Step 10: Progress bar bidirectional binding ----
        bar.addEventListener('input', function(e) {
            v.currentTime = (this.value / 1000) * (v.duration || 0);
            upd();
            resetTimer();
        });

        // ---- Step 11: Video event listeners ----
        v.addEventListener('timeupdate', upd);
        v.addEventListener('play', function() { playBtn.textContent = '\u23F8'; });
        v.addEventListener('pause', function() { playBtn.textContent = '\u25B6'; });
        v.addEventListener('loadedmetadata', upd);

        // ---- Initial state ----
        showCtrl();
        upd();
    });

    // ---- Toast notification helper ----
    function toast(msg) {
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:18%;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:10px 22px;border-radius:20px;z-index:2147483647;font-size:13px;pointer-events:none;transition:opacity .3s;box-shadow:0 4px 12px rgba(0,0,0,.3);white-space:pre-wrap;';
        document.body.appendChild(t);
        setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 300); }, 1200);
    }

    toast('iOS \u64AD\u653E\u5668\u5DF2\u555F\u52D5');
})();
