/* =========================================================
   АЛЬБОМ «МЫ ВМЕСТЕ» — логика
   Чистый JavaScript, без библиотек.
   ========================================================= */

/* ---------------------------------------------------------
   1. НАСТРОЙКИ — всё, что можно поменять под себя
   --------------------------------------------------------- */

// Дата, с которой считает живой таймер (страница 1).
// Формат: 'ГГГГ-ММ-ДДTЧЧ:ММ:СС' — время местное.
const START_DATE = new Date('2026-02-21T00:00:00');

// Причины для сердечек (страница 5). Можно добавлять сколько угодно —
// при повторном нажатии сердечко показывает следующую причину.
// Лучше короткие: до ~30 символов, чтобы влезали в сердечко.
const REASONS = [
  'За твою улыбку',
  'За то, как ты меня обнимаешь',
  'За твои глаза, в которых я тону',
  'За твой заразительный смех',
  'За то, что с тобой спокойно',
  'За твои милые звуки',
  'За то, что ты веришь в меня',
  'За наши ночные разговоры',
  'За то, что ты — это ты',
  'За твою заботу',
  'За то, как ты смотришь на меня',
  'За «доброе утро» от тебя',
  'За то, что ты меня понимаешь',
  'За уютное молчание вдвоём',
  'За твою доброту',
  'За то, как мило ты показываешь язычок',
  'За наши долгие прогулки',
  'За то, что я с тобой лучше',
  'За твой голос',
  'За каждый наш поцелуй',
  'За то, что ты рядом',
  'За нашу общую дурашливость',
  'За то, что ты моя',
  'Просто за то, что ты есть'
];

// Сколько сердечек на странице (3 в ряд)
const HEARTS_COUNT = 12;
const HEART_COLORS = ['#ffc2d4', '#ffadc6', '#ff9bb8', '#ffd3e0', '#f98bab', '#ffb6cc'];

// Конвертики (страница 6): подпись на конверте, заголовок и текст письма.
const LETTERS = [
  {
    label: 'когда грустно',
    title: 'Открой, когда грустно',
    text: 'Катюша, если тебе сейчас грустно — просто вспомни, что есть человек, который любит тебя больше всего на свете. Это я.\n\nВсё обязательно наладится. А я буду рядом и обниму так крепко, как только смогу.'
  },
  {
    label: 'когда скучаешь',
    title: 'Открой, когда скучаешь',
    text: 'Я тоже скучаю. Прямо сейчас.\n\nЗакрой глаза и представь, что я рядом и держу тебя за руку. Скоро это будет по-настоящему — и я долго-долго тебя не отпущу.'
  },
  {
    label: 'когда не спится',
    title: 'Открой, когда не спится',
    text: 'Не спится? Значит, думаешь обо мне :)\n\nЯ тоже часто засыпаю с мыслями о тебе. Спокойной ночи, Катюша. Пусть тебе приснится наша следующая встреча.'
  },
  {
    label: 'просто так',
    title: 'Просто так',
    text: 'Просто хочу сказать, что ты лучший и самый главный человечек в моей жизни.\n\nСпасибо тебе за каждый день, каждый смех и каждый поцелуй. Я люблю тебя.'
  }
];
const ENVELOPE_COLORS = [
  { env: '#f9c3d2', inside: '#e7859f', flap: '#fcd6e0' },
  { env: '#f4e6d4', inside: '#d9b98c', flap: '#faf1e5' },
  { env: '#ffffff', inside: '#f3a9bd', flap: '#fdf4f7' },
  { env: '#ef8ea8', inside: '#c24a6a', flap: '#f6b3c5' }
];

// Количество колец пружины (должно совпадать с --rings в style.css)
const RINGS = 12;


/* ---------------------------------------------------------
   2. ВСПОМОГАТЕЛЬНОЕ
   --------------------------------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Предсказуемый «случайный» генератор: узор не меняется при перезагрузке
function seeded(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Склонение: plural(5, ['день', 'дня', 'дней']) → 'дней'
function plural(n, forms) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}


/* ---------------------------------------------------------
   3. КНИГА: перелистывание, кнопки, свайпы, клавиатура
   --------------------------------------------------------- */
const book = $('#book');
const leaves = $$('.leaf', book);
const N = leaves.length;
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
const dotsBox = $('#dots');
const STAGGER = 130; // задержка между листами при перелистывании сразу через несколько

let cur = 0;
let flipTimers = [];
let farTimer = null;

// Порядок наложения: верхний лист — обложка
leaves.forEach((leaf, i) => {
  leaf.style.zIndex = N - i;
  const front = $('.front', leaf);
  if (front) front.insertAdjacentHTML('beforeend', '<span class="shade" aria-hidden="true"></span>');
});

// Точки-индикатор
leaves.forEach((_, i) => {
  const b = document.createElement('button');
  b.className = 'dot';
  b.setAttribute('aria-label', i === 0 ? 'Обложка' : 'Страница ' + i);
  b.addEventListener('click', () => goTo(i));
  dotsBox.appendChild(b);
});
const dots = $$('.dot', dotsBox);

function flipTime() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--flip-time')) * 1000 || 1100;
}

function updateState() {
  leaves.forEach((leaf, i) => {
    const isCur = i === cur;
    leaf.classList.toggle('is-current', isCur);
    leaf.inert = !isCur;
    leaf.setAttribute('aria-hidden', String(!isCur));
  });
  dots.forEach((d, i) => d.classList.toggle('active', i === cur));
  prevBtn.disabled = cur === 0;
  nextBtn.disabled = cur === N - 1;
  history.replaceState(null, '', cur ? '#p' + cur : location.pathname + location.search);
}

