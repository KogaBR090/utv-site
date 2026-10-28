/* UTV Produtora: comportamento e animações do site.
   Não é preciso editar este arquivo para trocar conteúdo: use conteudo.js. */
(function () {
  'use strict';

  var C = window.UTV || { trabalhos: [] };
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap;
  var ST = window.ScrollTrigger;
  var motion = !reduce && !!(G && ST);
  var lenis = null;

  if (!motion) root.classList.add('no-motion');

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function pad(n) { return String(n).padStart(2, '0'); }

  /* ---------- YouTube ---------- */
  function ytId(url) {
    if (!url) return '';
    var m = String(url).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(url) ? url : '';
  }
  function makeFrame(src, title) {
    var f = document.createElement('iframe');
    f.src = src;
    f.title = title || 'Vídeo';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    return f;
  }

  /* ---------- Portfólio ---------- */
  var FALLBACK = ['crepusculo', 'estudio', 'palco', 'ilha', 'cidade', 'janela', 'luz-quente', 'contraluz']
    .map(function (n) { return 'assets/img/' + n + '.jpg'; });
  var works = $('[data-works]');
  var filters = $('[data-filters]');

  function markFeature() {
    var first = true;
    $$('.work', works).forEach(function (w) {
      w.classList.toggle('is-feature', !w.hidden && first);
      if (!w.hidden) first = false;
    });
  }

  var filterRun = 0;
  function applyFilter(cat) {
    $$('button', filters).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === cat)); });
    var items = $$('.work', works);
    var show = function (w) { return cat === 'Todos' || w.dataset.cat === cat; };
    var run = ++filterRun;

    if (!motion || !window.Flip) {
      items.forEach(function (w) { w.hidden = !show(w); });
      markFeature();
      if (ST) ST.refresh();
      return;
    }

    // Cartões que saem somem com fade, os que continuam deslizam para a nova posição
    // e os que entram sobem com fade. A grade mantém a altura durante tudo isso
    // para a seção de baixo não subir por cima dos cartões.
    var leave = items.filter(function (w) { return !w.hidden && !show(w); });
    var stay = items.filter(function (w) { return !w.hidden && show(w); });
    var enter = items.filter(function (w) { return w.hidden && show(w); });
    works.style.minHeight = works.offsetHeight + 'px';

    var pending = 2;
    function settle() {
      if (--pending === 0 && run === filterRun) {
        works.style.minHeight = '';
        ST.refresh();
      }
    }

    function swap() {
      if (run !== filterRun) return;
      G.killTweensOf(items);
      G.set(items, { clearProps: 'opacity,transform' });
      var state = stay.length ? window.Flip.getState(stay) : null;
      items.forEach(function (w) { w.hidden = !show(w); });
      markFeature();
      if (state) {
        window.Flip.from(state, { duration: 0.6, ease: 'power3.inOut', absolute: true, nested: true, onComplete: settle });
      } else {
        settle();
      }
      if (enter.length) {
        // Entrada por CSS: não depende do ritmo do GSAP, então aparece já na primeira troca
        enter.forEach(function (w, i) {
          w.style.setProperty('--d', (i * 0.08) + 's');
          w.classList.add('is-entering');
          w.addEventListener('animationend', function () { w.classList.remove('is-entering'); }, { once: true });
        });
        setTimeout(settle, (enter.length - 1) * 80 + 900);
      } else {
        settle();
      }
    }

    if (leave.length) {
      G.to(leave, { opacity: 0, y: -24, duration: 0.35, stagger: 0.04, ease: 'power2.in', onComplete: swap });
    } else {
      swap();
    }
  }

  if (works && filters) {
    (C.trabalhos || []).forEach(function (t, i) {
      var id = ytId(t.video);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'work';
      b.dataset.cat = t.categoria || '';
      b.dataset.video = t.video || '';
      b.dataset.title = t.titulo || '';
      b.innerHTML = '<span class="work__media"><img alt=""></span>' +
        '<span class="work__meta"><span class="work__title"></span><span class="work__info"></span></span>';
      b.querySelector('img').src = t.imagem || (id ? 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg' : FALLBACK[i % FALLBACK.length]);
      b.querySelector('.work__title').textContent = t.titulo || '';
      b.querySelector('.work__info').textContent = [t.cliente, t.ano].filter(Boolean).join(', ');
      works.appendChild(b);
    });

    var cats = ['Todos'];
    (C.trabalhos || []).forEach(function (t) { if (t.categoria && cats.indexOf(t.categoria) < 0) cats.push(t.categoria); });
    cats.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.cat = c;
      b.textContent = c;
      b.setAttribute('aria-pressed', String(c === 'Todos'));
      filters.appendChild(b);
    });
    markFeature();
    filters.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) applyFilter(b.dataset.cat);
    });
  }

  /* ---------- Janela de vídeo ---------- */
  var lb = $('[data-lightbox]');
  function openVideo(url, title) {
    if (!lb) return;
    $('#lightbox-title', lb).textContent = title || '';
    var screen = $('[data-screen]', lb);
    screen.innerHTML = '';
    var id = ytId(url);
    if (id) {
      screen.appendChild(makeFrame('https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0', title));
    } else {
      var p = document.createElement('p');
      p.className = 'placeholder';
      p.textContent = '[Cole o link do YouTube deste vídeo em conteudo.js]';
      screen.appendChild(p);
    }
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    if (lenis) lenis.stop();
    if (motion) {
      G.fromTo(lb, { clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.out' });
      G.fromTo($('.lightbox__inner', lb), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.25, ease: 'power3.out' });
    }
  }
  if (lb) {
    lb.addEventListener('close', function () {
      $('[data-screen]', lb).innerHTML = '';
      if (lenis) lenis.start();
    });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  }
  document.addEventListener('click', function (e) {
    var v = e.target.closest('[data-video]');
    if (v) {
      openVideo(v.dataset.video === 'showreel' ? C.showreel : v.dataset.video, v.dataset.title);
      return;
    }
    if (e.target.closest('[data-close]') && lb) lb.close();
  });

  /* ---------- Canal: live, playlist e marcador de "agora" ---------- */
  var live = $('[data-live]');
  if (live && C.youtubeCanalId) {
    var ph = $('.placeholder', live);
    if (ph) ph.remove();
    live.appendChild(makeFrame('https://www.youtube.com/embed/live_stream?channel=' + encodeURIComponent(C.youtubeCanalId) + '&autoplay=1&mute=1', 'Canal UTV ao vivo'));
  }
  var pl = $('[data-playlist]');
  if (pl && C.playlistReprises) {
    pl.innerHTML = '';
    pl.appendChild(makeFrame('https://www.youtube-nocookie.com/embed/videoseries?list=' + encodeURIComponent(C.playlistReprises), 'Reprises do Canal UTV'));
  }
  var now = $('[data-now]');
  var elapsed = $('[data-elapsed]');
  var slots = $$('[data-slot]');
  function placeNow() {
    if (!now) return;
    var d = new Date();
    var pct = (d.getHours() * 60 + d.getMinutes()) / 1440 * 100;
    now.style.left = pct.toFixed(2) + '%';
    if (elapsed) elapsed.style.width = pct.toFixed(2) + '%';
    var tag = now.querySelector('.timeline__tag');
    tag.textContent = 'Agora ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    tag.classList.toggle('is-start', pct < 6);
    tag.classList.toggle('is-end', pct > 94);
    var cur = Math.floor(d.getHours() / 6);
    slots.forEach(function (li, i) { li.classList.toggle('is-now', i === cur); });
  }
  placeNow();
  if (now) setInterval(placeNow, 60000);

  /* ---------- Timecode, relógio e data do set ---------- */
  var tcs = $$('[data-tc]');
  if (tcs.length) {
    var t0 = performance.now();
    setInterval(function () {
      var f = Math.floor((performance.now() - t0) / (1000 / 24));
      var s = Math.floor(f / 24);
      var txt = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60) + ':' + pad(f % 24);
      tcs.forEach(function (el) { el.textContent = txt; });
    }, reduce ? 1000 : 42);
  }
  var clocks = $$('[data-clock]');
  function tickClock() {
    var d = new Date();
    clocks.forEach(function (el) { el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); });
  }
  if (clocks.length) { tickClock(); setInterval(tickClock, 1000); }
  $$('[data-today]').forEach(function (el) {
    var d = new Date();
    el.textContent = pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  });

  /* ---------- Navegação: some ao descer, volta ao subir, troca de cor sobre fundo claro ---------- */
  var nav = $('.nav');
  var bar = $('.progress');
  var themed = $$('[data-nav]');
  var lastY = window.scrollY;
  function onScroll() {
    var y = window.scrollY;
    if (nav) {
      var theme = 'dark';
      for (var i = 0; i < themed.length; i++) {
        var r = themed[i].getBoundingClientRect();
        if (r.top <= 36 && r.bottom > 36) { theme = themed[i].dataset.nav; break; }
      }
      nav.classList.toggle('on-light', theme === 'light');
      nav.classList.toggle('is-scrolled', y > 60);
      if (Math.abs(y - lastY) > 4) {
        nav.classList.toggle('is-hidden', y > lastY && y > 240);
        lastY = y;
      }
    }
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Menu no celular ---------- */
  var menu = $('#menu');
  var openBtn = $('.nav .nav__toggle');
  function setMenu(open) {
    if (!menu || !openBtn) return;
    menu.classList.toggle('is-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) { var c = $('.menu__close', menu); if (c) c.focus(); } else { openBtn.focus({ preventScroll: true }); }
  }
  if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
  if (menu) {
    menu.addEventListener('click', function (e) {
      if (e.target.closest('.menu__close') || e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
    });
  }

  /* ---------- Sem animação: para aqui ---------- */
  var intro = $('.intro');
  if (!motion) {
    if (intro) intro.remove();
    return;
  }

  /* ---------- Rolagem suave ---------- */
  G.registerPlugin.apply(G, [ST, window.SplitText, window.Flip].filter(Boolean));
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ST.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var target = a.getAttribute('href') === '#' ? null : $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- Ajudantes de texto ---------- */
  var Split = window.SplitText;
  function revealLines(el, opts) {
    if (!Split) return;
    opts = opts || {};
    Split.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: function (self) {
        return G.from(self.lines, {
          yPercent: 110,
          duration: 1.2,
          ease: 'expo.out',
          stagger: 0.1,
          delay: opts.delay || 0,
          scrollTrigger: opts.immediate ? null : { trigger: el, start: 'top 86%', once: true }
        });
      }
    });
  }

  // Letras partem espalhadas a partir do centro e se juntam. Usa transform,
  // então a frase já ocupa o lugar final e não muda de linha durante a animação.
  function spreadChars(el) {
    if (!Split || !el) return { chars: [el], x: function () { return 0; } };
    var chars = Split.create(el, { type: 'words,chars' }).chars;
    var mid = (chars.length - 1) / 2;
    var step = parseFloat(getComputedStyle(el).fontSize) * 0.3;
    return { chars: chars, x: function (i) { return (i - mid) * step; } };
  }

  /* ---------- Entrada da abertura ---------- */
  function heroIn() {
    var title = $('[data-hero-title]');
    var tl = G.timeline();
    var media = $('[data-hero-media] img') || $('.ch-hero [data-parallax] img');
    if (media) tl.fromTo(media, { scale: 1.22 }, { scale: 1, duration: 2.6, ease: 'expo.out' }, 0);
    if (title && Split) {
      var s = Split.create(title, { type: 'lines,words,chars', mask: 'lines' });
      tl.from(s.chars, { yPercent: 115, duration: 1.4, ease: 'expo.out', stagger: 0.035 }, 0.15);
    }
    var vf = $('.hero .vf');
    if (vf) tl.from(vf, { scale: 1.08, opacity: 0, duration: 1.8, ease: 'expo.out' }, 0.4);
    var rule = $('[data-hero-rule]');
    if (rule) tl.from(rule, { scaleX: 0, duration: 1.2, ease: 'expo.inOut' }, 0.7);
    var items = $$('[data-intro-item]');
    if (items.length) tl.from(items, { opacity: 0, y: 24, duration: 1, ease: 'power3.out', stagger: 0.12 }, 0.6);
    var player = $('[data-live]');
    if (player) tl.from(player, { clipPath: 'inset(12% 8% 12% 8%)', duration: 1.6, ease: 'expo.out' }, 0.3);
    $$('.ch-hero [data-fade]').forEach(function (el) { tl.from(el, { opacity: 0, y: 24, duration: 1, ease: 'power3.out' }, 0.7); });
    return tl;
  }

  function playIntro(done) {
    if (!intro || location.hash) { if (intro) intro.remove(); done(); return; }
    intro.style.animation = 'none';
    if (lenis) lenis.stop();
    var tc = $('.intro__tc', intro);
    var clock = { f: 0 };
    G.timeline({ onComplete: function () { intro.remove(); if (lenis) lenis.start(); } })
      .from('.intro__logo', { opacity: 0, letterSpacing: '1.1em', duration: 1.1, ease: 'power3.out' }, 0)
      .to(clock, {
        f: 48, duration: 1.2, ease: 'none',
        onUpdate: function () { var f = Math.round(clock.f); tc.textContent = '00:00:' + pad(Math.floor(f / 24)) + ':' + pad(f % 24); }
      }, 0)
      .to(intro, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, 1.3)
      .add(done, 1.55);
  }

  /* ---------- Animações de rolagem ---------- */
  function scrollScenes() {
    // Abertura sai de cena: imagem desce e cresce, texto sobe e some
    var hero = $('.hero');
    if (hero) {
      G.to('[data-hero-media]', { yPercent: 20, scale: 1.08, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      G.to('[data-hero-content]', { yPercent: -40, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '75% top', scrub: true } });
    }

    // Fundo das cenas mais lento que a página
    $$('[data-parallax]').forEach(function (el) {
      G.fromTo(el, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    $$('[data-lines]').forEach(function (el) { revealLines(el); });
    $$('[data-chars]').forEach(function (el) {
      if (!Split) return;
      var s = Split.create(el, { type: 'lines,words,chars', mask: 'lines' });
      G.from(s.chars, { yPercent: 115, duration: 1.3, ease: 'expo.out', stagger: 0.04, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    });
    $$('[data-bar]').forEach(function (el) {
      G.from(el, { scaleX: 0, duration: 1.2, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
    $$('[data-fade]').forEach(function (el) {
      if (el.closest('.ch-hero')) return;
      G.from(el, { opacity: 0, y: 30, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('[data-stagger]').forEach(function (el) {
      G.from(el.children, { opacity: 0, y: 30, duration: 1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    // Showreel: a moldura abre até a tela inteira enquanto a seção fica parada
    var reel = $('#showreel');
    if (reel) {
      var reelWord = spreadChars($('[data-reel-word]'));
      G.timeline({ scrollTrigger: { trigger: reel, start: 'top top', end: '+=140%', pin: true, scrub: 1, anticipatePin: 1 } })
        .fromTo('[data-reel-frame]', { clipPath: 'inset(22% 26% 22% 26%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 }, 0)
        .fromTo('[data-reel-img]', { scale: 1.4 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .fromTo('[data-reel-content] b', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 0.45)
        .fromTo(reelWord.chars, { x: reelWord.x, opacity: 0 }, { x: 0, opacity: 1, ease: 'none', duration: 0.55 }, 0.45)
        .fromTo('[data-reel-content] .cta', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.25 }, 0.85);
    }

    // Portfólio: tudo acompanha a rolagem (e volta ao rolar para cima).
    // O quadro abre aos poucos, a foto dá zoom e se move mais devagar que a página,
    // e o título sobe junto. Nada começa totalmente escondido.
    if (works) {
      $$('.work', works).forEach(function (w) {
        var media = $('.work__media', w);
        var img = $('.work__media img', w);
        var meta = $('.work__meta', w);
        var feature = w.classList.contains('is-feature');
        G.fromTo(media,
          { clipPath: feature ? 'inset(14% 12% 14% 12%)' : 'inset(16% 14% 16% 14%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: feature ? 'top 30%' : 'top 45%', scrub: 0.5 } });
        G.fromTo(img,
          { scale: 1.35, yPercent: -5 },
          { scale: 1.15, yPercent: 5, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: 0.5 } });
        if (meta && !feature) {
          G.fromTo(meta, { y: 48, opacity: 0.15 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: media, start: 'bottom bottom', end: 'bottom 70%', scrub: 0.5 } });
        }
        if (meta && feature) {
          G.fromTo(meta, { y: 40, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: w, start: 'top 75%', end: 'top 35%', scrub: 0.5 } });
        }
      });
    }

    // Serviços: a seção para na tela e as três etapas trocam uma por vez, na ordem.
    // A linha vermelha mostra quanto falta; o título fica parado ao lado.
    var list = $('[data-services]');
    if (list) {
      var steps = $$('[data-service]', list);
      var stage = list.closest('.services');
      stage.classList.add('is-staged');
      list.classList.add('is-staged');
      G.set(steps.slice(1), { autoAlpha: 0, yPercent: 35 });
      var stl = G.timeline({
        scrollTrigger: { trigger: stage, start: 'center center', end: function () { return '+=' + Math.round(window.innerHeight * 0.9 * steps.length); }, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true }
      });
      steps.forEach(function (step, i) {
        if (i === 0) return;
        var at = i - 0.5;
        stl.to(steps[i - 1], { autoAlpha: 0, yPercent: -35, duration: 0.45, ease: 'power2.in' }, at)
           .fromTo(step, { autoAlpha: 0, yPercent: 35 }, { autoAlpha: 1, yPercent: 0, duration: 0.45, ease: 'power2.out' }, at + 0.4);
      });
      stl.to({}, { duration: 0.5 });
      stl.fromTo('[data-services-fill]', { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: stl.duration() }, 0);
    }

    // Bastidores: a faixa de fotos corre na horizontal enquanto a página desce
    var bs = $('[data-backstage]');
    var track = $('[data-backstage-track]');
    if (bs && track) {
      var viewport = $('.backstage__viewport', bs);
      bs.classList.add('is-pinned');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var hz = G.to(track, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: { trigger: viewport, start: 'center center', end: function () { return '+=' + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      $$('[data-shot-img]', track).forEach(function (img) {
        G.fromTo(img, { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
      });
      $$('.shot', track).forEach(function (shot) {
        G.from(shot, { y: 80, ease: 'none', scrollTrigger: { trigger: shot, containerAnimation: hz, start: 'left 95%', end: 'left 60%', scrub: true } });
      });
    }

    // Quadros que se abrem e imagens que se movem dentro da moldura
    $$('[data-clip]').forEach(function (el) {
      G.from(el, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });
    $$('[data-inner-parallax]').forEach(function (img) {
      G.fromTo(img, { yPercent: -6, scale: 1.14 }, { yPercent: 6, scale: 1.14, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // Clientes: duas faixas em sentidos opostos, mais rápidas quando a página rola
    var mq = $('[data-marquee]');
    if (mq) {
      var rows = $$('.marquee__row', mq);
      rows.forEach(function (row) {
        var items = $$('li', row);
        for (var k = 0; k < 2; k++) {
          items.forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); row.appendChild(c); });
        }
      });
      mq.classList.add('is-moving');
      var visible = false;
      ST.create({ trigger: mq, start: 'top bottom', end: 'bottom top', onToggle: function (self) { visible = self.isActive; } });
      rows.forEach(function (row) {
        row._w = row.scrollWidth / 3;
        row._x = row.dataset.dir === '1' ? -row._w : 0;
      });
      window.addEventListener('resize', function () { rows.forEach(function (row) { row._w = row.scrollWidth / 3; }); });
      G.ticker.add(function (time, delta) {
        if (!visible) return;
        var v = lenis ? lenis.velocity : 0;
        var dirScroll = v < 0 ? -1 : 1;
        var speed = (0.045 + Math.min(Math.abs(v), 60) * 0.012) * delta;
        rows.forEach(function (row) {
          var dir = Number(row.dataset.dir) * dirScroll;
          row._x += speed * dir;
          if (row._x <= -row._w) row._x += row._w;
          if (row._x > 0) row._x -= row._w;
          G.set(row, { x: row._x });
        });
      });
    }

    // Claquete: a haste fecha conforme a página desce e bate quando chega ao fim
    var slate = $('[data-slate]');
    var stick = $('[data-slate-stick]');
    if (slate && stick) {
      var clapParts = [$('.slate__sticks', slate), $('.slate__grid', slate)];
      G.fromTo(stick, { rotate: -11 }, {
        rotate: 0,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: slate, start: 'top 92%', end: 'top 60%', scrub: 0.3,
          onLeave: function () { G.fromTo(clapParts, { y: 0 }, { y: 5, duration: 0.06, yoyo: true, repeat: 1, ease: 'power1.out' }); }
        }
      });
    }

    // Contato: as letras se juntam quando o título entra na tela
    $$('[data-track]').forEach(function (el) {
      var t = spreadChars(el);
      var lead = el.parentElement ? $('b', el.parentElement) : null;
      var tl = G.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' } });
      if (lead) tl.from(lead, { opacity: 0, y: 24, duration: 0.9, ease: 'power3.out' }, 0);
      tl.fromTo(t.chars, { x: t.x, opacity: 0 }, { x: 0, opacity: 1, duration: 1.6, ease: 'expo.out', stagger: { each: 0.02, from: 'center' } }, 0.1);
    });

    // Canal: a régua da grade se desenha e as faixas entram em sequência
    var rule = $('[data-rule]');
    if (rule) {
      G.from(rule, { scaleX: 0, ease: 'none', scrollTrigger: { trigger: rule, start: 'top 85%', end: 'top 55%', scrub: true } });
      G.from('[data-slot]', { opacity: 0, y: 40, duration: 1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: rule, start: 'top 80%', once: true } });
      if (now) G.from(now, { opacity: 0, y: -14, duration: 1, ease: 'power3.out', delay: 0.5, scrollTrigger: { trigger: rule, start: 'top 80%', once: true } });
    }

    // As seções fixadas mudam a altura da página: recalcula na ordem em que aparecem
    ST.sort();
    ST.refresh();
  }

  function start() {
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(function () {
      scrollScenes();
      playIntro(function () { heroIn(); });
      if (location.hash) {
        var t = $(location.hash);
        if (t && lenis) setTimeout(function () { lenis.scrollTo(t, { immediate: true }); }, 60);
      }
      window.addEventListener('load', function () { ST.refresh(); });
    });
  }
  start();
})();
