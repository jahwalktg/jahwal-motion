/* 즉석 모션그래픽 — 장면 정의
   모든 장면은 draw(ctx, t, p, F) 하나로 그린다. t = 초(0 ~ dur). 같은 t면 언제나 같은 그림(미리보기·MP4·GIF·전체화면이 같음).
   좌표는 F.W × F.H(16:9는 1920×1080, 1:1은 1080×1080, 9:16은 1080×1920). F.u = 크기 단위(16:9에서 1).
   p = 입력값(fields의 k) + 공통값(p._c1 주색, p._c2 보조색, p._bg 배경색, p._tx 글자색, p._logo 로고 Image|null, p._trans 투명 배경 여부). */
(function () {
  var E = {
    out: function (x) { return 1 - Math.pow(1 - x, 3); },
    in: function (x) { return x * x * x; },
    io: function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    back: function (x) { var c = 1.70158, d = c + 1; return 1 + d * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    elastic: function (x) { return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (2 * Math.PI / 3)) + 1; }
  };
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(t, start, dur) { return clamp((t - start) / dur, 0, 1); }   // 구간 진행률 0~1
  function lerp(a, b, x) { return a + (b - a) * x; }
  function rnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function lines(s, max) { return String(s || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, max || 99); }
  function hexA(hex, a) { var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, function (c) { return c + c; }); var n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function fmtNum(str) { // "1,234.5" 같은 글자 → {v, dec, prefix, suffix}
    var m = /^([^\d\-]*)(-?[\d,]*\.?\d*)(.*)$/.exec(String(str || '').trim());
    if (!m || !m[2]) return null;
    var raw = m[2].replace(/,/g, ''), dec = (raw.split('.')[1] || '').length;
    return { v: parseFloat(raw) || 0, dec: dec, pre: m[1], suf: m[3] };
  }
  function withComma(v, dec) { var s = v.toFixed(dec); var parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return parts.join('.'); }

  /* ---- 그리기 도우미 (F에 붙음) ---- */
  function makeF(ctx, W, H, fontName) {
    var u = Math.min(W, H * 16 / 9) / 1920;
    var F = { W: W, H: H, u: u, cx: W / 2, cy: H / 2, E: E, seg: seg, lerp: lerp, clamp: clamp, rnd: rnd, lines: lines, hexA: hexA };
    F.font = function (weight, size) { return weight + ' ' + Math.max(1, size) + 'px ' + fontName; };
    F.rr = function (x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    // 글자 한 줄: maxW 안에 들어오게 자동 축소. 돌려주는 값 = 실제 크기
    F.text = function (s, x, y, o) {
      s = String(s == null ? '' : s); if (!s) return o.size;
      var size = o.size, min = o.min || Math.max(12, o.size * 0.4);
      ctx.font = F.font(o.weight || 700, size);
      if (o.maxW) { while (size > min && ctx.measureText(s).width > o.maxW) { size -= Math.max(1, size * 0.04); ctx.font = F.font(o.weight || 700, size); } }
      ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.baseline || 'middle';
      ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * (o.alphaMul == null ? 1 : o.alphaMul);
      if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18 * u; ctx.shadowOffsetY = 4 * u; }
      ctx.fillStyle = o.color || '#fff'; ctx.fillText(s, x, y);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.globalAlpha = 1;
      return size;
    };
    // 긴 글 줄 바꿈 (낱말 단위, 안 되면 글자 단위)
    F.wrap = function (s, maxW, size, weight) {
      ctx.font = F.font(weight || 700, size); var out = [];
      lines(s).forEach(function (line) {
        var words = line.split(' '), cur = '';
        words.forEach(function (w) {
          var test = cur ? cur + ' ' + w : w;
          if (ctx.measureText(test).width <= maxW) { cur = test; return; }
          if (cur) out.push(cur);
          if (ctx.measureText(w).width <= maxW) { cur = w; return; }
          cur = ''; for (var i = 0; i < w.length; i++) { if (ctx.measureText(cur + w[i]).width > maxW && cur) { out.push(cur); cur = ''; } cur += w[i]; }
        });
        if (cur) out.push(cur);
      });
      return out;
    };
    // 여러 줄 글 상자: 줄 수에 맞게 크기 조절, 가운데 기준 y
    F.para = function (s, x, y, o) {
      var size = o.size, min = o.min || o.size * 0.5, ls;
      do { ls = F.wrap(s, o.maxW, size, o.weight); if (ls.length <= (o.maxLines || 4)) break; size -= Math.max(1, size * 0.06); } while (size > min);
      var lh = size * (o.lh || 1.35), total = lh * ls.length, y0 = y - total / 2 + lh / 2;
      ls.forEach(function (l, i) { F.text(l, x, y0 + i * lh, { size: size, weight: o.weight, color: o.color, align: o.align, alpha: o.alpha }); });
      return { size: size, h: total, n: ls.length };
    };
    F.imgContain = function (img, x, y, w, h, alpha) {
      if (!img || !img.naturalWidth) return;
      var r = Math.min(w / img.naturalWidth, h / img.naturalHeight), dw = img.naturalWidth * r, dh = img.naturalHeight * r;
      ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.globalAlpha = 1;
    };
    F.imgCover = function (img, x, y, w, h, zoom, px, py) { // zoom≥1, px/py 0~1 초점
      if (!img || !img.naturalWidth) return;
      var r = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (zoom || 1), dw = img.naturalWidth * r, dh = img.naturalHeight * r;
      var dx = x - (dw - w) * (px == null ? .5 : px), dy = y - (dh - h) * (py == null ? .5 : py);
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
    };
    F.circle = function (x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
    F.grad = function (c1, c2, vertical) { var g = vertical ? ctx.createLinearGradient(0, 0, 0, H) : ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
    // 배경 장식: 은은한 원 두 개 (주색 계열)
    F.deco = function (c1, c2, t) {
      ctx.save(); ctx.globalAlpha = .18;
      F.circle(W * .85 + Math.sin(t * .5) * 20 * u, H * .2, 320 * u, c1);
      F.circle(W * .12, H * .85 + Math.cos(t * .4) * 20 * u, 260 * u, c2);
      ctx.restore();
    };
    // 로고 (공통 입력) — 없으면 아무것도 안 그림. 돌려주는 값 = 그렸는지
    F.logo = function (img, x, y, w, h, alpha) { if (!img) return false; F.imgContain(img, x, y, w, h, alpha); return true; };
    F.light = function (hex) { var h = hex.replace('#', ''); if (h.length === 3) h = h.replace(/./g, function (c) { return c + c; }); var n = parseInt(h, 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) > 160; };
    return F;
  }

  var SCENES = [
    /* 1. 오프닝: 로고 + 행사명 */
    {
      id: 'open', group: '시작', icon: '🎬', name: '오프닝 — 로고와 행사명', dur: 6,
      desc: '로고가 떠오르고 행사명·부제·날짜가 차례로 나타나 마지막 그림에 멈춥니다. PPT 첫 장이나 행사 시작 화면.',
      fields: [
        { k: 'title', label: '행사명·제목', def: '2026년 참여자 역량강화 교육', max: 40 },
        { k: 'sub', label: '부제(선택)', def: '함께 배우고 함께 자라는 하루', max: 50 },
        { k: 'date', label: '날짜·장소 한 줄(선택)', def: '2026. 11. 28.(금) 14:00 · 3층 교육장', max: 50 },
        { k: 'org', label: '기관 이름(로고가 없을 때 글자로)', def: '○○지역자활센터', max: 24 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx;
        if (!p._trans) { ctx.fillStyle = F.grad(p._bg, hexA(p._c1, .35), true); ctx.fillRect(0, 0, W, H); F.deco(p._c1, p._c2, t); }
        var tall = H > W * 1.1;
        var a1 = E.back(seg(t, .15, .9)), al = seg(t, .15, .5);
        var logoH = (tall ? 300 : 260) * u, logoY = (tall ? H * .22 : H * .18);
        ctx.save(); ctx.translate(cx, logoY + logoH / 2); ctx.scale(Math.max(.01, a1), Math.max(.01, a1)); ctx.globalAlpha = al;
        if (!F.logo(p._logo, -logoH * 1.2, -logoH / 2, logoH * 2.4, logoH, al)) F.text(p.org, 0, 0, { size: 72 * u, weight: 800, color: p._tx, maxW: W * .8, alpha: al });
        ctx.restore();
        // 가로 선
        var lw = seg(t, .8, .7); ctx.fillStyle = p._c2; ctx.fillRect(cx - 160 * u * E.out(lw), logoY + logoH + 60 * u, 320 * u * E.out(lw), 6 * u);
        var y1 = logoY + logoH + (tall ? 220 : 180) * u;
        var a2 = seg(t, 1.0, .7); F.para(p.title, cx, y1 + (1 - E.out(a2)) * 40 * u, { size: (tall ? 92 : 110) * u, weight: 800, color: p._tx, maxW: W * .86, maxLines: 2, alpha: a2 });
        var a3 = seg(t, 1.6, .7); F.text(p.sub, cx, y1 + (tall ? 190 : 150) * u + (1 - E.out(a3)) * 30 * u, { size: 50 * u, weight: 500, color: p._tx, maxW: W * .8, alpha: a3 * .9 });
        var a4 = seg(t, 2.1, .7);
        if (p.date) { ctx.save(); ctx.globalAlpha = a4; var tw = Math.min(W * .7, 60 * u + ctx.measureText(p.date).width); F.rr(cx - tw / 2, y1 + (tall ? 290 : 240) * u, tw, 76 * u, 38 * u); ctx.fillStyle = hexA(p._c1, .9); ctx.fill(); ctx.restore(); F.text(p.date, cx, y1 + (tall ? 328 : 278) * u, { size: 38 * u, weight: 600, color: '#fff', maxW: tw - 60 * u, alpha: a4 }); }
      }
    },
    /* 2. 카운트다운 */
    {
      id: 'count', group: '시작', icon: '⏱', name: '시작 카운트다운', dur: function (p) { return (parseInt(p.n, 10) || 5) + 2; },
      desc: '5·4·3·2·1이 큰 숫자로 바뀌고 「시작합니다」가 뜹니다. 행사 시작 직전, 쉬는 시간 끝.',
      fields: [
        { k: 'n', label: '시작 숫자', type: 'number', def: 5, min: 3, max: 10 },
        { k: 'top', label: '위 글(선택)', def: '잠시 후 시작합니다', max: 30 },
        { k: 'end', label: '끝 글', def: '시작합니다!', max: 20 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy, n = parseInt(p.n, 10) || 5;
        if (!p._trans) { ctx.fillStyle = p._bg; ctx.fillRect(0, 0, W, H); F.deco(p._c1, p._c2, t); }
        F.text(p.top, cx, cy - 330 * u, { size: 56 * u, weight: 600, color: p._tx, maxW: W * .8, alpha: seg(t, 0, .5) * .9 });
        var R = 250 * u;
        if (t < n) {
          var i = Math.floor(t), f = t - i, num = n - i;
          ctx.save(); ctx.lineWidth = 18 * u; ctx.strokeStyle = hexA(p._c2, .25); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
          ctx.strokeStyle = p._c1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - f)); ctx.stroke(); ctx.restore();
          var sc = 1 + (1 - E.out(clamp(f * 2.5, 0, 1))) * .35, al = f < .85 ? 1 : 1 - (f - .85) / .15;
          ctx.save(); ctx.translate(cx, cy + 10 * u); ctx.scale(sc, sc); F.text(String(num), 0, 0, { size: 300 * u, weight: 900, color: p._tx, alpha: al }); ctx.restore();
        } else {
          var g = seg(t, n, .6);
          ctx.save(); ctx.translate(cx, cy); ctx.scale(E.back(g), E.back(g)); F.circle(0, 0, R + 30 * u, hexA(p._c1, .95)); ctx.restore();
          F.text(p.end, cx, cy, { size: 120 * u, weight: 900, color: '#fff', maxW: R * 1.7, alpha: seg(t, n + .2, .4) });
        }
      }
    },
    /* 3. 하단 자막 띠 */
    {
      id: 'lower', group: '진행', icon: '🪪', name: '하단 자막 띠 — 이름·소속', dur: function (p) { return p.stay === 'y' ? 5 : 7; },
      desc: '화면 아래 왼쪽에서 이름 띠가 들어오고(머물다 나갑니다). 발표자 소개, 인터뷰 영상 위 자막. 배경을 「투명(GIF)」으로 하면 영상 위에 얹을 수 있습니다.',
      fields: [
        { k: 'name', label: '이름', def: '김○○', max: 20 },
        { k: 'role', label: '소속·직함', def: '○○지역자활센터 팀장', max: 40 },
        { k: 'tag', label: '작은 꼬리표(선택)', def: '발표', max: 10 },
        { k: 'stay', label: '끝날 때', type: 'select', def: 'n', opts: [['n', '들어왔다 나감'], ['y', '들어와서 머묾(마지막 그림 유지)']] }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, dur = p.stay === 'y' ? 5 : 7;
        if (!p._trans) { ctx.fillStyle = p._bg; ctx.fillRect(0, 0, W, H); }
        var gin = E.out(seg(t, 0, .7)), gout = p.stay === 'y' ? 0 : E.in(seg(t, dur - .7, .6));
        var barH = 150 * u, barW = Math.min(W * .62, 1000 * u), x0 = W * .06, y0 = H - barH - H * .1;
        var x = x0 - barW * (1 - gin) - barW * 1.2 * gout;
        ctx.save(); ctx.translate(x, y0);
        ctx.fillStyle = p._c1; F.rr(0, 0, 18 * u, barH, 6 * u); ctx.fill();
        ctx.fillStyle = p._trans ? 'rgba(255,255,255,.96)' : (F.light(p._bg) ? '#fff' : 'rgba(255,255,255,.96)'); F.rr(18 * u, 0, barW - 18 * u, barH, 14 * u); ctx.fill();
        ctx.shadowColor = 'transparent';
        var tx = 50 * u, ta = seg(t, .5, .4);
        if (p.tag) { ctx.font = F.font(700, 28 * u); var tw = ctx.measureText(p.tag).width + 30 * u; ctx.globalAlpha = ta; ctx.fillStyle = p._c2; F.rr(tx, 26 * u, tw, 42 * u, 10 * u); ctx.fill(); ctx.globalAlpha = 1; F.text(p.tag, tx + tw / 2, 47 * u, { size: 28 * u, weight: 700, color: '#fff', alpha: ta }); tx += tw + 20 * u; }
        F.text(p.name, tx, 47 * u, { size: 52 * u, weight: 800, color: '#1A2B50', align: 'left', maxW: barW - tx - 30 * u, alpha: ta });
        F.text(p.role, 50 * u, 108 * u, { size: 32 * u, weight: 500, color: '#5B6885', align: 'left', maxW: barW - 90 * u, alpha: seg(t, .7, .4) });
        ctx.restore();
      }
    },
    /* 4. 순서 안내 */
    {
      id: 'steps', group: '진행', icon: '🔢', name: '순서 안내 1→2→3', dur: function (p) { return 1.2 + lines(p.items, 6).length * .8 + 2; },
      desc: '제목 아래 순서가 번호와 함께 하나씩 나타납니다. 오늘 일정, 진행 순서, 절차 안내.',
      fields: [
        { k: 'title', label: '제목', def: '오늘의 순서', max: 30 },
        { k: 'items', label: '순서(한 줄에 하나, 6개까지)', type: 'lines', def: '개회 및 인사\n사업 성과 보고\n우수 참여자 시상\n참여자 소감 나눔\n폐회', max: 6 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, items = lines(p.items, 6), n = items.length || 1;
        if (!p._trans) { ctx.fillStyle = F.grad(p._bg, hexA(p._c1, .25), true); ctx.fillRect(0, 0, W, H); F.deco(p._c1, p._c2, t); }
        var tall = H > W * 1.1;
        F.text(p.title, cx, H * (tall ? .12 : .14) - (1 - E.out(seg(t, 0, .6))) * 30 * u, { size: 84 * u, weight: 800, color: p._tx, maxW: W * .86, alpha: seg(t, 0, .6) });
        var top = H * (tall ? .22 : .27), avail = H * (tall ? .72 : .66), gap = Math.min(avail / n, (tall ? 180 : 150) * u), size = Math.min(60 * u, gap * .42);
        var boxW = Math.min(W * .84, 1300 * u), x0 = cx - boxW / 2;
        items.forEach(function (s, i) {
          var g = E.out(seg(t, 1.0 + i * .8, .6)), y = top + gap * i + gap / 2;
          if (g <= 0) return;
          ctx.save(); ctx.globalAlpha = g; ctx.translate((1 - g) * -60 * u, 0);
          ctx.fillStyle = F.light(p._bg) && !p._trans ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.10)'; F.rr(x0, y - gap * .38, boxW, gap * .76, 18 * u); ctx.fill();
          F.circle(x0 + gap * .38, y, gap * .27, p._c1);
          F.text(String(i + 1), x0 + gap * .38, y + 2 * u, { size: gap * .3, weight: 800, color: '#fff' });
          F.text(s, x0 + gap * .8, y, { size: size, weight: 700, color: p._tx, align: 'left', maxW: boxW - gap * 1.0 });
          ctx.restore();
        });
      }
    },
    /* 5. 쉬는 시간 타이머 (전체화면 재생 전용) */
    {
      id: 'timer', group: '진행', icon: '☕', name: '쉬는 시간 타이머', liveOnly: true, dur: function (p) { return (parseFloat(p.min) || 10) * 60 + 6; },
      desc: '남은 시간이 큰 글자로 줄어들고 끝나면 안내 글이 깜빡입니다. 파일로 받지 않고 「전체화면으로 재생」을 눌러 현장에서 바로 띄우는 장면입니다.',
      fields: [
        { k: 'min', label: '쉬는 시간(분)', type: 'number', def: 10, min: 1, max: 90, step: 0.5 },
        { k: 'msg', label: '위 글', def: '잠시 쉬는 시간입니다 ☕', max: 30 },
        { k: 'end', label: '끝났을 때 글', def: '곧 다시 시작합니다. 자리로 돌아와 주세요.', max: 40 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy, total = (parseFloat(p.min) || 10) * 60, rem = Math.max(0, total - t);
        ctx.fillStyle = p._bg; ctx.fillRect(0, 0, W, H); F.deco(p._c1, p._c2, t * .2);
        F.text(p.msg, cx, cy - 330 * u, { size: 60 * u, weight: 600, color: p._tx, maxW: W * .85 });
        var R = 280 * u; ctx.save(); ctx.lineWidth = 22 * u; ctx.strokeStyle = hexA(p._c2, .25); ctx.beginPath(); ctx.arc(cx, cy + 20 * u, R, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = rem < 60 ? '#E63946' : p._c1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy + 20 * u, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (rem / total)); ctx.stroke(); ctx.restore();
        var m = Math.floor(rem / 60), s = Math.floor(rem % 60), txt = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        if (rem > 0) F.text(txt, cx, cy + 20 * u, { size: 190 * u, weight: 900, color: p._tx });
        else { var bl = Math.sin(t * 6) > 0 ? 1 : .35; F.text('00:00', cx, cy + 20 * u, { size: 190 * u, weight: 900, color: '#E63946', alpha: bl }); }
        if (rem <= 0) F.para(p.end, cx, cy + 400 * u, { size: 56 * u, weight: 700, color: p._tx, maxW: W * .85, maxLines: 2 });
        else if (rem < 60) F.text('1분 남았습니다', cx, cy + 400 * u, { size: 48 * u, weight: 600, color: '#E63946' });
      }
    },
    /* 6. 호명 카드 */
    {
      id: 'call', group: '진행', icon: '🎤', name: '호명 카드 — 발표자·수상자', dur: 5.5,
      desc: '「다음 발표」 같은 꼬리표가 먼저 뜨고 이름이 크게 드러납니다. 시상, 발표 순서, 사업단 소개.',
      fields: [
        { k: 'label', label: '꼬리표', def: '우수 참여자', max: 14 },
        { k: 'name', label: '이름(크게)', def: '김 ○ ○', max: 16 },
        { k: 'sub', label: '소속·설명(선택)', def: '행복목욕탕 사업단', max: 40 },
        { k: 'note', label: '아래 작은 글(선택)', def: '큰 박수로 맞아 주세요 👏', max: 30 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy;
        if (!p._trans) { ctx.fillStyle = F.grad(hexA(p._c1, .9), p._bg); ctx.fillRect(0, 0, W, H); }
        // 반짝임
        var r = rnd(7); ctx.save();
        for (var i = 0; i < 40; i++) { var sx = r() * W, sy = r() * H, ph = r() * 6.28, sp = .6 + r(); var a = (Math.sin(t * sp * 3 + ph) + 1) / 2 * seg(t, .8, .8); ctx.globalAlpha = a * .8; F.circle(sx, sy, (2 + r() * 4) * u, '#fff'); }
        ctx.restore();
        var g1 = seg(t, 0, .5);
        ctx.font = F.font(700, 40 * u); var lw = ctx.measureText(p.label).width + 70 * u;
        ctx.save(); ctx.globalAlpha = g1; ctx.fillStyle = p._c2; F.rr(cx - lw / 2, cy - 300 * u - (1 - E.out(g1)) * 20 * u, lw, 72 * u, 36 * u); ctx.fill(); ctx.restore();
        F.text(p.label, cx, cy - 264 * u - (1 - E.out(g1)) * 20 * u, { size: 40 * u, weight: 700, color: '#fff', alpha: g1 });
        var g2 = seg(t, .7, .8); ctx.save(); ctx.beginPath(); ctx.rect(cx - W * .5 * E.out(g2), cy - 200 * u, W * E.out(g2), 400 * u); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, cy - 140 * u, W, 280 * u);
        F.text(p.name, cx, cy, { size: 190 * u, weight: 900, color: '#fff', maxW: W * .85, shadow: true }); ctx.restore();
        F.text(p.sub, cx, cy + 210 * u, { size: 56 * u, weight: 600, color: '#fff', maxW: W * .8, alpha: seg(t, 1.5, .6) * .95 });
        F.text(p.note, cx, H - 120 * u, { size: 40 * u, weight: 500, color: '#fff', maxW: W * .8, alpha: seg(t, 2.1, .6) * .85 });
      }
    },
    /* 7. 숫자 올라가기 */
    {
      id: 'nums', group: '보고', icon: '📈', name: '숫자 올라가기 — 성과 수치', dur: 6,
      desc: '수치가 0에서 목표까지 올라갑니다(최대 3개). 참여자 수, 매출, 교육 시간 같은 성과 보고.',
      fields: [
        { k: 'title', label: '제목(선택)', def: '2026년 우리 센터 한 해', max: 30 },
        { k: 'items', label: '항목(한 줄에 「이름 | 숫자 | 단위」, 3개까지)', type: 'lines', def: '참여자 | 126 | 명\n연간 매출 | 3,680 | 만 원\n교육 시간 | 1,240 | 시간', max: 3 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy;
        if (!p._trans) { ctx.fillStyle = F.grad(p._bg, hexA(p._c1, .3), true); ctx.fillRect(0, 0, W, H); F.deco(p._c1, p._c2, t); }
        var items = lines(p.items, 3).map(function (l) { var a = l.split('|').map(function (x) { return x.trim(); }); return { label: a[0] || '', num: fmtNum(a[1] || '0'), unit: a[2] || '' }; });
        var tall = H > W * 1.1, n = items.length || 1;
        F.text(p.title, cx, H * (tall ? .14 : .17), { size: 72 * u, weight: 800, color: p._tx, maxW: W * .86, alpha: seg(t, 0, .6) });
        items.forEach(function (it, i) {
          var g = E.out(seg(t, .6 + i * .35, 2.2)), ga = seg(t, .6 + i * .35, .5);
          var x, y, boxW;
          if (tall) { x = cx; y = H * .3 + i * (H * .62 / n) + (H * .62 / n) / 2; boxW = W * .82; }
          else { boxW = Math.min(W * .9 / n - 30 * u, 560 * u); x = cx + (i - (n - 1) / 2) * (boxW + 40 * u); y = cy + 60 * u; }
          ctx.save(); ctx.globalAlpha = ga; ctx.fillStyle = F.light(p._bg) && !p._trans ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.1)'; F.rr(x - boxW / 2, y - 170 * u, boxW, 340 * u, 26 * u); ctx.fill();
          ctx.fillStyle = p._c2; F.rr(x - 40 * u, y - 170 * u, 80 * u, 8 * u, 4 * u); ctx.fill(); ctx.restore();
          F.text(it.label, x, y - 95 * u, { size: 44 * u, weight: 600, color: p._tx, maxW: boxW - 60 * u, alpha: ga });
          var v = it.num ? withComma(it.num.v * g, it.num.dec) : '';
          ctx.font = F.font(900, 120 * u); var nw = ctx.measureText((it.num ? it.num.pre : '') + v).width; ctx.font = F.font(600, 44 * u); var uw = ctx.measureText(it.unit).width;
          var sc = Math.min(1, (boxW - 60 * u) / (nw + uw + 16 * u)), left = x - (nw + uw + 16 * u) * sc / 2;
          F.text((it.num ? it.num.pre : '') + v, left, y + 20 * u, { size: 120 * u * sc, weight: 900, color: p._c1, align: 'left', alpha: ga });
          F.text(it.unit, left + (nw + 16 * u) * sc, y + 40 * u, { size: 44 * u * sc, weight: 600, color: p._tx, align: 'left', alpha: ga });
        });
      }
    },
    /* 8. 비교 막대 */
    {
      id: 'bars', group: '보고', icon: '📊', name: '비교 막대 — 전후·항목 비교', dur: 6,
      desc: '막대가 자라며 값이 표시됩니다(최대 5개). 작년과 올해, 사업단별 비교.',
      fields: [
        { k: 'title', label: '제목', def: '참여자 수 변화', max: 30 },
        { k: 'items', label: '항목(한 줄에 「이름 | 값」, 5개까지)', type: 'lines', def: '2024년 | 98\n2025년 | 112\n2026년 | 126', max: 5 },
        { k: 'unit', label: '단위(선택)', def: '명', max: 8 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx;
        if (!p._trans) { ctx.fillStyle = F.grad(p._bg, hexA(p._c2, .2), true); ctx.fillRect(0, 0, W, H); }
        var items = lines(p.items, 5).map(function (l) { var a = l.split('|').map(function (x) { return x.trim(); }); return { label: a[0] || '', num: fmtNum(a[1] || '0') || { v: 0, dec: 0, pre: '', suf: '' } }; });
        var n = items.length || 1, mx = Math.max.apply(null, items.map(function (i) { return Math.abs(i.num.v); }).concat([1]));
        var tall = H > W * 1.1;
        F.text(p.title, cx, H * (tall ? .12 : .14), { size: 76 * u, weight: 800, color: p._tx, maxW: W * .86, alpha: seg(t, 0, .6) });
        var areaTop = H * (tall ? .24 : .3), areaH = H * (tall ? .58 : .5), base = areaTop + areaH, areaW = W * .8, x0 = cx - areaW / 2;
        var slot = areaW / n, bw = Math.min(slot * .6, 260 * u);
        ctx.fillStyle = hexA(p._tx, .25); ctx.fillRect(x0, base, areaW, 3 * u);
        items.forEach(function (it, i) {
          var g = E.out(seg(t, .6 + i * .3, 1.6)), x = x0 + slot * i + slot / 2, h = areaH * .9 * (Math.abs(it.num.v) / mx) * g;
          var last = i === n - 1; ctx.fillStyle = last ? p._c1 : hexA(p._c1, .55); F.rr(x - bw / 2, base - h, bw, h, 14 * u); ctx.fill();
          F.text(it.num.pre + withComma(it.num.v * g, it.num.dec) + (p.unit || it.num.suf), x, base - h - 44 * u, { size: Math.min(52 * u, slot * .3), weight: 800, color: p._tx, maxW: slot * .95, alpha: seg(t, .6 + i * .3, .4) });
          F.text(it.label, x, base + 50 * u, { size: Math.min(40 * u, slot * .25), weight: 600, color: p._tx, maxW: slot * .95, alpha: seg(t, .3 + i * .3, .4) });
        });
      }
    },
    /* 9. 마무리 감사 + QR */
    {
      id: 'thanks', group: '마무리', icon: '🙏', name: '마무리 — 감사 인사와 QR', dur: 6,
      desc: '감사 문구가 떠오르고 설문·소식 주소 QR이 나타납니다. 행사 마지막 장, 설문 안내.',
      fields: [
        { k: 'title', label: '큰 글', def: '함께해 주셔서 감사합니다', max: 30 },
        { k: 'sub', label: '작은 글(선택)', def: '오늘 교육 만족도 설문에 참여해 주세요', max: 50 },
        { k: 'url', label: 'QR에 담을 주소(선택, 비우면 QR 없음)', type: 'url', def: '', ph: 'https://…', max: 300 },
        { k: 'org', label: '기관 이름(로고 없을 때)', def: '○○지역자활센터', max: 24 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy, tall = H > W * 1.1;
        if (!p._trans) { ctx.fillStyle = F.grad(p._bg, hexA(p._c1, .4)); ctx.fillRect(0, 0, W, H); F.deco(p._c2, p._c1, t); }
        var hasQ = !!(p.url && p.url.trim());
        var tx = hasQ && !tall ? W * .36 : cx, maxW = hasQ && !tall ? W * .56 : W * .86;
        var g1 = seg(t, .2, .8);
        F.para(p.title, tx, (tall ? H * .22 : cy - 80 * u) + (1 - E.out(g1)) * 30 * u, { size: 104 * u, weight: 800, color: p._tx, maxW: maxW, maxLines: 2, alpha: g1 });
        F.para(p.sub, tx, (tall ? H * .36 : cy + 90 * u), { size: 46 * u, weight: 500, color: p._tx, maxW: maxW, maxLines: 2, alpha: seg(t, .9, .7) * .9 });
        var lg = seg(t, 1.4, .6);
        if (!F.logo(p._logo, tx - 200 * u, (tall ? H * .46 : cy + 190 * u), 400 * u, 110 * u, lg)) F.text(p.org, tx, (tall ? H * .5 : cy + 245 * u), { size: 40 * u, weight: 700, color: p._tx, maxW: maxW, alpha: lg * .8 });
        if (hasQ && window.qrcode) {
          var gq = E.back(seg(t, 1.2, .9)); var qs = (tall ? 520 : 460) * u, qx = tall ? cx : W * .75, qy = tall ? H * .72 : cy;
          try {
            var q = window.qrcode(0, 'M'); q.addData(p.url.trim()); q.make(); var cnt = q.getModuleCount(), pad = 28 * u, cell = (qs - pad * 2) / cnt;
            ctx.save(); ctx.translate(qx, qy); ctx.scale(Math.max(.01, gq), Math.max(.01, gq)); ctx.translate(-qs / 2, -qs / 2);
            ctx.fillStyle = '#fff'; F.rr(0, 0, qs, qs, 24 * u); ctx.fill(); ctx.fillStyle = '#1A2B50';
            for (var r = 0; r < cnt; r++) for (var c = 0; c < cnt; c++) if (q.isDark(r, c)) ctx.fillRect(pad + c * cell, pad + r * cell, cell + .5, cell + .5);
            ctx.restore();
            F.text('카메라로 찍으면 열립니다', qx, qy + qs / 2 + 50 * u, { size: 30 * u, weight: 500, color: p._tx, alpha: seg(t, 2, .5) * .8 });
          } catch (e) { F.text('주소가 너무 길어 QR을 못 만듭니다', qx, qy, { size: 30 * u, color: p._tx }); }
        }
      }
    },
    /* 10. 축하 콘페티 */
    {
      id: 'party', group: '마무리', icon: '🎉', name: '축하 — 콘페티', dur: 6,
      desc: '종이 꽃가루가 쏟아지며 축하 문구가 뜁니다. 시상, 수료, 개소 축하. 끝과 처음이 이어져 GIF 반복에 좋습니다.',
      fields: [
        { k: 'title', label: '큰 글', def: '축하합니다!', max: 20 },
        { k: 'sub', label: '작은 글(선택)', def: '2026년 자활근로 수료를 진심으로 축하드립니다', max: 50 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy;
        if (!p._trans) { ctx.fillStyle = p._bg; ctx.fillRect(0, 0, W, H); }
        var r = rnd(2026), cols = [p._c1, p._c2, '#F2B705', '#E63946', '#1F9D5C', '#8A6BE0'], dur = 6;
        ctx.save();
        for (var i = 0; i < 160; i++) {
          var x0 = r() * W, sp = (.6 + r() * .6), ph = r() * dur, w = (10 + r() * 14) * u, h = (14 + r() * 20) * u, col = cols[Math.floor(r() * cols.length)], sw = (r() - .5) * 2, rot = r() * 6.28, rs = (r() - .5) * 6;
          var tt = ((t + ph) % dur) / dur;                 // 0~1 반복 (끝·처음 이음)
          var y = -h * 2 + tt * (H + h * 4) * sp / .9, x = x0 + Math.sin(tt * 6.28 * 2 + ph) * 60 * u * sw;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot + tt * rs); ctx.scale(Math.cos(tt * 6.28 * 3 + ph), 1); ctx.fillStyle = col; ctx.globalAlpha = .95; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
        }
        ctx.restore();
        var bounce = 1 + Math.abs(Math.sin(t * 2.2)) * .06;
        ctx.save(); ctx.translate(cx, cy - 20 * u); ctx.scale(bounce, bounce);
        F.text(p.title, 0, 0, { size: 170 * u, weight: 900, color: p._tx, maxW: W * .85 / bounce, shadow: true }); ctx.restore();
        F.para(p.sub, cx, cy + 170 * u, { size: 50 * u, weight: 600, color: p._tx, maxW: W * .8, maxLines: 2 });
      }
    },
    /* 11. 사진 켄 번스 */
    {
      id: 'photo', group: '사진', icon: '🖼️', name: '사진 켄 번스 — 천천히 움직이는 사진', dur: 8,
      desc: '사진 한 장이 천천히 확대되며 한쪽으로 흐르고 자막이 뜹니다. 소식지 사진, 현장 사진 소개.',
      fields: [
        { k: 'img', label: '사진', type: 'image' },
        { k: 'cap', label: '자막(선택)', def: '2026년 가을, 참여자 나들이', max: 40 },
        { k: 'dir', label: '움직임', type: 'select', def: 'in', opts: [['in', '가운데로 다가가기'], ['out', '멀어지기'], ['lr', '왼쪽에서 오른쪽으로'], ['rl', '오른쪽에서 왼쪽으로']] }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, g = seg(t, 0, 8);
        ctx.fillStyle = p._trans ? 'rgba(0,0,0,0)' : '#111'; ctx.fillRect(0, 0, W, H);
        var img = p.img;
        if (img) {
          var z, px = .5, py = .5;
          if (p.dir === 'out') z = lerp(1.18, 1.0, g); else z = lerp(1.0, 1.18, g);
          if (p.dir === 'lr') { z = 1.15; px = lerp(.15, .85, g); } if (p.dir === 'rl') { z = 1.15; px = lerp(.85, .15, g); }
          F.imgCover(img, 0, 0, W, H, z, px, py);
        } else {
          ctx.fillStyle = hexA(p._c1, .5); ctx.fillRect(0, 0, W, H);
          F.text('사진을 넣어 주세요 (왼쪽 「사진」 칸)', cx, F.cy, { size: 54 * u, weight: 600, color: '#fff', maxW: W * .8 });
        }
        if (p.cap) {
          var a = seg(t, 1.2, .8) * (1 - seg(t, 7.3, .6));
          ctx.save(); ctx.globalAlpha = a; var gr = ctx.createLinearGradient(0, H * .7, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); ctx.fillStyle = gr; ctx.fillRect(0, H * .7, W, H * .3); ctx.restore();
          F.text(p.cap, cx, H - 110 * u, { size: 54 * u, weight: 700, color: '#fff', maxW: W * .85, alpha: a, shadow: true });
        }
      }
    },
    /* 12. 롤링 공지 자막 */
    {
      id: 'ticker', group: '진행', icon: '📢', name: '흐르는 공지 자막', dur: function (p) { var n = String(p.text || '').length; return Math.max(6, Math.min(40, 4 + n * 0.22)); },
      desc: '아래 띠를 따라 공지가 흐릅니다. 행사 중 안내(주차·식사·설문), 대기 화면. 배경 「투명(GIF)」이면 영상·슬라이드 위에 얹기.',
      fields: [
        { k: 'tag', label: '머리 글', def: '안내', max: 8 },
        { k: 'text', label: '흐를 글(한 줄)', def: '행사 뒤 1층 로비에서 다과가 준비되어 있습니다 · 주차권은 안내 데스크에서 받아 가세요 · 설문은 QR로 참여해 주세요', max: 300 },
        { k: 'pos', label: '위치', type: 'select', def: 'b', opts: [['b', '아래'], ['t', '위']] }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, dur = SCENES_BY.ticker.dur(p);
        if (!p._trans) { ctx.fillStyle = p._bg; ctx.fillRect(0, 0, W, H); }
        var barH = 110 * u, y = p.pos === 't' ? H * .06 : H - barH - H * .06;
        ctx.fillStyle = p._trans ? 'rgba(26,43,80,.92)' : hexA(F.light(p._bg) ? '#1A2B50' : '#000', .85); ctx.fillRect(0, y, W, barH);
        ctx.font = F.font(800, 40 * u); var tagW = p.tag ? ctx.measureText(p.tag).width + 70 * u : 0;
        if (p.tag) { ctx.fillStyle = p._c1; ctx.fillRect(0, y, tagW, barH); F.text(p.tag, tagW / 2, y + barH / 2 + 2 * u, { size: 40 * u, weight: 800, color: '#fff' }); }
        var txt = String(p.text || ''); ctx.font = F.font(600, 46 * u); var tw = ctx.measureText(txt).width, dist = W - tagW + tw, x = tagW + (W - tagW) - (t / dur) * dist;
        ctx.save(); ctx.beginPath(); ctx.rect(tagW, y, W - tagW, barH); ctx.clip();
        F.text(txt, x, y + barH / 2 + 2 * u, { size: 46 * u, weight: 600, color: '#fff', align: 'left' }); ctx.restore();
      }
    }
  ];
  var SCENES_BY = {}; SCENES.forEach(function (s) { SCENES_BY[s.id] = s; });
  window.MG = { SCENES: SCENES, BY: SCENES_BY, makeF: makeF, E: E, lines: lines, hexA: hexA };
})();