function goTo(target, instant = false) {
  target = Math.max(0, Math.min(N - 1, target));
  if (target === cur && !instant) return;
  const from = cur;
  cur = target;

  // Отменяем незавершённые перелистывания
  flipTimers.forEach(clearTimeout);
  flipTimers = [];
  clearTimeout(farTimer);

  // На время анимации показываем все задействованные листы
  const hi = Math.max(from, target);
  leaves.forEach((leaf, i) => leaf.classList.toggle('far', i > hi + 1));

  // Какие листы должны поменять состояние
  const changes = leaves
    .map((leaf, i) => ({ leaf, i, want: i < cur }))
    .filter(c => c.leaf.classList.contains('flipped') !== c.want);
  if (target < from) changes.reverse(); // назад — сначала ближайший лист

  if (instant) {
    book.classList.add('no-anim');
    changes.forEach(c => c.leaf.classList.toggle('flipped', c.want));
    book.offsetHeight; // применяем без анимации
    book.classList.remove('no-anim');
  } else {
    changes.forEach((c, k) => {
      const run = () => c.leaf.classList.toggle('flipped', c.want);
      if (k === 0) run(); else flipTimers.push(setTimeout(run, k * STAGGER));
    });
  }

  updateState();
  onPageEnter(cur);

  // Прячем дальние листы, чтобы телефону было легче
  farTimer = setTimeout(() => {
    leaves.forEach((leaf, i) => leaf.classList.toggle('far', i > cur + 1));
  }, instant ? 0 : changes.length * STAGGER + flipTime() + 50);
}

const next = () => goTo(cur + 1);
const prev = () => goTo(cur - 1);

prevBtn.addEventListener('click', prev);
nextBtn.addEventListener('click', next);
$$('[data-go]').forEach(btn => btn.addEventListener('click', () => goTo(+btn.dataset.go)));

// Клавиатура
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeLightbox(); closeLetter(); return; }
  if (isModalOpen()) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
});

// Свайпы на телефоне
(() => {
  let sx = 0, sy = 0, st = 0, tracking = false;
  const stage = $('#stage');
  stage.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || isModalOpen()) { tracking = false; return; }
    tracking = true;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - st < 800) {
      dx < 0 ? next() : prev();
    }
  }, { passive: true });
})();

// Действия при открытии страницы
function onPageEnter(i) {
  if (i === N - 1) heartConfetti();
}


/* ---------------------------------------------------------
   4. ПРУЖИНА И БЛЁСТКИ НА ФОНЕ
   --------------------------------------------------------- */
$('#rings').innerHTML = '<span class="ring"></span>'.repeat(RINGS);

(() => {
  const box = $('#bgSparkles');
  const rnd = seeded(11);
  let html = '';
  for (let i = 0; i < 26; i++) {
    html += `<i style="left:${(rnd() * 100).toFixed(1)}%;top:${(rnd() * 100).toFixed(1)}%;` +
      `--s:${(6 + rnd() * 12).toFixed(0)}px;--t:${(2.5 + rnd() * 3).toFixed(1)}s;--d:${(rnd() * 4).toFixed(1)}s"></i>`;
  }
  box.innerHTML = html;
})();


/* ---------------------------------------------------------
   5. НАДПИСИ СТРАЗАМИ (обложка)
   Текст рисуется на невидимом canvas, а потом в местах букв
   раскладываются «камушки» в шахматном порядке.
   --------------------------------------------------------- */
function buildGemText(el, seed) {
  const text = el.dataset.gems;
  const ruby = el.dataset.palette === 'ruby';
  const fs = 150;                 // размер шрифта на холсте
  const track = fs * 0.08;        // расстояние между буквами
  const font = `900 ${fs}px Montserrat, "Arial Black", sans-serif`;

  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.font = font;
  const chars = [...text];
  const widths = chars.map(ch => ctx.measureText(ch).width);
  const W = Math.ceil(widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1) + fs * 0.4);
  const H = Math.ceil(fs * 1.1);
  c.width = W; c.height = H;
  ctx.font = font;
  ctx.fillStyle = '#000';
  let x = fs * 0.2;
  chars.forEach((ch, i) => { ctx.fillText(ch, x, fs * 0.9); x += widths[i] + track; });

  const data = ctx.getImageData(0, 0, W, H).data;
  const step = fs * 0.088;        // шаг между стразами
  const rowH = step * 0.87;
  const gems = [];
  for (let r = 0, y = step / 2; y < H; r++, y += rowH) {
    for (let gx = (r % 2) * step / 2 + step / 2; gx < W; gx += step) {
      if (data[((y | 0) * W + (gx | 0)) * 4 + 3] > 150) gems.push([gx, y]);
    }
  }
  if (!gems.length) { el.textContent = text; return; }

  const rnd = seeded(seed);
  const fills = ruby ? ['gemRuby', 'gemRuby2', 'gemRuby'] : ['gemCrystal', 'gemPink', 'gemIris', 'gemCrystal'];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let body = '';
  for (const [gx, gy] of gems) {
    minX = Math.min(minX, gx); maxX = Math.max(maxX, gx);
    minY = Math.min(minY, gy); maxY = Math.max(maxY, gy);
    const r = step * (0.44 + rnd() * 0.07);
    body += `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${r.toFixed(2)}" fill="url(#${fills[(rnd() * fills.length) | 0]})"/>`;
  }
  // Искорки поверх страз
  let sparks = '';
  const nSp = Math.max(6, Math.round(gems.length * 0.06));
  for (let k = 0; k < nSp; k++) {
    const [gx, gy] = gems[(rnd() * gems.length) | 0];
    const s = step * (1.1 + rnd() * 0.9), q = s * 0.16;
    sparks += `<path class="spark" style="--d:${(rnd() * 3.2).toFixed(2)}s" d="M${gx} ${gy - s}L${gx + q} ${gy - q}L${gx + s} ${gy}L${gx + q} ${gy + q}L${gx} ${gy + s}L${gx - q} ${gy + q}L${gx - s} ${gy}L${gx - q} ${gy - q}Z"/>`;
  }
  const pad = step;
  el.innerHTML =
    `<svg viewBox="${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + pad * 2).toFixed(1)} ${(maxY - minY + pad * 2).toFixed(1)}" aria-hidden="true">` +
    `<g stroke="rgba(70,20,35,.28)" stroke-width="${(step * 0.05).toFixed(2)}">${body}</g>${sparks}</svg>`;
}

