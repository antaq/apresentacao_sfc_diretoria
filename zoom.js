/*
 * Zoom de texto da apresentação à Diretoria — SFC.
 *
 * Adaptado do visualizador do Workshop SAI. A diferença: lá os slides são
 * escritos à mão com os textos em rem (base 26px no <html>), então bastava
 * mexer no font-size da raiz. Aqui os slides usam utilitários do Tailwind,
 * em que TAMBÉM os espaçamentos (p-*, gap-*, w-*) estão em rem — mexer na
 * raiz redimensionaria a página inteira e quebraria o layout de 1920x1080.
 *
 * Por isso o zoom usa uma custom property (--tz) aplicada só às classes de
 * tamanho de texto. Caixas, paddings e larguras permanecem intactos.
 *
 * Controles: teclas + / - / 0 (no slide ou no visualizador) e os botões da
 * barra de navegação. O nível é persistido em localStorage e compartilhado
 * por todos os slides.
 */
(function () {
  var MIN = 0.8, MAX = 1.4, STEP = 0.1;
  var KEY = 'sfc-diretoria-zoom';
  var embedded = window.parent !== window;

  /* Reescreve as classes de tamanho do Tailwind em função de --tz.
     A folha é anexada ao final do <head>, depois do CDN, para vencer no
     desempate por ordem. As line-heights viram adimensionais (mesma razão
     do original) para acompanharem o texto; leading-* é redeclarado na
     sequência para continuar prevalecendo onde estiver escrito. */
  var CSS = [
    ':root{--tz:1;}',
    '.text-xs{font-size:calc(0.75rem*var(--tz));line-height:1.333;}',
    '.text-sm{font-size:calc(0.875rem*var(--tz));line-height:1.429;}',
    '.text-base{font-size:calc(1rem*var(--tz));line-height:1.5;}',
    '.text-lg{font-size:calc(1.125rem*var(--tz));line-height:1.556;}',
    '.text-xl{font-size:calc(1.25rem*var(--tz));line-height:1.4;}',
    '.text-2xl{font-size:calc(1.5rem*var(--tz));line-height:1.333;}',
    '.text-3xl{font-size:calc(1.875rem*var(--tz));line-height:1.2;}',
    '.text-4xl{font-size:calc(2.25rem*var(--tz));line-height:1.111;}',
    '.text-5xl{font-size:calc(3rem*var(--tz));line-height:1;}',
    '.text-6xl{font-size:calc(3.75rem*var(--tz));line-height:1;}',
    '.leading-none{line-height:1;}',
    '.leading-snug{line-height:1.375;}',
    '.leading-relaxed{line-height:1.625;}',
    /* Acima de 100% o texto cresce além dos 1080px em que os slides foram
       fechados. Em vez de cortar conteúdo, o slide passa a rolar. */
    'html[data-tz-over] .slide{overflow-y:auto;overflow-x:hidden;}',
    'html[data-tz-over] .slide::-webkit-scrollbar{width:10px;}',
    'html[data-tz-over] .slide::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.5);border-radius:5px;}'
  ].join('');

  var style = document.createElement('style');
  style.id = 'tz-style';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  var zoom = parseFloat(localStorage.getItem(KEY));
  if (!zoom || zoom < MIN || zoom > MAX) zoom = 1;

  function apply(showFeedback) {
    var root = document.documentElement;
    root.style.setProperty('--tz', String(zoom));
    if (zoom > 1) {
      root.setAttribute('data-tz-over', '');
    } else {
      root.removeAttribute('data-tz-over');
      /* Voltando a caber, o overflow vira hidden de novo — sem zerar a
         rolagem o slide ficaria travado no ponto em que estava. */
      var slide = document.querySelector('.slide');
      if (slide) slide.scrollTop = 0;
    }
    if (embedded) {
      window.parent.postMessage({ type: 'slide-zoom-changed', value: zoom }, '*');
    }
    if (showFeedback) badge();
  }

  function set(z, showFeedback) {
    zoom = Math.min(MAX, Math.max(MIN, Math.round(z * 10) / 10));
    localStorage.setItem(KEY, String(zoom));
    apply(showFeedback);
  }

  /* Indicador temporário com o nível atual (ex.: "Texto: 120%") */
  var badgeEl = null, badgeTimer = null;
  function badge() {
    if (!badgeEl) {
      badgeEl = document.createElement('div');
      badgeEl.style.cssText =
        'position:fixed;top:24px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,51,102,0.92);color:#fff;font:700 15px/1 Montserrat,sans-serif;' +
        'padding:10px 22px;border-radius:999px;z-index:9999;pointer-events:none;' +
        'box-shadow:0 6px 18px rgba(0,0,0,0.3);transition:opacity 0.3s;';
      document.body.appendChild(badgeEl);
    }
    badgeEl.textContent = 'Texto: ' + Math.round(zoom * 100) + '%';
    badgeEl.style.opacity = '1';
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(function () { badgeEl.style.opacity = '0'; }, 1200);
  }

  window.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // preserva o zoom nativo do navegador
    if (e.key === '+' || e.key === '=') { e.preventDefault(); set(zoom + STEP, true); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); set(zoom - STEP, true); }
    else if (e.key === '0') { e.preventDefault(); set(1, true); }
  });

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.type !== 'slide-zoom') return;
    if (d.action === 'in') set(zoom + STEP, true);
    else if (d.action === 'out') set(zoom - STEP, true);
    else if (d.action === 'reset') set(1, true);
  });

  /* Fora do visualizador não há nada a ajustar: os slides já são 100vw/100vh. */
  document.addEventListener('DOMContentLoaded', function () { apply(false); });
  apply(false);
})();
