/* 즉석 모션그래픽 — 장면: PPT 꾸밈 (3차) 제목 등장·전/후 비교·흐름도·타임라인·조직도 */
(function () {
  var E = MG.E, seg = MG.seg, lerp = MG.lerp, clamp = MG.clamp, rnd = MG.rnd, lines = MG.lines, hexA = MG.hexA;
  function arrow(ctx, x1, y1, x2, y2, w, color, g) { var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ex = x1 + dx * g, ey = y1 + dy * g, ux = dx / L, uy = dy / L; ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke(); if (g > .95) { var h = w * 3.2; ctx.beginPath(); ctx.moveTo(ex + ux * h * .6, ey + uy * h * .6); ctx.lineTo(ex - ux * h * .6 - uy * h * .6, ey - uy * h * .6 + ux * h * .6); ctx.lineTo(ex - ux * h * .6 + uy * h * .6, ey - uy * h * .6 - ux * h * .6); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  function splitKV(l) { var a = l.split('|').map(function (x) { return x.trim(); }); return a.length > 1 ? { k: a[0], v: a.slice(1).join(' | ') } : { k: '', v: a[0] }; }

  MG.add([
    /* 29. 제목 등장 */
    {
      id: 'title', group: 'PPT 꾸밈', icon: '🔠', name: '제목 등장 — 한 글자씩·밑줄', dur: 4,
      desc: '제목이 한 글자씩 나타나고(또는 떠오르고) 아래에 밑줄이 그어집니다. 슬라이드 제목 자리에.',
      fields: [
        { k: 'title', label: '제목', def: '2026년 자활사업 추진 성과', max: 30 },
        { k: 'sub', label: '작은 글(선택)', def: '○○지역자활센터', max: 40 },
        { k: 'style', label: '등장 방식', type: 'select', def: 'type', opts: [['type', '한 글자씩'], ['rise', '글자가 떠오름'], ['wipe', '왼쪽에서 드러남']] },
        { k: 'align', label: '정렬', type: 'select', def: 'c', opts: [['c', '가운데'], ['l', '왼쪽']] }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy; F.bg(p, t);
        var size = 120 * u; ctx.font = F.font(900, size); while (ctx.measureText(p.title).width > W * .86 && size > 40 * u) { size -= 4 * u; ctx.font = F.font(900, size); }
        var tw = ctx.measureText(p.title).width, left = p.align === 'l' ? W * .1 : cx - tw / 2, y = cy - 20 * u, prog = seg(t, .2, 1.6);
        if (p.style === 'wipe') { ctx.save(); ctx.beginPath(); ctx.rect(left - 10 * u, y - size, tw * E.io(prog) + 20 * u, size * 2); ctx.clip(); F.text(p.title, left, y, { size: size, weight: 900, color: p._tx, align: 'left' }); ctx.restore(); }
        else { var chars = p.title.split(''), n = chars.length, x = left; for (var i = 0; i < n; i++) { var cw = ctx.measureText(chars[i]).width, g = seg(prog * (n + 3), i, 3), a = p.style === 'type' ? (g > .3 ? 1 : 0) : E.out(g), dy = p.style === 'rise' ? (1 - E.out(g)) * 60 * u : 0; ctx.font = F.font(900, size); F.text(chars[i], x, y + dy, { size: size, weight: 900, color: p._tx, align: 'left', alpha: a }); x += cw; } }
        var ul = E.io(seg(t, 1.6, .7)); ctx.save(); ctx.fillStyle = p._c1; F.rr(left, y + size * .62, tw * ul, 12 * u, 6 * u); ctx.fill(); ctx.restore();
        if (p.style === 'type' && t < 1.9 && Math.floor(t * 3) % 2 === 0) { var cxr = left + ctx.measureText(p.title.slice(0, Math.min(p.title.length, Math.floor(prog * (p.title.length + 3))))).width; ctx.fillStyle = p._c2; ctx.fillRect(cxr + 6 * u, y - size * .5, 8 * u, size); }
        F.text(p.sub, p.align === 'l' ? left : cx, y + size * .62 + 80 * u, { size: 44 * u, weight: 500, color: p._tx, align: p.align === 'l' ? 'left' : 'center', maxW: W * .8, alpha: seg(t, 2.3, .6) * .85 });
      }
    },
    /* 32. 전/후 비교 */
    {
      id: 'compare', group: 'PPT 꾸밈', icon: '↔️', name: '전 / 후 비교', dur: 7,
      desc: '왼쪽 「전」 카드가 뜨고 화살표가 그어진 뒤 오른쪽 「후」 카드가 색으로 뜹니다. 개선 전후, 작년과 올해.',
      fields: [
        { k: 'title', label: '제목(선택)', def: '업무 도구 도입 전과 후', max: 30 },
        { k: 'lt', label: '왼쪽 제목', def: '도입 전', max: 12 },
        { k: 'll', label: '왼쪽 내용(한 줄에 하나, 4개까지)', type: 'lines', def: '엑셀에서 한 줄씩 복사\n한글 표에 다시 붙이기\n매달 반나절', max: 4 },
        { k: 'rt', label: '오른쪽 제목', def: '도입 후', max: 12 },
        { k: 'rl', label: '오른쪽 내용(4개까지)', type: 'lines', def: '파일 넣으면 표 완성\n붙여넣기 한 번\n10분', max: 4 }
      ],
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy, tall = H > W * 1.1; F.bg(p, t);
        F.text(p.title, cx, H * .12, { size: 64 * u, weight: 800, color: p._tx, maxW: W * .9, alpha: seg(t, 0, .5) });
        var cw = tall ? W * .8 : W * .38, ch = tall ? H * .3 : H * .56, lx = tall ? cx - cw / 2 : W * .06, ly = tall ? H * .2 : H * .26, rx = tall ? lx : W - W * .06 - cw, ry = tall ? H * .62 : ly;
        function box(x, y, title, items, g, hot, t0) { if (g <= 0) return; ctx.save(); ctx.globalAlpha = g; ctx.translate(0, (1 - g) * 40 * u); F.panel(x, y, cw, ch, 28 * u, p); ctx.fillStyle = hot ? p._c1 : hexA(p._tx, .35); F.rr(x, y, cw, 96 * u, 28 * u); ctx.fill(); ctx.fillRect(x, y + 60 * u, cw, 36 * u); ctx.restore(); F.text(title, x + cw / 2, y + 48 * u, { size: 50 * u, weight: 800, color: '#fff', maxW: cw * .9, alpha: g }); var its = lines(items, 4), lh = Math.min(100 * u, (ch - 130 * u) / Math.max(1, its.length)); its.forEach(function (s, i) { var a = seg(t, t0 + i * .3, .4); F.text((hot ? '✓ ' : '• ') + s, x + 40 * u, y + 130 * u + lh * i + lh / 2, { size: Math.min(46 * u, lh * .5), weight: hot ? 700 : 500, color: p._tx, align: 'left', maxW: cw - 80 * u, alpha: a * g }); }); }
        box(lx, ly, p.lt, p.ll, E.out(seg(t, .3, .6)), false, .8);
        var ag = E.io(seg(t, 2.2, .7)); if (tall) arrow(ctx, cx, ly + ch + 20 * u, cx, ry - 20 * u, 14 * u, p._c2, ag); else arrow(ctx, lx + cw + 30 * u, cy + 40 * u, rx - 30 * u, cy + 40 * u, 14 * u, p._c2, ag);
        box(rx, ry, p.rt, p.rl, E.out(seg(t, 3.0, .6)), true, 3.5);
      }
    },
    /* 33. 흐름도 */
    {
      id: 'flow', group: 'PPT 꾸밈', icon: '➡️', name: '흐름도 — 상자가 차례로',
      desc: '단계 상자가 화살표를 따라 하나씩 나타납니다(6개까지). 업무 절차, 참여 과정, 사업 흐름. 「이름 | 작은 설명」으로 두 줄.',
      fields: [
        { k: 'title', label: '제목(선택)', def: '자활 참여 과정', max: 30 },
        { k: 'items', label: '단계(한 줄에 하나, 6개까지, 「이름 | 설명」)', type: 'lines', def: '의뢰 | 주민센터\n초기 상담 | 게이트웨이\n교육 | 기초교육·자활학교\n사업단 배치 | 참여 시작\n자립 | 취·창업', max: 6 }
      ],
      dur: function (p) { return 1 + lines(p.items, 6).length * .9 + 1.5; },
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy, tall = H > W * 1.1; F.bg(p, t);
        var its = lines(p.items, 6).map(splitKV), n = its.length || 1;
        F.text(p.title, cx, H * .12, { size: 64 * u, weight: 800, color: p._tx, maxW: W * .9, alpha: seg(t, 0, .5) });
        var gap = 70 * u, bw, bh, x0, y0; if (tall) { bh = Math.min(200 * u, (H * .7 - gap * (n - 1)) / n); bw = W * .76; x0 = cx - bw / 2; y0 = H * .2; } else { bw = Math.min(420 * u, (W * .9 - gap * (n - 1)) / n); bh = 240 * u; x0 = cx - (bw * n + gap * (n - 1)) / 2; y0 = cy - bh / 2 + 40 * u; }
        its.forEach(function (it, i) {
          var x = tall ? x0 : x0 + i * (bw + gap), y = tall ? y0 + i * (bh + gap) : y0, g = E.back(seg(t, .6 + i * .9, .5)), hot = i === n - 1;
          if (i) { var ag = E.io(seg(t, .3 + i * .9, .4)); if (tall) arrow(ctx, cx, y - gap + 8 * u, cx, y - 10 * u, 10 * u, p._c2, ag); else arrow(ctx, x - gap + 8 * u, y + bh / 2, x - 10 * u, y + bh / 2, 10 * u, p._c2, ag); }
          if (g <= 0) return; ctx.save(); ctx.translate(x + bw / 2, y + bh / 2); var s = Math.max(.01, g); ctx.scale(s, s); ctx.translate(-(x + bw / 2), -(y + bh / 2));
          ctx.fillStyle = hot ? p._c1 : F.card(p); F.rr(x, y, bw, bh, 24 * u); ctx.fill(); if (!hot) { ctx.strokeStyle = hexA(p._c1, .6); ctx.lineWidth = 4 * u; ctx.stroke(); }
          F.circle(x + 36 * u, y + 36 * u, 24 * u, hot ? 'rgba(255,255,255,.3)' : p._c1); F.text(i + 1, x + 36 * u, y + 38 * u, { size: 28 * u, weight: 800, color: '#fff' });
          var k = it.k || it.v, v = it.k ? it.v : '';
          F.text(k, x + bw / 2, y + bh / 2 - (v ? 22 * u : 0), { size: Math.min(50 * u, bh * .24), weight: 800, color: hot ? '#fff' : p._tx, maxW: bw - 50 * u });
          F.text(v, x + bw / 2, y + bh / 2 + 36 * u, { size: Math.min(32 * u, bh * .15), weight: 500, color: hot ? 'rgba(255,255,255,.9)' : p._tx, maxW: bw - 50 * u, alpha: .85 });
          ctx.restore();
        });
      }
    },
    /* 38. 일정 타임라인 */
    {
      id: 'timeline', group: 'PPT 꾸밈', icon: '📅', name: '일정 타임라인 — 점이 이어짐',
      desc: '선 위에 점이 차례로 켜지고 「때 | 내용」이 위아래로 번갈아 뜹니다(8개까지). 연간 계획, 사업 일정, 추진 경과.',
      fields: [
        { k: 'title', label: '제목(선택)', def: '2026년 추진 일정', max: 30 },
        { k: 'items', label: '일정(한 줄에 「때 | 내용」, 8개까지)', type: 'lines', def: '1월 | 참여자 모집\n3월 | 사업단 개편\n6월 | 상반기 평가\n9월 | 성과 공유회\n11월 | 수료식\n12월 | 결과 보고', max: 8 },
        { k: 'now', label: '현재 위치 번호(선택, 그 점을 강조)', def: '', max: 2 }
      ],
      dur: function (p) { return 1 + lines(p.items, 8).length * .7 + 1.5; },
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, cy = F.cy, tall = H > W * 1.1; F.bg(p, t);
        var its = lines(p.items, 8).map(splitKV), n = its.length || 1, now = parseInt(p.now, 10);
        F.text(p.title, cx, H * .12, { size: 64 * u, weight: 800, color: p._tx, maxW: W * .9, alpha: seg(t, 0, .5) });
        var x1 = W * .08, x2 = W * .92, ly = cy + 40 * u, y1 = H * .22, y2 = H * .92, lx = W * .18;
        var prog = E.io(seg(t, .5, n * .7)); ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 10 * u; ctx.strokeStyle = hexA(p._tx, .15); ctx.beginPath(); if (tall) { ctx.moveTo(lx, y1); ctx.lineTo(lx, y2); } else { ctx.moveTo(x1, ly); ctx.lineTo(x2, ly); } ctx.stroke(); ctx.strokeStyle = p._c1; ctx.beginPath(); if (tall) { ctx.moveTo(lx, y1); ctx.lineTo(lx, lerp(y1, y2, prog)); } else { ctx.moveTo(x1, ly); ctx.lineTo(lerp(x1, x2, prog), ly); } ctx.stroke(); ctx.restore();
        its.forEach(function (it, i) {
          var f = n === 1 ? .5 : i / (n - 1), px = tall ? lx : lerp(x1 + 40 * u, x2 - 40 * u, f), py = tall ? lerp(y1 + 30 * u, y2 - 30 * u, f) : ly, g = E.back(seg(t, .6 + i * .7, .45)), hot = now === i + 1;
          if (g <= 0) return; var R = (hot ? 30 : 20) * u * Math.max(.01, g);
          F.circle(px, py, R + 10 * u, hexA(hot ? p._c2 : p._c1, .25)); F.circle(px, py, R, hot ? p._c2 : p._c1); if (hot) F.circle(px, py, R * .4, '#fff');
          var up = i % 2 === 0, a = seg(t, .8 + i * .7, .4), lab = Math.min(40 * u, (tall ? 46 : W * .9 / n * .2) * u), slot = tall ? W * .7 : W * .84 / n * 1.6;
          if (tall) { F.text(it.k || (i + 1), lx + 70 * u, py - 26 * u, { size: 40 * u, weight: 800, color: p._c1, align: 'left', maxW: W * .7, alpha: a }); F.text(it.v, lx + 70 * u, py + 28 * u, { size: 38 * u, weight: 600, color: p._tx, align: 'left', maxW: W * .72, alpha: a }); }
          else { var ty = up ? py - 70 * u : py + 70 * u; F.text(it.k || (i + 1), px, up ? ty - 50 * u : ty + 50 * u, { size: lab, weight: 800, color: hot ? p._c2 : p._c1, maxW: slot, alpha: a }); F.text(it.v, px, ty, { size: Math.min(36 * u, lab * .95), weight: 600, color: p._tx, maxW: slot, alpha: a }); }
        });
      }
    },
    /* 39. 조직도 */
    {
      id: 'org', group: 'PPT 꾸밈', icon: '🏢', name: '조직도 — 위에서 아래로',
      desc: '맨 위 상자 → 가운데 줄(팀, 4개까지) → 아래 줄(사업단·담당)이 차례로 나타납니다. 아래 줄은 「팀 번호 | 이름들」.',
      fields: [
        { k: 'top', label: '맨 위', def: '○○지역자활센터', max: 24 },
        { k: 'top2', label: '맨 위 작은 글(선택)', def: '센터장', max: 20 },
        { k: 'mid', label: '가운데 줄(한 줄에 하나, 4개까지)', type: 'lines', def: '자활사업운영과\n사례관리과\n운영지원과', max: 4 },
        { k: 'low', label: '아래 줄(「가운데 번호 | 이름, 이름」, 가운데마다 한 줄)', type: 'lines', def: '1 | 편의점 · 세차 · 청소 · 샐러드\n2 | 게이트웨이 · 사례관리 · 교육\n3 | 회계 · 총무 · 4대보험', max: 4 }
      ],
      dur: function (p) { return 1 + lines(p.mid, 4).length * .5 + lines(p.low, 4).length * .5 + 2; },
      draw: function (ctx, t, p, F) {
        var W = F.W, H = F.H, u = F.u, cx = F.cx, tall = H > W * 1.1; F.bg(p, t);
        var mids = lines(p.mid, 4), n = mids.length || 1, lows = {}; lines(p.low, 4).forEach(function (l) { var a = l.split('|'); if (a.length > 1) lows[parseInt(a[0], 10)] = a.slice(1).join('|').trim(); });
        var tw = Math.min(W * .5, 640 * u), th = (p.top2 ? 150 : 110) * u, ty = H * .1, g0 = E.back(seg(t, .2, .5));
        if (g0 > 0) { ctx.save(); ctx.translate(cx, ty + th / 2); var s0 = Math.max(.01, g0); ctx.scale(s0, s0); ctx.fillStyle = p._c1; F.rr(-tw / 2, -th / 2, tw, th, 22 * u); ctx.fill(); F.text(p.top, 0, p.top2 ? -24 * u : 0, { size: 54 * u, weight: 900, color: '#fff', maxW: tw - 60 * u }); F.text(p.top2, 0, 36 * u, { size: 34 * u, weight: 500, color: 'rgba(255,255,255,.9)', maxW: tw - 60 * u }); ctx.restore(); }
        var gap = 40 * u, mw = Math.min(400 * u, (W * .92 - gap * (n - 1)) / n), mh = 120 * u, my = ty + th + 110 * u, x0 = cx - (mw * n + gap * (n - 1)) / 2;
        var lg = E.io(seg(t, .7, .5)); ctx.save(); ctx.strokeStyle = hexA(p._tx, .4); ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.moveTo(cx, ty + th); ctx.lineTo(cx, ty + th + 55 * u * lg); ctx.stroke(); if (lg > .99 && n > 1) { var ag = E.io(seg(t, 1.0, .4)); ctx.beginPath(); ctx.moveTo(cx - (x0 + mw / 2 < cx ? (cx - x0 - mw / 2) * ag : 0), ty + th + 55 * u); ctx.lineTo(cx + (cx - x0 - mw / 2) * ag, ty + th + 55 * u); ctx.stroke(); } ctx.restore();
        mids.forEach(function (m, i) {
          var x = x0 + i * (mw + gap), g = E.back(seg(t, 1.2 + i * .5, .45)); if (g <= 0) return;
          ctx.save(); ctx.strokeStyle = hexA(p._tx, .4); ctx.lineWidth = 5 * u; ctx.beginPath(); ctx.moveTo(x + mw / 2, ty + th + 55 * u); ctx.lineTo(x + mw / 2, my); ctx.stroke(); ctx.restore();
          ctx.save(); ctx.translate(x + mw / 2, my + mh / 2); var s = Math.max(.01, g); ctx.scale(s, s); F.panel(-mw / 2, -mh / 2, mw, mh, 18 * u, p); ctx.strokeStyle = p._c1; ctx.lineWidth = 5 * u; ctx.stroke(); ctx.fillStyle = p._c2; F.rr(-mw / 2, -mh / 2, mw, 12 * u, 6 * u); ctx.fill(); F.text(m, 0, 6 * u, { size: 44 * u, weight: 800, color: p._tx, maxW: mw - 40 * u }); ctx.restore();
          var low = lows[i + 1]; if (!low) return; var gl = seg(t, 1.2 + n * .5 + i * .5, .5); if (gl <= 0) return;
          var ly = my + mh + 50 * u, lh = H - ly - H * .06, parts = low.split(/\s*[·,、]\s*/).filter(Boolean), ph = Math.min(80 * u, lh / Math.max(1, parts.length));
          ctx.save(); ctx.globalAlpha = gl; ctx.strokeStyle = hexA(p._tx, .35); ctx.lineWidth = 4 * u; ctx.setLineDash([10 * u, 10 * u]); ctx.beginPath(); ctx.moveTo(x + mw / 2, my + mh); ctx.lineTo(x + mw / 2, ly + ph * parts.length - ph / 2); ctx.stroke(); ctx.restore();
          parts.forEach(function (s2, j) { var a = seg(t, 1.2 + n * .5 + i * .5 + j * .15, .3); var yy = ly + ph * j + ph / 2; ctx.save(); ctx.globalAlpha = a; F.panel(x + 30 * u, yy - ph * .4, mw - 60 * u, ph * .8, 12 * u, p); ctx.restore(); F.text(s2, x + mw / 2, yy + 2 * u, { size: Math.min(34 * u, ph * .45), weight: 600, color: p._tx, maxW: mw - 90 * u, alpha: a }); });
        });
      }
    }
  ]);
})();