function buildAllGems() {
  $$('.gem-text').forEach((el, i) => buildGemText(el, 101 + i * 17));
}
// Ждём загрузки шрифта Montserrat, чтобы буквы получились правильными
if (document.fonts && document.fonts.load) {
  Promise.race([
    document.fonts.load('900 150px Montserrat', $$('.gem-text').map(el => el.dataset.gems).join('')),
    new Promise(r => setTimeout(r, 2500))
  ]).then(buildAllGems, buildAllGems);
} else {
  buildAllGems();
}


/* ---------------------------------------------------------
   6. ЖИВОЙ ТАЙМЕР (страница 1)
   --------------------------------------------------------- */
const TIMER_UNITS = [
  ['years',   ['год', 'года', 'лет']],
  ['months',  ['месяц', 'месяца', 'месяцев']],
  ['weeks',   ['неделя', 'недели', 'недель']],
  ['days',    ['день', 'дня', 'дней']],
  ['hours',   ['час', 'часа', 'часов']],
  ['minutes', ['минута', 'минуты', 'минут']],
  ['seconds', ['секунда', 'секунды', 'секунд']]
];

function addMonths(date, n) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInMonth));
  return d;
}

// Разница между датами по календарю: годы, месяцы, недели, дни, часы, минуты, секунды
function dateDiff(from, to) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  let anchor = addMonths(from, months);
  if (anchor > to) { months--; anchor = addMonths(from, months); }
  let rest = Math.floor((to - anchor) / 1000);
  const totalDays = Math.floor(rest / 86400); rest %= 86400;
  return {
    years: Math.floor(months / 12),
    months: months % 12,
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    hours: Math.floor(rest / 3600),
    minutes: Math.floor((rest % 3600) / 60),
    seconds: rest % 60
  };
}

(() => {
  const box = $('#timer');
  const label = $('#timerLabel');
  const total = $('#timerTotal');
  box.innerHTML = TIMER_UNITS.map(([key]) =>
    `<div class="t-unit" data-unit="${key}"><span class="t-num">0</span><span class="t-lbl"></span></div>`).join('');
  const cells = Object.fromEntries(TIMER_UNITS.map(([key]) => [key, $(`[data-unit="${key}"]`, box)]));
  let last = {};

  // Большая цифра + слово (месяцы, а после первой годовщины — годы)
  const bigNum = $('#bigNum');
  const bigWord = $('#bigWord');
  const totals = $('#totals');
  function updateBig(parts, ms) {
    const useYears = parts.years > 0;
    const n = useYears ? parts.years : parts.months;
    const word = plural(n, useYears ? ['год', 'года', 'лет'] : ['месяц', 'месяца', 'месяцев']).toUpperCase();
    if (bigNum.dataset.text !== String(n)) {
      bigNum.dataset.text = n;
      bigNum.firstElementChild.textContent = n;
      bigNum.classList.toggle('two-digits', String(n).length > 1);
    }
    if (bigWord.textContent !== word) {
      bigWord.textContent = word;
      bigWord.style.fontSize = Math.min(15, 41 / (word.length * 0.8)).toFixed(2) + 'cqw';
    }
    // Сколько всего недель, дней, часов, минут и секунд мы вместе
    const s = Math.max(0, Math.floor(ms / 1000));
    totals.innerHTML = [
      [Math.floor(s / 604800), ['неделя', 'недели', 'недель']],
      [Math.floor(s / 86400), ['день', 'дня', 'дней']],
      [Math.floor(s / 3600), ['час', 'часа', 'часов']],
      [Math.floor(s / 60), ['минута', 'минуты', 'минут']],
      [s, ['секунда', 'секунды', 'секунд']]
    ].map(([v, f]) => `<li><b>${v.toLocaleString('ru-RU')}</b> ${plural(v, f)}</li>`).join('');
  }

  function tick() {
    const now = new Date();
    const future = now < START_DATE;   // если дата ещё не наступила — обратный отсчёт
    const parts = future ? dateDiff(now, START_DATE) : dateDiff(START_DATE, now);
    label.textContent = future ? 'До нашей даты осталось:' : 'Мы вместе:';
    updateBig(future ? dateDiff(now, now) : parts, now - START_DATE);

    // Плитку «лет» показываем, только когда пройдёт первый год
    cells.years.hidden = parts.years === 0;
    box.dataset.count = parts.years === 0 ? 6 : 7;

    for (const [key, forms] of TIMER_UNITS) {
      const v = parts[key];
      if (last[key] === v) continue;
      const cell = cells[key];
      cell.querySelector('.t-num').textContent = v;
      cell.querySelector('.t-lbl').textContent = plural(v, forms);
      if (last[key] !== undefined) {
        cell.classList.remove('tick');
        void cell.offsetWidth;
        cell.classList.add('tick');
      }
    }
    last = parts;

    const days = Math.floor(Math.abs(now - START_DATE) / 86400000);
    total.textContent = future
      ? `ещё ${days} ${plural(days, ['день', 'дня', 'дней'])} ♥`
      : 'и каждая секунда с тобой — любимая ♥';
  }
  tick();
  setInterval(tick, 1000);
})();


/* ---------------------------------------------------------
   7. ВИНТАЖНАЯ КАРТА (страница 3)
   Два полушария, как на старинных картах. Контуры материков
   упрощённые (долгота, широта).
   --------------------------------------------------------- */
const LAND = {
  northAmerica: [-166,68.5,-156,71.3,-141,69.6,-128,70.1,-115,68.8,-100,68,-90,69,-82,68,-87,64.3,-92.5,62,-94.5,59,-92.5,57,-88,56,-82.5,55,-82,52.5,-79.5,51.5,-78.8,55,-77,59,-78,61,-77.5,62.5,-73,62.3,-70,61,-69.5,59,-65,60.3,-61.5,56.3,-56,52.3,-59.5,48.7,-64.5,49.5,-70,47.2,-65,47,-61,45.3,-66,43.8,-70,43.6,-70.5,41.8,-74,40.6,-75.5,38.5,-76.2,36.8,-75.8,35.2,-77.8,34,-80.5,32.2,-81.4,30.3,-80.1,27,-80.4,25.2,-81.7,25.9,-82.8,27.8,-84,30,-86,30.4,-89.5,30.2,-90,29.2,-93.5,29.7,-97.3,27.8,-97.6,25,-97.5,22,-95.9,18.8,-94.5,18.2,-91.4,18.6,-90.4,21,-87,21.5,-87.6,18.4,-88.3,15.8,-84,15.9,-83.3,12.5,-83.6,10.8,-82,9,-79.5,9.6,-77.4,8.6,-78.5,7.6,-79.9,7.5,-80.5,8.2,-82.8,8.2,-85.7,10,-85.7,11.2,-87.7,13.2,-91.4,13.9,-94.4,16.1,-96.5,15.7,-99.7,16.7,-103.5,18.3,-105.6,20.5,-105.3,22.4,-107,24,-109.3,25.8,-112.2,28.9,-114.7,31.6,-113,28.9,-111.5,26,-110,23,-112,24.8,-114.1,27.8,-115.8,30.4,-117.1,32.5,-118.5,34,-120.6,34.6,-121.9,36.6,-122.5,37.8,-123.8,39.8,-124.3,42,-124,46.2,-124.7,48.4,-123,49,-125.5,50.4,-127.7,51.5,-130.2,54.7,-132,56.5,-135.4,58.3,-139.7,59.7,-144,60,-146.6,60.8,-149.8,59.6,-151.8,59.2,-154,57.5,-157.6,57.4,-161.8,55.6,-164.8,54.4,-158.5,58.4,-162,59.8,-165,60.5,-165.4,62.5,-164.5,63.2,-161,64.5,-166.2,65.2,-168,65.6,-164.5,66.5,-163.6,67.1],
  greenland: [-73,78.2,-66,80.8,-60,82,-45,82.9,-30,83.5,-20,82,-18,79.5,-19.5,76,-21.5,72.5,-22,70.2,-25,68.5,-32,68,-38,65.6,-41,63.5,-43,60.1,-46,60.8,-49.5,62.5,-51,64.2,-53.2,66.2,-53.5,69,-51,70.5,-55,71.4,-55,73.5,-58.5,75.8,-66,76.2,-70.5,77.3],
  baffin: [-80,73.5,-73,71.8,-68,70.2,-64.8,67.5,-61.8,66.6,-65,63.2,-66.5,62,-71.5,63,-73.5,64.5,-78,64.3,-76,66.3,-73,67.8,-78.5,69.4,-83,70,-88.5,70.6,-89.5,72.6,-84,73.6],
  victoria: [-118,72.8,-112,73.2,-104.5,73,-101.8,70.4,-105,68.8,-111,68.6,-117.6,69.2,-119.6,71.4],
  ellesmere: [-91,80.4,-84,82.9,-70,83,-61,82.3,-70,80,-75.5,78.8,-79.5,76.5,-89,76.4,-94,78.4],
  cuba: [-85,21.8,-82,23,-77,22,-74.2,20.2,-77.5,19.8,-80,21.6],
  hispaniola: [-74.4,18.5,-72.8,19.9,-69.9,19.7,-68.4,18.6,-71.4,17.6],
  southAmerica: [-80,9,-75,11,-72,12,-64,10.5,-60,8,-52,5,-50,0,-44,-2,-35,-5,-35,-9,-39,-15,-40,-20,-42,-23,-48,-26,-48.5,-28,-53,-34,-57,-36,-58,-38,-62,-39,-65,-42,-64,-45,-67,-46,-66,-48,-69,-51,-68.5,-53,-71,-54,-74,-52,-75,-47,-73,-40,-71.5,-30,-70.5,-20,-71,-17.5,-76,-14,-79,-8,-81,-5,-80,-2,-80,1,-77.5,4,-77.5,7],
  eurasia: [-9,37,-8.8,38.7,-9.4,39.4,-8.8,41.2,-9.2,43.1,-8,43.7,-5.8,43.6,-3.8,43.4,-1.8,43.4,-1.3,44.5,-1.2,46,-2.2,47.1,-4.4,47.9,-4.6,48.6,-3,48.8,-1.6,48.7,-1.3,49.7,0.2,49.7,1.6,50.4,2.5,51.1,3.6,51.4,4.6,52.5,5,53.3,7,53.6,8.6,53.9,8.6,55.5,8.1,56.5,8.6,57.1,10.6,57.7,10.3,56.6,10,55.2,10.2,54.4,11,54,12.4,54.3,13.8,54.1,16,54.3,18.5,54.8,19.6,54.4,21.2,55.2,21.1,56.4,21.6,57.5,22.6,57.7,24.1,57,24.4,58.3,23.5,58.6,23.4,59.2,25,59.5,28,59.5,30.2,59.9,28.6,60.6,26.5,60.4,24,60,22.5,60.2,21.4,60.8,21.5,62.3,22.3,63.3,24.6,64.6,25.4,65.1,24.5,65.8,22.3,65.8,21.3,64.5,20.3,63.6,18.6,62.8,17.4,61.6,17.3,60.6,18.8,59.8,18,59.3,16.7,57.9,16.4,56.6,15.6,56.2,14.3,55.6,12.9,55.4,12.6,56.5,11.9,57.6,11.3,58.9,10.2,59,8.5,58.2,7,58,5.6,58.7,5.2,60,5,61.6,6.2,62.6,8.5,63.6,10.6,64.6,12.5,66.3,14.5,67.8,16,68.8,18.5,69.8,21,70.2,23.5,70.9,25.7,71.1,28.3,71,31,70.3,33.1,69.4,36.5,69.1,40.4,67.9,41.2,66.8,36,66.3,34.6,64.5,37.5,64,40,64.6,41.7,66.1,44.2,66.6,43.8,68.3,46,68.2,48.5,67.6,52.5,68.5,55.5,68.3,58.6,69,60.7,69.8,64,69.3,68.2,68.4,68.6,69.6,67,71.5,69,72.8,72.8,72.8,76,72.4,80.6,73.6,86.9,75,95,76.1,100,77.6,104.3,77.7,106.6,76.6,112.6,75.9,113.4,73.5,119,73.1,126.5,73.4,129,72.1,131,70.9,135.5,71.6,139.5,72.4,146,72.4,152.6,70.9,159.7,70.8,166,69.7,170.4,70.1,176,69.8,180,68.9,180,65.3,178.7,64.3,176.9,62.5,173.6,61.7,170.6,60.2,166.3,59.8,163.6,59.9,163.3,58.5,162.1,56.1,160,54.2,158.4,52.8,156.7,51,156.2,52.8,155.6,55.2,155.9,56.8,157.5,58,159.5,61.5,156.6,61.6,154.2,59.5,151.3,58.9,148.5,59.3,145.5,59.4,142.2,59,140.2,57.7,138.2,56.4,137,54.2,139.8,54.2,141.4,53.3,140.5,51.6,140.3,50,140.1,48.4,138.5,47,136.4,45.2,134.2,43.4,132.3,43.2,130.7,42.3,129.7,41,129.4,40.1,128.4,38.6,129.4,36.6,129.3,35.2,127.8,34.7,126.4,34.4,126.5,35.8,126.1,36.7,126.8,37.7,125.4,37.7,124.7,38.1,125.2,39.4,124.4,40,122.3,40.5,121.2,38.8,121.8,40.9,120.4,40.2,119.4,39.4,118,39.2,117.6,38.4,118.5,37.5,119.6,37.1,120.7,37.8,122.5,37.2,120.8,36.4,119.3,35.1,120.3,34.3,120.9,32.6,121.9,31.7,121.9,30.9,121.5,29.6,121.6,28.4,120.4,27.1,119.7,25.7,118.6,24.5,117.2,23.6,115.6,22.8,114.2,22.3,113,21.9,111.7,21.6,110.4,21.2,110.1,20.3,109.7,21.5,108.5,21.7,106.7,20.7,105.8,19,106.8,17,108.8,15.3,109.3,12,107.5,10.5,106,9.5,105,8.6,104.8,10.3,103.5,11,102.3,12.2,101,12.6,100,13.5,99.5,11,99.2,9.2,100.3,7.5,101.3,6.8,103.4,4.8,103.5,2.6,104.2,1.4,103.3,1.4,101.3,2.8,100.4,4.8,100.2,6.3,98.3,8.2,98.6,10.2,98.5,13,97.7,16.3,97,16.7,95.3,15.8,94.3,16.2,94.4,18.8,92.3,20.7,91.8,22.3,90.5,22.1,89,21.7,87,21.3,86.6,20.2,84.8,19.2,82.3,16.6,80.3,15.5,80.2,13.3,79.8,10.4,78.2,8.9,77.5,8.1,76.4,9.6,75.4,11.8,74.5,14,73.4,16.4,72.9,19,72.7,21.2,72.6,22.2,70.4,20.9,69,22.4,68.3,23.6,66.7,25.2,64,25.3,61.5,25.2,58.8,25.5,57.3,25.8,56.4,27,54.8,26.6,52,27.9,50.6,29.3,49,30.2,48,30,48.6,28.2,49.8,26.8,50.3,25.6,51,24.6,51.6,25.9,51.5,24.3,53.6,24.1,55.5,25.4,56.3,26.3,56.3,24.5,58.8,23.6,59.8,22.4,58.5,20.4,57.7,18.9,55.5,17.6,52.2,15.8,48.7,14,45,12.8,43.4,12.7,42.8,15.2,42.6,16.8,40.9,19.5,39.1,21.5,38.5,23.6,37.4,25,35.8,27.4,34.9,29.5,34.2,31.3,35,32.8,35.6,34.6,36,35.8,36.1,36.6,34.6,36.8,32.8,36.1,30.6,36.7,28,36.7,27.3,37.4,26.4,38.2,26.8,39.3,26.2,39.6,26.4,40.2,26,40.8,24,40.7,22.9,40.6,23.7,39.9,22.6,39.3,24,38.2,23.2,37.5,22.7,36.4,21.7,36.8,21.3,37.8,21.1,38.4,20.7,39,20,39.7,19.4,40.5,19.5,41.8,18.5,42.5,17,43.2,15.2,44.2,14,45,13.6,45.6,12.4,45.4,12.3,44.6,13.6,43.5,14.6,42.2,16.1,41.4,18.5,40.1,17.2,40.4,17.1,39,16.1,38,15.7,38.2,16,39.5,15.6,40.1,14.3,40.8,12.5,41.6,11,42.4,10.3,43.5,8.9,44.4,7.5,43.8,6,43.1,4.6,43.4,3.1,43.1,3.2,41.9,0.9,41,-0.3,39.5,0.2,38.7,-0.7,37.6,-2.1,36.7,-4.4,36.7,-5.6,36,-6.4,36.8,-7.4,37.2],
  africa: [-5.9,35.8,-2,35.1,1,36.5,3,36.8,7,37,9.8,37.3,11,37,10.4,36.1,11.1,35.2,10.1,34.3,10.9,33.2,12.5,32.8,15.2,32.3,15.7,31.4,19,30.3,20.1,31,20,32.1,21.6,32.9,25,31.9,29,30.9,32.3,31.3,34.2,31.3,34.9,29.5,34.3,27.8,32.6,29.9,33.6,27.5,35.5,24,36.9,22,37.4,19.5,38.6,18,39.7,15.3,41.2,14.5,42.6,12.8,43.3,11.9,44.6,10.4,47.4,11.2,51.2,11.9,51,10.4,50,8,48.6,5.5,46,2.2,43.5,-0.5,41.5,-1.8,40.2,-2.8,39.3,-4.8,39.4,-6.8,39.6,-8.8,40.5,-10.5,40.6,-14.8,39.3,-16.9,36.8,-18.6,35.2,-21.5,35.5,-23.9,32.8,-25.8,32.6,-28.3,30.6,-30.5,27.5,-33.3,25.6,-34,22.4,-34,20,-34.8,18.4,-34.1,18.2,-32,17.3,-29.3,15.2,-27,14.5,-23,13.2,-20.3,11.8,-17.3,12.3,-13.8,13.7,-11.5,13.2,-8.9,12.2,-6.1,11.8,-4.3,9.3,-1.4,9.4,1.1,9.8,3.2,8.6,4.6,6,4.3,4.3,6.3,1.6,6.2,-1.9,4.8,-4,5.2,-7.6,4.4,-9.3,5.5,-11.5,6.9,-13.3,8.8,-15,10.8,-16.7,12.5,-17.5,14.7,-16.5,16.2,-16.1,19.5,-17,21,-15.9,23.8,-14.5,26.2,-13.2,27.6,-11,28.8,-9.8,30.5,-9.4,32.4,-6.9,34.2],
  madagascar: [44,-25,47,-25,49.5,-17,50.5,-15.5,49,-12,47,-15.5,44.5,-16.5,43.5,-21],
  britain: [-5.5,50,1.5,51,1.7,52.7,0,53.5,-1.5,55,-2,57,-1.8,57.6,-4,58.6,-5,58.6,-6,57,-5.5,55.5,-4.8,54.8,-3,54,-3,53.4,-4.5,53.3,-4.2,52.3,-5.2,51.7,-3,51.4],
  ireland: [-6,52,-6,54.5,-7.5,55.3,-10,54,-10,52,-8,51.5],
  iceland: [-24,65.5,-22,66.5,-15,66.5,-13.5,65,-18,63.5,-22,63.8],
  svalbard: [11,78.5,16,80,27,80,21,77.5,16,76.5],
  novayaZemlya: [52,71,57,75,68,76.8,60,74,55,71],
  sicily: [12.4,38.1,15.6,38.3,15.1,36.7,12.4,37.6],
  sardinia: [8.4,41,9.8,41,9.6,39.1,8.4,39],
  crete: [23.5,35.3,26.3,35.2,24.5,34.9],
  sriLanka: [80,6,82,7,81.5,9,80,9.8],
  hainan: [108.6,19.2,110.5,20.1,111,19.6,109.6,18.2],
  taiwan: [120.2,22.5,121.9,25,121.5,22],
  japan: [130,31,131.5,31.5,132,33.5,135,34,137,34.5,140,35,141,38,142,40,141.5,41.5,140,40,139.8,38,137,37,136,35.8,133,35.5,131,34.5,129.5,33.5],
  hokkaido: [140,42,141.5,45.5,145.5,43.5,143,42,141,41.6],
  sakhalin: [142,46,143.5,49,142.5,54,142,51.5],
  philippines: [120,18.5,122,18.5,122,14,124,12.5,126,9.5,125.5,6,122,7,123.5,10,121.5,12.5,120.5,14.5],
  borneo: [109,1.5,110,-1.5,111,-3,114.5,-4,116.5,-2,118,1,119,5,117,7,115.5,5,113,3,111,2],
  sumatra: [95.3,5.5,98,4,100.5,0.5,104,-2,106,-4,106,-6,104.5,-5.8,102,-4,99,-0.5,97,2.5],
  java: [105.5,-6,108.5,-6.5,112.5,-6.8,114.5,-7.8,110,-8.2,106,-7.3],
  sulawesi: [119,-5.5,120.5,-5.6,121,-2,123,-1,124.8,1.5,121,1,119.5,-0.5],
  newGuinea: [131,-1,135,-3.5,138,-1.5,141,-2.6,145,-4,147.5,-6,150,-10.5,147,-10,144,-7.8,141,-9,138,-8.3,137.5,-5,133,-4,132,-2.5],
  australia: [114,-22,114.5,-26,115,-30,115,-34,118,-35,123,-34,126,-32.2,131,-31.5,134,-32.5,137.5,-35.5,138.5,-34.5,140,-37.5,144,-38.5,146.5,-39,150,-37.5,151.5,-33,153,-30,153.5,-25.5,150.5,-22.5,146,-19,145.5,-15,143.5,-14,142.5,-10.7,141.5,-13.5,141.5,-17,139.5,-17.5,136,-15.5,137,-12,133,-11.5,130,-13,129,-15,126,-14,123,-17,121,-19.5,117,-20.7],
  tasmania: [145,-41,148.3,-41,148,-43.2,146,-43.5],
  nzNorth: [172.7,-34.5,174.5,-36,178.5,-37.7,177,-39.5,175,-41.5,174.5,-39.5,173.8,-39,174.5,-37],
  nzSouth: [172.7,-40.5,174,-41.3,172.7,-43.7,171,-44.5,169,-46.6,166.5,-46,168,-44,170.5,-42.5]
};
const LAKES = {
  blackSea: [27.5,42.5,28,41.4,29,41.2,31.3,41.1,33.3,42,35.2,42,38.3,40.9,41.5,41.5,41.6,42.6,40,43.4,38.2,44.4,37,45,35.6,45.1,34.4,44.5,33.5,44.6,32.6,45.4,33.5,46,31.6,46.6,30.2,45.8,29.6,45.2,28.7,44.3,28,43.3],
  caspian: [46.7,44.6,47.4,43,48.5,41.8,49.5,40.3,49,38.4,48.9,37.6,50.3,37.1,51.8,36.6,53.9,37,53.9,38.9,53.2,40.3,52.7,41.8,52.9,42.2,51.3,43.2,51.3,44.4,53.1,45.3,52.7,46.7,51.2,47.1,49.1,46.4,47.5,45.6]
};

function buildMap() {
  const box = $('#vintageMap');
  if (!box) return;
  const D = Math.PI / 180;
  const R = 340;
  const hemis = [
    { cx: 500, cy: 372, lon0: -110, labels: [['OCEANUS', -150, 12], ['PACIFICUS', -150, 4], ['ATLANTICUS', -45, 28]] },
    { cx: 500, cy: 1058, lon0: 70, labels: [['MARE', 75, -18], ['INDICUM', 75, -26]] }
  ];
  const pairs = flat => { const p = []; for (let i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]); return p; };
  const densify = pts => {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / 2));
      for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    }
    return out;
  };
  // Ортографическая проекция; точки с обратной стороны прижимаются к краю круга
  const project = (lon, lat, h) => {
    const d = ((lon - h.lon0 + 540) % 360) - 180;
    const cl = Math.cos(lat * D);
    let x = cl * Math.sin(d * D), y = Math.sin(lat * D);
    if (cl * Math.cos(d * D) < 0) { const k = Math.hypot(x, y) || 1; x /= k; y /= k; }
    return [h.cx + x * R, h.cy - y * R];
  };
  const toPath = (pts, h) => 'M' + densify(pts).map(([lo, la]) => project(lo, la, h).map(v => v.toFixed(1)).join(' ')).join('L') + 'Z';

  // Антарктида
  const antarctica = [];
  for (let lon = -180; lon <= 180; lon += 10) antarctica.push([lon, -69 - 3 * Math.sin(lon * D * 2) - 2 * Math.cos(lon * D * 3)]);
  antarctica.push([180, -90], [-180, -90]);

  const landSets = Object.values(LAND).map(pairs).concat([antarctica]);
  const lakeSets = Object.values(LAKES).map(pairs);

  let svg = `<svg viewBox="0 0 1000 1430" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="seaGrad" cx=".45" cy=".4" r=".65">
        <stop offset="0" stop-color="#e4e3c4"/><stop offset=".75" stop-color="#cfd0ac"/><stop offset="1" stop-color="#b3b48d"/>
      </radialGradient>`;
  hemis.forEach((h, i) => { svg += `<clipPath id="hemi${i}"><circle cx="${h.cx}" cy="${h.cy}" r="${R}"/></clipPath>`; });
  svg += `</defs>`;

  hemis.forEach((h, i) => {
    svg += `<circle cx="${h.cx}" cy="${h.cy}" r="${R}" fill="url(#seaGrad)"/>`;
    svg += `<g clip-path="url(#hemi${i})">`;
    // сетка координат
    let g = '';
    [-60, -30, 0, 30, 60].forEach(lat => {
      const y = h.cy - Math.sin(lat * D) * R, hw = Math.cos(lat * D) * R;
      g += `<line x1="${(h.cx - hw).toFixed(1)}" y1="${y.toFixed(1)}" x2="${(h.cx + hw).toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    });
    [30, 60].forEach(dl => { g += `<ellipse cx="${h.cx}" cy="${h.cy}" rx="${(Math.sin(dl * D) * R).toFixed(1)}" ry="${R}"/>`; });
    g += `<line x1="${h.cx}" y1="${h.cy - R}" x2="${h.cx}" y2="${h.cy + R}"/>`;
    svg += `<g class="grat">${g}</g>`;
    svg += landSets.map(p => `<path class="land" d="${toPath(p, h)}"/>`).join('');
    svg += lakeSets.map(p => `<path class="lake" d="${toPath(p, h)}"/>`).join('');
    svg += h.labels.map(([t, lo, la]) => {
      const [x, y] = project(lo, la, h);
      return `<text class="label" x="${x.toFixed(0)}" y="${y.toFixed(0)}" text-anchor="middle">${t}</text>`;
    }).join('');
    svg += `</g>`;
    svg += `<circle class="rim" cx="${h.cx}" cy="${h.cy}" r="${R}"/><circle class="rim2" cx="${h.cx}" cy="${h.cy}" r="${R + 9}"/>`;
  });

  // Роза ветров
  const compass = (cx, cy, r) => {
    let s = `<g transform="translate(${cx} ${cy})"><circle r="${r}" fill="none" stroke="#5b3d22" stroke-width="1.5"/><circle r="${r * 0.8}" fill="none" stroke="#5b3d22" stroke-width=".8" stroke-dasharray="3 3"/>`;
    for (let i = 0; i < 8; i++) {
      const L = i % 2 ? r * 0.62 : r * 1.05, w = i % 2 ? r * 0.1 : r * 0.17;
      s += `<g transform="rotate(${i * 45})"><path d="M0 ${-L}L${w} 0L0 0Z" fill="#5b3d22"/><path d="M0 ${-L}L${-w} 0L0 0Z" fill="#efdcb2" stroke="#5b3d22" stroke-width=".8"/></g>`;
    }
    return s + `<circle r="${r * 0.08}" fill="#a3262f"/><text class="title" y="${-r - 10}" text-anchor="middle">N</text></g>`;
  };
  svg += compass(872, 112, 62);
  svg += `<text class="title" x="70" y="1395">MAPPA MUNDI</text>`;
  svg += `</svg>`;
  box.innerHTML = svg;
}
buildMap();


/* ---------------------------------------------------------
   8. I LOVE YOU (страница 4)
   --------------------------------------------------------- */
(() => {
  const el = $('#ily');
  if (!el) return;
  const rnd = seeded(5);
  let i = 0;
  el.innerHTML = el.dataset.lines.split('|').map(line =>
    `<span class="ily-line">${[...line].map(ch =>
      `<span class="ily-l" data-l="${ch}" style="--i:${i++};--rot:${(rnd() * 12 - 6).toFixed(1)}deg"><span>${ch}</span></span>`
    ).join('')}</span>`
  ).join('');
})();


/* ---------------------------------------------------------
   9. 100 ПРИЧИН: сердечки-перевёртыши (страница 5)
   --------------------------------------------------------- */
(() => {
  const grid = $('#heartsGrid');
  if (!grid) return;
  const pool = shuffle(REASONS.slice());
  let nextReason = 0;
  const take = () => pool[nextReason++ % pool.length];
  const rnd = seeded(9);

  for (let i = 0; i < HEARTS_COUNT; i++) {
    const btn = document.createElement('button');
    btn.className = 'hc';
    btn.setAttribute('aria-label', 'Открыть причину');
    btn.style.cssText =
      `--i:${i};--c:${HEART_COLORS[i % HEART_COLORS.length]};` +
      `--r:${(rnd() * 24 - 12).toFixed(1)}deg;--dx:${(rnd() * 2 - 1).toFixed(1)}cqw;--dy:${(rnd() * 2 - 1).toFixed(1)}cqw`;
    btn.innerHTML =
      '<span class="hc-inner"><span class="hc-face hc-front"></span>' +
      '<span class="hc-face hc-back"><span class="hc-text"></span></span></span>';
    const text = $('.hc-text', btn);
    // длинные причины пишем чуть мельче, чтобы влезли в сердечко
    const setReason = r => { text.textContent = r; btn.classList.toggle('long', r.length > 28); };
    setReason(take());

    btn.addEventListener('click', () => {
      if (btn.classList.contains('flipped')) {
        btn.classList.remove('flipped');
        btn.dataset.used = '1';
      } else {
        // при повторном открытии — новая причина
        if (btn.dataset.used) setReason(take());
        btn.classList.add('flipped');
      }
    });
    grid.appendChild(btn);
  }
})();


/* ---------------------------------------------------------
   10. КОНВЕРТИКИ (страница 6)
   --------------------------------------------------------- */
const letterModal = $('#letterModal');

function openLetter(L) {
  $('#letterTitle').textContent = L.title;
  $('#letterText').textContent = L.text;
  letterModal.classList.add('open');
  letterModal.setAttribute('aria-hidden', 'false');
  $('#letterClose').focus({ preventScroll: true });
}
function closeLetter() {
  letterModal.classList.remove('open');
  letterModal.setAttribute('aria-hidden', 'true');
}
$('#letterClose').addEventListener('click', closeLetter);
letterModal.addEventListener('click', e => { if (e.target === letterModal) closeLetter(); });

(() => {
  const box = $('#envelopes');
  if (!box) return;
  const tilts = [-3, 2.5, 2, -2.5];
  LETTERS.forEach((L, i) => {
    const c = ENVELOPE_COLORS[i % ENVELOPE_COLORS.length];
    const env = document.createElement('button');
    env.className = 'envelope';
    env.setAttribute('aria-label', 'Конверт: открой, ' + L.label);
    env.style.cssText = `--env:${c.env};--env-in:${c.inside};--env-flap:${c.flap};--r:${tilts[i % tilts.length]}deg`;
    env.innerHTML =
      '<span class="env-back"></span><span class="env-paper"></span><span class="env-front"></span>' +
      '<span class="env-flap"></span><span class="env-seal">♥</span><span class="env-label"></span>';
    $('.env-label', env).textContent = L.label;
    env.addEventListener('click', () => {
      if (env.classList.contains('open')) { openLetter(L); return; }
      env.classList.add('open');
      // письмо показываем, только если страницу за это время не перелистнули
      setTimeout(() => { if (env.closest('.leaf').classList.contains('is-current')) openLetter(L); }, 850);
    });
    box.appendChild(env);
  });
})();


/* ---------------------------------------------------------
   11. НАДПИСЬ «ИЗ ГАЗЕТ» (страница 8)
   --------------------------------------------------------- */
(() => {
  const el = $('#ransom');
  if (!el) return;
  const rnd = seeded(23);
  const STYLES = 9;
  let prevStyle = -1, i = 0;
  const jag = () => (rnd() * 7).toFixed(1);
  const lines = el.dataset.lines.split('|');
  const longest = Math.max(...lines.map(l => l.length));
  el.innerHTML = lines.map(line =>
    // короткие строки делаем чуть крупнее
    `<span class="r-line" style="--ls:${Math.min(1.3, longest / line.length).toFixed(2)}">${[...line].map(ch => {
      if (ch === ' ') return '<span class="r-sp"></span>';
      let s;
      do { s = 1 + Math.floor(rnd() * STYLES); } while (s === prevStyle);
      prevStyle = s;
      const clip = `polygon(${jag()}% ${jag()}%, ${100 - jag()}% ${jag()}%, ${100 - jag()}% ${100 - jag()}%, ${jag()}% ${100 - jag()}%)`;
      return `<span class="r-l rs-${s}" style="--i:${i++};--r:${(rnd() * 14 - 7).toFixed(1)}deg;` +
        `--y:${(rnd() * 1.6 - 0.8).toFixed(2)}cqw;--sz:${(0.88 + rnd() * 0.3).toFixed(2)};clip-path:${clip}">${ch}</span>`;
    }).join('')}</span>`
  ).join('');
})();


/* ---------------------------------------------------------
   12. ПРОСМОТР ФОТО НА ВЕСЬ ЭКРАН
   --------------------------------------------------------- */
const lightbox = $('#lightbox');
const lightboxImg = $('#lightboxImg');

function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt || '';
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}
function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
}
function isModalOpen() {
  return lightbox.classList.contains('open') || letterModal.classList.contains('open');
}
book.addEventListener('click', e => {
  const img = e.target.closest('img.photo');
  if (img) openLightbox(img.currentSrc || img.src, img.alt);
});
lightbox.addEventListener('click', closeLightbox);


/* ---------------------------------------------------------
   13. ДОЖДЬ ИЗ СЕРДЕЧЕК (последняя страница)
   --------------------------------------------------------- */
function heartConfetti() {
  const page = $('#pageEnd');
  if (!page || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#d4102a', '#e2557d', '#ef7fa0', '#ffb6cc', '#ff8fab'];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 26; i++) {
    const h = document.createElement('span');
    h.className = 'confetti-heart';
    h.textContent = '♥';
    h.style.cssText =
      `left:${(8 + Math.random() * 88).toFixed(1)}%;--c:${colors[i % colors.length]};` +
      `--s:${(3 + Math.random() * 5).toFixed(1)}cqw;--t:${(3 + Math.random() * 2.5).toFixed(2)}s;` +
      `--d:${(0.6 + Math.random() * 1.8).toFixed(2)}s;--sx:${(Math.random() * 20 - 10).toFixed(1)}cqw;` +
      `--rot:${(Math.random() * 720 - 360).toFixed(0)}deg`;
    frag.appendChild(h);
  }
  page.appendChild(frag);
  setTimeout(() => $$('.confetti-heart', page).forEach(h => h.remove()), 7500);
}


/* ---------------------------------------------------------
   14. СТАРТ
   --------------------------------------------------------- */
// Можно открыть сразу нужную страницу: index.html#p3
const startPage = parseInt((location.hash.match(/^#p(\d+)$/) || [])[1], 10);
if (startPage > 0 && startPage < N) goTo(startPage, true);
else { leaves.forEach((leaf, i) => leaf.classList.toggle('far', i > 1)); updateState(); }
