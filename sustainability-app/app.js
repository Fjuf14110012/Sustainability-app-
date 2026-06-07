'use strict';

// ── Tab switching (two-level: primary categories + sub-tabs) ──────────────
const TAB_TO_CATEGORY = {
  home: 'home',
  calculator: 'tools',
  recycling:  'tools',
  realtime:   'tools',
  grid:       'tools',
  fridge:     'tools',
  seasonal:   'tools',
  mealcompare:'tools',
  vampire:    'tools',
  laundry:    'tools',
  tracker:    'tools',
  circular:   'learn',
  thrift:     'learn',
  sdgs:       'learn',
  quest:      'games',
  quiz:       'games',
  sorter:     'games',
  energy:     'games',
  live:       'world',
  sea:        'world',
  refugees:   'world',
  activism:   'world',
  corporate:  'world',
  policy:     'world',
  join:       'world',
};
const CATEGORY_DEFAULT_TAB = { home: 'home', tools: 'calculator', learn: 'circular', games: 'quest', world: 'live' };
const lastTabInCategory = { ...CATEGORY_DEFAULT_TAB };

function switchTab(name) {
  const cat = TAB_TO_CATEGORY[name];
  if (!cat) return;
  if (cat !== 'home') lastTabInCategory[cat] = name;

  // Primary tab active state
  document.querySelectorAll('.ptab').forEach(t => {
    const isActive = t.dataset.cat === cat;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Sub-tabs bar: hide on Home, show + activate correct group otherwise
  const subBar = document.getElementById('sub-tabs-bar');
  subBar.classList.toggle('show', cat !== 'home');
  document.querySelectorAll('.sub-tabs').forEach(s => {
    s.classList.toggle('active', s.dataset.cat === cat);
  });

  // Sub-tab pill active state
  document.querySelectorAll('.stab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });

  // Swap the actual panel
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');

  // Per-tab hooks
  if (name === 'circular') { if (cycle.playing) startCycleAuto(); }
  else                     { stopCycleTimer(); }
  if (name === 'thrift')   animateThriftChart();
  if (name === 'live')     startLiveCounters();
  else                     stopLiveCounters();
}

function switchCategory(cat) {
  switchTab(lastTabInCategory[cat] || CATEGORY_DEFAULT_TAB[cat]);
}

document.querySelectorAll('.ptab').forEach(t => {
  t.addEventListener('click', () => switchCategory(t.dataset.cat));
});
document.querySelectorAll('.stab').forEach(t => {
  t.addEventListener('click', () => switchTab(t.dataset.tab));
});

// Home page CTA buttons jump straight to a specific sub-tab
document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.goto);
    document.getElementById('tools').scrollIntoView({ behavior: 'smooth' });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// CARBON CALCULATOR
// ══════════════════════════════════════════════════════════════════════════
const EMISSION_FACTORS = {
  // Transport
  miles:        0.000411 * 52,   // kg CO2 per mile, * 52 weeks → annual kg
  flightShort:  0.255,           // tonnes per flight
  flightLong:   1.62,            // tonnes per flight
  // Energy (kg CO2 per $ spent, rough estimate)
  electricity:  0.42 * 12,       // monthly → annual
  gas:          0.18 * 12,
  // Home size multiplier
  homeType: { apartment: 0.7, 'small-house': 1.0, 'large-house': 1.6 },
  // Diet (tonnes/year)
  diet: { vegan: 1.5, vegetarian: 1.7, pescatarian: 2.0, omnivore: 2.5, 'heavy-meat': 3.3 },
  // Food waste
  foodWaste: { low: 0, medium: 0.3, high: 0.7 },
  // Shopping
  clothes:   0.006 * 12,   // per $ monthly → annual tonnes
  shopping:  0.05,          // per order per year
};

document.getElementById('calc-btn').addEventListener('click', calculateFootprint);
document.getElementById('calc-reset').addEventListener('click', () => {
  document.querySelectorAll('.calc-section input, .calc-section select').forEach(el => {
    if (el.tagName === 'INPUT') el.value = '';
    else el.selectedIndex = 0;
  });
  document.getElementById('calc-result').classList.add('hidden');
});

function v(id) { return parseFloat(document.getElementById(id).value) || 0; }
function sv(id) { return document.getElementById(id).value; }

function calculateFootprint() {
  const transport = (v('miles') * EMISSION_FACTORS.miles / 1000)
    + (v('flights-short') * EMISSION_FACTORS.flightShort)
    + (v('flights-long')  * EMISSION_FACTORS.flightLong);

  const homeMultiplier = EMISSION_FACTORS.homeType[sv('home-type')];
  const energy = ((v('electricity') * EMISSION_FACTORS.electricity)
    + (v('gas') * EMISSION_FACTORS.gas)) / 1000 * homeMultiplier;

  const diet = EMISSION_FACTORS.diet[sv('diet')]
    + EMISSION_FACTORS.foodWaste[sv('food-waste')];

  const shopping = (v('clothes') * EMISSION_FACTORS.clothes)
    + (v('shopping') * EMISSION_FACTORS.shopping);

  const total = +(transport + energy + diet + shopping).toFixed(2);

  renderResult(total, { transport: +transport.toFixed(2), energy: +energy.toFixed(2), diet: +diet.toFixed(2), shopping: +shopping.toFixed(2) });
}

function renderResult(total, breakdown) {
  document.getElementById('result-number').textContent = total;

  const pct = Math.min((total / 12) * 100, 100);
  document.getElementById('gauge-fill').style.width = pct + '%';

  let rating, ratingClass, tips;
  if (total < 2) {
    rating = '🌟 Excellent — You\'re a sustainability champion!';
    ratingClass = 'background:var(--green-pale);color:var(--green-dark)';
    tips = ['Keep inspiring others with your low-carbon lifestyle.', 'Consider advocating for systemic change in your community.', 'Your footprint is well below the global average of 4 tonnes.'];
  } else if (total < 4) {
    rating = '✅ Good — Below the global average!';
    ratingClass = 'background:var(--green-pale);color:var(--green-dark)';
    tips = ['Try switching to renewable energy if available.', 'Even one fewer flight per year makes a big difference.', 'Consider a more plant-heavy diet for further reductions.'];
  } else if (total < 7) {
    rating = '⚠️ Average — Room for meaningful improvement.';
    ratingClass = 'background:#fef9c3;color:#854d0e';
    tips = ['Reducing car miles is one of the highest-impact actions.', 'Switch at least one meal per day to plant-based.', 'Audit your home energy use — LED bulbs and insulation help.', 'Buy secondhand before buying new.'];
  } else {
    rating = '🔴 High — Significant changes can make a real impact.';
    ratingClass = 'background:var(--warn-pale);color:var(--warn)';
    tips = ['Consider reducing long-haul flights — they dominate your footprint.', 'Switching to an EV or using public transport would help greatly.', 'A plant-based diet can cut food emissions by up to 70%.', 'Talk to your employer about remote work to cut commuting.', 'Check if your energy provider offers a green tariff.'];
  }

  const ratingEl = document.getElementById('result-rating');
  ratingEl.textContent = rating;
  ratingEl.setAttribute('style', ratingClass + ';border-radius:10px;padding:.6rem 1rem;');

  const icons = { transport:'🚗', energy:'🏠', diet:'🥗', shopping:'🛍️' };
  document.getElementById('result-breakdown').innerHTML = Object.entries(breakdown).map(([k, val]) =>
    `<div class="breakdown-item">
      <div class="bd-icon">${icons[k]}</div>
      <div class="bd-label">${k.charAt(0).toUpperCase()+k.slice(1)}</div>
      <div class="bd-val">${val}t</div>
    </div>`
  ).join('');

  document.getElementById('result-tips').innerHTML =
    '<h4>💡 Tips to reduce your footprint</h4><ul class="tip-list">' +
    tips.map(t => `<li>${t}</li>`).join('') + '</ul>';

  document.getElementById('calc-result').classList.remove('hidden');
  document.getElementById('calc-result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ══════════════════════════════════════════════════════════════════════════
// RECYCLING SEARCH TOOL
// ══════════════════════════════════════════════════════════════════════════
const recyclingDB = {
  'plastic bottle': {
    icon: '🧴', bin: 'blue', binLabel: 'Blue / Recycling Bin',
    steps: ['Rinse clean — food residue contaminates recycling.', 'Remove the cap (recycle separately or check local rules).', 'Crush to save space if your bin has room.', 'Place in your kerbside recycling bin.'],
    fact: 'Recycling one plastic bottle saves enough energy to power a 60W lightbulb for 6 hours.',
  },
  'battery': {
    icon: '🔋', bin: 'special', binLabel: 'Special Collection Required',
    steps: ['Never put batteries in regular bins — they can cause fires.', 'Tape the terminals of lithium batteries for safety.', 'Drop off at a supermarket, DIY store, or council collection point.', 'Many electronics stores have dedicated battery drop-off boxes.'],
    fact: 'Batteries contain valuable metals like lithium, cobalt, and manganese that can be fully recovered.',
  },
  'pizza box': {
    icon: '🍕', bin: 'black', binLabel: 'General Waste or Composting',
    steps: ['Greasy pizza boxes cannot be recycled — grease ruins the process.', 'If only the top lid is grease-free, tear it off and recycle that part.', 'The greasy bottom goes in the general waste or compost.', 'Check if your council accepts it in food waste bins.'],
    fact: 'Grease from food contaminates entire batches of paper recycling — keeping it out matters!',
  },
  'phone': {
    icon: '📱', bin: 'special', binLabel: 'E-Waste / Special Collection',
    steps: ['Back up your data and perform a factory reset first.', 'Consider donating or selling if still functional.', 'Take to a manufacturer take-back scheme, carrier store, or e-waste event.', 'Never throw in general waste — phones contain toxic heavy metals.'],
    fact: 'A single smartphone contains over 60 different elements from the periodic table.',
  },
  'glass jar': {
    icon: '🫙', bin: 'green', binLabel: 'Glass Recycling Bin',
    steps: ['Rinse out any food or liquid residue.', 'Remove lids (metal lids can usually be recycled separately).', 'Do not put in general mixed recycling — glass needs its own stream.', 'Take to a bottle bank or use your kerbside glass collection.'],
    fact: 'Glass can be recycled endlessly without any loss in quality or purity.',
  },
  'newspaper': {
    icon: '📰', bin: 'blue', binLabel: 'Blue / Paper Recycling',
    steps: ['Stack newspapers and fold flat.', 'Keep dry — wet paper is harder to recycle.', 'Do not shred (shredded paper fibres are too short to recycle easily).', 'Place in your paper recycling bin or take to a paper bank.'],
    fact: 'Recycling a single newspaper saves about 75% of the energy needed to make a new one.',
  },
  'styrofoam': {
    icon: '📦', bin: 'black', binLabel: 'General Waste (mostly)',
    steps: ['Standard kerbside bins do not accept styrofoam (EPS).', 'Check if your local council has an EPS drop-off point.', 'Some supermarkets and packaging suppliers accept it back.', 'Reuse as packing material before disposing.'],
    fact: 'Styrofoam takes over 500 years to decompose in landfill. Avoiding it is the best option.',
  },
  'clothes': {
    icon: '👕', bin: 'special', binLabel: 'Donation / Textile Collection',
    steps: ['If wearable: donate to charity shops, clothes banks, or online platforms.', 'If worn out: take to textile recycling banks (many supermarkets have these).', 'Never put clothes in recycling bins — they jam sorting machinery.', 'Check if the brand has a take-back programme.'],
    fact: 'The average item of clothing is worn only 7 times before being discarded.',
  },
};

const categories = {
  paper: {
    name: '📄 Paper & Cardboard',
    items: ['newspaper', 'cardboard box', 'magazine', 'paper bag', 'cereal box', 'toilet roll tube', 'egg carton', 'envelopes'],
    guide: 'Most paper and cardboard can be recycled kerbside. Keep it dry and clean. Pizza boxes and greasy paper are exceptions — they go in general waste or compost. Shredded paper is usually not accepted.',
  },
  plastic: {
    name: '🧴 Plastics',
    items: ['plastic bottle', 'yoghurt pot', 'plastic bag', 'food tray', 'bubble wrap', 'plastic film', 'bottle cap', 'carrier bag'],
    guide: 'Plastics with the numbers 1 (PET) and 2 (HDPE) are most widely accepted. Always rinse. Plastic bags and film must go to supermarket collection points, not kerbside bins. Carrier bags can jam sorting machinery.',
  },
  glass: {
    name: '🫙 Glass',
    items: ['glass jar', 'wine bottle', 'beer bottle', 'glass container', 'condiment bottle', 'pickle jar'],
    guide: 'Glass must be recycled via a bottle bank or dedicated kerbside glass collection — not mixed recycling. Rinse thoroughly. Window glass and mirrors are not recyclable in bottle banks.',
  },
  metal: {
    name: '🥫 Metal & Cans',
    items: ['aluminium can', 'steel can', 'tin foil', 'food tin', 'aerosol', 'metal lid', 'biscuit tin'],
    guide: 'Aluminium cans are one of the most valuable recyclables. Rinse cans. Aerosols can be recycled if completely empty. Tin foil should be scrunched into a ball before recycling.',
  },
  electronics: {
    name: '💻 Electronics',
    items: ['phone', 'laptop', 'tablet', 'battery', 'charger', 'TV', 'printer', 'cables'],
    guide: 'All electronics must go to an e-waste collection point or WEEE recycling centre. Never put in general waste — they contain toxic materials and valuable recoverable metals.',
  },
  organic: {
    name: '🍃 Organic Waste',
    items: ['food scraps', 'fruit peels', 'vegetable peelings', 'coffee grounds', 'tea bags', 'grass cuttings', 'leaves', 'egg shells'],
    guide: 'Organic waste can be home composted or placed in food waste bins. Compost reduces methane from landfill. Cooked food should only go in council food waste bins, not home compost.',
  },
};

function searchItem(query) {
  const q = query.toLowerCase().trim();
  let found = null;
  for (const [key, data] of Object.entries(recyclingDB)) {
    if (q.includes(key) || key.includes(q)) { found = { key, ...data }; break; }
  }
  const resultEl = document.getElementById('recycle-result');
  if (!found) {
    resultEl.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--text-light)">
      <span style="font-size:2rem">🔍</span>
      <p style="margin-top:.5rem">No result found for "<strong>${query}</strong>". Try a different term or browse by category below.</p>
    </div>`;
  } else {
    resultEl.innerHTML = `
      <div class="item-header">
        <span class="item-icon">${found.icon}</span>
        <div>
          <div class="item-name">${found.key.charAt(0).toUpperCase()+found.key.slice(1)}</div>
          <span class="item-bin bin-${found.bin}">${found.binLabel}</span>
        </div>
      </div>
      <ul class="recycle-steps">${found.steps.map(s=>`<li>${s}</li>`).join('')}</ul>
      <div class="did-you-know"><strong>Did you know?</strong> ${found.fact}</div>`;
  }
  resultEl.classList.remove('hidden');
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('search-btn').addEventListener('click', () => {
  const val = document.getElementById('recycle-search').value;
  if (val.trim()) searchItem(val);
});
document.getElementById('recycle-search').addEventListener('keydown', e => {
  if (e.key === 'Enter') { const v = e.target.value; if (v.trim()) searchItem(v); }
});
document.querySelectorAll('.tag').forEach(tag => {
  tag.addEventListener('click', () => {
    document.getElementById('recycle-search').value = tag.dataset.item;
    searchItem(tag.dataset.item);
  });
});
document.querySelectorAll('.category-card').forEach(card => {
  card.addEventListener('click', () => {
    const cat = categories[card.dataset.category];
    const el = document.getElementById('category-result');
    el.innerHTML = `<h4>${cat.name}</h4>
      <p style="font-size:.9rem;color:var(--text-mid);margin-bottom:1rem">${cat.guide}</p>
      <div class="category-items">${cat.items.map(i=>`<span class="category-item-tag" data-item="${i}">${i}</span>`).join('')}</div>`;
    el.classList.remove('hidden');
    el.querySelectorAll('.category-item-tag').forEach(t => {
      t.addEventListener('click', () => { document.getElementById('recycle-search').value = t.dataset.item; searchItem(t.dataset.item); });
    });
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ECO QUIZ
// ══════════════════════════════════════════════════════════════════════════
const QUESTIONS = [
  {
    category: 'Climate Change',
    q: 'What percentage of global greenhouse gas emissions come from food production?',
    options: ['Around 5%', 'Around 12%', 'Around 26%', 'Around 40%'],
    answer: 2,
    explanation: 'Approximately 26% of global emissions come from food production, including farming, land use, and supply chains.',
  },
  {
    category: 'Recycling',
    q: 'How many times can aluminium be recycled without losing quality?',
    options: ['Once', '5–10 times', '20–30 times', 'Indefinitely'],
    answer: 3,
    explanation: 'Aluminium can be recycled an infinite number of times without any degradation in quality — making it one of the most valuable recyclables.',
  },
  {
    category: 'Energy',
    q: 'Which energy source currently produces the least CO₂ per kilowatt-hour?',
    options: ['Natural Gas', 'Nuclear Power', 'Coal', 'Solar PV'],
    answer: 1,
    explanation: 'Nuclear power has one of the lowest lifecycle CO₂ emissions per kWh — comparable to wind and solar — at around 12g CO₂/kWh vs coal\'s 820g.',
  },
  {
    category: 'Biodiversity',
    q: 'What fraction of the Earth\'s species are estimated to live in tropical rainforests?',
    options: ['1 in 10', '1 in 4', 'More than half', 'About 1 in 3'],
    answer: 2,
    explanation: 'Tropical rainforests cover just 6% of Earth\'s surface but are home to more than half of the world\'s plant and animal species.',
  },
  {
    category: 'Sustainable Living',
    q: 'Which single dietary change has the largest impact on reducing your carbon footprint?',
    options: ['Buying local produce', 'Cutting beef consumption', 'Avoiding air-freighted foods', 'Reducing food waste'],
    answer: 1,
    explanation: 'Cutting beef has the single biggest dietary impact. Beef produces 60kg of CO₂ per kg of meat — about 20× more than pulses.',
  },
  {
    category: 'Climate Change',
    q: 'By how much has global average temperature risen since pre-industrial times?',
    options: ['About 0.5°C', 'About 1.1°C', 'About 2°C', 'About 3°C'],
    answer: 1,
    explanation: 'Global temperatures have risen by approximately 1.1–1.2°C since pre-industrial times. The Paris Agreement aims to limit warming to 1.5°C.',
  },
  {
    category: 'Energy',
    q: 'What is the most energy-efficient mode of transport per passenger per km?',
    options: ['Electric Car', 'High-Speed Train', 'Conventional Bus', 'Cycling'],
    answer: 3,
    explanation: 'Cycling produces near-zero direct emissions and is the most energy-efficient human transport mode, with trains a close second for mass transit.',
  },
  {
    category: 'Recycling',
    q: 'What happens when non-recyclable items are placed in recycling bins?',
    options: ['They are sorted out automatically', 'They can contaminate entire batches', 'They are composted instead', 'Nothing — they\'re separated by hand'],
    answer: 1,
    explanation: 'Contamination from non-recyclables (especially food waste and liquids) can make entire loads unrecyclable, sending them to landfill.',
  },
  {
    category: 'Biodiversity',
    q: 'What is the leading cause of biodiversity loss globally?',
    options: ['Climate change', 'Pollution', 'Habitat destruction', 'Invasive species'],
    answer: 2,
    explanation: 'Habitat destruction — primarily through deforestation, agriculture, and urban expansion — is currently the #1 driver of species loss worldwide.',
  },
  {
    category: 'Sustainable Living',
    q: 'How much of clothing produced globally is estimated to end up in landfill or incinerated each year?',
    options: ['Around 10%', 'Around 30%', 'Around 50%', 'More than 70%'],
    answer: 3,
    explanation: 'The Ellen MacArthur Foundation estimates more than 70% of clothing ends up in landfill or incinerated. Only 1% is recycled into new textiles.',
  },
];

let currentQuestion = 0;
let score = 0;
let answered = false;

document.getElementById('start-quiz-btn').addEventListener('click', startQuiz);
document.getElementById('next-btn').addEventListener('click', nextQuestion);
document.getElementById('retake-btn').addEventListener('click', retakeQuiz);

function startQuiz() {
  currentQuestion = 0; score = 0; answered = false;
  document.getElementById('quiz-start-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');
  loadQuestion();
}

function loadQuestion() {
  answered = false;
  const total = QUESTIONS.length;
  const pct = (currentQuestion / total) * 100;
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const t      = (window.i18n && window.i18n.t)      ? window.i18n.t      : (k => k);
  const qT = (window.i18n && window.i18n.QUIZ_T) ? window.i18n.QUIZ_T[currentQuestion] : null;
  const q  = QUESTIONS[currentQuestion];

  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-progress-text').textContent =
    t('quiz.qOf').replace('{n}', currentQuestion + 1).replace('{total}', total);
  document.getElementById('question-category').textContent = qT ? tField(qT.category) : q.category;
  document.getElementById('question-text').textContent     = qT ? tField(qT.q)        : q.q;

  const letters = ['A','B','C','D'];
  const opts = qT ? qT.options.map(tField) : q.options;
  document.getElementById('options-grid').innerHTML = opts.map((opt, i) =>
    `<button class="option-btn" data-idx="${i}">
      <span class="opt-letter">${letters[i]}</span>${opt}
    </button>`
  ).join('');

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => selectAnswer(+btn.dataset.idx));
  });

  document.getElementById('quiz-feedback').classList.add('hidden');
  document.getElementById('next-btn').classList.add('hidden');
}

function selectAnswer(idx) {
  if (answered) return;
  answered = true;
  const q = QUESTIONS[currentQuestion];
  const correct = idx === q.answer;
  if (correct) score++;

  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === idx && !correct) btn.classList.add('wrong');
  });

  const fb = document.getElementById('quiz-feedback');
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const t      = (window.i18n && window.i18n.t)      ? window.i18n.t      : (k => k);
  const qT = (window.i18n && window.i18n.QUIZ_T) ? window.i18n.QUIZ_T[currentQuestion] : null;
  const expl = qT ? tField(qT.explanation) : q.explanation;
  fb.textContent = (correct ? t('quiz.correct') : t('quiz.wrong')) + expl;
  fb.className = 'quiz-feedback ' + (correct ? 'correct-fb' : 'wrong-fb');
  fb.classList.remove('hidden');

  const nextBtn = document.getElementById('next-btn');
  nextBtn.textContent = currentQuestion < QUESTIONS.length - 1 ? t('quiz.next') : t('quiz.seeResults');
  nextBtn.classList.remove('hidden');
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion >= QUESTIONS.length) {
    showResults();
  } else {
    loadQuestion();
  }
}

function showResults() {
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('quiz-result-screen').classList.remove('hidden');

  document.getElementById('final-score').textContent = `${score}/${QUESTIONS.length}`;
  document.getElementById('score-circle').style.background =
    score >= 8 ? 'linear-gradient(135deg,#1b4332,#40916c)'
    : score >= 5 ? 'linear-gradient(135deg,#2d6a4f,#74c69d)'
    : 'linear-gradient(135deg,#e07a5f,#f4a261)';

  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const tier = score <= 3 ? 0 : score <= 6 ? 1 : score <= 8 ? 2 : 3;

  document.getElementById('quiz-result-title').textContent = t('quiz.tier.' + tier);
  document.getElementById('quiz-result-msg').textContent   = t('quiz.msg.' + tier);

  const badges = [];
  if (score === QUESTIONS.length) badges.push(t('quiz.badge.perfect'));
  if (score >= 7) badges.push(t('quiz.badge.expert'));
  if (score >= 5) badges.push(t('quiz.badge.recycle'));
  if (score >= 3) badges.push(t('quiz.badge.climate'));

  document.getElementById('result-badges').innerHTML = badges.map(b => `<span class="badge">${b}</span>`).join('');
}

function retakeQuiz() {
  document.getElementById('quiz-result-screen').classList.add('hidden');
  document.getElementById('quiz-start-screen').classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════════════════════
// "WHAT BIN?" DROP GAME  (Tetris-style falling trash)
// ══════════════════════════════════════════════════════════════════════════
const BINS = [
  { key: 'recycling', icon: '♻️', label: 'Recycling' },
  { key: 'glass',     icon: '🫙', label: 'Glass' },
  { key: 'compost',   icon: '🍃', label: 'Compost' },
  { key: 'ewaste',    icon: '🔌', label: 'E-Waste' },
  { key: 'landfill',  icon: '🗑️', label: 'Landfill' },
];
function binLabel(key) {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : null;
  if (t) return t('sort.bin.' + key);
  const b = BINS.find(x => x.key === key);
  return b ? b.label : key;
}

const SORTER_ITEMS = [
  { icon: '🍕', name: 'Pizza box',     correct: 'landfill',
    why: 'Grease ruins paper recycling — soiled cardboard belongs in general waste.' },
  { icon: '☕', name: 'Coffee cup',    correct: 'landfill',
    why: 'Paper cups have a plastic lining — standard recycling can\'t process them.' },
  { icon: '🔋', name: 'Battery',       correct: 'ewaste',
    why: 'Loose batteries can spark fires in trucks. Use a battery drop-off.' },
  { icon: '🫙', name: 'Glass jar',     correct: 'glass',
    why: 'Rinsed glass jars belong in the dedicated glass stream.' },
  { icon: '🍌', name: 'Banana peel',   correct: 'compost',
    why: 'Food scraps compost into rich soil instead of methane in landfill.' },
  { icon: '🥤', name: 'Plastic bottle',correct: 'recycling',
    why: 'Rinsed PET bottles are widely accepted in kerbside recycling.' },
  { icon: '💡', name: 'Light bulb',    correct: 'ewaste',
    why: 'Bulbs contain electronics — take them to an e-waste point.' },
  { icon: '🥫', name: 'Soup can',      correct: 'recycling',
    why: 'Aluminium is endlessly recyclable. Just rinse it first.' },
  { icon: '🍟', name: 'Crisp packet',  correct: 'landfill',
    why: 'Metallised film is mixed layers kerbside recycling can\'t separate.' },
  { icon: '📱', name: 'Old phone',     correct: 'ewaste',
    why: 'Phones hold precious metals and toxic parts — always e-waste.' },
  { icon: '📰', name: 'Newspaper',     correct: 'recycling',
    why: 'Clean, dry paper recycles easily.' },
  { icon: '🍵', name: 'Tea bag',       correct: 'compost',
    why: 'Tea leaves compost well — check the bag is plastic-free.' },
  { icon: '🍎', name: 'Apple core',    correct: 'compost',
    why: 'Apple cores break down quickly in any compost bin.' },
  { icon: '👕', name: 'Old T-shirt',   correct: 'landfill',
    why: 'Textiles jam kerbside sorting machinery — use a clothing bank.' },
  { icon: '🍷', name: 'Wine bottle',   correct: 'glass',
    why: 'Empty wine bottles belong in glass recycling — remove the cork first.' },
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build the bins row (re-buildable on language change)
function buildBins() {
  const row = document.getElementById('bins-row');
  row.innerHTML = BINS.map(b => `
    <div class="bin" data-bin="${b.key}">
      <span class="bin-icon">${b.icon}</span>
      <span class="bin-label">${binLabel(b.key)}</span>
    </div>`).join('');
  row.querySelectorAll('.bin').forEach((bin, i) => {
    bin.addEventListener('click', () => sendToColumn(i));
  });
}
buildBins();

// ── Game state ────────────────────────────────────────────────────────────
const COL_CENTERS = [10, 30, 50, 70, 90];   // % horizontal positions for the 5 columns
const FLOOR_Y     = 290;                    // px — when item.top reaches this, it lands
const BASE_SPEED  = 1.3;                    // px/frame at speed ×1
const LIVES_START = 3;

const game = {
  active: false,
  paused: false,
  queue: [],
  qIdx: 0,
  current: null,
  colIdx: 2,
  y: 0,
  vy: BASE_SPEED,
  speedMul: 1.0,
  lives: LIVES_START,
  score: 0,
  sorted: 0,
  mistakes: [],
  rafId: null,
};

const fallingEl   = document.getElementById('falling-item');
const fallingIcon = fallingEl.querySelector('.falling-icon');
const fallingName = fallingEl.querySelector('.falling-name');

document.getElementById('sorter-start-btn').addEventListener('click', startSorter);
document.getElementById('sorter-retry-btn').addEventListener('click', startSorter);
document.getElementById('ctrl-left' ).addEventListener('click', () => moveCol(-1));
document.getElementById('ctrl-right').addEventListener('click', () => moveCol( 1));
document.getElementById('ctrl-down' ).addEventListener('click', () => fastDrop());

document.addEventListener('keydown', e => {
  if (!game.active || game.paused) return;
  const k = e.key;
  if (k === 'ArrowLeft')                  { e.preventDefault(); moveCol(-1); }
  else if (k === 'ArrowRight')            { e.preventDefault(); moveCol(1); }
  else if (k === 'ArrowDown' || k === ' '){ e.preventDefault(); fastDrop(); }
});

function startSorter() {
  Object.assign(game, {
    active: true, paused: false,
    queue: shuffle(SORTER_ITEMS), qIdx: 0,
    colIdx: 2, y: 0, vy: BASE_SPEED, speedMul: 1.0,
    lives: LIVES_START, score: 0, sorted: 0, mistakes: [],
  });
  document.getElementById('sorter-start').classList.add('hidden');
  document.getElementById('sorter-result').classList.add('hidden');
  document.getElementById('sorter-game').classList.remove('hidden');
  document.getElementById('sorter-feedback').classList.add('hidden');
  document.getElementById('playfield').focus();
  updateHUD();
  spawnItem();
  startLoop();
}

function sorterItemName(item) {
  const idx = SORTER_ITEMS.indexOf(item);
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : null;
  const data = (window.i18n && window.i18n.SORTER_T) ? window.i18n.SORTER_T[idx] : null;
  if (tField && data) return tField(data.name);
  return item.name;
}
function sorterItemWhy(item) {
  const idx = SORTER_ITEMS.indexOf(item);
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : null;
  const data = (window.i18n && window.i18n.SORTER_T) ? window.i18n.SORTER_T[idx] : null;
  if (tField && data) return tField(data.why);
  return item.why;
}

function spawnItem() {
  const item = game.queue[game.qIdx % game.queue.length];
  game.qIdx++;
  game.current = item;
  game.colIdx = 2;
  game.y = 0;
  game.vy = BASE_SPEED * game.speedMul;
  game.paused = false;
  fallingIcon.textContent = item.icon;
  fallingName.textContent = sorterItemName(item);
  fallingEl.classList.remove('placed-correct', 'placed-wrong');
  fallingEl.style.left = COL_CENTERS[game.colIdx] + '%';
  fallingEl.style.top  = '0px';
  fallingEl.style.opacity = '1';
}

function startLoop() {
  cancelAnimationFrame(game.rafId);
  const tick = () => {
    if (!game.active) return;
    if (!game.paused) {
      game.y += game.vy;
      fallingEl.style.top  = game.y + 'px';
      fallingEl.style.left = COL_CENTERS[game.colIdx] + '%';
      if (game.y >= FLOOR_Y) resolveItem();
    }
    game.rafId = requestAnimationFrame(tick);
  };
  game.rafId = requestAnimationFrame(tick);
}

function moveCol(delta) {
  game.colIdx = Math.max(0, Math.min(4, game.colIdx + delta));
}
function sendToColumn(idx) {
  if (!game.active || game.paused) return;
  game.colIdx = idx;
  fastDrop();
}
function fastDrop() {
  game.vy = Math.max(game.vy, BASE_SPEED * game.speedMul * 6);
}

function resolveItem() {
  game.paused = true;
  if (game.y > FLOOR_Y) game.y = FLOOR_Y;
  fallingEl.style.top = game.y + 'px';

  const binKey = BINS[game.colIdx].key;
  const item   = game.current;
  const correct = binKey === item.correct;

  fallingEl.classList.add(correct ? 'placed-correct' : 'placed-wrong');

  const binEl = document.querySelectorAll('.bin')[game.colIdx];
  binEl.classList.add(correct ? 'bin-correct' : 'bin-wrong');
  setTimeout(() => binEl.classList.remove('bin-correct', 'bin-wrong'), 600);

  const fb = document.getElementById('sorter-feedback');
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const why = sorterItemWhy(item);
  const name = sorterItemName(item);
  if (correct) {
    fb.innerHTML = `✅ <strong>${t('sort.nice')}</strong> ${why}`;
    fb.className = 'sorter-feedback correct-fb';
    game.score += 10;
    game.sorted++;
    if (game.sorted > 0 && game.sorted % 5 === 0) game.speedMul = +(game.speedMul + 0.15).toFixed(2);
    showPop('+10', COL_CENTERS[game.colIdx]);
  } else {
    const lead = t('sort.wrongLead')
      .replace('{name}', name)
      .replace('{correct}', binLabel(item.correct))
      .replace('{chosen}', binLabel(binKey));
    fb.innerHTML = `❌ <strong>${lead}</strong> ${why}`;
    fb.className = 'sorter-feedback wrong-fb';
    game.lives--;
    game.mistakes.push({ item, chosen: binKey });
  }
  fb.classList.remove('hidden');
  updateHUD();

  setTimeout(() => {
    fb.classList.add('hidden');
    if (game.lives <= 0) endGame();
    else spawnItem();
  }, 1100);
}

function showPop(text, leftPct) {
  const pop = document.getElementById('score-pop');
  pop.textContent = text;
  pop.style.left = leftPct + '%';
  pop.style.top  = (FLOOR_Y - 10) + 'px';
  pop.classList.remove('show');
  void pop.offsetWidth; // restart animation
  pop.classList.add('show');
}

function updateHUD() {
  document.getElementById('sorter-score' ).textContent = game.score;
  document.getElementById('sorter-sorted').textContent = game.sorted;
  document.getElementById('sorter-lives' ).textContent = '❤️'.repeat(Math.max(0, game.lives)) || '💀';
  document.getElementById('sorter-speed' ).textContent = '×' + game.speedMul.toFixed(1);
}

function endGame() {
  game.active = false;
  cancelAnimationFrame(game.rafId);
  document.getElementById('sorter-game').classList.add('hidden');
  document.getElementById('sorter-result').classList.remove('hidden');

  document.getElementById('sorter-final-score').textContent = game.score;
  document.getElementById('sorter-score-circle').style.background =
    game.score >= 150 ? 'linear-gradient(135deg,#1b4332,#40916c)'
    : game.score >=  60 ? 'linear-gradient(135deg,#2d6a4f,#74c69d)'
    : 'linear-gradient(135deg,#e07a5f,#f4a261)';

  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  let title, msg;
  if (game.score >= 200)      { title = t('sort.legend');  msg = t('sort.legend.msg').replace('{n}', game.sorted); }
  else if (game.score >= 100) { title = t('sort.pro');     msg = t('sort.pro.msg').replace('{n}', game.sorted); }
  else if (game.score >=  40) { title = t('sort.getting'); msg = t('sort.getting.msg').replace('{n}', game.sorted); }
  else                        { title = t('sort.tough');   msg = t('sort.tough.msg'); }
  document.getElementById('sorter-result-title').textContent = title;
  document.getElementById('sorter-result-msg').textContent = msg;

  const recap = document.getElementById('sorter-recap');
  if (game.mistakes.length === 0) {
    recap.innerHTML = `<div style="text-align:center;color:var(--green-dark);font-size:.95rem;font-weight:600">${t('sort.flawless')}</div>`;
  } else {
    recap.innerHTML = `<div style="font-size:.85rem;color:var(--text-light);text-align:center;margin-bottom:.5rem">${t('sort.misHeader')}</div>` +
      game.mistakes.map(r => `
        <div class="recap-row recap-wrong">
          <span class="recap-icon">${r.item.icon}</span>
          <span class="recap-name">${sorterItemName(r.item)}</span>
          <span class="recap-verdict">${t('sort.you')}: ${binLabel(r.chosen)} → ${binLabel(r.item.correct)}</span>
          <span class="recap-mark">❌</span>
        </div>`).join('');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// CIRCULAR ECONOMY WALKTHROUGH  (scrollytelling)
// ══════════════════════════════════════════════════════════════════════════
const LIFECYCLES = {
  smartphone: [
    { emoji: '⛏️', short: 'Extract', phase: 'Raw Material Extraction', title: 'Mining the Materials',
      desc: 'A single smartphone contains over 60 elements — gold, cobalt, lithium, tungsten and rare earths — mined across the globe, often at high environmental and human cost.',
      stat: '34 kg', statLabel: 'ore mined per 130g phone' },
    { emoji: '🏭', short: 'Make', phase: 'Manufacturing', title: 'Building the Device',
      desc: 'Chip fabrication and assembly are hugely energy-intensive. Producing the phone — not using it — accounts for the bulk of its lifetime carbon footprint.',
      stat: '~80%', statLabel: 'of lifetime CO₂ is from production' },
    { emoji: '🚢', short: 'Ship', phase: 'Distribution', title: 'Shipped Worldwide',
      desc: 'Components and finished phones are sea-shipped and air-freighted across continents before reaching a store shelf or your doorstep.',
      stat: '12,000+ km', statLabel: 'typical journey before first use' },
    { emoji: '📱', short: 'Use', phase: 'Use Phase', title: 'In Your Pocket',
      desc: 'You charge it daily and depend on it constantly — yet most phones are swapped out long before they actually stop working.',
      stat: '2–3 yrs', statLabel: 'average lifespan before replacement' },
    { emoji: '🗑️', short: 'Discard', phase: 'End of Life', title: 'The Drawer or the Dump',
      desc: 'Most old phones are forgotten in drawers or thrown away. In landfill, toxic heavy metals can leach into soil and water.',
      stat: '~17%', statLabel: 'of global e-waste is properly recycled' },
    { emoji: '🔄', short: 'Renew', phase: 'The Circular Fix', title: 'Closing the Loop', circular: true,
      desc: 'Repair, resell or trade in your phone. Refurbishment extends its life, and proper recycling recovers gold, copper and rare metals to build new devices — with no fresh mining.',
      stat: '100%', statLabel: 'of key metals are recoverable' },
  ],
  tshirt: [
    { emoji: '🌱', short: 'Grow', phase: 'Raw Material Extraction', title: 'Growing the Cotton',
      desc: 'Conventional cotton is thirsty and pesticide-heavy. Growing enough fibre for just one T-shirt consumes a staggering amount of fresh water.',
      stat: '2,700 L', statLabel: 'of water for one cotton T-shirt' },
    { emoji: '🏭', short: 'Make', phase: 'Manufacturing', title: 'Spinning, Dyeing & Sewing',
      desc: 'Cotton is spun, woven, dyed and stitched. Textile dyeing and finishing is one of the largest polluters of clean water in the world.',
      stat: '~20%', statLabel: 'of water pollution from dyeing' },
    { emoji: '✈️', short: 'Ship', phase: 'Distribution', title: 'Shipped to Your Store',
      desc: 'Garments travel from factories — frequently in Asia — to warehouses and shops right across the globe.',
      stat: '10,000+ km', statLabel: 'shipped before reaching your wardrobe' },
    { emoji: '👕', short: 'Wear', phase: 'Use Phase', title: 'Worn & Washed',
      desc: 'The average garment is worn only a handful of times. Every wash uses water and energy, and sheds plastic microfibres into waterways.',
      stat: '7–10', statLabel: 'wears before being discarded' },
    { emoji: '🗑️', short: 'Discard', phase: 'End of Life', title: 'Landfill or Incinerator',
      desc: 'The vast majority of clothing is landfilled or burned. Natural fibres take years to break down; synthetic blends never fully do.',
      stat: '>70%', statLabel: 'of clothing is landfilled or burned' },
    { emoji: '🔄', short: 'Renew', phase: 'The Circular Fix', title: 'Closing the Loop', circular: true,
      desc: 'Buy less and better, choose secondhand, repair and re-wear. Donate or use textile recycling so fibres become new products instead of waste.',
      stat: '<1%', statLabel: 'of textiles are recycled into new clothing' },
  ],
};

// ── Cycle state ───────────────────────────────────────────────────────────
const cycle = { stages: [], idx: 0, timer: null, playing: true, product: 'smartphone' };
const CYCLE_INTERVAL_MS = 5000;

function cycleStageField(idx, field) {
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : null;
  const tr = (window.i18n && window.i18n.LIFECYCLES_T && window.i18n.LIFECYCLES_T[cycle.product])
    ? window.i18n.LIFECYCLES_T[cycle.product][idx] : null;
  if (tField && tr && tr[field]) return tField(tr[field]);
  return cycle.stages[idx][field];
}

function renderLifecycle(product) {
  cycle.product = product;
  cycle.stages = LIFECYCLES[product];
  cycle.idx = 0;

  const R = 38;
  const labelDist = 52;  // px outward from each node centre
  const angles = [0, 60, 120, 180, 240, 300];

  const nodesEl = document.getElementById('cycle-nodes');
  nodesEl.innerHTML = cycle.stages.map((s, i) => {
    const a = (angles[i] * Math.PI) / 180;
    const x = 50 + Math.sin(a) * R;
    const y = 50 - Math.cos(a) * R;
    const lx = Math.sin(a) * labelDist;
    const ly = -Math.cos(a) * labelDist;
    return `<button class="cycle-node ${s.circular ? 'circular' : ''}" data-idx="${i}"
        style="top:${y.toFixed(2)}%;left:${x.toFixed(2)}%;">
        <span class="node-emoji">${s.emoji}</span>
        <span class="node-label" style="--lx:${lx.toFixed(1)}px;--ly:${ly.toFixed(1)}px;">${cycleStageField(i, 'short')}</span>
      </button>`;
  }).join('');

  nodesEl.querySelectorAll('.cycle-node').forEach(btn => {
    btn.addEventListener('click', () => selectStage(+btn.dataset.idx));
  });

  document.getElementById('cycle-total').textContent = cycle.stages.length;
  updateCycleCenter();
}

function updateCycleCenter() {
  const s = cycle.stages[cycle.idx];
  if (!s) return;
  document.getElementById('cycle-stage-num').textContent  = cycle.idx + 1;
  document.getElementById('cycle-stage-phase').textContent = cycleStageField(cycle.idx, 'phase');
  document.getElementById('cycle-stage-title').textContent = cycleStageField(cycle.idx, 'title');
  document.getElementById('cycle-stage-desc').textContent  = cycleStageField(cycle.idx, 'desc');
  document.getElementById('cycle-stat-num').textContent    = s.stat;
  document.getElementById('cycle-stat-label').textContent  = cycleStageField(cycle.idx, 'statLabel');
  document.getElementById('cycle-cur').textContent         = cycle.idx + 1;
  document.querySelectorAll('.cycle-node').forEach((btn, i) => {
    btn.classList.toggle('active', i === cycle.idx);
  });
  document.getElementById('cycle-diagram').classList.toggle('is-circular', !!s.circular);
}

function selectStage(i) {
  const n = cycle.stages.length;
  if (!n) return;
  cycle.idx = ((i % n) + n) % n;
  updateCycleCenter();
  if (cycle.playing) startCycleAuto(); // restart timer after manual navigation
}

function startCycleAuto() {
  stopCycleTimer();
  if (!cycle.playing) return;
  cycle.timer = setInterval(() => selectStage(cycle.idx + 1), CYCLE_INTERVAL_MS);
}
function stopCycleTimer() {
  if (cycle.timer) { clearInterval(cycle.timer); cycle.timer = null; }
}

document.getElementById('cycle-prev').addEventListener('click', () => selectStage(cycle.idx - 1));
document.getElementById('cycle-next').addEventListener('click', () => selectStage(cycle.idx + 1));
document.getElementById('cycle-play').addEventListener('click', () => {
  cycle.playing = !cycle.playing;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  document.getElementById('cycle-play').textContent = cycle.playing ? t('circ.pause') : t('circ.play');
  document.getElementById('cycle-diagram').classList.toggle('paused', !cycle.playing);
  if (cycle.playing) startCycleAuto();
  else stopCycleTimer();
});

// Pause when the cursor is over the diagram so users can read at their pace
const diagramEl = document.getElementById('cycle-diagram');
diagramEl.addEventListener('mouseenter', () => { if (cycle.playing) stopCycleTimer(); });
diagramEl.addEventListener('mouseleave', () => { if (cycle.playing) startCycleAuto(); });

document.querySelectorAll('.product-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.product-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLifecycle(btn.dataset.product);
    if (cycle.playing) startCycleAuto();
  });
});

// Initial render (auto-rotation starts only once the Circular tab is opened — see switchTab)
renderLifecycle('smartphone');

// ══════════════════════════════════════════════════════════════════════════
// THRIFT & SAVE  (benefits, price chart, savings calculator)
// ══════════════════════════════════════════════════════════════════════════
const THRIFT_DATA = [
  { id: 'tshirt',  icon: '👕', name: 'T-shirt',     new:  25, thrift:  5 },
  { id: 'jeans',   icon: '👖', name: 'Jeans',       new:  60, thrift: 12 },
  { id: 'sweater', icon: '🧶', name: 'Sweater',     new:  50, thrift: 10 },
  { id: 'dress',   icon: '👗', name: 'Dress',       new:  45, thrift: 10 },
  { id: 'jacket',  icon: '🧥', name: 'Jacket/Coat', new: 120, thrift: 25 },
  { id: 'shoes',   icon: '👟', name: 'Shoes',       new:  80, thrift: 15 },
  { id: 'handbag', icon: '👜', name: 'Handbag',     new:  90, thrift: 20 },
  { id: 'kids',    icon: '🧸', name: 'Kids outfit', new:  35, thrift:  6 },
];

function thriftName(d) {
  const idx = THRIFT_DATA.indexOf(d);
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : null;
  const tr = (window.i18n && window.i18n.THRIFT_T) ? window.i18n.THRIFT_T[idx] : null;
  if (tField && tr) return tField(tr.name);
  return d.name;
}

function renderThriftChart() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const max = Math.max(...THRIFT_DATA.map(d => d.new));
  document.getElementById('thrift-chart').innerHTML = THRIFT_DATA.map(d => {
    const saved = d.new - d.thrift;
    const pct   = Math.round((saved / d.new) * 100);
    return `
      <div class="chart-row">
        <div class="chart-label">
          <span class="chart-label-icon">${d.icon}</span>${thriftName(d)}
        </div>
        <div class="chart-bars">
          <div class="chart-bar-row">
            <span class="chart-bar-tag new">${t('thrift.tag.new')}</span>
            <div class="chart-bar-track"><div class="chart-bar-fill new" data-w="${(d.new/max)*100}"></div></div>
            <span class="chart-bar-price">$${d.new}</span>
          </div>
          <div class="chart-bar-row">
            <span class="chart-bar-tag thrift">${t('thrift.tag.thrift')}</span>
            <div class="chart-bar-track"><div class="chart-bar-fill thrift" data-w="${(d.thrift/max)*100}"></div></div>
            <span class="chart-bar-price">$${d.thrift}</span>
          </div>
          <span class="chart-save">${t('thrift.save')} $${saved} (${pct}%)</span>
        </div>
      </div>`;
  }).join('');
}

function animateThriftChart() {
  // Reset to 0, then animate to target widths
  document.querySelectorAll('.chart-bar-fill').forEach(el => { el.style.width = '0%'; });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.chart-bar-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }));
}

function renderSavingsCalc() {
  document.getElementById('savings-grid').innerHTML = THRIFT_DATA.map(d => {
    const nm = thriftName(d);
    return `
    <div class="saver-item">
      <div class="saver-head">
        <span class="saver-name">${d.icon} ${nm}</span>
        <span class="saver-count" id="count-${d.id}">0</span>
      </div>
      <input class="saver-slider" type="range" min="0" max="12" value="0" data-id="${d.id}" aria-label="${nm}" />
    </div>`;
  }).join('');
  document.querySelectorAll('.saver-slider').forEach(s => {
    s.addEventListener('input', updateSavings);
  });
  updateSavings();
}

function updateSavings() {
  let newTotal = 0, thriftTotal = 0;
  THRIFT_DATA.forEach(d => {
    const el = document.querySelector(`.saver-slider[data-id="${d.id}"]`);
    const n = parseInt(el.value, 10) || 0;
    document.getElementById(`count-${d.id}`).textContent = n;
    newTotal    += n * d.new;
    thriftTotal += n * d.thrift;
  });
  const saved = newTotal - thriftTotal;
  document.getElementById('cost-new'   ).textContent = newTotal;
  document.getElementById('cost-thrift').textContent = thriftTotal;
  document.getElementById('cost-save'  ).textContent = saved;

  const fun = document.getElementById('savings-fun');
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  let key;
  if      (saved === 0)   key = 'thrift.fun.0';
  else if (saved < 30)    key = 'thrift.fun.s';
  else if (saved < 80)    key = 'thrift.fun.m';
  else if (saved < 200)   key = 'thrift.fun.l';
  else if (saved < 500)   key = 'thrift.fun.xl';
  else if (saved < 1000)  key = 'thrift.fun.xxl';
  else if (saved < 2000)  key = 'thrift.fun.huge';
  else                    key = 'thrift.fun.mega';
  fun.innerHTML = t(key).replace('{n}', saved);
}

// Initial render (chart bars animate on first tab open)
renderThriftChart();
renderSavingsCalc();

// ══════════════════════════════════════════════════════════════════════════
// ENERGY GRID BALANCER  (5-level renewable energy puzzle)
// ══════════════════════════════════════════════════════════════════════════
const ENERGY_SOURCES = {
  solar:      { icon: '☀️', name: 'Solar Panel',  mw: 3,  type: 'renew' },
  wind:       { icon: '🌬️', name: 'Wind Turbine', mw: 4,  type: 'renew' },
  hydro:      { icon: '💧', name: 'Hydro Dam',    mw: 5,  type: 'renew' },
  geothermal: { icon: '🌋', name: 'Geothermal',   mw: 6,  type: 'renew' },
  coal:       { icon: '🪨', name: 'Coal Plant',   mw: 10, type: 'fossil' },
  gasPlant:   { icon: '⛽', name: 'Gas Plant',    mw: 8,  type: 'fossil' },
};

const ENERGY_LEVELS = [
  { name: 'Light the Village', demand: 10, sources: ['solar','wind'] },
  { name: 'Power the Town',    demand: 20, sources: ['solar','wind','geothermal','coal'] },
  { name: 'Energize the City', demand: 35, sources: ['solar','wind','geothermal','hydro','gasPlant'] },
  { name: 'Industrial Zone',   demand: 55, sources: ['solar','wind','geothermal','hydro','coal','gasPlant'] },
  { name: 'Mega-City Grid',    demand: 80, sources: ['solar','wind','geothermal','hydro','coal','gasPlant'] },
];

const energy = { levelIdx: 0, placed: [], totalStars: 0 };

function buildCityBuildings() {
  const heights = [55, 80, 65, 95, 70, 78];
  const rows    = [3,  4,  3,  5,  3,  4];
  document.getElementById('city-buildings').innerHTML = heights.map((h, i) => {
    const wins = Array.from({ length: rows[i] * 2 }, () => '<div class="city-window"></div>').join('');
    return `<div class="city-building" style="height:${h}%;width:38px;">${wins}</div>`;
  }).join('');
}

function startEnergyGame() {
  energy.levelIdx = 0;
  energy.totalStars = 0;
  energy.placed = [];
  document.getElementById('energy-start').classList.add('hidden');
  document.getElementById('energy-result').classList.add('hidden');
  document.getElementById('energy-complete').classList.add('hidden');
  document.getElementById('energy-game').classList.remove('hidden');
  buildCityBuildings();
  loadEnergyLevel();
}

function energySourceName(key) {
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : null;
  const tr = (window.i18n && window.i18n.ENERGY_SOURCES_T) ? window.i18n.ENERGY_SOURCES_T[key] : null;
  if (tField && tr) return tField(tr.name);
  return ENERGY_SOURCES[key].name;
}
function energyLevelName(idx) {
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : null;
  const tr = (window.i18n && window.i18n.ENERGY_LEVELS_T) ? window.i18n.ENERGY_LEVELS_T[idx] : null;
  if (tField && tr) return tField(tr.name);
  return ENERGY_LEVELS[idx].name;
}

function loadEnergyLevel() {
  const lvl = ENERGY_LEVELS[energy.levelIdx];
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  energy.placed = [];
  document.getElementById('energy-level-num').textContent  = energy.levelIdx + 1;
  document.getElementById('energy-level-name').textContent = energyLevelName(energy.levelIdx);
  document.getElementById('energy-demand-val').textContent = lvl.demand;
  document.getElementById('power-target').textContent      = lvl.demand;
  document.getElementById('energy-total-stars').textContent = energy.totalStars;
  document.getElementById('energy-feedback').classList.add('hidden');

  const palette = document.getElementById('energy-sources');
  palette.innerHTML = lvl.sources.map(key => {
    const s = ENERGY_SOURCES[key];
    const isFossil = s.type === 'fossil';
    return `<div class="source-card ${isFossil ? 'fossil' : ''}" data-src="${key}">
      <span class="src-icon">${s.icon}</span>
      <span class="src-name">${energySourceName(key)}</span>
      <span class="src-mw">${s.mw} MW</span>
      ${isFossil ? `<span class="src-warning">${t('energy.pollutes')}</span>` : ''}
    </div>`;
  }).join('');
  palette.querySelectorAll('.source-card').forEach(c => {
    c.addEventListener('click', () => addEnergySource(c.dataset.src));
  });

  updateEnergyPlaced();
  updatePowerMeter();
}

function addEnergySource(key) {
  energy.placed.push(key);
  updateEnergyPlaced();
  updatePowerMeter();
  document.getElementById('energy-feedback').classList.add('hidden');
}

function removeEnergySource(idx) {
  energy.placed.splice(idx, 1);
  updateEnergyPlaced();
  updatePowerMeter();
  document.getElementById('energy-feedback').classList.add('hidden');
}

function updateEnergyPlaced() {
  const el = document.getElementById('energy-placed');
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  if (energy.placed.length === 0) {
    el.innerHTML = `<div class="energy-placed-empty">${t('energy.placedEmpty')}</div>`;
    return;
  }
  el.innerHTML = energy.placed.map((key, i) => {
    const s = ENERGY_SOURCES[key];
    const isFossil = s.type === 'fossil';
    return `<div class="placed-card ${isFossil ? 'fossil' : ''}" data-idx="${i}" title="Click to remove">
      <span class="pc-icon">${s.icon}</span>
      <span class="pc-name">${energySourceName(key)}</span>
      <span class="pc-mw">+${s.mw}</span>
      <span class="pc-x">✕</span>
    </div>`;
  }).join('');
  el.querySelectorAll('.placed-card').forEach(c => {
    c.addEventListener('click', () => removeEnergySource(+c.dataset.idx));
  });
}

function updatePowerMeter() {
  const lvl = ENERGY_LEVELS[energy.levelIdx];
  let renewMW = 0, fossilMW = 0;
  energy.placed.forEach(key => {
    const s = ENERGY_SOURCES[key];
    if (s.type === 'fossil') fossilMW += s.mw; else renewMW += s.mw;
  });
  const totalMW = renewMW + fossilMW;
  document.getElementById('power-val').textContent = totalMW;

  const renewPct  = Math.min((renewMW  / lvl.demand) * 100, 100);
  const fossilPct = Math.min((fossilMW / lvl.demand) * 100, Math.max(0, 100 - renewPct));
  document.getElementById('power-bar').style.width = renewPct + '%';
  document.getElementById('power-bar-fossil').style.width = fossilPct + '%';
  document.getElementById('power-bar-fossil').style.left  = renewPct + '%';

  const windows = document.querySelectorAll('.city-window');
  const litCount = Math.min(Math.floor((totalMW / lvl.demand) * windows.length), windows.length);
  windows.forEach((w, i) => w.classList.toggle('lit', i < litCount));

  const smoke = document.getElementById('city-smoke');
  if (fossilMW > 0) {
    smoke.innerHTML =
      '<span class="smoke-puff" style="bottom:25%;left:18%;animation-delay:0s">💨</span>' +
      '<span class="smoke-puff" style="bottom:35%;left:50%;animation-delay:.7s">💨</span>' +
      '<span class="smoke-puff" style="bottom:20%;left:78%;animation-delay:1.3s">💨</span>';
  } else {
    smoke.innerHTML = '';
  }
}

function powerUp() {
  const lvl = ENERGY_LEVELS[energy.levelIdx];
  let renewMW = 0, fossilMW = 0;
  energy.placed.forEach(key => {
    const s = ENERGY_SOURCES[key];
    if (s.type === 'fossil') fossilMW += s.mw; else renewMW += s.mw;
  });
  const totalMW = renewMW + fossilMW;
  const fb = document.getElementById('energy-feedback');
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);

  if (fossilMW > 0) {
    fb.innerHTML = t('energy.fb.pollution');
    fb.className = 'energy-feedback fail-fb';
    fb.classList.remove('hidden');
    return;
  }
  if (totalMW < lvl.demand) {
    fb.innerHTML = t('energy.fb.short').replace('{mw}', lvl.demand - totalMW);
    fb.className = 'energy-feedback warn-fb';
    fb.classList.remove('hidden');
    return;
  }

  const overrun = totalMW / lvl.demand;
  const stars = overrun <= 1.15 ? 3 : overrun <= 1.4 ? 2 : 1;
  energy.totalStars += stars;
  showEnergyResult(stars, totalMW, lvl);
}

function showEnergyResult(stars, totalMW, lvl) {
  document.getElementById('energy-game').classList.add('hidden');
  document.getElementById('energy-result').classList.remove('hidden');
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  document.getElementById('energy-result-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  document.getElementById('energy-result-title').textContent = t('energy.res.' + stars);
  const lead = t('energy.res.msg').replace('{mw}', totalMW).replace('{d}', lvl.demand);
  const suf  = t('energy.res.suf' + stars);
  document.getElementById('energy-result-msg').innerHTML = lead + suf;

  const isLast = energy.levelIdx >= ENERGY_LEVELS.length - 1;
  document.getElementById('energy-next-btn').textContent = isLast ? t('energy.finish') : t('energy.next');
}

function nextEnergyLevel() {
  document.getElementById('energy-result').classList.add('hidden');
  if (energy.levelIdx >= ENERGY_LEVELS.length - 1) {
    showEnergyComplete();
    return;
  }
  energy.levelIdx++;
  document.getElementById('energy-game').classList.remove('hidden');
  loadEnergyLevel();
}

function showEnergyComplete() {
  document.getElementById('energy-complete').classList.remove('hidden');
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const stars = energy.totalStars;
  const max   = ENERGY_LEVELS.length * 3;
  const head  = t('energy.cm.head').replace('{s}', stars).replace('{m}', max);
  const tail  = stars >= max - 1   ? t('energy.cm.top')
              : stars >= max * 0.7 ? t('energy.cm.mid')
              :                      t('energy.cm.low');
  document.getElementById('energy-complete-msg').innerHTML = head + tail;
  const badges = [t('energy.badge.hero')];
  if (stars >= max * 0.8) badges.unshift(t('energy.badge.master'));
  if (stars === max)      badges.unshift(t('energy.badge.perfect'));
  document.getElementById('energy-final-badges').innerHTML = badges.map(b => `<span class="badge">${b}</span>`).join('');
}

document.getElementById('energy-start-btn'  ).addEventListener('click', startEnergyGame);
document.getElementById('power-up-btn'      ).addEventListener('click', powerUp);
document.getElementById('energy-reset-btn'  ).addEventListener('click', () => {
  energy.placed = [];
  updateEnergyPlaced();
  updatePowerMeter();
  document.getElementById('energy-feedback').classList.add('hidden');
});
document.getElementById('energy-next-btn'   ).addEventListener('click', nextEnergyLevel);
document.getElementById('energy-restart-btn').addEventListener('click', startEnergyGame);

// ══════════════════════════════════════════════════════════════════════════
// ECO-HERO QUEST  (visual, level-based footprint calculator)
// ══════════════════════════════════════════════════════════════════════════
const QUEST_LEVELS = [
  { label: 'Transportation', question: 'How do you mostly get around day-to-day?',
    options: [
      { icon: '🚲', label: 'Walk or bike',     sub: 'mostly human-powered', co2: 0.4, badge: '🚲 Pedal Power' },
      { icon: '🚊', label: 'Public transport', sub: 'bus, train, metro',    co2: 1.1, badge: null },
      { icon: '🚗', label: 'Personal car',     sub: 'daily commute',        co2: 3.2, badge: null },
      { icon: '✈️', label: 'Frequent flyer',   sub: 'many flights a year',  co2: 6.0, badge: null },
    ] },
  { label: 'Diet', question: 'What\'s typically on your plate?',
    options: [
      { icon: '🥗', label: 'Vegan',        sub: 'plant-only',        co2: 1.5, badge: '🌱 Plant-Powered' },
      { icon: '🥬', label: 'Vegetarian',   sub: 'no meat or fish',   co2: 1.8, badge: null },
      { icon: '🐟', label: 'Pescatarian',  sub: 'fish but no meat',  co2: 2.3, badge: null },
      { icon: '🥩', label: 'Heavy meat',   sub: 'meat most meals',   co2: 3.5, badge: null },
    ] },
  { label: 'Home Energy', question: 'How do you heat and power your home?',
    options: [
      { icon: '☀️', label: 'Renewable',    sub: 'clean tariff or solar', co2: 0.6, badge: '⚡ Clean-Energy Captain' },
      { icon: '🔌', label: 'Mixed grid',   sub: 'standard electricity',  co2: 2.0, badge: null },
      { icon: '🔥', label: 'Gas heating',  sub: 'gas + grid electricity',co2: 3.5, badge: null },
      { icon: '🛢️', label: 'Oil & coal',   sub: 'oil boiler or coal',    co2: 5.0, badge: null },
    ] },
  { label: 'Shopping', question: 'How often do you buy new clothes & gadgets?',
    options: [
      { icon: '♻️', label: 'Mostly secondhand', sub: 'thrift & repair',    co2: 0.3, badge: '♻️ Thrift Champion' },
      { icon: '🛍️', label: 'Occasionally new',  sub: 'a few items a year', co2: 1.2, badge: null },
      { icon: '📦', label: 'Regularly online',  sub: 'monthly orders',     co2: 2.5, badge: null },
      { icon: '🛒', label: 'Constantly',         sub: 'weekly hauls',       co2: 4.0, badge: null },
    ] },
  { label: 'Holidays', question: 'What do your holidays usually look like?',
    options: [
      { icon: '🏞️', label: 'Local staycations', sub: 'close to home',     co2: 0.2, badge: '🏞️ Local Explorer' },
      { icon: '🚆', label: 'Train trips',        sub: 'overland journeys', co2: 1.0, badge: null },
      { icon: '✈️', label: 'A flight or two',    sub: '1–2 trips/year',    co2: 3.0, badge: null },
      { icon: '🌐', label: 'Multiple flights',   sub: 'frequent travel',   co2: 6.0, badge: null },
    ] },
];

const RANKS = [
  { max:  4, icon: '🦸', name: 'Eco Legend',
    desc: 'You\'re setting the standard. Your footprint is well below the global average — an inspiration!' },
  { max:  7, icon: '🌍', name: 'Planet Hero',
    desc: 'Strong eco-game! Your impact is below average, with a little room to push lower on the biggest categories.' },
  { max: 11, icon: '🌳', name: 'Eco Warrior',
    desc: 'A solid mix of green habits. One next-greener swap will make a big dent.' },
  { max: 15, icon: '🌿', name: 'Eco Friend',
    desc: 'You care — and a few habit shifts in transport, diet or shopping could cut your footprint dramatically.' },
  { max: 99, icon: '🌱', name: 'Sprout',
    desc: 'Everyone starts somewhere! Pick one category and try the next-greener option — small swaps add up fast.' },
];

const quest = { idx: 0, selections: [], total: 0 };

function startQuest() {
  quest.idx = 0;
  quest.selections = [];
  quest.total = 0;
  document.getElementById('quest-start').classList.add('hidden');
  document.getElementById('quest-result').classList.add('hidden');
  document.getElementById('quest-game').classList.remove('hidden');
  loadQuestLevel();
}

function loadQuestLevel() {
  const lvl   = QUEST_LEVELS[quest.idx];
  const total = QUEST_LEVELS.length;
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const t      = (window.i18n && window.i18n.t)      ? window.i18n.t      : (k => k);
  const trL    = (window.i18n && window.i18n.QUEST_T) ? window.i18n.QUEST_T[quest.idx] : null;

  document.getElementById('quest-progress').innerHTML = QUEST_LEVELS.map((_, i) => {
    const cls = i < quest.idx ? 'done' : i === quest.idx ? 'current' : '';
    return `<div class="quest-dot ${cls}"></div>`;
  }).join('');

  const labelStr = trL ? tField(trL.label)    : lvl.label;
  const qStr     = trL ? tField(trL.question) : lvl.question;
  document.getElementById('quest-level-label').textContent =
    t('quest.levelOf').replace('{n}', quest.idx + 1).replace('{total}', total).replace('{label}', labelStr);
  document.getElementById('quest-question').textContent = qStr;

  const optsEl = document.getElementById('quest-options');
  optsEl.innerHTML = lvl.options.map((o, i) => {
    const trO = trL ? trL.options[i] : null;
    const lbl = trO ? tField(trO.label) : o.label;
    const sub = trO ? tField(trO.sub)   : o.sub;
    return `
    <button class="quest-opt" data-idx="${i}">
      <span class="quest-opt-icon">${o.icon}</span>
      <span class="quest-opt-label">${lbl}</span>
      <span class="quest-opt-sub">${sub}</span>
    </button>`;
  }).join('');
  optsEl.querySelectorAll('.quest-opt').forEach(btn => {
    btn.addEventListener('click', () => selectQuestOption(+btn.dataset.idx));
  });
}

function selectQuestOption(i) {
  const lvl = QUEST_LEVELS[quest.idx];
  const opt = lvl.options[i];
  // Store option index so badges can be re-translated later
  quest.selections.push({ levelIdx: quest.idx, optIdx: i, co2: opt.co2 });
  quest.total += opt.co2;

  document.querySelectorAll('.quest-opt').forEach((b, idx) => {
    b.classList.toggle('selected', idx === i);
    b.disabled = true;
  });

  setTimeout(() => {
    quest.idx++;
    if (quest.idx >= QUEST_LEVELS.length) showQuestReveal();
    else loadQuestLevel();
  }, 600);
}

function showQuestReveal() {
  document.getElementById('quest-game').classList.add('hidden');
  document.getElementById('quest-result').classList.remove('hidden');

  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const total = +quest.total.toFixed(1);
  const rankIdx = RANKS.findIndex(r => total < r.max);
  const rIdx = rankIdx === -1 ? RANKS.length - 1 : rankIdx;
  const rank = RANKS[rIdx];
  const rankT = (window.i18n && window.i18n.RANKS_T) ? window.i18n.RANKS_T[rIdx] : null;
  const rankName = rankT ? tField(rankT.name) : rank.name;
  const rankDesc = rankT ? tField(rankT.desc) : rank.desc;

  document.getElementById('quest-rank-name').textContent = rankName;
  document.getElementById('quest-rank-desc').textContent = rankDesc;

  const badgeEl = document.getElementById('quest-badge');
  badgeEl.textContent = rank.icon;
  badgeEl.style.background =
    total < 4  ? 'linear-gradient(135deg,#1b4332,#40916c)' :
    total < 7  ? 'linear-gradient(135deg,#2d6a4f,#74c69d)' :
    total < 11 ? 'linear-gradient(135deg,#74c69d,#b6e0ce)' :
    total < 15 ? 'linear-gradient(135deg,#f4a261,#e07a5f)' :
                 'linear-gradient(135deg,#e07a5f,#c25540)';
  // Restart the pop animation
  badgeEl.style.animation = 'none';
  void badgeEl.offsetWidth;
  badgeEl.style.animation = '';

  animateNumber(document.getElementById('quest-footprint-num'), 0, total, 900);

  // Re-translate each earned badge from the current language using QUEST_T
  const earned = quest.selections.map(s => {
    const trL = (window.i18n && window.i18n.QUEST_T) ? window.i18n.QUEST_T[s.levelIdx] : null;
    const trO = trL ? trL.options[s.optIdx] : null;
    if (trO && trO.badge) return tField(trO.badge);
    return QUEST_LEVELS[s.levelIdx].options[s.optIdx].badge;
  }).filter(Boolean);
  const finalBadges = [`${rank.icon} ${rankName}`, ...earned];
  document.getElementById('quest-badges-earned').innerHTML =
    finalBadges.map(b => `<span class="badge">${b}</span>`).join('');
}

function animateNumber(el, from, to, ms) {
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / ms, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (from + (to - from) * eased).toFixed(1);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.getElementById('quest-start-btn').addEventListener('click', startQuest);
document.getElementById('quest-retry-btn').addEventListener('click', startQuest);

// ══════════════════════════════════════════════════════════════════════════
// SHARE ECOTRACK
// ══════════════════════════════════════════════════════════════════════════
// ↓↓↓ CHANGE THIS to your live site URL once EcoTrack is hosted ↓↓↓
const SHARE_URL = 'https://fjuf14110012.github.io/Sustainability-app-/sustainability-app/';

const shareBox = document.getElementById('share-box');
const shareLinkInput = document.getElementById('share-link');
const shareStatus = document.getElementById('share-status');
shareLinkInput.value = SHARE_URL;

document.getElementById('share-ecotrack-btn').addEventListener('click', async () => {
  shareBox.classList.remove('hidden');
  shareStatus.textContent = '';
  shareBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Use the device's native share sheet when available (mobile / modern browsers)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'EcoTrack — Live Sustainably',
        text: 'Track your carbon footprint and live more sustainably with EcoTrack 🌿',
        url: SHARE_URL,
      });
      shareStatus.textContent = '✅ Thanks for sharing EcoTrack!';
    } catch (e) {
      /* user dismissed the share sheet — no action needed */
    }
  }
});

document.getElementById('copy-link-btn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(SHARE_URL);
  } catch (e) {
    shareLinkInput.select();
    document.execCommand('copy');
  }
  shareStatus.textContent = '✅ Link copied to clipboard!';
});

// ═══════════════════════════════════════════════════════════════════
// 🌍 WORLD — Live Counter, Sea Level, Stories, Activism, Corporate
// ═══════════════════════════════════════════════════════════════════

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ── Live Carbon Counter ──────────────────────────────────────────
// Per-second rates derived from annual global figures (approximate).
const LIVE_RATES = {
  co2:       1186,    // tonnes CO₂ per second  (~37.4 Gt/yr)
  forest:    0.317,   // hectares per second    (~10M ha/yr)
  plastic:   349,     // kg per second          (~11M t/yr)
  displaced: 0.73,    // people per second      (~23M/yr)
  solar:     11,      // MW per second          (~350 GW/yr)
};

let liveTimer = null;

function yearStartSeconds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return (now - start) / 1000;
}

function fmtLive(n) {
  return Math.floor(n).toLocaleString('en-US');
}

function tickLiveCounters() {
  const s = yearStartSeconds();
  Object.keys(LIVE_RATES).forEach(key => {
    const el = document.querySelector(`[data-counter="${key}"]`);
    if (el) el.textContent = fmtLive(LIVE_RATES[key] * s);
  });
}

function startLiveCounters() {
  tickLiveCounters();
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = setInterval(tickLiveCounters, 1000);
}
function stopLiveCounters() {
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null; }
}

// ── Sea Level Rise ───────────────────────────────────────────────
const SEA_LEVELS_META = [
  { temp: 1.5, riseM: 0.5 },
  { temp: 2.0, riseM: 1.0 },
  { temp: 3.0, riseM: 2.5 },
  { temp: 4.0, riseM: 5.0 },
];

const seaState = { idx: 0 };

function renderSeaLevel() {
  const headline = document.getElementById('sea-headline');
  const cities = document.getElementById('sea-cities');
  if (!headline || !cities) return;

  const meta = SEA_LEVELS_META[seaState.idx];
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const headlines = (window.i18n && window.i18n.SEA_LEVEL_T) ? window.i18n.SEA_LEVEL_T.headlines : [];
  const cityData = (window.i18n && window.i18n.SEA_LEVEL_T) ? window.i18n.SEA_LEVEL_T.cities : [];

  const slider = document.getElementById('sea-slider');
  if (slider) slider.value = seaState.idx;
  document.querySelectorAll('.sea-level-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.level, 10) === seaState.idx);
  });

  headline.innerHTML = `
    <div class="sea-temp">+${meta.temp.toFixed(1)}°C ${escapeHTML(t('sea.warming'))}</div>
    <div class="sea-rise">~${meta.riseM} m ${escapeHTML(t('sea.rise'))}</div>
    <div class="sea-desc">${escapeHTML(tField(headlines[seaState.idx]))}</div>
  `;

  const fillPct = Math.min(100, (seaState.idx + 1) * 25);
  cities.innerHTML = cityData.map(city => `
    <div class="sea-city-card" style="--fill:${fillPct}%">
      <div class="sea-city-water" style="height:${fillPct}%"></div>
      <div class="sea-city-skyline">🏙️</div>
      <div class="sea-city-info">
        <h4>${escapeHTML(tField(city.name))}</h4>
        <p>${escapeHTML(tField(city.impact[seaState.idx]))}</p>
      </div>
    </div>
  `).join('');
}

// ── Climate Refugee Stories ──────────────────────────────────────
function renderStories() {
  const wrap = document.getElementById('stories-grid');
  if (!wrap) return;
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const t      = (window.i18n && window.i18n.t)      ? window.i18n.t      : (k => k);
  const stories = (window.i18n && window.i18n.STORIES_T) ? window.i18n.STORIES_T : [];
  wrap.innerHTML = stories.map(s => `
    <article class="story-card">
      <div class="story-icon">${s.icon}</div>
      <div class="story-location">${escapeHTML(tField(s.loc))}</div>
      <h3 class="story-headline">${escapeHTML(tField(s.headline))}</h3>
      <p class="story-body">${escapeHTML(tField(s.body))}</p>
      <a class="story-link" href="${s.link}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('ref.readMore'))}</a>
    </article>
  `).join('');
}

// ── Localized Activism Finder ────────────────────────────────────
// Verified, real climate / environmental groups active in major cities.
// Each entry's URL is the group's official site.
const CITY_ACTIVISM = {
  paris: {
    labelKey: 'act.city.paris',
    flag: '🇫🇷',
    groups: [
      { name: 'Alternatiba Paris',         url: 'https://alternatiba.eu/paris/',
        what: { en: 'Citizen movement organising the Paris Climate Village and local transition actions.',
                fr: 'Mouvement citoyen organisant le Village des alternatives et des actions de transition.',
                'zh-CN': '组织巴黎气候村和本地转型行动的公民运动。',
                'zh-TW': '組織巴黎氣候村和本地轉型行動的公民運動。' } },
      { name: 'Extinction Rebellion France', url: 'https://extinctionrebellion.fr/',
        what: { en: 'Non-violent civil disobedience network with an active Paris group.',
                fr: 'Réseau de désobéissance civile non-violente, groupe parisien actif.',
                'zh-CN': '在巴黎活跃的非暴力公民抗命网络。',
                'zh-TW': '在巴黎活躍的非暴力公民抗命網絡。' } },
      { name: 'Les Amis de la Terre France', url: 'https://www.amisdelaterre.org/',
        what: { en: 'French chapter of Friends of the Earth — HQ in Montreuil, campaigns across Île-de-France.',
                fr: 'Branche française des Amis de la Terre, basée à Montreuil, campagnes en Île-de-France.',
                'zh-CN': '地球之友法国分会，总部蒙特勒伊。',
                'zh-TW': '地球之友法國分會，總部蒙特勒伊。' } },
      { name: 'Greenpeace France',         url: 'https://www.greenpeace.fr/',
        what: { en: 'National Greenpeace office with a Paris volunteer group running outreach and street actions.',
                fr: 'Bureau national avec un groupe local parisien actif.',
                'zh-CN': '绿色和平法国办公室，巴黎志愿小组开展街头行动。',
                'zh-TW': '綠色和平法國辦公室，巴黎志願小組開展街頭行動。' } },
    ],
  },
  ny: {
    labelKey: 'act.city.ny',
    flag: '🇺🇸',
    groups: [
      { name: 'WE ACT for Environmental Justice', url: 'https://www.weact.org/',
        what: { en: 'Harlem-based environmental justice org working on air quality, housing and climate policy.',
                fr: 'ONG de justice environnementale basée à Harlem (air, logement, climat).',
                'zh-CN': '总部哈林区的环境正义组织，关注空气、住房与气候政策。',
                'zh-TW': '總部哈林區的環境正義組織，關注空氣、住房與氣候政策。' } },
      { name: 'Transportation Alternatives',  url: 'https://www.transalt.org/',
        what: { en: 'Campaigns for safer streets, more bike lanes and less car traffic across NYC boroughs.',
                fr: 'Campagne pour des rues sûres, plus de pistes cyclables et moins de voitures à NYC.',
                'zh-CN': '推动纽约各区更安全街道、更多自行车道、减少车流。',
                'zh-TW': '推動紐約各區更安全街道、更多自行車道、減少車流。' } },
      { name: 'Sunrise Movement NYC',          url: 'https://www.sunrisemovement.org/hubs/',
        what: { en: 'Youth-led climate movement; NYC hubs lead Green New Deal organising and lobbying.',
                fr: 'Mouvement climat jeunesse ; les groupes NYC militent pour un Green New Deal.',
                'zh-CN': '青年主导的气候运动，纽约小组推动绿色新政。',
                'zh-TW': '青年主導的氣候運動，紐約小組推動綠色新政。' } },
      { name: 'NYC Audubon',                   url: 'https://www.nycaudubon.org/',
        what: { en: 'Protects the city\'s wild birds and habitats — runs cleanups, bird walks and Lights Out NYC.',
                fr: 'Protège les oiseaux et habitats urbains ; nettoyages, balades, Lights Out NYC.',
                'zh-CN': '保护纽约野生鸟类与栖地，举办清洁、观鸟与“熄灯”行动。',
                'zh-TW': '保護紐約野生鳥類與棲地，舉辦清潔、觀鳥與「熄燈」行動。' } },
    ],
  },
  london: {
    labelKey: 'act.city.london',
    flag: '🇬🇧',
    groups: [
      { name: 'Extinction Rebellion UK', url: 'https://extinctionrebellion.uk/',
        what: { en: 'UK arm of XR — the most active London-based climate civil-disobedience network.',
                fr: 'Branche britannique d\'XR, principal réseau climatique londonien.',
                'zh-CN': 'XR 英国分会，伦敦最活跃的气候公民抗命网络。',
                'zh-TW': 'XR 英國分會，倫敦最活躍的氣候公民抗命網絡。' } },
      { name: 'London Wildlife Trust',  url: 'https://www.wildlondon.org.uk/',
        what: { en: 'Runs nature reserves and habitat-restoration volunteer days across Greater London.',
                fr: 'Gère des réserves naturelles et journées bénévoles dans le Grand Londres.',
                'zh-CN': '在大伦敦地区管理自然保护区与栖地修复志愿日。',
                'zh-TW': '在大倫敦地區管理自然保護區與棲地修復志願日。' } },
      { name: 'Just Stop Oil',          url: 'https://juststopoil.org/',
        what: { en: 'UK direct-action campaign demanding an end to new oil and gas licences.',
                fr: 'Campagne britannique d\'action directe contre les nouvelles licences pétro-gazières.',
                'zh-CN': '英国直接行动运动，反对新油气许可。',
                'zh-TW': '英國直接行動運動，反對新油氣許可。' } },
      { name: 'Greenpeace UK',          url: 'https://www.greenpeace.org.uk/',
        what: { en: 'UK Greenpeace HQ in Islington — campaigns, volunteer groups, and weekly London events.',
                fr: 'Siège britannique à Islington — campagnes et groupes bénévoles londoniens.',
                'zh-CN': '绿色和平英国总部位于伊斯灵顿，每周有伦敦活动。',
                'zh-TW': '綠色和平英國總部位於伊斯靈頓，每週有倫敦活動。' } },
    ],
  },
  berlin: {
    labelKey: 'act.city.berlin',
    flag: '🇩🇪',
    groups: [
      { name: 'Fridays for Future Berlin', url: 'https://fridaysforfuture.de/',
        what: { en: 'Berlin chapter of the global youth climate strike movement.',
                fr: 'Antenne berlinoise du mouvement mondial de grève climatique étudiante.',
                'zh-CN': '全球青年气候罢课运动的柏林分支。',
                'zh-TW': '全球青年氣候罷課運動的柏林分支。' } },
      { name: 'BUND Berlin',               url: 'https://www.bund-berlin.de/',
        what: { en: 'Berlin state branch of BUND (Friends of the Earth Germany) — cycling, energy, biodiversity.',
                fr: 'Section berlinoise du BUND (Amis de la Terre Allemagne).',
                'zh-CN': '德国 BUND（地球之友）柏林州分会。',
                'zh-TW': '德國 BUND（地球之友）柏林州分會。' } },
      { name: 'Letzte Generation',         url: 'https://letztegeneration.org/',
        what: { en: 'German civil-resistance group; Berlin is its main organising base.',
                fr: 'Groupe allemand de résistance civile, principalement basé à Berlin.',
                'zh-CN': '德国公民抵抗团体，柏林为主要据点。',
                'zh-TW': '德國公民抵抗團體，柏林為主要據點。' } },
      { name: 'Ende Gelände',              url: 'https://www.ende-gelaende.org/',
        what: { en: 'Coal-exit mass-action alliance organised partly from Berlin.',
                fr: 'Alliance d\'action de masse pour la sortie du charbon, organisée en partie depuis Berlin.',
                'zh-CN': '反煤大型行动联盟，部分活动由柏林组织。',
                'zh-TW': '反煤大型行動聯盟，部分活動由柏林組織。' } },
    ],
  },
  taipei: {
    labelKey: 'act.city.taipei',
    flag: '🇹🇼',
    groups: [
      { name: 'Citizen of the Earth Taiwan (CET)', url: 'https://www.cet-taiwan.org/',
        what: { en: 'National environmental NGO with a Taipei office — energy, water, and air-quality advocacy.',
                fr: 'ONG environnementale nationale, bureau à Taipei (énergie, eau, qualité de l\'air).',
                'zh-CN': '地球公民基金会，台北办公室，关注能源、水与空气品质。',
                'zh-TW': '地球公民基金會，台北辦公室，關注能源、水與空氣品質。' } },
      { name: 'Green Citizens\' Action Alliance',  url: 'https://www.gcaa.org.tw/',
        what: { en: 'Taipei-based NGO focused on nuclear, energy transition and corporate transparency.',
                fr: 'ONG basée à Taipei sur le nucléaire, la transition énergétique et la transparence.',
                'zh-CN': '总部台北，关注核能、能源转型与企业透明度。',
                'zh-TW': '總部台北，關注核能、能源轉型與企業透明度。' } },
      { name: 'Society of Wilderness',             url: 'https://www.sow.org.tw/',
        what: { en: 'Taiwan\'s biggest grassroots conservation group; Taipei chapter runs habitat workdays.',
                fr: 'Plus grande ONG taïwanaise de conservation ; section Taipei active sur les habitats.',
                'zh-CN': '台湾最大的草根保育团体，台北分会举办栖地工作日。',
                'zh-TW': '台灣最大的草根保育團體，台北分會舉辦棲地工作日。' } },
      { name: 'Taiwan Environmental Info Assoc.',  url: 'https://e-info.org.tw/',
        what: { en: 'Runs Taiwan\'s leading environmental news desk plus Taipei volunteer monitoring programmes.',
                fr: 'Principal site d\'actualités environnementales taïwanais et programmes de bénévoles à Taipei.',
                'zh-CN': '台湾主要环境新闻平台，并组织台北志愿监测活动。',
                'zh-TW': '台灣主要環境新聞平台，並組織台北志願監測活動。' } },
    ],
  },
};

let lastActivismCity = '';

function renderActivism(cityId) {
  const wrap = document.getElementById('activism-results');
  if (!wrap) return;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const lang = (window.i18n && window.i18n.getLang) ? window.i18n.getLang() : 'en';
  const id = (cityId || '').trim();
  lastActivismCity = id;

  if (!id || !CITY_ACTIVISM[id]) {
    wrap.innerHTML = `<div class="activism-prompt">${escapeHTML(t('act.prompt'))}</div>`;
    return;
  }

  // Visual state on buttons
  document.querySelectorAll('.activism-city-btn').forEach(b => {
    b.classList.toggle('is-active', b.dataset.city === id);
  });

  const city = CITY_ACTIVISM[id];
  const cityLabel = t(city.labelKey);
  const visit = t('act.visit');

  wrap.innerHTML = `
    <div class="activism-banner">
      <strong>${escapeHTML(t('act.banner'))} ${escapeHTML(cityLabel)}</strong>
      <span>${escapeHTML(t('act.intro'))}</span>
    </div>
    <div class="activism-grid">
      ${city.groups.map(g => `
        <div class="activism-card">
          <div class="activism-icon">${city.flag}</div>
          <h4>${escapeHTML(g.name)}</h4>
          <p>${escapeHTML(g.what[lang] || g.what.en)}</p>
          <div class="activism-links">
            <a href="${g.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(visit)} →</a>
          </div>
        </div>
      `).join('')}
    </div>
    <p class="activism-tip">${escapeHTML(t('act.disclaimer'))}</p>
  `;
}

// ── Corporate Accountability Tracker ─────────────────────────────
// Grades are illustrative composites of public reporting (CDP, Climate Action 100+,
// NewClimate, InfluenceMap) — not official ratings.
const COMPANIES = [
  { name: 'Patagonia',       sector: 'Apparel',    grade: 'A', pledge: 'Net-zero by 2025',                 note: '1% for the planet; owns its supply chain audits.' },
  { name: 'Ørsted',          sector: 'Energy',     grade: 'A', pledge: 'Carbon-neutral by 2025',           note: 'Pivoted from oil/gas to 90% renewables since 2009.' },
  { name: 'Microsoft',       sector: 'Tech',       grade: 'B', pledge: 'Carbon-negative by 2030',          note: 'Buying carbon removal at scale; data-center water use rising.' },
  { name: 'Unilever',        sector: 'Consumer',   grade: 'B', pledge: 'Net-zero by 2039',                 note: 'Strong disclosure; recent backslide on plastics targets.' },
  { name: 'Apple',           sector: 'Tech',       grade: 'B', pledge: 'Net-zero supply chain by 2030',    note: 'Renewable-powered operations; repair restrictions criticized.' },
  { name: 'IKEA',            sector: 'Retail',     grade: 'B', pledge: 'Climate-positive by 2030',         note: 'Real progress on materials; volume growth offsets gains.' },
  { name: 'Tesla',           sector: 'Auto',       grade: 'C', pledge: 'No formal target',                 note: 'Mission-aligned product; weak transparency, no Scope 3 plan.' },
  { name: 'Amazon',          sector: 'Tech',       grade: 'C', pledge: 'Net-zero by 2040',                 note: 'Climate Pledge co-author; emissions still rising YoY.' },
  { name: 'Walmart',         sector: 'Retail',     grade: 'C', pledge: 'Zero emissions by 2040',           note: 'Project Gigaton ambitious; supplier verification thin.' },
  { name: 'Coca-Cola',       sector: 'Consumer',   grade: 'C', pledge: '25% reusable packaging by 2030',   note: 'Top global plastic polluter (Break Free From Plastic).' },
  { name: 'Nestlé',          sector: 'Consumer',   grade: 'C', pledge: 'Net-zero by 2050',                 note: 'Deforestation in palm/cocoa supply chains persists.' },
  { name: 'JPMorgan Chase',  sector: 'Finance',    grade: 'D', pledge: 'Net-zero financed by 2050',        note: 'Top fossil-fuel financier globally since Paris Agreement.' },
  { name: 'Shell',           sector: 'Energy',     grade: 'D', pledge: 'Net-zero by 2050',                 note: 'Walked back 2030 targets; heavy fossil lobbying via trade groups.' },
  { name: 'BP',              sector: 'Energy',     grade: 'D', pledge: 'Net-zero by 2050',                 note: 'Cut emissions target from 35% to 20–30% by 2030 in 2023.' },
  { name: 'Boeing',          sector: 'Industrial', grade: 'D', pledge: 'Net-zero ops by 2050',             note: 'Aviation Scope 3 unaddressed; lobbies against fuel-efficiency rules.' },
  { name: 'ExxonMobil',      sector: 'Energy',     grade: 'F', pledge: 'Scope 1+2 net-zero by 2050',       note: 'Decades of documented climate denial; Scope 3 excluded.' },
  { name: 'Chevron',         sector: 'Energy',     grade: 'F', pledge: 'Carbon intensity cuts only',       note: 'Heavy lobbying; offset projects flagged as ineffective.' },
  { name: 'Saudi Aramco',    sector: 'Energy',     grade: 'F', pledge: 'Net-zero ops by 2050',             note: "World's largest corporate emitter; expanding production." },
  { name: 'Glencore',        sector: 'Mining',     grade: 'F', pledge: 'Net-zero by 2050',                 note: 'Largest coal exporter; recently expanded coal production.' },
  { name: 'Koch Industries', sector: 'Industrial', grade: 'F', pledge: 'No public target',                 note: 'Funded climate-denial think tanks for decades.' },
  // Taiwan 🇹🇼
  { name: 'TSMC',                sector: 'Semiconductors 🇹🇼', grade: 'B', pledge: '100% renewable by 2040, net-zero by 2050', note: 'First Asian semi to join RE100; uses 7%+ of all Taiwan electricity and 200,000 t of water per day.' },
  { name: 'Delta Electronics',   sector: 'Electronics 🇹🇼',    grade: 'A', pledge: 'RE100 + carbon-neutral by 2030',           note: 'CDP A-list for 7 straight years; builds LEED-certified green factories worldwide.' },
  { name: 'ASUS',                sector: 'Tech 🇹🇼',           grade: 'B', pledge: 'Net-zero by 2050, RE100 by 2035',          note: 'Strong product take-back & repair program; supply-chain emissions still rising.' },
  { name: 'Foxconn (Hon Hai)',   sector: 'Electronics 🇹🇼',    grade: 'C', pledge: 'Net-zero by 2050',                         note: "World's largest contract manufacturer; pace of decarbonisation criticised by investors." },
  { name: 'Taipower',            sector: 'Energy (state) 🇹🇼', grade: 'D', pledge: 'Net-zero by 2050 (state goal)',            note: 'State utility still ~80% fossil-fuelled; massive coal + LNG baseload.' },
  { name: 'CPC Corporation',     sector: 'Oil & Gas (state) 🇹🇼', grade: 'F', pledge: 'Net-zero ops by 2050',                  note: 'Taiwan state oil & gas firm; refineries cited for repeated air-pollution violations.' },
  { name: 'Formosa Plastics',    sector: 'Petrochemicals 🇹🇼', grade: 'F', pledge: 'Net-zero ops by 2050',                     note: 'Vietnam toxic-spill scandal 2016; ongoing PFAS & dioxin contamination in Yunlin.' },
];

const corpState = { search: '', filter: 'all' };

function corpMatchesFilter(c) {
  if (corpState.filter === 'all') return true;
  if (corpState.filter === 'D-F') return c.grade === 'D' || c.grade === 'F';
  return c.grade === corpState.filter;
}

function renderCorporate() {
  const grid = document.getElementById('corp-grid');
  if (!grid) return;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const q = corpState.search.toLowerCase().trim();
  const list = COMPANIES.filter(c => {
    if (!corpMatchesFilter(c)) return false;
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q);
  });
  document.querySelectorAll('.corp-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === corpState.filter);
  });
  if (!list.length) {
    grid.innerHTML = `<p class="corp-empty">${escapeHTML(t('corp.empty'))}</p>`;
    return;
  }
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const CORP_T = (window.i18n && window.i18n.CORP_T) ? window.i18n.CORP_T : null;
  grid.innerHTML = list.map(c => {
    const idx = COMPANIES.indexOf(c);
    const tr  = CORP_T ? CORP_T[idx] : null;
    const pledge = tr ? tField(tr.pledge) : c.pledge;
    const note   = tr ? tField(tr.note)   : c.note;
    return `
    <div class="corp-card">
      <div class="corp-card-head">
        <div class="grade-badge grade-${c.grade.toLowerCase()}">${c.grade}</div>
        <div>
          <h4 class="corp-name">${escapeHTML(c.name)}</h4>
          <div class="corp-sector">${escapeHTML(c.sector)}</div>
        </div>
      </div>
      <div class="corp-pledge"><strong>${escapeHTML(t('corp.pledge'))}</strong> ${escapeHTML(pledge)}</div>
      <p class="corp-note">${escapeHTML(note)}</p>
    </div>`;
  }).join('');
}

// ── Laws & Policies ───────────────────────────────────────────────
const POLICIES = [
  // Global treaties
  { id: 'paris',    name: 'Paris Agreement',                 year: 2015, region: 'global', flag: '🌍', jurisdiction: 'United Nations',
    summary: 'Legally binding international treaty on climate change. Aims to limit global warming to well below 2°C, ideally 1.5°C, above pre-industrial levels.' },
  { id: 'kyoto',    name: 'Kyoto Protocol',                  year: 1997, region: 'global', flag: '🌍', jurisdiction: 'United Nations',
    summary: 'First treaty to set binding emissions reduction targets for developed countries. Introduced carbon trading and the Clean Development Mechanism.' },
  { id: 'montreal', name: 'Montreal Protocol',               year: 1987, region: 'global', flag: '🌍', jurisdiction: 'United Nations',
    summary: 'Universally ratified treaty that phased out ozone-depleting substances. Considered the most successful environmental agreement in history.' },
  { id: 'cbd',      name: 'Convention on Biological Diversity', year: 1992, region: 'global', flag: '🌍', jurisdiction: 'United Nations',
    summary: 'International treaty to conserve biodiversity, ensure sustainable use of its components, and share benefits arising from genetic resources fairly.' },
  { id: 'basel',    name: 'Basel Convention',                year: 1989, region: 'global', flag: '🌍', jurisdiction: 'United Nations',
    summary: 'Controls trans-boundary movements of hazardous waste. The 2019 plastic amendment regulates global trade in plastic waste.' },

  // Europe
  { id: 'eu-greendeal', name: 'European Green Deal',         year: 2019, region: 'eu', flag: '🇪🇺', jurisdiction: 'European Union',
    summary: 'EU growth strategy aiming to make Europe the first climate-neutral continent by 2050, with a 55% emissions cut by 2030.' },
  { id: 'eu-ets',   name: 'EU Emissions Trading System (ETS)', year: 2005, region: 'eu', flag: '🇪🇺', jurisdiction: 'European Union',
    summary: "World's first and largest carbon market. Caps emissions from power plants, factories and airlines and lets them trade allowances." },
  { id: 'eu-cbam',  name: 'EU Carbon Border Adjustment Mechanism (CBAM)', year: 2023, region: 'eu', flag: '🇪🇺', jurisdiction: 'European Union',
    summary: 'Tariff on imports of carbon-intensive goods (steel, cement, fertiliser, aluminium…) to prevent carbon leakage and level the playing field.' },
  { id: 'eu-sup',   name: 'EU Single-Use Plastics Directive', year: 2019, region: 'eu', flag: '🇪🇺', jurisdiction: 'European Union',
    summary: 'Bans the 10 single-use plastic items most found on EU beaches (straws, cutlery, plates, cotton buds…) and sets recycled-content targets for bottles.' },
  { id: 'uk-cca',   name: 'Climate Change Act',              year: 2008, region: 'eu', flag: '🇬🇧', jurisdiction: 'United Kingdom',
    summary: 'First law in the world to set legally binding long-term emissions targets. Amended in 2019 to require net zero by 2050.' },
  { id: 'de-eeg',   name: 'Renewable Energy Sources Act (EEG)', year: 2000, region: 'eu', flag: '🇩🇪', jurisdiction: 'Germany',
    summary: 'Pioneering feed-in tariff law that guaranteed prices for renewable electricity. Drove the global solar boom and the Energiewende.' },
  { id: 'fr-agec',  name: 'Anti-Waste & Circular Economy Law (AGEC)', year: 2020, region: 'eu', flag: '🇫🇷', jurisdiction: 'France',
    summary: 'Bans destruction of unsold non-food goods, phases out single-use plastics by 2040, and forces a repairability index on electronics.' },
  { id: 'se-tax',   name: 'Carbon Tax',                      year: 1991, region: 'eu', flag: '🇸🇪', jurisdiction: 'Sweden',
    summary: "One of the world's first and highest carbon taxes (~€115/tonne). Cut emissions while the economy doubled in size." },
  { id: 'no-ev',    name: 'Electric Vehicle Incentives',     year: 1990, region: 'eu', flag: '🇳🇴', jurisdiction: 'Norway',
    summary: 'Decades of tax exemptions, free tolls and parking for EVs made Norway the world leader: over 80% of new cars sold are now electric.' },
  { id: 'dk-cact',  name: 'Climate Act',                     year: 2020, region: 'eu', flag: '🇩🇰', jurisdiction: 'Denmark',
    summary: 'Legally binds Denmark to cut emissions 70% by 2030 vs. 1990 — one of the most ambitious national targets in the world.' },

  // North America
  { id: 'us-ira',   name: 'Inflation Reduction Act (IRA)',   year: 2022, region: 'na', flag: '🇺🇸', jurisdiction: 'United States',
    summary: "Largest climate investment in US history: ~$369B in tax credits and subsidies for clean energy, EVs, batteries and domestic manufacturing." },
  { id: 'us-caa',   name: 'Clean Air Act',                   year: 1970, region: 'na', flag: '🇺🇸', jurisdiction: 'United States',
    summary: 'Foundational US law regulating air pollution. Cut major pollutants by ~78% while GDP grew. Basis for federal CO₂ regulation.' },
  { id: 'ca-gghg',  name: 'Greenhouse Gas Pollution Pricing Act', year: 2018, region: 'na', flag: '🇨🇦', jurisdiction: 'Canada',
    summary: 'National carbon-pricing backstop that applies in any province without an equivalent system. Revenue is returned to households.' },

  // Asia
  { id: 'cn-dual',  name: 'Dual Carbon Goals',               year: 2020, region: 'asia', flag: '🇨🇳', jurisdiction: 'China',
    summary: "President Xi's pledge to peak CO₂ before 2030 and reach carbon neutrality before 2060. Drives the world's largest solar & EV build-out." },
  { id: 'kr-ets',   name: 'Korea Emissions Trading Scheme (K-ETS)', year: 2015, region: 'asia', flag: '🇰🇷', jurisdiction: 'South Korea',
    summary: "Asia's first nationwide mandatory cap-and-trade system. Covers ~74% of national emissions across power, industry and aviation." },
  { id: 'jp-tr',    name: 'Top Runner Program',              year: 1998, region: 'asia', flag: '🇯🇵', jurisdiction: 'Japan',
    summary: 'Sets efficiency standards for appliances and vehicles based on the best product on the market, forcing the rest of the industry to catch up.' },
  { id: 'in-napcc', name: 'National Action Plan on Climate Change', year: 2008, region: 'asia', flag: '🇮🇳', jurisdiction: 'India',
    summary: 'Umbrella strategy of 8 missions including the National Solar Mission, which helped scale Indian solar from <20 MW to over 80 GW.' },
  { id: 'bt-const', name: 'Constitutional Carbon-Negative Pledge', year: 2008, region: 'asia', flag: '🇧🇹', jurisdiction: 'Bhutan',
    summary: 'Constitution mandates that at least 60% of land remains forested. Bhutan absorbs more CO₂ than it emits — the world\u2019s only carbon-negative country.' },

  // Africa
  { id: 'rw-plastic', name: 'Plastic Bag Ban',               year: 2008, region: 'africa', flag: '🇷🇼', jurisdiction: 'Rwanda',
    summary: "One of the world's strictest plastic bans. Extended in 2019 to all single-use plastics. Bags are confiscated at the border." },
  { id: 'ke-plastic', name: 'Plastic Bag Ban',               year: 2017, region: 'africa', flag: '🇰🇪', jurisdiction: 'Kenya',
    summary: 'Carries fines up to $38,000 or 4 years prison for producing or importing plastic bags — among the toughest penalties in the world.' },
  { id: 'za-ct',    name: 'Carbon Tax Act',                  year: 2019, region: 'africa', flag: '🇿🇦', jurisdiction: 'South Africa',
    summary: "Africa's first comprehensive carbon tax. Covers a coal-heavy economy and is being phased in with rising rates through 2030." },

  // Latin America
  { id: 'cr-decarb', name: 'National Decarbonization Plan',   year: 2019, region: 'la', flag: '🇨🇷', jurisdiction: 'Costa Rica',
    summary: 'Roadmap to a net-zero economy by 2050. Costa Rica already runs on ~99% renewable electricity and has reversed deforestation since the 1980s.' },
  { id: 'br-forest', name: 'Forest Code',                     year: 2012, region: 'la', flag: '🇧🇷', jurisdiction: 'Brazil',
    summary: 'Requires rural landowners to preserve a percentage of native vegetation (up to 80% in the Amazon). Central tool against deforestation.' },
  { id: 'cl-fwl',    name: 'Framework Law on Climate Change', year: 2022, region: 'la', flag: '🇨🇱', jurisdiction: 'Chile',
    summary: 'Legally enshrines carbon neutrality by 2050 and gives subnational governments climate-action duties — a first in Latin America.' },

  // Oceania
  { id: 'nz-zca',   name: 'Zero Carbon Act',                 year: 2019, region: 'oc', flag: '🇳🇿', jurisdiction: 'New Zealand',
    summary: 'Commits New Zealand to net-zero greenhouse gases (excl. biogenic methane) by 2050 and creates an independent Climate Change Commission.' },
  { id: 'au-ret',   name: 'Renewable Energy Target (RET)',   year: 2001, region: 'oc', flag: '🇦🇺', jurisdiction: 'Australia',
    summary: 'Drove deployment of 33,000 GWh/yr of renewable electricity by 2020 — equivalent to powering ~6 million homes with clean energy.' },

  // Taiwan 🇹🇼
  { id: 'tw-ccra',  name: 'Climate Change Response Act',      year: 2023, region: 'asia', flag: '🇹🇼', jurisdiction: 'Taiwan',
    summary: 'Replaces the 2015 Greenhouse Gas Reduction Act. Legally enshrines net-zero by 2050, introduces a carbon fee on heavy emitters from 2024, and creates a national Climate Change Committee chaired by the Premier.' },
  { id: 'tw-reda',  name: 'Renewable Energy Development Act', year: 2009, region: 'asia', flag: '🇹🇼', jurisdiction: 'Taiwan',
    summary: 'Foundation of Taiwan\'s feed-in tariff system. The 2019 amendment requires large electricity users (>5 MW contract capacity) to install renewables, buy green power, or pay into a renewables fund.' },
  { id: 'tw-plastic', name: 'Single-Use Plastics Restrictions', year: 2002, region: 'asia', flag: '🇹🇼', jurisdiction: 'Taiwan',
    summary: 'Phased ban on free plastic bags, disposable cutlery, straws and cups in restaurants and retail. Goal: full single-use plastic phase-out by 2030 — among the most ambitious in Asia.' },
  { id: 'tw-offshore', name: 'Offshore Wind Programme',         year: 2018, region: 'asia', flag: '🇹🇼', jurisdiction: 'Taiwan',
    summary: 'Auctions allocating 5.7 GW of offshore wind by 2025 and a further 15 GW by 2035, making Taiwan the largest offshore-wind market in Asia outside mainland China.' },
];

const policyState = { search: '', filter: 'all' };

function renderPolicy() {
  const grid = document.getElementById('policy-grid');
  if (!grid) return;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const POLICIES_T = (window.i18n && window.i18n.POLICIES_T) ? window.i18n.POLICIES_T : null;
  const q = policyState.search.toLowerCase().trim();
  const list = POLICIES.filter(p => {
    if (policyState.filter !== 'all' && p.region !== policyState.filter) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q)
        || p.jurisdiction.toLowerCase().includes(q)
        || String(p.year).includes(q);
  });
  document.querySelectorAll('.policy-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === policyState.filter);
  });
  if (!list.length) {
    grid.innerHTML = `<p class="policy-empty">${escapeHTML(t('policy.empty'))}</p>`;
    return;
  }
  grid.innerHTML = list.map(p => {
    const idx = POLICIES.indexOf(p);
    const tr  = POLICIES_T ? POLICIES_T[idx] : null;
    const name    = tr ? tField(tr.name)    : p.name;
    const jur     = tr ? tField(tr.jurisdiction) : p.jurisdiction;
    const summary = tr ? tField(tr.summary) : p.summary;
    const regionLabel = t('policy.region.' + p.region);
    return `
    <div class="policy-card">
      <div class="policy-card-head">
        <div class="policy-flag">${p.flag}</div>
        <div class="policy-title-wrap">
          <h4 class="policy-name">${escapeHTML(name)}</h4>
          <div class="policy-jur">${escapeHTML(jur)}</div>
        </div>
      </div>
      <div class="policy-meta">
        <span class="policy-year">${p.year}</span>
        <span class="policy-region">${escapeHTML(regionLabel)}</span>
      </div>
      <p class="policy-summary">${escapeHTML(summary)}</p>
    </div>`;
  }).join('');
}

// ── Join Associations ─────────────────────────────────────────────
// Curated: only organisations headquartered in major world cities.
const ASSOCIATIONS = [
  // International
  { id: 'greenpeace',          icon: '🟢', founded: 1971, scope: 'international', url: 'https://www.greenpeace.org/',
    name: 'Greenpeace', region: 'Amsterdam 🇳🇱 (global)',
    cause: 'Climate, oceans, forests and non-violent direct action.',
    what:  'Independent global campaigning network using non-violent creative confrontation to expose environmental problems and force solutions.',
    why:   'Funded only by individuals — no government or corporate money — so it can confront polluters without conflicts of interest.',
    how:   'Sign petitions, donate monthly, or join a local volunteer / action team via greenpeace.org.' },
  { id: '350',                  icon: '🌡️', founded: 2008, scope: 'international', url: 'https://350.org/',
    name: '350.org', region: 'New York 🇺🇸 (global)',
    cause: 'Ending fossil fuels and driving the renewable energy transition.',
    what:  'Grassroots climate movement named after the safe upper limit of atmospheric CO₂ (350 ppm). Organises mass mobilisations and divestment campaigns in 188 countries.',
    why:   'Pioneered the global fossil-fuel divestment movement — over $40 trillion now committed.',
    how:   'Find a local group on 350.org, join a divestment campaign or train as an organiser.' },
  { id: 'sierraclub',           icon: '🏔️', founded: 1892, scope: 'international', url: 'https://www.sierraclub.org/',
    name: 'Sierra Club', region: 'San Francisco 🇺🇸',
    cause: 'Protecting wild places, transitioning off coal and environmental justice.',
    what:  'America\'s oldest grassroots environmental organisation. Famous for the \u201CBeyond Coal\u201D campaign that shut hundreds of US coal plants.',
    why:   'Highly effective on US energy policy. Combines outings, advocacy and lobbying.',
    how:   'Join a local chapter — almost every US city has one — for hikes, clean-ups and campaigns.' },
  { id: 'xr',                   icon: '⏳', founded: 2018, scope: 'international', url: 'https://rebellion.global/',
    name: 'Extinction Rebellion (XR)', region: 'London 🇬🇧 (global)',
    cause: 'Forcing governments to act on the climate and ecological emergency.',
    what:  'Non-violent civil-disobedience movement in 70+ countries demanding governments tell the truth, act now and create citizens\' assemblies.',
    why:   'Visible, disruptive tactics that put climate on front pages and force policy debates.',
    how:   'Find a local group at rebellion.global; trainings on non-violent direct action are free and open to anyone.' },
  { id: 'rainforest-alliance',  icon: '🐸', founded: 1987, scope: 'international', url: 'https://www.rainforest-alliance.org/',
    name: 'Rainforest Alliance', region: 'New York 🇺🇸 (60+ countries)',
    cause: 'Sustainable tropical agriculture and protection of rainforests.',
    what:  'Certifies farms (the little green frog seal on coffee, bananas, cocoa) that meet environmental and worker-rights standards.',
    why:   'Helps 2 million+ smallholder farmers earn more while protecting forests.',
    how:   'Look for green-frog certified products; donate; or apply for agronomy / volunteer roles at rainforest-alliance.org.' },

  // National (capital / major city HQ)
  { id: 'sunrise',              icon: '🌅', founded: 2017, scope: 'national', url: 'https://www.sunrisemovement.org/',
    name: 'Sunrise Movement', region: 'Washington, DC 🇺🇸',
    cause: 'A Green New Deal and good jobs in the energy transition.',
    what:  'Youth-led political movement that helped force the Green New Deal onto the US national agenda.',
    why:   'Trains young people to run for office and pressures politicians to take bold climate action.',
    how:   'Find or start a \u201Chub\u201D at sunrisemovement.org; training programmes are free.' },
  { id: 'fne',                  icon: '🌿', founded: 1968, scope: 'national', url: 'https://fne.asso.fr/',
    name: 'France Nature Environnement', region: 'Paris 🇫🇷',
    cause: 'Biodiversity, water, climate, pesticides and circular economy.',
    what:  'Federation of 6,200 French environmental associations. Takes polluters to court and engages in national policy.',
    why:   'France\'s biggest environmental network, with strong legal expertise.',
    how:   'Join a local association via fne.asso.fr or volunteer in regional campaigns.' },
  { id: 'bund',                 icon: '🌲', founded: 1975, scope: 'national', url: 'https://www.bund.net/',
    name: 'BUND (Friends of the Earth Germany)', region: 'Berlin 🇩🇪',
    cause: 'Nature conservation, climate, agriculture and chemical policy.',
    what:  'Germany\'s most active environmental NGO, with 670,000+ supporters across 2,000 local groups.',
    why:   'Drove the German nuclear phase-out and shapes EU chemical regulations.',
    how:   'Join a local \u201COrtsgruppe\u201D via bund.net; clean-ups, working groups and political action.' },
  { id: 'acf',                  icon: '🦘', founded: 1966, scope: 'national', url: 'https://www.acf.org.au/',
    name: 'Australian Conservation Foundation', region: 'Melbourne 🇦🇺',
    cause: 'Coral reefs, climate, native species and First Nations partnerships.',
    what:  'Australia\'s largest national environmental advocacy NGO. Campaigns on the Great Barrier Reef, coal exports and First Nations rights.',
    why:   'Independent, member-funded voice in a coal-export economy.',
    how:   'Become a member, take part in community-organising training, or join a local action group at acf.org.au.' },

  // Youth
  { id: 'fff',                  icon: '👧', founded: 2018, scope: 'youth', url: 'https://fridaysforfuture.org/',
    name: 'Fridays for Future', region: 'Stockholm 🇸🇪 (global)',
    cause: 'Climate action — listen to the science.',
    what:  'Youth climate-strike movement started by Greta Thunberg outside the Swedish parliament. Now in 7,500+ cities.',
    why:   'Decentralised, leaderless and student-driven. Anyone can start a strike.',
    how:   'Register a school strike on fridaysforfuture.org, or join an upcoming Global Climate Strike.' },

  // Taiwan 🇹🇼 — Taipei
  { id: 'cet-taiwan',           icon: '🌏', founded: 2007, scope: 'national', url: 'https://www.cet-taiwan.org/',
    name: 'Citizens of the Earth Taiwan (地球公民基金會)', region: 'Taipei 🇹🇼',
    cause: 'Energy transition, anti-pollution and protection of Taiwan\'s mountains, rivers and coasts.',
    what:  'Public-interest foundation campaigning against coal, petrochemicals and illegal land-use; pushes Taiwan\'s net-zero policy.',
    why:   'Best-resourced grassroots environmental NGO in Taiwan; major force behind the Climate Change Response Act.',
    how:   'Donate, volunteer or attend public hearings via cet-taiwan.org. English content available.' },
  { id: 'sow-taiwan',           icon: '🌿', founded: 1995, scope: 'national', url: 'https://www.sow.org.tw/',
    name: 'Society of Wilderness (荒野保護協會)', region: 'Taipei 🇹🇼',
    cause: 'Habitat conservation through citizen volunteering across Taiwan\'s ecosystems.',
    what:  'Runs 20+ local chapters managing wetlands, forests and coastal cleanups; trains thousands of volunteer nature interpreters every year.',
    why:   'Largest volunteer-based conservation network in Taiwan — accessible nature-protection work for any age.',
    how:   'Sign up as a member or join a chapter activity on sow.org.tw.' },
  { id: 'eia-taiwan',           icon: '📰', founded: 2001, scope: 'national', url: 'https://e-info.org.tw/',
    name: 'Taiwan Environmental Information Association (台灣環境資訊協會)', region: 'Taipei 🇹🇼',
    cause: 'Independent environmental journalism and citizen-science monitoring.',
    what:  'Runs e-info.org.tw, Taiwan\'s leading environmental news site, plus coral-reef citizen-science dives and land-trust projects.',
    why:   'Holds polluters and the government accountable with daily fact-checked reporting in Mandarin.',
    how:   'Subscribe to the newsletter, donate, or volunteer as a citizen-scientist diver at e-info.org.tw.' },
  { id: 'huf-taiwan',           icon: '🛒', founded: 1989, scope: 'national', url: 'https://www.huf.org.tw/',
    name: 'Homemakers United Foundation (主婦聯盟環境保護基金會)', region: 'Taipei 🇹🇼',
    cause: 'Food safety, anti-nuclear, plastic reduction and women\'s environmental leadership.',
    what:  'Pioneered Taiwan\'s organic co-op movement and the recycling and food-waste laws of the 1990s; still campaigns for reusable food packaging.',
    why:   'One of Taiwan\'s oldest grassroots NGOs — proves environmentalism starts in the kitchen and the supermarket.',
    how:   'Become a member, attend a workshop, or shop at the co-op store on huf.org.tw.' },
];

const joinState = { search: '', filter: 'all' };

function renderJoin() {
  const grid = document.getElementById('join-grid');
  if (!grid) return;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
  const ASSOCIATIONS_T = (window.i18n && window.i18n.ASSOCIATIONS_T) ? window.i18n.ASSOCIATIONS_T : null;

  const q = joinState.search.toLowerCase().trim();
  const list = ASSOCIATIONS.filter(a => {
    if (joinState.filter !== 'all' && a.scope !== joinState.filter) return false;
    if (!q) return true;
    return a.name.toLowerCase().includes(q)
        || a.region.toLowerCase().includes(q)
        || a.cause.toLowerCase().includes(q);
  });
  document.querySelectorAll('.join-filter').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === joinState.filter);
  });
  if (!list.length) {
    grid.innerHTML = `<p class="join-empty">${escapeHTML(t('join.empty'))}</p>`;
    return;
  }
  grid.innerHTML = list.map(a => {
    const idx = ASSOCIATIONS.indexOf(a);
    const tr  = ASSOCIATIONS_T ? ASSOCIATIONS_T[idx] : null;
    const region = tr ? tField(tr.region) : a.region;
    const cause  = tr ? tField(tr.cause)  : a.cause;
    const what   = tr ? tField(tr.what)   : a.what;
    const why    = tr ? tField(tr.why)    : a.why;
    const how    = tr ? tField(tr.how)    : a.how;
    const scopeLabel = t('join.scope.' + a.scope);
    return `
    <div class="join-card">
      <div class="join-card-head">
        <div class="join-icon">${a.icon}</div>
        <div class="join-title-wrap">
          <h4 class="join-name">${escapeHTML(a.name)}</h4>
          <div class="join-region">${escapeHTML(region)}</div>
        </div>
      </div>
      <div class="join-meta">
        <span class="join-scope ${a.scope}">${escapeHTML(scopeLabel)}</span>
        <span class="join-founded">${escapeHTML(t('join.since'))} ${a.founded}</span>
      </div>
      <p class="join-cause"><strong>${escapeHTML(t('join.cause'))}</strong> ${escapeHTML(cause)}</p>
      <p class="join-block"><strong>${escapeHTML(t('join.what'))}</strong>${escapeHTML(what)}</p>
      <p class="join-block"><strong>${escapeHTML(t('join.why'))}</strong>${escapeHTML(why)}</p>
      <p class="join-block"><strong>${escapeHTML(t('join.how'))}</strong>${escapeHTML(how)}</p>
      <div class="join-actions">
        <a class="join-link" href="${a.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(t('join.visit'))} →</a>
      </div>
    </div>`;
  }).join('');
}

// ── SDG modal ─────────────────────────────────────────────────────
const SDG_POLICY_MAP = {
  1:  'ca-gghg',     // Carbon pricing with revenue returned to households
  2:  'br-forest',   // Protects ecosystems that food security depends on
  3:  'us-caa',      // Clean Air Act cuts pollution-related illness
  4:  'eu-greendeal',// Just Transition Fund retrains workers
  5:  'paris',       // Paris Agreement Gender Action Plan
  6:  'eu-sup',      // Reduces plastic in waterways
  7:  'de-eeg',      // Launched global renewable energy boom
  8:  'us-ira',      // Massive clean-energy job creation
  9:  'jp-tr',       // Innovation through efficiency standards
  10: 'za-ct',       // Carbon tax with worker-protection phase-in
  11: 'fr-agec',     // Circular-economy law for cities & communities
  12: 'eu-sup',      // Single-use plastics directive
  13: 'uk-cca',      // First binding national climate law
  14: 'basel',       // Plastic-waste amendment regulates marine pollution
  15: 'bt-const',    // 60% forest cover constitutionally mandated
  16: 'nz-zca',      // Independent Climate Commission strengthens institutions
  17: 'montreal',    // Universally ratified — gold standard for partnership
};

const SDG_COLORS = {
  1:'#E5243B',2:'#DDA63A',3:'#4C9F38',4:'#C5192D',5:'#FF3A21',6:'#26BDE2',
  7:'#FCC30B',8:'#A21942',9:'#FD6925',10:'#DD1367',11:'#FD9D24',12:'#BF8B2E',
  13:'#3F7E44',14:'#0A97D9',15:'#56C02B',16:'#00689D',17:'#19486A',
};
const SDG_ICONS = {
  1:'🚫',2:'🌾',3:'❤️‍🩹',4:'📚',5:'⚧️',6:'💧',7:'⚡',8:'💼',9:'🏗️',
  10:'⚖️',11:'🏙️',12:'♻️',13:'🌡️',14:'🐠',15:'🌳',16:'☮️',17:'🤝',
};

let activeSdg = null;

function openSdgModal(sdgNum) {
  const n = parseInt(sdgNum, 10);
  if (!n || n < 1 || n > 17) return;
  const modal = document.getElementById('sdg-modal');
  if (!modal) return;
  activeSdg = n;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);

  // Header (color, number, icon, name)
  const head = document.getElementById('sdg-modal-head');
  head.style.setProperty('--sdg', SDG_COLORS[n]);
  document.getElementById('sdg-modal-num').textContent  = n;
  document.getElementById('sdg-modal-icon').textContent = SDG_ICONS[n];
  document.getElementById('sdg-modal-name').textContent = t('sdg.' + n);

  // Detail paragraph
  document.getElementById('sdg-modal-detail').textContent = t('sdg.' + n + '.detail');

  // Linked policy
  document.getElementById('sdg-modal-policy-label').textContent = t('sdg.exampleLabel');
  const policyCard = document.getElementById('sdg-modal-policy-card');
  const policyId = SDG_POLICY_MAP[n];
  const policy = POLICIES.find(p => p.id === policyId);
  if (policy) {
    const tField = (window.i18n && window.i18n.tField) ? window.i18n.tField : (x => (typeof x === 'string' ? x : x.en));
    const POLICIES_T = (window.i18n && window.i18n.POLICIES_T) ? window.i18n.POLICIES_T : null;
    const idx = POLICIES.indexOf(policy);
    const tr  = POLICIES_T ? POLICIES_T[idx] : null;
    const name    = tr ? tField(tr.name)         : policy.name;
    const jur     = tr ? tField(tr.jurisdiction) : policy.jurisdiction;
    const summary = tr ? tField(tr.summary)      : policy.summary;
    const regionLabel = t('policy.region.' + policy.region);
    policyCard.innerHTML = `
      <div class="policy-card-head">
        <div class="policy-flag">${policy.flag}</div>
        <div class="policy-title-wrap">
          <h4 class="policy-name">${escapeHTML(name)}</h4>
          <div class="policy-jur">${escapeHTML(jur)}</div>
        </div>
      </div>
      <div class="policy-meta">
        <span class="policy-year">${policy.year}</span>
        <span class="policy-region">${escapeHTML(regionLabel)}</span>
      </div>
      <p class="policy-summary">${escapeHTML(summary)}</p>`;
  } else {
    policyCard.innerHTML = '';
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSdgModal() {
  const modal = document.getElementById('sdg-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
  activeSdg = null;
}

document.querySelectorAll('.sdg-card').forEach(card => {
  card.addEventListener('click', () => openSdgModal(card.dataset.sdg));
});
const sdgCloseBtn = document.getElementById('sdg-modal-close');
if (sdgCloseBtn) sdgCloseBtn.addEventListener('click', closeSdgModal);
document.querySelectorAll('[data-sdg-close]').forEach(el => {
  el.addEventListener('click', closeSdgModal);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeSdg !== null) closeSdgModal();
});

// ── SDG Actions (Learn tab) ──────────────────────────────────────
// Five concrete, small-scale personal actions per SDG.
const SDG_ACTIONS = {
  1: [
    { icon: '🛍️', text: { en: 'Donate clothes, food and supplies to local shelters and food banks each season.', fr: 'Donnez vêtements, nourriture et fournitures aux refuges et banques alimentaires chaque saison.', 'zh-CN': '每个季节向当地庇护所和食物银行捐赠衣物、食品和用品。', 'zh-TW': '每個季節向當地庇護所和食物銀行捐贈衣物、食品和用品。' } },
    { icon: '💵', text: { en: 'Buy fair-trade products that pay producers a living wage.', fr: 'Achetez des produits équitables qui paient un salaire décent aux producteurs.', 'zh-CN': '购买公平贸易产品，让生产者获得生活工资。', 'zh-TW': '購買公平貿易產品，讓生產者獲得生活工資。' } },
    { icon: '🏪', text: { en: 'Spend at small local businesses instead of giant chains when you can.', fr: 'Achetez chez les petits commerces locaux plutôt que les grandes chaînes.', 'zh-CN': '尽量在本地小商家消费，而不是大型连锁店。', 'zh-TW': '盡量在本地小商家消費，而不是大型連鎖店。' } },
    { icon: '🧑‍🏫', text: { en: 'Volunteer skills — tutoring, CV help, language practice — at community centres.', fr: 'Donnez de vos compétences (tutorat, aide CV, langues) en centres sociaux.', 'zh-CN': '在社区中心志愿提供辅导、简历指导或语言练习等技能。', 'zh-TW': '在社區中心志願提供輔導、履歷指導或語言練習等技能。' } },
    { icon: '💳', text: { en: 'Bank with credit unions or ethical banks that avoid predatory lending.', fr: 'Bancarisez-vous via coopératives ou banques éthiques, sans prêts prédateurs.', 'zh-CN': '选择信用合作社或道德银行，避免掠夺性贷款机构。', 'zh-TW': '選擇信用合作社或道德銀行，避免掠奪性貸款機構。' } },
  ],
  2: [
    { icon: '🥕', text: { en: 'Cut food waste — plan meals, freeze leftovers, store produce properly.', fr: 'Réduisez le gaspillage : planifiez les repas, congelez les restes, conservez bien.', 'zh-CN': '减少食物浪费：规划餐食、冷冻剩饭、正确储存农产品。', 'zh-TW': '減少食物浪費：規劃餐食、冷凍剩飯、正確儲存農產品。' } },
    { icon: '🌱', text: { en: 'Grow some food at home — windowsill herbs or balcony tomatoes count.', fr: 'Cultivez un peu à la maison : herbes en pot ou tomates au balcon.', 'zh-CN': '在家种点食物——窗台香草或阳台番茄都算。', 'zh-TW': '在家種點食物——窗台香草或陽台番茄都算。' } },
    { icon: '🏪', text: { en: 'Shop seasonal local produce from farmers\' markets.', fr: 'Achetez des produits locaux et de saison au marché.', 'zh-CN': '在农夫市集购买本地、当季的农产品。', 'zh-TW': '在農夫市集購買本地、當季的農產品。' } },
    { icon: '🥫', text: { en: 'Drop non-perishables at a food bank once a month.', fr: 'Déposez des conserves à une banque alimentaire chaque mois.', 'zh-CN': '每月向食物银行捐赠一次非易腐食品。', 'zh-TW': '每月向食物銀行捐贈一次非易腐食品。' } },
    { icon: '🐝', text: { en: 'Plant pollinator-friendly flowers — bees underpin the food system.', fr: 'Plantez des fleurs pour pollinisateurs : les abeilles font notre nourriture.', 'zh-CN': '种植对传粉者友好的花卉——蜜蜂支撑着粮食系统。', 'zh-TW': '種植對傳粉者友好的花卉——蜜蜂支撐著糧食系統。' } },
  ],
  3: [
    { icon: '🚶', text: { en: 'Walk or cycle short trips — cuts air pollution and boosts your health.', fr: 'Marchez ou pédalez pour les courts trajets : moins de pollution, mieux pour vous.', 'zh-CN': '短途步行或骑行——减少空气污染，也对健康有益。', 'zh-TW': '短途步行或騎行——減少空氣污染，也對健康有益。' } },
    { icon: '🚭', text: { en: 'Avoid smoking and limit alcohol — for you and the people around you.', fr: 'Évitez le tabac et limitez l\'alcool — pour vous et votre entourage.', 'zh-CN': '远离吸烟、节制饮酒——为自己也为身边的人。', 'zh-TW': '遠離吸菸、節制飲酒——為自己也為身邊的人。' } },
    { icon: '🧘', text: { en: 'Make sleep, movement and time outdoors non-negotiable basics.', fr: 'Faites du sommeil, du mouvement et du plein air des bases non négociables.', 'zh-CN': '把睡眠、运动和户外时间当作不可妥协的日常。', 'zh-TW': '把睡眠、運動和戶外時間當作不可妥協的日常。' } },
    { icon: '💉', text: { en: 'Stay current on vaccinations — protects more vulnerable neighbours.', fr: 'Tenez vos vaccinations à jour : cela protège les plus vulnérables.', 'zh-CN': '按时接种疫苗，保护更脆弱的邻居。', 'zh-TW': '按時接種疫苗，保護更脆弱的鄰居。' } },
    { icon: '🩺', text: { en: 'Use mental-health resources; check in regularly on friends and family.', fr: 'Utilisez les ressources de santé mentale ; prenez des nouvelles de vos proches.', 'zh-CN': '善用心理健康资源，并定期关心亲友。', 'zh-TW': '善用心理健康資源，並定期關心親友。' } },
  ],
  4: [
    { icon: '📚', text: { en: 'Donate books to libraries, schools, prisons or refugee centres.', fr: 'Donnez des livres aux bibliothèques, écoles, prisons ou centres de réfugiés.', 'zh-CN': '将书籍捐给图书馆、学校、监狱或难民中心。', 'zh-TW': '將書籍捐給圖書館、學校、監獄或難民中心。' } },
    { icon: '🧑‍🏫', text: { en: 'Volunteer to tutor or mentor a student in your community.', fr: 'Tutorer ou parrainer un élève bénévolement dans votre communauté.', 'zh-CN': '在你的社区志愿辅导或指导一位学生。', 'zh-TW': '在你的社區志願輔導或指導一位學生。' } },
    { icon: '💻', text: { en: 'Share free learning tools (Khan Academy, Wikipedia) with families who need them.', fr: 'Partagez des outils gratuits (Khan Academy, Wikipedia) avec les familles qui en ont besoin.', 'zh-CN': '与有需要的家庭分享免费学习工具（如可汗学院、维基百科）。', 'zh-TW': '與有需要的家庭分享免費學習工具（如可汗學院、維基百科）。' } },
    { icon: '🎒', text: { en: 'Fund a child\'s school supplies via a verified charity each year.', fr: 'Financez les fournitures scolaires d\'un enfant via une association reconnue.', 'zh-CN': '每年通过可信的慈善机构资助一名儿童的学习用品。', 'zh-TW': '每年透過可信的慈善機構資助一名兒童的學習用品。' } },
    { icon: '🌐', text: { en: 'Practise a second language — it opens cross-cultural understanding.', fr: 'Apprenez une seconde langue : cela ouvre à d\'autres cultures.', 'zh-CN': '学一门第二语言，能打开跨文化的理解。', 'zh-TW': '學一門第二語言，能打開跨文化的理解。' } },
  ],
  5: [
    { icon: '💬', text: { en: 'Call out sexist language and behaviour calmly when you see it.', fr: 'Dénoncez calmement le langage et les comportements sexistes.', 'zh-CN': '看到性别歧视的言行时，平和地指出来。', 'zh-TW': '看到性別歧視的言行時，平和地指出來。' } },
    { icon: '🛍️', text: { en: 'Support women-led businesses, creators and authors.', fr: 'Soutenez les entreprises, créateur·ices et autrices dirigées par des femmes.', 'zh-CN': '支持由女性领导的企业、创作者和作家。', 'zh-TW': '支持由女性領導的企業、創作者和作家。' } },
    { icon: '🍼', text: { en: 'Share unpaid work — cooking, childcare, eldercare — equitably at home.', fr: 'Partagez équitablement à la maison : cuisine, enfants, aidance.', 'zh-CN': '在家公平分担无偿劳动：做饭、育儿、照护长辈。', 'zh-TW': '在家公平分擔無償勞動：做飯、育兒、照護長輩。' } },
    { icon: '📚', text: { en: 'Read and amplify women, non-binary and trans authors.', fr: 'Lisez et faites connaître des auteur·ices femmes, non-binaires et trans.', 'zh-CN': '阅读并推广女性、非二元性别和跨性别作家的作品。', 'zh-TW': '閱讀並推廣女性、非二元性別和跨性別作家的作品。' } },
    { icon: '🗳️', text: { en: 'Vote for and donate to candidates pushing gender-equity policy.', fr: 'Votez et donnez aux candidat·es qui défendent l\'égalité des genres.', 'zh-CN': '投票并捐款给推动性别平等政策的候选人。', 'zh-TW': '投票並捐款給推動性別平等政策的候選人。' } },
  ],
  6: [
    { icon: '🚿', text: { en: 'Take shorter showers and fix any dripping taps within a week.', fr: 'Douches plus courtes ; réparez les robinets qui fuient dans la semaine.', 'zh-CN': '缩短淋浴时间，并在一周内修好滴水的水龙头。', 'zh-TW': '縮短淋浴時間，並在一週內修好滴水的水龍頭。' } },
    { icon: '🧼', text: { en: 'Switch to biodegradable, phosphate-free soap and detergent.', fr: 'Passez à des savons et lessives biodégradables sans phosphates.', 'zh-CN': '改用可生物降解、无磷的肥皂与洗涤剂。', 'zh-TW': '改用可生物降解、無磷的肥皂與洗滌劑。' } },
    { icon: '🚱', text: { en: 'Never pour oil, paint, solvents or medication down the drain.', fr: 'Ne jetez jamais huile, peinture, solvants ou médicaments dans l\'évier.', 'zh-CN': '切勿将油、油漆、溶剂或药物倒入下水道。', 'zh-TW': '切勿將油、油漆、溶劑或藥物倒入下水道。' } },
    { icon: '🧴', text: { en: 'Skip microbead products — they end up in waterways and fish.', fr: 'Évitez les produits avec microbilles : elles finissent dans l\'eau et les poissons.', 'zh-CN': '避免使用含微珠的产品——它们会流入水道和鱼体内。', 'zh-TW': '避免使用含微珠的產品——它們會流入水道和魚體內。' } },
    { icon: '💧', text: { en: 'Install a low-flow shower head or tap aerator (cheap, fast win).', fr: 'Installez une douchette ou un mousseur économe : rapide et bon marché.', 'zh-CN': '安装节水花洒或水龙头起泡器——便宜又有效。', 'zh-TW': '安裝節水花灑或水龍頭起泡器——便宜又有效。' } },
  ],
  7: [
    { icon: '💡', text: { en: 'Replace remaining bulbs with LEDs; pick A-rated appliances when buying new.', fr: 'Passez aux LED ; choisissez des appareils classés A à l\'achat.', 'zh-CN': '把剩下的灯泡换成 LED；购买新电器时选 A 级能效。', 'zh-TW': '把剩下的燈泡換成 LED；購買新電器時選 A 級能效。' } },
    { icon: '🔌', text: { en: 'Unplug chargers and electronics when not in use to kill standby draw.', fr: 'Débranchez chargeurs et appareils en veille pour couper la consommation.', 'zh-CN': '不使用时拔掉充电器和电器，消除待机耗电。', 'zh-TW': '不使用時拔掉充電器和電器，消除待機耗電。' } },
    { icon: '☀️', text: { en: 'Switch to a green electricity tariff if your provider offers one.', fr: 'Passez à un tarif d\'électricité verte si votre fournisseur en propose un.', 'zh-CN': '如果电力公司提供绿电方案，请改用绿电。', 'zh-TW': '如果電力公司提供綠電方案，請改用綠電。' } },
    { icon: '🌡️', text: { en: 'Lower the thermostat 1–2 °C in winter; raise it in summer.', fr: 'Baissez le thermostat de 1–2 °C l\'hiver ; remontez-le l\'été.', 'zh-CN': '冬天恒温器调低 1–2 °C，夏天调高。', 'zh-TW': '冬天恆溫器調低 1–2 °C，夏天調高。' } },
    { icon: '🪟', text: { en: 'Add weather-stripping to doors and windows — cheapest insulation upgrade.', fr: 'Ajoutez des joints aux portes et fenêtres : l\'isolation la moins chère.', 'zh-CN': '在门窗加装密封条——最便宜的保温升级。', 'zh-TW': '在門窗加裝密封條——最便宜的保溫升級。' } },
  ],
  8: [
    { icon: '🛍️', text: { en: 'Favour brands that publish independent supply-chain audits.', fr: 'Privilégiez les marques qui publient des audits indépendants de leur chaîne.', 'zh-CN': '优先选择公开独立供应链审计的品牌。', 'zh-TW': '優先選擇公開獨立供應鏈審計的品牌。' } },
    { icon: '☕', text: { en: 'Tip service workers fairly and respect their breaks.', fr: 'Laissez un pourboire correct et respectez les pauses des employé·es.', 'zh-CN': '给服务人员合理小费，并尊重他们的休息时间。', 'zh-TW': '給服務人員合理小費，並尊重他們的休息時間。' } },
    { icon: '🚫', text: { en: 'Avoid fast-fashion brands with documented labour abuses.', fr: 'Évitez les marques de fast-fashion aux abus du travail documentés.', 'zh-CN': '避开有明确劳工剥削记录的快时尚品牌。', 'zh-TW': '避開有明確勞工剝削紀錄的快時尚品牌。' } },
    { icon: '🧑‍🤝‍🧑', text: { en: 'Back unions, co-ops and worker-owned businesses.', fr: 'Soutenez syndicats, coopératives et entreprises détenues par les salarié·es.', 'zh-CN': '支持工会、合作社和员工持有的企业。', 'zh-TW': '支持工會、合作社和員工持有的企業。' } },
    { icon: '🌍', text: { en: 'Choose fair-trade coffee, cocoa, tea and bananas.', fr: 'Choisissez café, cacao, thé et bananes équitables.', 'zh-CN': '选择公平贸易的咖啡、可可、茶叶和香蕉。', 'zh-TW': '選擇公平貿易的咖啡、可可、茶葉和香蕉。' } },
  ],
  9: [
    { icon: '🔧', text: { en: 'Repair before replacing — phones, clothes, bikes, appliances.', fr: 'Réparez avant de remplacer : téléphones, vêtements, vélos, appareils.', 'zh-CN': '坏了先修，别急着换：手机、衣物、自行车、家电。', 'zh-TW': '壞了先修，別急著換：手機、衣物、自行車、家電。' } },
    { icon: '🚲', text: { en: 'Use public transport; lobby locally for safer cycling infrastructure.', fr: 'Utilisez les transports en commun ; militez pour des aménagements cyclables.', 'zh-CN': '搭乘公共交通；并向地方推动更安全的自行车基础设施。', 'zh-TW': '搭乘公共交通；並向地方推動更安全的自行車基礎設施。' } },
    { icon: '🌐', text: { en: 'Use and donate to open-source software and open-hardware projects.', fr: 'Utilisez et soutenez logiciels libres et matériels ouverts.', 'zh-CN': '使用并捐助开源软件与开源硬件项目。', 'zh-TW': '使用並捐助開源軟體與開源硬體專案。' } },
    { icon: '🧪', text: { en: 'Visit a local makerspace, repair café or FabLab.', fr: 'Fréquentez un makerspace, repair café ou FabLab local.', 'zh-CN': '光顾本地的创客空间、维修咖啡馆或 FabLab。', 'zh-TW': '光顧本地的創客空間、維修咖啡館或 FabLab。' } },
    { icon: '📲', text: { en: 'Aim for a 5-year minimum lifespan on every device to cut e-waste.', fr: 'Visez 5 ans minimum d\'usage par appareil pour limiter les déchets élec.', 'zh-CN': '让每台设备至少使用 5 年，减少电子垃圾。', 'zh-TW': '讓每台設備至少使用 5 年，減少電子垃圾。' } },
  ],
  10: [
    { icon: '🗣️', text: { en: 'Listen to marginalised voices — and pay them for their work.', fr: 'Écoutez les voix marginalisées et rémunérez leur travail.', 'zh-CN': '倾听被边缘化的声音——并为他们的工作付酬。', 'zh-TW': '傾聽被邊緣化的聲音——並為他們的工作付酬。' } },
    { icon: '🏦', text: { en: 'Bank with credit unions or ethical banks instead of mega-banks.', fr: 'Bancarisez-vous via coopératives ou banques éthiques plutôt que méga-banques.', 'zh-CN': '改用信用合作社或道德银行，而非巨型银行。', 'zh-TW': '改用信用合作社或道德銀行，而非巨型銀行。' } },
    { icon: '🗳️', text: { en: 'Vote in every local election — inequality is mostly shaped there.', fr: 'Votez à chaque élection locale : l\'inégalité s\'y joue surtout.', 'zh-CN': '每次地方选举都去投票——不平等大多在那里被塑造。', 'zh-TW': '每次地方選舉都去投票——不平等大多在那裡被塑造。' } },
    { icon: '🎁', text: { en: 'Redistribute: donate, join mutual aid, pay it forward.', fr: 'Redistribuez : don, entraide, transmission.', 'zh-CN': '主动再分配：捐赠、互助、把善意传递下去。', 'zh-TW': '主動再分配：捐贈、互助、把善意傳遞下去。' } },
    { icon: '🏘️', text: { en: 'Push back on NIMBY zoning — support affordable-housing builds.', fr: 'Opposez-vous au NIMBYisme : soutenez la construction de logements abordables.', 'zh-CN': '反对邻避主义——支持兴建可负担住房。', 'zh-TW': '反對鄰避主義——支持興建可負擔住房。' } },
  ],
  11: [
    { icon: '🚲', text: { en: 'Walk, cycle or take transit instead of a private car when possible.', fr: 'Préférez marche, vélo ou transports en commun à la voiture individuelle.', 'zh-CN': '尽量以步行、骑行或公共交通取代私家车。', 'zh-TW': '盡量以步行、騎行或公共交通取代私家車。' } },
    { icon: '🌳', text: { en: 'Plant or sponsor a street tree in your neighbourhood.', fr: 'Plantez ou parrainez un arbre de rue dans votre quartier.', 'zh-CN': '在你的街区种植或认养一棵行道树。', 'zh-TW': '在你的街區種植或認養一棵行道樹。' } },
    { icon: '🌻', text: { en: 'Join a community garden or tool library nearby.', fr: 'Rejoignez un jardin partagé ou une bibliothèque d\'outils près de chez vous.', 'zh-CN': '加入附近的社区花园或工具图书馆。', 'zh-TW': '加入附近的社區花園或工具圖書館。' } },
    { icon: '🗣️', text: { en: 'Attend city-council meetings on transport, housing or climate.', fr: 'Assistez aux conseils municipaux : transport, logement, climat.', 'zh-CN': '参加涉及交通、住房或气候的市议会会议。', 'zh-TW': '參加涉及交通、住房或氣候的市議會會議。' } },
    { icon: '🛒', text: { en: 'Shop on your local high street — it cuts logistics emissions too.', fr: 'Achetez dans le commerce de proximité : moins d\'émissions logistiques.', 'zh-CN': '在本地街区购物——同时减少物流排放。', 'zh-TW': '在本地街區購物——同時減少物流排放。' } },
  ],
  12: [
    { icon: '🛍️', text: { en: 'Carry your own bag, bottle and reusable cup, every day.', fr: 'Emportez sac, gourde et tasse réutilisables tous les jours.', 'zh-CN': '每天随身携带自带袋、水瓶和可重复使用的杯子。', 'zh-TW': '每天隨身攜帶自帶袋、水瓶和可重複使用的杯子。' } },
    { icon: '👕', text: { en: 'Buy second-hand first; repair clothes you already own.', fr: 'Commencez par l\'occasion ; réparez ce que vous avez déjà.', 'zh-CN': '优先买二手；并修补现有的衣物。', 'zh-TW': '優先買二手；並修補現有的衣物。' } },
    { icon: '🍱', text: { en: 'Cook at home; meal-plan to cut food waste in half.', fr: 'Cuisinez maison ; planifiez les repas pour diviser le gaspillage par deux.', 'zh-CN': '在家做饭；规划餐食可让食物浪费减半。', 'zh-TW': '在家做飯；規劃餐食可讓食物浪費減半。' } },
    { icon: '📦', text: { en: 'Refuse unnecessary packaging; try refill or zero-waste shops.', fr: 'Refusez les emballages superflus ; testez le vrac et le zéro déchet.', 'zh-CN': '拒绝多余包装；尝试散装或零废弃商店。', 'zh-TW': '拒絕多餘包裝；嘗試散裝或零廢棄商店。' } },
    { icon: '📅', text: { en: 'Pause-buy: wait 30 days before any non-essential purchase.', fr: 'Pause-achat : attendez 30 jours avant tout achat non essentiel.', 'zh-CN': '冷静购买：所有非必要购物先等 30 天。', 'zh-TW': '冷靜購買：所有非必要購物先等 30 天。' } },
  ],
  13: [
    { icon: '✈️', text: { en: 'Fly less; take trains or buses for any trip under 1000 km.', fr: 'Volez moins ; train ou car pour tout trajet de moins de 1000 km.', 'zh-CN': '少坐飞机；1000 公里以内改搭火车或客运。', 'zh-TW': '少坐飛機；1000 公里以內改搭火車或客運。' } },
    { icon: '🥗', text: { en: 'Eat plant-rich meals at least four days a week.', fr: 'Mangez à base de plantes au moins quatre jours par semaine.', 'zh-CN': '每周至少四天以植物为主的饮食。', 'zh-TW': '每週至少四天以植物為主的飲食。' } },
    { icon: '🏦', text: { en: 'Move your pension and savings to verified fossil-free funds.', fr: 'Placez retraite et épargne dans des fonds sans fossiles vérifiés.', 'zh-CN': '把养老金与储蓄转入经认证的无化石燃料基金。', 'zh-TW': '把退休金與儲蓄轉入經認證的無化石燃料基金。' } },
    { icon: '🗳️', text: { en: 'Vote for candidates with credible, science-based climate plans.', fr: 'Votez pour des candidat·es au plan climat crédible et scientifique.', 'zh-CN': '投票给拥有可信、有科学依据气候计划的候选人。', 'zh-TW': '投票給擁有可信、有科學依據氣候計畫的候選人。' } },
    { icon: '📣', text: { en: 'Talk about climate with friends and family — silence is the killer.', fr: 'Parlez climat avec proches et amis — le silence est le pire.', 'zh-CN': '与亲友谈论气候——沉默才是最大的杀手。', 'zh-TW': '與親友談論氣候——沉默才是最大的殺手。' } },
  ],
  14: [
    { icon: '🐟', text: { en: 'Avoid bluefin tuna, shark and overfished species; look for MSC.', fr: 'Évitez thon rouge, requin et espèces surpêchées ; cherchez le label MSC.', 'zh-CN': '避开蓝鳍金枪鱼、鲨鱼及过度捕捞物种；认 MSC 标章。', 'zh-TW': '避開藍鰭鮪魚、鯊魚及過度捕撈物種；認 MSC 標章。' } },
    { icon: '🚯', text: { en: 'Join a beach or river clean-up at least twice a year.', fr: 'Participez à un nettoyage de plage ou rivière au moins deux fois par an.', 'zh-CN': '每年至少参加两次海滩或河岸清洁活动。', 'zh-TW': '每年至少參加兩次海灘或河岸清潔活動。' } },
    { icon: '🧴', text: { en: 'Use reef-safe sunscreen (no oxybenzone or octinoxate).', fr: 'Utilisez une crème solaire compatible récifs (sans oxybenzone/octinoxate).', 'zh-CN': '使用珊瑚礁安全防晒霜（不含氧苯酮或桂皮酸盐）。', 'zh-TW': '使用珊瑚礁安全防曬乳（不含氧苯酮或桂皮酸鹽）。' } },
    { icon: '🛍️', text: { en: 'Cut single-use plastics — 80% of ocean plastic comes from land.', fr: 'Coupez les plastiques jetables : 80% du plastique océanique vient de la terre.', 'zh-CN': '减少一次性塑料——海洋塑料 80% 来自陆地。', 'zh-TW': '減少一次性塑膠——海洋塑膠 80% 來自陸地。' } },
    { icon: '🚱', text: { en: 'Never flush wipes, cotton buds or pills — they reach the sea.', fr: 'Ne jetez jamais lingettes, coton-tiges ou médicaments dans les toilettes.', 'zh-CN': '湿巾、棉签、药物绝不冲马桶——它们最终都会入海。', 'zh-TW': '濕巾、棉花棒、藥物絕不沖馬桶——它們最終都會入海。' } },
  ],
  15: [
    { icon: '🌳', text: { en: 'Plant native trees and pollinator-friendly flowers — skip invasives.', fr: 'Plantez des arbres indigènes et fleurs mellifères ; évitez les invasives.', 'zh-CN': '种本土树种与传粉者友好花卉，避免入侵物种。', 'zh-TW': '種本土樹種與傳粉者友好花卉，避免入侵物種。' } },
    { icon: '🐦', text: { en: 'Leave wild patches, log piles and uncut lawn corners for wildlife.', fr: 'Laissez des coins sauvages, tas de bois et pelouses non tondues pour la faune.', 'zh-CN': '留出野生地、木堆和不修剪的草地角落给野生动物。', 'zh-TW': '留出野生地、木堆和不修剪的草地角落給野生動物。' } },
    { icon: '🌾', text: { en: 'Stop using garden pesticides and herbicides.', fr: 'Arrêtez pesticides et herbicides au jardin.', 'zh-CN': '停止在花园使用杀虫剂和除草剂。', 'zh-TW': '停止在花園使用殺蟲劑和除草劑。' } },
    { icon: '🛒', text: { en: 'Choose deforestation-free palm oil, soy, beef, cocoa and timber.', fr: 'Choisissez huile de palme, soja, bœuf, cacao et bois sans déforestation.', 'zh-CN': '选择无毁林的棕榈油、大豆、牛肉、可可与木材。', 'zh-TW': '選擇無毀林的棕櫚油、大豆、牛肉、可可與木材。' } },
    { icon: '🐾', text: { en: 'Keep cats indoors at dawn and dusk — they kill billions of birds.', fr: 'Gardez les chats à l\'intérieur à l\'aube et au crépuscule (oiseaux).', 'zh-CN': '黎明和黄昏让猫待在室内——它们每年杀死数十亿只鸟。', 'zh-TW': '黎明和黃昏讓貓待在室內——牠們每年殺死數十億隻鳥。' } },
  ],
  16: [
    { icon: '🗳️', text: { en: 'Vote in every election — local, regional and national.', fr: 'Votez à chaque élection : locale, régionale, nationale.', 'zh-CN': '每次选举都去投票——地方、区域和全国。', 'zh-TW': '每次選舉都去投票——地方、區域和全國。' } },
    { icon: '📰', text: { en: 'Subscribe to and share quality journalism instead of rage-bait.', fr: 'Abonnez-vous et partagez du journalisme de qualité, pas du sensationnel.', 'zh-CN': '订阅并分享优质新闻报道，而非煽动性内容。', 'zh-TW': '訂閱並分享優質新聞報導，而非煽動性內容。' } },
    { icon: '✉️', text: { en: 'Write to your representatives on issues you actually care about.', fr: 'Écrivez à vos élu·es sur les sujets qui vous tiennent à cœur.', 'zh-CN': '就你真正关心的议题写信给民意代表。', 'zh-TW': '就你真正關心的議題寫信給民意代表。' } },
    { icon: '🧑‍⚖️', text: { en: 'Volunteer with civil-rights or refugee-support organisations.', fr: 'Bénévolez auprès d\'ONG de droits civiques ou de soutien aux réfugié·es.', 'zh-CN': '到公民权利或难民支援组织做志愿者。', 'zh-TW': '到公民權利或難民支援組織做志願者。' } },
    { icon: '🤝', text: { en: 'Resolve conflicts non-violently — and teach kids the same.', fr: 'Réglez les conflits sans violence — apprenez-le aux enfants.', 'zh-CN': '用非暴力方式解决冲突——并教孩子这样做。', 'zh-TW': '用非暴力方式解決衝突——並教孩子這樣做。' } },
  ],
  17: [
    { icon: '💸', text: { en: 'Set up a monthly donation to one verified global charity.', fr: 'Mettez en place un don mensuel à une ONG mondiale vérifiée.', 'zh-CN': '设定每月固定捐款给一个经认证的全球公益组织。', 'zh-TW': '設定每月固定捐款給一個經認證的全球公益組織。' } },
    { icon: '🧑‍🤝‍🧑', text: { en: 'Join — or start — a local sustainability group.', fr: 'Rejoignez ou créez un groupe local de durabilité.', 'zh-CN': '加入或发起一个本地永续行动小组。', 'zh-TW': '加入或發起一個本地永續行動小組。' } },
    { icon: '🌐', text: { en: 'Share knowledge: translate, write, teach, podcast, code.', fr: 'Partagez vos savoirs : traduire, écrire, enseigner, podcaster, coder.', 'zh-CN': '分享知识：翻译、写作、教学、播客、写程式。', 'zh-TW': '分享知識：翻譯、寫作、教學、播客、寫程式。' } },
    { icon: '🗳️', text: { en: 'Push your country to meet its UN aid (ODA) commitments.', fr: 'Pressez votre pays de tenir ses engagements d\'aide (APD) à l\'ONU.', 'zh-CN': '推动你的国家兑现联合国官方发展援助（ODA）承诺。', 'zh-TW': '推動你的國家兌現聯合國官方發展援助（ODA）承諾。' } },
    { icon: '📣', text: { en: 'Amplify campaigners and movements from the Global South.', fr: 'Relayez les militant·es et mouvements du Sud global.', 'zh-CN': '放大来自全球南方的运动与倡议者的声音。', 'zh-TW': '放大來自全球南方的運動與倡議者的聲音。' } },
  ],
};

let activeSdgAction = null;

function renderSdgActions(sdgNum) {
  const wrap = document.getElementById('sdg-actions-display');
  if (!wrap) return;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const lang = (window.i18n && window.i18n.getLang) ? window.i18n.getLang() : 'en';
  const n = parseInt(sdgNum, 10);

  if (!n || !SDG_ACTIONS[n]) {
    activeSdgAction = null;
    wrap.innerHTML = `<div class="sdg-actions-prompt">${escapeHTML(t('sdgActions.prompt'))}</div>`;
    document.querySelectorAll('.sdg-action-card').forEach(c => c.classList.remove('is-active'));
    return;
  }
  activeSdgAction = n;

  document.querySelectorAll('.sdg-action-card').forEach(c => {
    c.classList.toggle('is-active', parseInt(c.dataset.actionSdg, 10) === n);
  });

  const color = SDG_COLORS[n];
  const icon  = SDG_ICONS[n];
  const name  = t('sdg.' + n);
  const heading = t('sdgActions.heading');

  wrap.innerHTML = `
    <div class="sdg-actions-banner" style="--sdg:${color}">
      <span class="sdg-actions-num">${n}</span>
      <span class="sdg-actions-icon">${icon}</span>
      <div class="sdg-actions-title">
        <h3>${escapeHTML(name)}</h3>
        <p>${escapeHTML(heading)}</p>
      </div>
    </div>
    <ul class="sdg-action-list">
      ${SDG_ACTIONS[n].map(a => `
        <li class="sdg-action-item">
          <span class="sdg-action-icon">${a.icon}</span>
          <span class="sdg-action-text">${escapeHTML(a.text[lang] || a.text.en)}</span>
        </li>
      `).join('')}
    </ul>
    <p class="sdg-actions-foot">${escapeHTML(t('sdgActions.foot'))}</p>
  `;
}

document.querySelectorAll('.sdg-action-card').forEach(card => {
  card.addEventListener('click', () => renderSdgActions(card.dataset.actionSdg));
});

// ── Real-time CO₂ Estimator (Carbon Interface API + offline fallback) ──
// Sources for offline factors:
//  - Electricity: IEA 2022 global grid average ≈ 436 g CO₂e / kWh
//  - Flight (passenger·km, economy): DEFRA 2024 short-haul ≈ 0.158, long-haul ≈ 0.149 → use 0.115 kg avg
//    Cabin multipliers: economy 1.0, premium 1.5, business 2.9, first 4.0 (ICAO/DEFRA)
//  - Freight (g CO₂e / tonne·km): truck 62, train 22, ship 16, plane (air-freight) 602 (DEFRA 2024)
const CI_KEY_STORAGE = 'carbon_interface_key_v1';
const CI_ENDPOINT    = 'https://www.carboninterface.com/api/v1/estimates';

const RT_FACTORS = {
  electricity_g_per_kwh:      436,
  flight_g_per_passenger_km:  115,
  flight_class_multiplier:    { economy: 1.0, premium: 1.5, business: 2.9, first: 4.0 },
  shipping_g_per_tonne_km:    { truck: 62, train: 22, ship: 16, plane: 602 },
};

const rtState = { mode: 'flight', lastInputs: null };

function rtGetKey()   { try { return localStorage.getItem(CI_KEY_STORAGE) || ''; } catch (_) { return ''; } }
function rtSaveKey(k) { try { localStorage.setItem(CI_KEY_STORAGE, k); } catch (_) {} }
function rtClearKey() { try { localStorage.removeItem(CI_KEY_STORAGE); } catch (_) {} }

function rtUpdateKeyStatus() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const status = document.getElementById('rt-key-status');
  const has = !!rtGetKey();
  if (status) {
    status.textContent = has ? t('rt.key.statusOn') : t('rt.key.statusOff');
    status.classList.toggle('is-on', has);
  }
  // Show last 4 chars in input field if present (masked)
  const input = document.getElementById('rt-key-input');
  if (input && has) input.placeholder = '••••••••••••••••' + rtGetKey().slice(-4);
  else if (input) input.placeholder = t('rt.key.placeholder');
}

function rtShowKeyMsg(msg, kind) {
  const el = document.getElementById('rt-key-msg');
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || '';
  el.className = 'rt-key-msg' + (kind ? ' is-' + kind : '');
}

function rtSwitchMode(mode) {
  if (!['flight','electricity','shipping'].includes(mode)) return;
  rtState.mode = mode;
  document.querySelectorAll('.rt-mode-btn').forEach(b => {
    b.classList.toggle('is-active', b.dataset.rtMode === mode);
  });
  document.querySelectorAll('.rt-form').forEach(f => {
    f.classList.toggle('hidden', f.dataset.rtForm !== mode);
  });
}

function rtReadFlightInputs() {
  return {
    distance_km: parseFloat(document.getElementById('rt-flight-distance').value) || 0,
    passengers:  Math.max(1, parseInt(document.getElementById('rt-flight-passengers').value, 10) || 1),
    cabin:       document.getElementById('rt-flight-class').value || 'economy',
  };
}
function rtReadElecInputs() {
  return {
    kwh:     parseFloat(document.getElementById('rt-elec-kwh').value) || 0,
    country: (document.getElementById('rt-elec-country').value || '').trim().toLowerCase().slice(0, 2),
  };
}
function rtReadShipInputs() {
  return {
    weight_kg:    parseFloat(document.getElementById('rt-ship-weight').value) || 0,
    distance_km:  parseFloat(document.getElementById('rt-ship-distance').value) || 0,
    method:       document.getElementById('rt-ship-method').value || 'truck',
  };
}

function rtOfflineEstimate(mode, inputs) {
  if (mode === 'flight') {
    const mult = RT_FACTORS.flight_class_multiplier[inputs.cabin] || 1;
    const kg = (RT_FACTORS.flight_g_per_passenger_km * inputs.distance_km * inputs.passengers * mult) / 1000;
    return { kg, source: 'offline', details: inputs };
  }
  if (mode === 'electricity') {
    const kg = (RT_FACTORS.electricity_g_per_kwh * inputs.kwh) / 1000;
    return { kg, source: 'offline', details: inputs };
  }
  if (mode === 'shipping') {
    const g = RT_FACTORS.shipping_g_per_tonne_km[inputs.method] || RT_FACTORS.shipping_g_per_tonne_km.truck;
    const kg = (g * (inputs.weight_kg / 1000) * inputs.distance_km) / 1000;
    return { kg, source: 'offline', details: inputs };
  }
  return null;
}

async function rtApiEstimate(mode, inputs, key) {
  let body;
  if (mode === 'electricity') {
    body = {
      type: 'electricity',
      electricity_unit:  'kwh',
      electricity_value: inputs.kwh,
      country:           inputs.country || 'us',
    };
  } else if (mode === 'shipping') {
    body = {
      type:             'shipping',
      weight_value:     inputs.weight_kg,
      weight_unit:      'kg',
      distance_value:   inputs.distance_km,
      distance_unit:    'km',
      transport_method: inputs.method,
    };
  } else {
    // Carbon Interface 'flight' requires IATA airport codes, which our UI does not collect.
    // Fall back to offline for flight even when a key is present.
    const e = new Error('FLIGHT_REQUIRES_IATA');
    e.code = 'FLIGHT_REQUIRES_IATA';
    throw e;
  }
  const res = await fetch(CI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    const err = new Error('API ' + res.status);
    err.code = 'API_ERROR';
    err.status = res.status;
    err.body = txt.slice(0, 240);
    throw err;
  }
  const json = await res.json();
  const kg = json && json.data && json.data.attributes && json.data.attributes.carbon_kg;
  if (typeof kg !== 'number') {
    const err = new Error('API_BAD_PAYLOAD');
    err.code = 'API_BAD_PAYLOAD';
    throw err;
  }
  return { kg, source: 'api', details: inputs, raw: json.data.attributes };
}

function rtRenderResult(mode, result, note) {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('rt-result');
  if (!wrap) return;
  const kg = result.kg;
  const sourceKey = result.source === 'api' ? 'rt.result.sourceApi' : 'rt.result.sourceOffline';
  // Equivalents
  const trees = kg / 21;            // kg / (kg per tree-year)
  const carKm = (kg * 1000) / 170;  // g CO2 / (g per km, avg ICE car)

  const modeLabel = t('rt.mode.' + mode);
  const sourceLabel = t(sourceKey);
  const noteHTML = note ? `<div class="rt-result-note">${escapeHTML(note)}</div>` : '';

  wrap.innerHTML = `
    <div class="rt-result-card">
      <div class="rt-result-head">
        <span class="rt-result-mode">${escapeHTML(modeLabel)}</span>
        <span class="rt-result-source ${result.source === 'api' ? 'is-api' : 'is-offline'}">${escapeHTML(sourceLabel)}</span>
      </div>
      <div class="rt-result-big">
        <span class="rt-result-num">${kg.toFixed(kg < 1 ? 3 : kg < 10 ? 2 : 1)}</span>
        <span class="rt-result-unit">${escapeHTML(t('rt.result.unit'))}</span>
      </div>
      <div class="rt-result-equiv">
        <div class="rt-equiv">
          <span class="rt-equiv-icon">🌳</span>
          <span class="rt-equiv-text">${trees.toFixed(2)} ${escapeHTML(t('rt.result.equivTrees'))}</span>
        </div>
        <div class="rt-equiv">
          <span class="rt-equiv-icon">🚗</span>
          <span class="rt-equiv-text">${Math.round(carKm)} ${escapeHTML(t('rt.result.equivCarKm'))}</span>
        </div>
      </div>
      ${noteHTML}
    </div>
  `;
}

function rtRenderError(msg) {
  const wrap = document.getElementById('rt-result');
  if (!wrap) return;
  wrap.innerHTML = `<div class="rt-result-error">⚠️ ${escapeHTML(msg)}</div>`;
}

async function rtEstimate() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const mode = rtState.mode;
  const inputs = mode === 'flight'      ? rtReadFlightInputs()
               : mode === 'electricity' ? rtReadElecInputs()
               : rtReadShipInputs();
  rtState.lastInputs = inputs;

  // Basic validation
  const positive = mode === 'flight'      ? inputs.distance_km > 0
                 : mode === 'electricity' ? inputs.kwh > 0
                 : (inputs.weight_kg > 0 && inputs.distance_km > 0);
  if (!positive) { rtRenderError(t('rt.err.inputs')); return; }

  const key = rtGetKey();
  const btn = document.getElementById('rt-estimate-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ ' + t('rt.estimating'); }
  try {
    if (key && (mode === 'electricity' || mode === 'shipping')) {
      try {
        const r = await rtApiEstimate(mode, inputs, key);
        rtRenderResult(mode, r);
        return;
      } catch (e) {
        // Fall back to offline; explain why.
        let why = t('rt.err.apiGeneric');
        if (e.code === 'API_ERROR' && e.status === 401) why = t('rt.err.apiAuth');
        else if (e.code === 'API_ERROR') why = t('rt.err.apiStatus').replace('{n}', e.status);
        const r = rtOfflineEstimate(mode, inputs);
        rtRenderResult(mode, r, why);
        return;
      }
    }
    // Offline path (no key, or flight always offline)
    const r = rtOfflineEstimate(mode, inputs);
    const note = (mode === 'flight' && key) ? t('rt.note.flightOffline')
               : (!key) ? t('rt.note.noKey')
               : '';
    rtRenderResult(mode, r, note || null);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = t('rt.estimate'); }
  }
}

function rtRefreshStaticLabels() {
  // Re-run after a language change: re-render the result if one exists, refresh key status.
  rtUpdateKeyStatus();
  const wrap = document.getElementById('rt-result');
  if (wrap && rtState.lastInputs) {
    // Re-estimate to refresh language of labels (offline is safe & fast)
    const r = rtOfflineEstimate(rtState.mode, rtState.lastInputs);
    rtRenderResult(rtState.mode, r);
  }
}

// Wire up real-time tool controls
document.querySelectorAll('.rt-mode-btn').forEach(b => {
  b.addEventListener('click', () => rtSwitchMode(b.dataset.rtMode));
});
const rtEstBtn = document.getElementById('rt-estimate-btn');
if (rtEstBtn) rtEstBtn.addEventListener('click', rtEstimate);

const rtKeySave  = document.getElementById('rt-key-save');
const rtKeyClear = document.getElementById('rt-key-clear');
const rtKeyInput = document.getElementById('rt-key-input');
if (rtKeySave && rtKeyInput) {
  rtKeySave.addEventListener('click', () => {
    const v = (rtKeyInput.value || '').trim();
    const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
    if (!v) { rtShowKeyMsg(t('rt.key.msgEmpty'), 'err'); return; }
    rtSaveKey(v);
    rtKeyInput.value = '';
    rtUpdateKeyStatus();
    rtShowKeyMsg(t('rt.key.msgSaved'), 'ok');
  });
}
if (rtKeyClear) {
  rtKeyClear.addEventListener('click', () => {
    const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
    rtClearKey();
    if (rtKeyInput) rtKeyInput.value = '';
    rtUpdateKeyStatus();
    rtShowKeyMsg(t('rt.key.msgCleared'), 'ok');
  });
}
rtUpdateKeyStatus();

// ── Live Grid Cleanliness Widget (Electricity Maps API) ──────────
// API: GET https://api.electricitymap.org/v3/carbon-intensity/latest?zone=XX
//      headers: { 'auth-token': KEY }
// Offline averages: Ember Global Electricity Review 2024 + IEA 2023 country profiles.
const GRID_KEY_STORAGE = 'electricity_maps_key_v1';
const GRID_ENDPOINT    = 'https://api.electricitymap.org/v3/carbon-intensity/latest';
const GRID_PI_ENDPOINT = 'https://api.electricitymap.org/v3/power-breakdown/latest';

// [code, name, offline yearly avg gCO₂/kWh]
const GRID_ZONES = [
  ['AR', 'Argentina',     320],
  ['AU', 'Australia',     510],
  ['BR', 'Brazil',         90],
  ['CA', 'Canada',        130],
  ['CN', 'China',         550],
  ['DE', 'Germany',       380],
  ['DK', 'Denmark',       180],
  ['ES', 'Spain',         170],
  ['FI', 'Finland',       110],
  ['FR', 'France',         60],
  ['GB', 'United Kingdom',238],
  ['ID', 'Indonesia',     700],
  ['IL', 'Israel',        510],
  ['IN', 'India',         700],
  ['IS', 'Iceland',        30],
  ['IT', 'Italy',         290],
  ['JP', 'Japan',         480],
  ['KR', 'South Korea',   470],
  ['MX', 'Mexico',        430],
  ['NL', 'Netherlands',   320],
  ['NO', 'Norway',         30],
  ['NZ', 'New Zealand',   140],
  ['PL', 'Poland',        660],
  ['SE', 'Sweden',         40],
  ['SG', 'Singapore',     410],
  ['TR', 'Turkey',        450],
  ['TW', 'Taiwan',        570],
  ['US', 'United States', 370],
  ['VN', 'Vietnam',       540],
  ['ZA', 'South Africa',  900],
];

const GRID_GREEN_MAX  = 200;
const GRID_YELLOW_MAX = 450;

const gridState = { zone: 'TW', last: null };

function gridGetKey()   { try { return localStorage.getItem(GRID_KEY_STORAGE) || ''; } catch (_) { return ''; } }
function gridSaveKey(k) { try { localStorage.setItem(GRID_KEY_STORAGE, k); } catch (_) {} }
function gridClearKey() { try { localStorage.removeItem(GRID_KEY_STORAGE); } catch (_) {} }

function gridUpdateKeyStatus() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const status = document.getElementById('grid-key-status');
  const has = !!gridGetKey();
  if (status) {
    status.textContent = has ? t('grid.key.statusOn') : t('grid.key.statusOff');
    status.classList.toggle('is-on', has);
  }
  const input = document.getElementById('grid-key-input');
  if (input && has) input.placeholder = '••••••••••••••••' + gridGetKey().slice(-4);
  else if (input) input.placeholder = t('grid.key.placeholder');
}

function gridShowKeyMsg(msg, kind) {
  const el = document.getElementById('grid-key-msg');
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || '';
  el.className = 'rt-key-msg' + (kind ? ' is-' + kind : '');
}

function gridPopulateZones() {
  const sel = document.getElementById('grid-zone');
  if (!sel) return;
  const prior = sel.value || gridState.zone;
  sel.innerHTML = GRID_ZONES.map(([code, name]) =>
    `<option value="${code}">${code} — ${escapeHTML(name)}</option>`
  ).join('');
  sel.value = prior;
}

function gridStatusBand(g) {
  if (g < GRID_GREEN_MAX)  return 'green';
  if (g < GRID_YELLOW_MAX) return 'yellow';
  return 'red';
}

async function gridApiFetch(zone, key) {
  const headers = { 'auth-token': key };
  // step 1: carbon intensity
  const ciRes = await fetch(`${GRID_ENDPOINT}?zone=${encodeURIComponent(zone)}`, { headers });
  if (!ciRes.ok) {
    const err = new Error('API ' + ciRes.status);
    err.code = 'API_ERROR';
    err.status = ciRes.status;
    throw err;
  }
  const ciJson = await ciRes.json();
  const g = ciJson && (ciJson.carbonIntensity ?? ciJson.data?.carbonIntensity);
  if (typeof g !== 'number') {
    const err = new Error('API_BAD_PAYLOAD');
    err.code = 'API_BAD_PAYLOAD';
    throw err;
  }
  // step 2: power breakdown — best effort, endpoint may 403 on free tier
  let renewablePct = null, fossilPct = null, updatedAt = ciJson.datetime || null;
  try {
    const pbRes = await fetch(`${GRID_PI_ENDPOINT}?zone=${encodeURIComponent(zone)}`, { headers });
    if (pbRes.ok) {
      const pb = await pbRes.json();
      if (typeof pb.renewablePercentage === 'number') renewablePct = pb.renewablePercentage;
      if (typeof pb.fossilFuelPercentage === 'number') fossilPct = pb.fossilFuelPercentage;
      if (pb.datetime) updatedAt = pb.datetime;
    }
  } catch (_) { /* breakdown is optional */ }
  return { g, renewablePct, fossilPct, updatedAt, source: 'api' };
}

function gridOffline(zone) {
  const entry = GRID_ZONES.find(z => z[0] === zone);
  const g = entry ? entry[2] : 436; // world avg fallback
  return { g, renewablePct: null, fossilPct: null, updatedAt: null, source: 'offline' };
}

function gridRenderStatus(zone, data, note) {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('grid-status');
  if (!wrap) return;
  const band = gridStatusBand(data.g);
  const bandKey = 'grid.band.' + band;
  const recKey  = 'grid.rec.' + band;
  const sourceKey = data.source === 'api' ? 'grid.sourceApi' : 'grid.sourceOffline';
  const zoneName = (GRID_ZONES.find(z => z[0] === zone) || [zone, zone])[1];

  const updated = data.updatedAt
    ? (() => { try { return new Date(data.updatedAt).toLocaleString(); } catch (_) { return data.updatedAt; } })()
    : null;

  const noteHTML = note ? `<div class="rt-result-note">${escapeHTML(note)}</div>` : '';
  const breakdownHTML = (data.renewablePct != null || data.fossilPct != null) ? `
    <div class="grid-breakdown">
      ${data.renewablePct != null ? `<div class="grid-bd"><span>🌱 ${escapeHTML(t('grid.renewable'))}</span><strong>${Math.round(data.renewablePct)}%</strong></div>` : ''}
      ${data.fossilPct    != null ? `<div class="grid-bd"><span>🛢️ ${escapeHTML(t('grid.fossil'))}</span><strong>${Math.round(data.fossilPct)}%</strong></div>` : ''}
    </div>` : '';
  const updatedHTML = updated ? `<div class="grid-updated">${escapeHTML(t('grid.updatedAt'))} ${escapeHTML(updated)}</div>` : '';

  wrap.innerHTML = `
    <div class="grid-card grid-${band}">
      <div class="grid-head">
        <div class="grid-zone-label">
          <span class="grid-zone-code">${escapeHTML(zone)}</span>
          <span class="grid-zone-name">${escapeHTML(zoneName)}</span>
        </div>
        <span class="rt-result-source ${data.source === 'api' ? 'is-api' : 'is-offline'}">${escapeHTML(t(sourceKey))}</span>
      </div>
      <div class="grid-dot grid-dot-${band}" aria-hidden="true"></div>
      <div class="grid-band-label">${escapeHTML(t(bandKey))}</div>
      <div class="grid-big">
        <span class="grid-num">${Math.round(data.g)}</span>
        <span class="grid-unit">${escapeHTML(t('grid.unit'))}</span>
      </div>
      <div class="grid-rec">${escapeHTML(t(recKey))}</div>
      ${breakdownHTML}
      ${updatedHTML}
      ${noteHTML}
    </div>
  `;
}

function gridRenderError(msg) {
  const wrap = document.getElementById('grid-status');
  if (!wrap) return;
  wrap.innerHTML = `<div class="rt-result-error">⚠️ ${escapeHTML(msg)}</div>`;
}

async function gridCheck() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const sel = document.getElementById('grid-zone');
  const zone = (sel && sel.value) || gridState.zone;
  gridState.zone = zone;
  const btn = document.getElementById('grid-refresh-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ ' + t('grid.checking'); }
  const key = gridGetKey();
  try {
    if (key) {
      try {
        const data = await gridApiFetch(zone, key);
        gridState.last = data;
        gridRenderStatus(zone, data);
        return;
      } catch (e) {
        let why = t('grid.err.apiGeneric');
        if (e.code === 'API_ERROR' && e.status === 401) why = t('grid.err.apiAuth');
        else if (e.code === 'API_ERROR' && e.status === 404) why = t('grid.err.apiZone');
        else if (e.code === 'API_ERROR') why = t('grid.err.apiStatus').replace('{n}', e.status);
        const data = gridOffline(zone);
        gridState.last = data;
        gridRenderStatus(zone, data, why);
        return;
      }
    }
    const data = gridOffline(zone);
    gridState.last = data;
    gridRenderStatus(zone, data, t('grid.note.noKey'));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = t('grid.refresh'); }
  }
}

function gridRefreshStatic() {
  gridUpdateKeyStatus();
  // Re-populate zone select (names are static English; we keep value)
  if (gridState.last) gridRenderStatus(gridState.zone, gridState.last);
}

// Wire grid widget
gridPopulateZones();
const gridZoneSel = document.getElementById('grid-zone');
if (gridZoneSel) {
  gridZoneSel.value = gridState.zone;
  gridZoneSel.addEventListener('change', () => { gridState.zone = gridZoneSel.value; });
}
const gridRefreshBtn = document.getElementById('grid-refresh-btn');
if (gridRefreshBtn) gridRefreshBtn.addEventListener('click', gridCheck);

const gridKeySave  = document.getElementById('grid-key-save');
const gridKeyClear = document.getElementById('grid-key-clear');
const gridKeyInput = document.getElementById('grid-key-input');
if (gridKeySave && gridKeyInput) {
  gridKeySave.addEventListener('click', () => {
    const v = (gridKeyInput.value || '').trim();
    const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
    if (!v) { gridShowKeyMsg(t('grid.key.msgEmpty'), 'err'); return; }
    gridSaveKey(v);
    gridKeyInput.value = '';
    gridUpdateKeyStatus();
    gridShowKeyMsg(t('grid.key.msgSaved'), 'ok');
  });
}
if (gridKeyClear) {
  gridKeyClear.addEventListener('click', () => {
    const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
    gridClearKey();
    if (gridKeyInput) gridKeyInput.value = '';
    gridUpdateKeyStatus();
    gridShowKeyMsg(t('grid.key.msgCleared'), 'ok');
  });
}
gridUpdateKeyStatus();

// ── Fridge Raid: Food Waste Minimizer (offline recipe matcher) ──
// Recipes are stored locally — no API or account required. The matcher
// normalizes the user's free-form input (plurals, common synonyms) and
// ranks recipes by how many of the user's ingredients they actually use,
// so as little as possible goes to waste.
const FRIDGE_RECIPES = [
  { id: 'omelette', icon: '🍳', title: 'Veggie Omelette', time: 10,
    required: ['egg'],
    optional: ['onion','tomato','spinach','cheese','mushroom','pepper','herb','butter','milk','scallion'],
    steps: [
      'Beat 2–3 eggs with a pinch of salt and pepper.',
      'Sauté any chopped veg in a hot oiled pan for 1–2 min.',
      'Pour the eggs over, let them set, sprinkle cheese, fold and serve.'
    ] },
  { id: 'scrambled', icon: '🍳', title: 'Scrambled Eggs on Toast', time: 8,
    required: ['egg','bread'],
    optional: ['butter','milk','cheese','herb','tomato','spinach','scallion'],
    steps: [
      'Whisk eggs with a splash of milk and salt.',
      'Melt butter in a low-heat pan. Pour in eggs and stir gently until just set.',
      'Pile onto toast and finish with herbs or grated cheese.'
    ] },
  { id: 'french-toast', icon: '🥪', title: 'French Toast', time: 12,
    required: ['egg','bread','milk'],
    optional: ['cinnamon','butter','vanilla','honey','banana','berry','sugar'],
    steps: [
      'Whisk egg, milk, a pinch of cinnamon and vanilla in a shallow dish.',
      'Dip bread slices on both sides, letting them soak briefly.',
      'Fry in butter on medium heat ~2 min per side until golden.',
      'Serve with honey or fruit.'
    ] },
  { id: 'pancakes', icon: '🥞', title: 'Quick Pancakes', time: 15,
    required: ['flour','egg','milk'],
    optional: ['butter','sugar','baking-powder','vanilla','banana','berry','honey'],
    steps: [
      'Whisk 1 cup flour, 1 egg, 1 cup milk and a pinch of salt into a smooth batter.',
      'Add 1 tsp baking powder + 1 tbsp sugar if you have them.',
      'Pour ladles onto a hot, buttered pan — flip when bubbles form on the surface.'
    ] },
  { id: 'tomato-egg', icon: '🍅', title: 'Tomato & Egg Stir-fry', time: 10,
    required: ['egg','tomato'],
    optional: ['onion','soy-sauce','sugar','scallion','garlic','sesame-oil'],
    steps: [
      'Cut tomatoes into wedges. Beat 3 eggs lightly.',
      'Scramble the eggs in oil until just set; remove.',
      'Sauté tomato (and onion/garlic) until juicy, season with a splash of soy sauce + pinch of sugar.',
      'Fold the egg back in. Scatter scallion on top.'
    ] },
  { id: 'aglio-olio', icon: '🍝', title: 'Garlic Spaghetti (Aglio e Olio)', time: 15,
    required: ['pasta','garlic','olive-oil'],
    optional: ['chili','parsley','lemon','cheese'],
    steps: [
      'Boil pasta in well-salted water until al dente. Save a cup of cooking water.',
      'Sliver garlic and warm gently in olive oil with chili flakes (do not brown).',
      'Toss pasta in the oil with a splash of pasta water until glossy.',
      'Finish with parsley, lemon zest and cheese.'
    ] },
  { id: 'tomato-pasta', icon: '🍝', title: 'Tomato Pasta', time: 20,
    required: ['pasta','tomato'],
    optional: ['onion','garlic','basil','olive-oil','cheese','chili'],
    steps: [
      'Sauté onion and garlic in olive oil until soft.',
      'Add chopped tomato (or canned) + a pinch of sugar/salt. Simmer 10–15 min.',
      'Boil and drain pasta, toss in sauce, finish with basil and cheese.'
    ] },
  { id: 'pesto-pasta', icon: '🌿', title: 'Pesto Pasta', time: 15,
    required: ['pasta','basil','olive-oil','garlic'],
    optional: ['cheese','pine-nut','lemon','tomato'],
    steps: [
      'Blitz basil, garlic, pine nuts, cheese and olive oil into a rough pesto.',
      'Boil pasta; reserve a splash of cooking water.',
      'Stir pesto through hot pasta, loosen with pasta water. Top with cherry tomatoes.'
    ] },
  { id: 'mac-cheese', icon: '🧀', title: 'Mac and Cheese', time: 25,
    required: ['pasta','cheese','milk'],
    optional: ['butter','flour','mustard','herb','bread'],
    steps: [
      'Boil pasta and drain.',
      'Melt butter, whisk in flour, then milk until thickened. Off the heat, stir in grated cheese.',
      'Fold pasta into the sauce. Bake with breadcrumbs if you fancy a crust.'
    ] },
  { id: 'fried-rice', icon: '🍚', title: 'Egg Fried Rice', time: 12,
    required: ['rice','egg','soy-sauce'],
    optional: ['onion','garlic','carrot','peas','scallion','ginger','sesame-oil','pepper'],
    steps: [
      'Use cold leftover rice — fresh rice goes mushy.',
      'Scramble egg in hot oil; push aside.',
      'Stir-fry aromatics + veg on high heat for 2 min.',
      'Add rice, break it up, splash in soy sauce. Toss in the egg and scallion at the end.'
    ] },
  { id: 'egg-drop', icon: '🥣', title: 'Egg Drop Soup', time: 10,
    required: ['egg','stock'],
    optional: ['ginger','scallion','cornstarch','soy-sauce','sesame-oil','garlic'],
    steps: [
      'Bring stock to a simmer with a slice of ginger.',
      'Slurry 1 tsp cornstarch in cold water; stir into the stock until lightly thickened.',
      'Stir the stock in one direction; slowly drizzle in beaten egg to form ribbons.',
      'Finish with scallion, soy sauce and a drop of sesame oil.'
    ] },
  { id: 'veg-stirfry', icon: '🥦', title: 'Veggie Stir-fry', time: 12,
    required: ['soy-sauce','garlic'],
    optional: ['broccoli','carrot','pepper','mushroom','tofu','rice','sesame-oil','scallion','ginger','onion','cabbage'],
    steps: [
      'Cut everything roughly the same size so it cooks evenly.',
      'Heat oil until shimmering. Add garlic + ginger for 20 s.',
      'Add hardest veg first (carrot, broccoli stems), then softer ones. Toss 3–4 min.',
      'Splash in soy sauce + a drop of sesame oil. Serve over rice.'
    ] },
  { id: 'lentil-soup', icon: '🥣', title: 'Lentil Soup', time: 35,
    required: ['lentil','onion','stock'],
    optional: ['carrot','garlic','tomato','celery','cumin','olive-oil','herb','lemon'],
    steps: [
      'Sauté onion, garlic, carrot, celery in olive oil until soft.',
      'Add a pinch of cumin, then lentils, tomato and stock.',
      'Simmer 25–30 min until lentils break down. Finish with a squeeze of lemon.'
    ] },
  { id: 'minestrone', icon: '🍲', title: 'Minestrone', time: 30,
    required: ['tomato','onion','stock'],
    optional: ['pasta','carrot','celery','bean','zucchini','garlic','herb','olive-oil','spinach','potato'],
    steps: [
      'Sauté onion, garlic, carrot and celery in olive oil for 5 min.',
      'Add tomato, stock and any chopped veg + beans. Simmer 15 min.',
      'Add a small pasta for the last 8 min. Finish with herbs.'
    ] },
  { id: 'veg-curry', icon: '🍛', title: 'Quick Veggie Curry', time: 25,
    required: ['onion','garlic','tomato'],
    optional: ['ginger','chickpea','potato','carrot','spinach','coconut-milk','curry-powder','rice','cumin','turmeric','chili'],
    steps: [
      'Sweat onion, garlic, ginger in oil. Add spices and toast 30 s.',
      'Add tomato + any chunky veg + chickpeas. Pour in coconut milk.',
      'Simmer 15–20 min until thick. Stir spinach in at the end. Serve with rice.'
    ] },
  { id: 'dal', icon: '🍛', title: 'Simple Dal', time: 30,
    required: ['lentil','onion'],
    optional: ['garlic','ginger','tomato','cumin','turmeric','butter','rice','chili','spinach'],
    steps: [
      'Simmer lentils in 3× their volume of water with turmeric until soft (~20 min).',
      'In another pan, fry onion, garlic, ginger and cumin in butter or oil.',
      'Stir the fried mix into the lentils. Season and serve with rice.'
    ] },
  { id: 'chickpea-salad', icon: '🥗', title: 'Chickpea Salad', time: 8,
    required: ['chickpea'],
    optional: ['tomato','cucumber','onion','lemon','olive-oil','parsley','feta','herb','pepper'],
    steps: [
      'Drain and rinse chickpeas.',
      'Toss with chopped cucumber, tomato, red onion, parsley and crumbled feta.',
      'Dress with olive oil, lemon, salt and pepper.'
    ] },
  { id: 'greek-salad', icon: '🥗', title: 'Greek Salad', time: 8,
    required: ['tomato','cucumber','onion'],
    optional: ['feta','olive','olive-oil','lemon','oregano','herb'],
    steps: [
      'Chunk tomato, cucumber and red onion.',
      'Top with feta and olives.',
      'Dress with olive oil, oregano and a squeeze of lemon.'
    ] },
  { id: 'mashed-potato', icon: '🥔', title: 'Mashed Potatoes', time: 25,
    required: ['potato'],
    optional: ['butter','milk','garlic','cheese','herb'],
    steps: [
      'Peel and chop potatoes; boil in salted water until fork-tender.',
      'Drain well, then mash with butter and warm milk.',
      'Season generously. Stir in roasted garlic or grated cheese to lift it.'
    ] },
  { id: 'potato-soup', icon: '🥣', title: 'Potato & Leek Soup', time: 30,
    required: ['potato','onion','stock'],
    optional: ['leek','garlic','milk','butter','herb','cream'],
    steps: [
      'Sweat onion (and leek if you have it) in butter until soft.',
      'Add diced potato and stock. Simmer 20 min until tender.',
      'Blend until smooth. Stir in a splash of milk or cream and season.'
    ] },
  { id: 'tomato-soup', icon: '🥣', title: 'Tomato Soup', time: 25,
    required: ['tomato','onion'],
    optional: ['garlic','stock','basil','cream','butter','bread','olive-oil'],
    steps: [
      'Sauté onion and garlic in butter or olive oil.',
      'Add chopped tomato + stock. Simmer 15 min.',
      'Blend smooth, swirl in cream, season, finish with basil. Great with grilled cheese.'
    ] },
  { id: 'quesadilla', icon: '🌯', title: 'Veggie Quesadilla', time: 10,
    required: ['tortilla','cheese'],
    optional: ['onion','pepper','mushroom','bean','tomato','spinach','herb'],
    steps: [
      'Scatter cheese (+ any chopped veg) over half a tortilla. Fold.',
      'Toast in a dry pan, pressing down, ~2 min per side.',
      'Cut into wedges. Salsa, yogurt or hot sauce on the side.'
    ] },
  { id: 'grilled-cheese', icon: '🧀', title: 'Grilled Cheese', time: 8,
    required: ['bread','cheese'],
    optional: ['butter','tomato','onion','herb'],
    steps: [
      'Butter the outside of two bread slices. Pile cheese (and tomato/herb if you like) between them.',
      'Toast in a low-medium pan ~3 min per side until golden and the cheese is melted.'
    ] },
  { id: 'banana-bread', icon: '🍌', title: 'One-Bowl Banana Bread', time: 60,
    required: ['banana','flour','egg'],
    optional: ['butter','sugar','baking-soda','vanilla','walnut','cinnamon','milk'],
    steps: [
      'Mash 3 ripe bananas. Mix in 1 egg, melted butter, sugar and vanilla.',
      'Fold in 1.5 cups flour + 1 tsp baking soda + a pinch of salt + walnuts.',
      'Bake at 175 °C / 350 °F for ~50 min until a skewer comes out clean.'
    ] },
  { id: 'smoothie', icon: '🥤', title: 'Use-Up Smoothie', time: 5,
    required: ['banana'],
    optional: ['milk','yogurt','berry','honey','oat','spinach','peanut-butter'],
    steps: [
      'Toss banana + any soft fruit + a handful of spinach into a blender.',
      'Add milk or yogurt to thin, oats for body, peanut butter or honey to richen.',
      'Blend until smooth. Drink the fridge clean.'
    ] },
  { id: 'roasted-veg', icon: '🔥', title: 'Tray-Baked Roasted Veg', time: 35,
    required: ['olive-oil'],
    optional: ['potato','carrot','pepper','onion','zucchini','herb','garlic','sweet-potato','broccoli','tomato'],
    steps: [
      'Heat oven to 200 °C / 400 °F. Chop hardy veg into 2 cm chunks.',
      'Toss with olive oil, salt, pepper and any herbs you have.',
      'Roast 25–30 min, turning once, until the edges are caramelised.'
    ] },
  { id: 'chicken-stirfry', icon: '🥢', title: 'Chicken Stir-fry', time: 15,
    required: ['chicken','soy-sauce','garlic'],
    optional: ['ginger','scallion','pepper','broccoli','rice','sesame-oil','onion','carrot','chili'],
    steps: [
      'Slice chicken thin; marinate 5 min with a splash of soy sauce.',
      'Sear in a very hot pan until just cooked; remove.',
      'Stir-fry aromatics + veg, return the chicken, splash in more soy + sesame oil.',
      'Serve over rice.'
    ] },
];

// canonical id  =>  list of accepted user-typed variants (lowercase)
const FRIDGE_SYNONYMS = {
  egg: ['egg','eggs','egg white','egg whites','egg yolk','egg yolks'],
  tomato: ['tomato','tomatoes','cherry tomato','cherry tomatoes','plum tomato','plum tomatoes','canned tomato','tinned tomato','tomato sauce'],
  onion: ['onion','onions','red onion','white onion','yellow onion','shallot','shallots'],
  scallion: ['scallion','scallions','green onion','green onions','spring onion','spring onions'],
  garlic: ['garlic','garlic clove','garlic cloves','minced garlic'],
  ginger: ['ginger','ginger root','fresh ginger'],
  potato: ['potato','potatoes','spud','spuds','baby potato','baby potatoes'],
  'sweet-potato': ['sweet potato','sweet potatoes','yam','yams'],
  pepper: ['pepper','peppers','bell pepper','bell peppers','capsicum','capsicums','red pepper','green pepper','yellow pepper'],
  chili: ['chili','chilli','chile','chilis','chilies','chillies','chilli pepper','chili pepper','chili flake','chili flakes','red chili'],
  zucchini: ['zucchini','zucchinis','courgette','courgettes'],
  eggplant: ['eggplant','eggplants','aubergine','aubergines'],
  spinach: ['spinach','baby spinach'],
  mushroom: ['mushroom','mushrooms','button mushroom','cremini','portobello','shiitake'],
  cheese: ['cheese','cheddar','parmesan','mozzarella','swiss','gruyere','grated cheese','shredded cheese'],
  feta: ['feta','feta cheese'],
  milk: ['milk','whole milk','skim milk','semi-skimmed milk','oat milk','almond milk','soy milk','soya milk'],
  butter: ['butter','unsalted butter','salted butter'],
  bread: ['bread','toast','baguette','bread slice','slice of bread','sourdough','sandwich bread','pita','pita bread'],
  pasta: ['pasta','spaghetti','penne','fusilli','macaroni','noodles','linguine','rigatoni','farfalle','tagliatelle'],
  rice: ['rice','white rice','brown rice','basmati','jasmine','leftover rice','cooked rice'],
  chickpea: ['chickpea','chickpeas','garbanzo','garbanzos','garbanzo bean','garbanzo beans'],
  bean: ['bean','beans','kidney bean','kidney beans','black bean','black beans','white bean','white beans','cannellini','butter bean'],
  lentil: ['lentil','lentils','red lentil','red lentils','green lentil','green lentils','brown lentil','brown lentils','puy lentil'],
  stock: ['stock','broth','vegetable stock','veg stock','chicken stock','beef stock','bouillon','stock cube'],
  'olive-oil': ['olive oil','extra virgin olive oil','evoo'],
  oil: ['oil','vegetable oil','sunflower oil','cooking oil','canola oil'],
  'sesame-oil': ['sesame oil','toasted sesame oil'],
  'soy-sauce': ['soy sauce','soya sauce','shoyu','tamari','dark soy sauce','light soy sauce'],
  basil: ['basil','fresh basil','dried basil'],
  parsley: ['parsley','flat leaf parsley','italian parsley','curly parsley'],
  cilantro: ['cilantro','coriander','fresh cilantro','fresh coriander'],
  oregano: ['oregano','dried oregano'],
  thyme: ['thyme','fresh thyme','dried thyme'],
  mint: ['mint','fresh mint'],
  herb: ['herb','herbs','mixed herbs','italian herbs','dried herbs','fresh herbs','herbes de provence'],
  lemon: ['lemon','lemons','lemon juice','lemon zest'],
  lime: ['lime','limes','lime juice'],
  carrot: ['carrot','carrots','baby carrot','baby carrots'],
  celery: ['celery','celery stick','celery stalk','celery stalks'],
  broccoli: ['broccoli','broccoli floret','broccoli florets'],
  leek: ['leek','leeks'],
  avocado: ['avocado','avocados'],
  cucumber: ['cucumber','cucumbers'],
  olive: ['olive','olives','kalamata','black olive','green olive'],
  cabbage: ['cabbage','green cabbage','white cabbage','red cabbage','savoy cabbage'],
  chicken: ['chicken','chicken breast','chicken breasts','chicken thigh','chicken thighs','chicken leg','chicken legs'],
  beef: ['beef','ground beef','minced beef','mince','beef mince','steak'],
  yogurt: ['yogurt','yoghurt','greek yogurt','greek yoghurt','plain yogurt'],
  tortilla: ['tortilla','tortillas','wrap','wraps','flour tortilla','corn tortilla'],
  flour: ['flour','all purpose flour','plain flour','wheat flour','self raising flour','self-raising flour','ap flour'],
  banana: ['banana','bananas','ripe banana','ripe bananas'],
  berry: ['berry','berries','blueberry','blueberries','strawberry','strawberries','raspberry','raspberries','blackberry','blackberries','frozen berry','frozen berries'],
  honey: ['honey','runny honey'],
  'coconut-milk': ['coconut milk','coconut cream','tinned coconut milk','canned coconut milk'],
  tofu: ['tofu','firm tofu','silken tofu','extra firm tofu'],
  peas: ['pea','peas','green peas','frozen peas','garden peas'],
  cumin: ['cumin','ground cumin','cumin seed','cumin seeds'],
  turmeric: ['turmeric','ground turmeric'],
  cinnamon: ['cinnamon','ground cinnamon','cinnamon stick'],
  vanilla: ['vanilla','vanilla extract','vanilla essence','vanilla pod','vanilla bean'],
  sugar: ['sugar','white sugar','brown sugar','caster sugar','granulated sugar','demerara sugar'],
  'baking-soda': ['baking soda','bicarbonate of soda','bicarb','bicarb soda'],
  'baking-powder': ['baking powder'],
  walnut: ['walnut','walnuts','pecan','pecans'],
  'pine-nut': ['pine nut','pine nuts','pinenuts'],
  oat: ['oat','oats','rolled oats','porridge oats','oatmeal'],
  'peanut-butter': ['peanut butter','pb'],
  hummus: ['hummus','houmous'],
  lettuce: ['lettuce','salad leaves','mixed greens','romaine','iceberg','cos lettuce','salad'],
  cornstarch: ['cornstarch','corn starch','cornflour','corn flour'],
  mustard: ['mustard','dijon','dijon mustard','wholegrain mustard','mustard powder'],
  'curry-powder': ['curry powder','curry paste','garam masala'],
  cream: ['cream','heavy cream','double cream','single cream','whipping cream'],
};

// Build flat lookup: any variant => canonical id
const FRIDGE_VARIANT_TO_CANON = (function () {
  const m = new Map();
  for (const canon in FRIDGE_SYNONYMS) {
    for (const v of FRIDGE_SYNONYMS[canon]) {
      m.set(v.toLowerCase().trim(), canon);
    }
  }
  return m;
})();

function fridgeCanonicalize(raw) {
  if (!raw) return null;
  let s = String(raw).toLowerCase().trim();
  // Strip leading numbers / measurements ("2 eggs", "1 cup milk")
  s = s.replace(/^[\d./]+\s*(g|kg|ml|l|cups?|tbsp|tsp|oz|lb|tablespoons?|teaspoons?)?\s*/, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (FRIDGE_VARIANT_TO_CANON.has(s)) return FRIDGE_VARIANT_TO_CANON.get(s);
  // Strip trailing plural s
  if (s.length > 3 && s.endsWith('s')) {
    const sing = s.slice(0, -1);
    if (FRIDGE_VARIANT_TO_CANON.has(sing)) return FRIDGE_VARIANT_TO_CANON.get(sing);
  }
  // Fall back to the last word
  const words = s.split(' ');
  if (words.length > 1) {
    const last = words[words.length - 1];
    if (FRIDGE_VARIANT_TO_CANON.has(last)) return FRIDGE_VARIANT_TO_CANON.get(last);
    if (last.length > 3 && last.endsWith('s')) {
      const ls = last.slice(0, -1);
      if (FRIDGE_VARIANT_TO_CANON.has(ls)) return FRIDGE_VARIANT_TO_CANON.get(ls);
    }
  }
  return null;
}

function fridgeParseInput(text) {
  if (!text) return { canon: new Set(), unknown: [] };
  const chunks = String(text).split(/[,;\n]+/);
  const canon = new Set();
  const unknown = [];
  for (const c of chunks) {
    const trimmed = c.trim();
    if (!trimmed) continue;
    const k = fridgeCanonicalize(trimmed);
    if (k) canon.add(k);
    else unknown.push(trimmed);
  }
  return { canon, unknown };
}

function fridgeMatchRecipes(userSet) {
  const results = [];
  for (const r of FRIDGE_RECIPES) {
    const req = r.required;
    const opt = r.optional || [];
    const haveReq = req.filter(x => userSet.has(x));
    const missingReq = req.filter(x => !userSet.has(x));
    const haveOpt = opt.filter(x => userSet.has(x));
    // Required matches matter most; optional matches break ties; penalize missing requireds.
    const score = haveReq.length * 3 + haveOpt.length - missingReq.length * 4;
    results.push({ r, haveReq, missingReq, haveOpt, score, complete: missingReq.length === 0 });
  }
  return results
    .filter(x => x.haveReq.length > 0 && x.missingReq.length <= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function fridgePrettify(canon) {
  return canon.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fridgeRenderChips(userSet, unknown) {
  const wrap = document.getElementById('fridge-chip-row');
  if (!wrap) return;
  if (userSet.size === 0 && unknown.length === 0) {
    wrap.innerHTML = '';
    wrap.setAttribute('aria-hidden', 'true');
    return;
  }
  wrap.setAttribute('aria-hidden', 'false');
  const parts = [];
  for (const c of userSet) {
    parts.push(`<span class="fridge-chip fridge-chip-known">✓ ${escapeHTML(fridgePrettify(c))}</span>`);
  }
  for (const u of unknown) {
    parts.push(`<span class="fridge-chip fridge-chip-unknown">? ${escapeHTML(u)}</span>`);
  }
  wrap.innerHTML = parts.join('');
}

function fridgeRenderResults(matches, userSet, unknown) {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('fridge-results');
  if (!wrap) return;

  if (userSet.size === 0) {
    wrap.innerHTML = `<div class="fridge-empty">⚠️ ${escapeHTML(t('fridge.errEmpty'))}</div>`;
    return;
  }
  if (matches.length === 0) {
    wrap.innerHTML = `<div class="fridge-empty">😔 ${escapeHTML(t('fridge.errNoMatch'))}</div>`;
    return;
  }

  // Find which user ingredients are unused by any of the top matches
  const usedCanon = new Set();
  matches.forEach(m => { m.haveReq.forEach(x => usedCanon.add(x)); m.haveOpt.forEach(x => usedCanon.add(x)); });
  const wastingTokens = [...userSet].filter(x => !usedCanon.has(x));

  const cards = matches.map(m => {
    const r = m.r;
    const usedCount = m.haveReq.length + m.haveOpt.length;
    const stepsHTML = r.steps.map(s => `<li>${escapeHTML(s)}</li>`).join('');
    const tags = [
      m.complete
        ? `<span class="fridge-tag fridge-tag-ok">✅ ${escapeHTML(t('fridge.tagComplete'))}</span>`
        : `<span class="fridge-tag fridge-tag-missing">🛒 ${escapeHTML(t('fridge.tagMissing').replace('{n}', m.missingReq.length))}</span>`,
      `<span class="fridge-tag">⏱️ ${r.time} ${escapeHTML(t('fridge.minutes'))}</span>`,
      `<span class="fridge-tag fridge-tag-uses">🥗 ${escapeHTML(t('fridge.tagUses').replace('{n}', usedCount))}</span>`,
    ].join('');
    const have = [...m.haveReq, ...m.haveOpt].map(fridgePrettify).map(escapeHTML).join(', ');
    const missList = m.missingReq.map(fridgePrettify).map(escapeHTML).join(', ');
    const missingHTML = m.missingReq.length
      ? `<div class="fridge-card-missing"><strong>${escapeHTML(t('fridge.youNeed'))}</strong> ${missList}</div>`
      : '';
    return `
      <details class="fridge-card">
        <summary>
          <span class="fridge-card-icon">${r.icon}</span>
          <span class="fridge-card-title">${escapeHTML(r.title)}</span>
          <span class="fridge-card-tags">${tags}</span>
        </summary>
        <div class="fridge-card-body">
          <div class="fridge-card-uses"><strong>${escapeHTML(t('fridge.uses'))}</strong> ${have}</div>
          ${missingHTML}
          <ol class="fridge-card-steps">${stepsHTML}</ol>
        </div>
      </details>`;
  }).join('');

  const wasteHint = wastingTokens.length
    ? `<div class="fridge-waste-hint">💡 ${escapeHTML(t('fridge.wasteHint'))} <strong>${wastingTokens.map(fridgePrettify).map(escapeHTML).join(', ')}</strong></div>`
    : `<div class="fridge-waste-hint fridge-waste-hint-ok">🌟 ${escapeHTML(t('fridge.wasteAllUsed'))}</div>`;

  const unknownHint = unknown.length
    ? `<div class="fridge-unknown-hint">${escapeHTML(t('fridge.unknownHint'))} <em>${unknown.map(escapeHTML).join(', ')}</em></div>`
    : '';

  wrap.innerHTML = `
    <div class="fridge-results-summary">
      <strong>${escapeHTML(t('fridge.found').replace('{n}', matches.length))}</strong>
      ${wasteHint}
      ${unknownHint}
    </div>
    <div class="fridge-cards">${cards}</div>
  `;
}

const fridgeState = { lastInput: '', lastCanon: null, lastUnknown: null, lastMatches: null };

function fridgeFind() {
  const input = document.getElementById('fridge-input');
  if (!input) return;
  const text = (input.value || '').trim();
  fridgeState.lastInput = text;
  const { canon, unknown } = fridgeParseInput(text);
  const matches = fridgeMatchRecipes(canon);
  fridgeState.lastCanon = canon;
  fridgeState.lastUnknown = unknown;
  fridgeState.lastMatches = matches;
  fridgeRenderChips(canon, unknown);
  fridgeRenderResults(matches, canon, unknown);
}

function fridgeClear() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const input = document.getElementById('fridge-input');
  if (input) input.value = '';
  fridgeState.lastInput = '';
  fridgeState.lastCanon = null;
  fridgeState.lastUnknown = null;
  fridgeState.lastMatches = null;
  const chips = document.getElementById('fridge-chip-row');
  if (chips) { chips.innerHTML = ''; chips.setAttribute('aria-hidden', 'true'); }
  const results = document.getElementById('fridge-results');
  if (results) {
    results.innerHTML = `<div class="fridge-results-prompt">${escapeHTML(t('fridge.prompt'))}</div>`;
  }
}

function fridgeQuickAdd(extra) {
  const input = document.getElementById('fridge-input');
  if (!input || !extra) return;
  const current = (input.value || '').trim();
  input.value = current ? current + ', ' + extra : extra;
  input.focus();
}

function fridgeRefreshStatic() {
  if (fridgeState.lastMatches) {
    fridgeRenderResults(fridgeState.lastMatches, fridgeState.lastCanon, fridgeState.lastUnknown || []);
    return;
  }
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const results = document.getElementById('fridge-results');
  if (results) {
    const p = results.querySelector('.fridge-results-prompt');
    if (p) p.textContent = t('fridge.prompt');
  }
}

// Wire up Fridge Raid controls
const fridgeFindBtn  = document.getElementById('fridge-find-btn');
const fridgeClearBtn = document.getElementById('fridge-clear-btn');
if (fridgeFindBtn)  fridgeFindBtn.addEventListener('click', fridgeFind);
if (fridgeClearBtn) fridgeClearBtn.addEventListener('click', fridgeClear);
document.querySelectorAll('[data-fridge-add]').forEach(btn => {
  btn.addEventListener('click', () => fridgeQuickAdd(btn.dataset.fridgeAdd));
});
const fridgeInputEl = document.getElementById('fridge-input');
if (fridgeInputEl) {
  fridgeInputEl.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); fridgeFind(); }
  });
}

// ── Seasonal & Local Food Finder (offline produce calendar) ──
// All data is local. Region is auto-detected from the browser time zone but
// the user can override it. Eating in-season produce avoids high-emission
// air-freight; air-freighted food can emit up to ~50× more CO₂ than the same
// item grown locally (Our World in Data, 2020).
const PRODUCE = {
  // id: { e:emoji, en, fr, zh-CN, zh-TW }
  apple:        { e:'🍎', en:'Apple',          fr:'Pomme',           'zh-CN':'苹果',     'zh-TW':'蘋果' },
  pear:         { e:'🍐', en:'Pear',           fr:'Poire',           'zh-CN':'梨',       'zh-TW':'梨' },
  strawberry:   { e:'🍓', en:'Strawberry',     fr:'Fraise',          'zh-CN':'草莓',     'zh-TW':'草莓' },
  raspberry:    { e:'🫐', en:'Raspberry',      fr:'Framboise',       'zh-CN':'树莓',     'zh-TW':'樹莓' },
  blueberry:    { e:'🫐', en:'Blueberry',      fr:'Myrtille',        'zh-CN':'蓝莓',     'zh-TW':'藍莓' },
  blackcurrant: { e:'🫐', en:'Blackcurrant',   fr:'Cassis',          'zh-CN':'黑加仑',   'zh-TW':'黑加侖' },
  cherry:       { e:'🍒', en:'Cherry',         fr:'Cerise',          'zh-CN':'樱桃',     'zh-TW':'櫻桃' },
  plum:         { e:'🍑', en:'Plum',           fr:'Prune',           'zh-CN':'李子',     'zh-TW':'李子' },
  grape:        { e:'🍇', en:'Grape',          fr:'Raisin',          'zh-CN':'葡萄',     'zh-TW':'葡萄' },
  fig:          { e:'🟣', en:'Fig',            fr:'Figue',           'zh-CN':'无花果',   'zh-TW':'無花果' },
  apricot:      { e:'🍑', en:'Apricot',        fr:'Abricot',         'zh-CN':'杏',       'zh-TW':'杏' },
  peach:        { e:'🍑', en:'Peach',          fr:'Pêche',           'zh-CN':'桃子',     'zh-TW':'桃子' },
  nectarine:    { e:'🍑', en:'Nectarine',      fr:'Nectarine',       'zh-CN':'油桃',     'zh-TW':'油桃' },
  melon:        { e:'🍈', en:'Melon',          fr:'Melon',           'zh-CN':'甜瓜',     'zh-TW':'甜瓜' },
  watermelon:   { e:'🍉', en:'Watermelon',     fr:'Pastèque',        'zh-CN':'西瓜',     'zh-TW':'西瓜' },
  rhubarb:      { e:'🌱', en:'Rhubarb',        fr:'Rhubarbe',        'zh-CN':'大黄',     'zh-TW':'大黃' },
  orange:       { e:'🍊', en:'Orange',         fr:'Orange',          'zh-CN':'橙子',     'zh-TW':'柳橙' },
  mandarin:     { e:'🍊', en:'Mandarin',       fr:'Mandarine',       'zh-CN':'橘子',     'zh-TW':'橘子' },
  lemon:        { e:'🍋', en:'Lemon',          fr:'Citron',          'zh-CN':'柠檬',     'zh-TW':'檸檬' },
  pomegranate:  { e:'🟥', en:'Pomegranate',    fr:'Grenade',         'zh-CN':'石榴',     'zh-TW':'石榴' },
  persimmon:    { e:'🟧', en:'Persimmon',      fr:'Kaki',            'zh-CN':'柿子',     'zh-TW':'柿子' },
  lychee:       { e:'🔴', en:'Lychee',         fr:'Litchi',          'zh-CN':'荔枝',     'zh-TW':'荔枝' },
  longan:       { e:'🟤', en:'Longan',         fr:'Longane',         'zh-CN':'龙眼',     'zh-TW':'龍眼' },
  mango:        { e:'🥭', en:'Mango',          fr:'Mangue',          'zh-CN':'芒果',     'zh-TW':'芒果' },
  pineapple:    { e:'🍍', en:'Pineapple',      fr:'Ananas',          'zh-CN':'菠萝',     'zh-TW':'鳳梨' },
  papaya:       { e:'🟧', en:'Papaya',         fr:'Papaye',          'zh-CN':'木瓜',     'zh-TW':'木瓜' },
  banana:       { e:'🍌', en:'Banana',         fr:'Banane',          'zh-CN':'香蕉',     'zh-TW':'香蕉' },
  passionfruit: { e:'🟣', en:'Passionfruit',   fr:'Fruit de la passion', 'zh-CN':'百香果', 'zh-TW':'百香果' },
  guava:        { e:'🟢', en:'Guava',          fr:'Goyave',          'zh-CN':'番石榴',   'zh-TW':'芭樂' },
  dragonfruit:  { e:'🟥', en:'Dragon fruit',   fr:'Fruit du dragon', 'zh-CN':'火龙果',   'zh-TW':'火龍果' },
  kiwi:         { e:'🥝', en:'Kiwifruit',      fr:'Kiwi',            'zh-CN':'奇异果',   'zh-TW':'奇異果' },
  avocado:      { e:'🥑', en:'Avocado',        fr:'Avocat',          'zh-CN':'牛油果',   'zh-TW':'酪梨' },

  asparagus:    { e:'🌿', en:'Asparagus',      fr:'Asperge',         'zh-CN':'芦笋',     'zh-TW':'蘆筍' },
  broccoli:     { e:'🥦', en:'Broccoli',       fr:'Brocoli',         'zh-CN':'西兰花',   'zh-TW':'青花菜' },
  cabbage:      { e:'🥬', en:'Cabbage',        fr:'Chou',            'zh-CN':'卷心菜',   'zh-TW':'高麗菜' },
  napa:         { e:'🥬', en:'Napa cabbage',   fr:'Chou chinois',    'zh-CN':'大白菜',   'zh-TW':'大白菜' },
  bokchoy:      { e:'🥬', en:'Bok choy',       fr:'Pak-choï',        'zh-CN':'青江菜',   'zh-TW':'青江菜' },
  carrot:       { e:'🥕', en:'Carrot',         fr:'Carotte',         'zh-CN':'胡萝卜',   'zh-TW':'紅蘿蔔' },
  cauliflower:  { e:'🥦', en:'Cauliflower',    fr:'Chou-fleur',      'zh-CN':'花椰菜',   'zh-TW':'花椰菜' },
  celery:       { e:'🌿', en:'Celery',         fr:'Céleri',          'zh-CN':'芹菜',     'zh-TW':'芹菜' },
  zucchini:     { e:'🥒', en:'Zucchini',       fr:'Courgette',       'zh-CN':'西葫芦',   'zh-TW':'櫛瓜' },
  cucumber:     { e:'🥒', en:'Cucumber',       fr:'Concombre',       'zh-CN':'黄瓜',     'zh-TW':'小黃瓜' },
  eggplant:     { e:'🍆', en:'Eggplant',       fr:'Aubergine',       'zh-CN':'茄子',     'zh-TW':'茄子' },
  garlic:       { e:'🧄', en:'Garlic',         fr:'Ail',             'zh-CN':'大蒜',     'zh-TW':'大蒜' },
  leek:         { e:'🌱', en:'Leek',           fr:'Poireau',         'zh-CN':'韭葱',     'zh-TW':'韭蔥' },
  lettuce:      { e:'🥬', en:'Lettuce',        fr:'Laitue',          'zh-CN':'生菜',     'zh-TW':'生菜' },
  onion:        { e:'🧅', en:'Onion',          fr:'Oignon',          'zh-CN':'洋葱',     'zh-TW':'洋蔥' },
  parsnip:      { e:'🥕', en:'Parsnip',        fr:'Panais',          'zh-CN':'欧防风',   'zh-TW':'歐防風' },
  pea:          { e:'🟢', en:'Peas',           fr:'Petits pois',     'zh-CN':'豌豆',     'zh-TW':'豌豆' },
  pepper:       { e:'🫑', en:'Bell pepper',    fr:'Poivron',         'zh-CN':'甜椒',     'zh-TW':'甜椒' },
  potato:       { e:'🥔', en:'Potato',         fr:'Pomme de terre',  'zh-CN':'土豆',     'zh-TW':'馬鈴薯' },
  sweetpotato:  { e:'🍠', en:'Sweet potato',   fr:'Patate douce',    'zh-CN':'红薯',     'zh-TW':'地瓜' },
  pumpkin:      { e:'🎃', en:'Pumpkin',        fr:'Citrouille',      'zh-CN':'南瓜',     'zh-TW':'南瓜' },
  squash:       { e:'🟠', en:'Winter squash',  fr:'Courge',          'zh-CN':'冬南瓜',   'zh-TW':'冬南瓜' },
  radish:       { e:'🔴', en:'Radish',         fr:'Radis',           'zh-CN':'萝卜',     'zh-TW':'蘿蔔' },
  daikon:       { e:'⚪', en:'Daikon',         fr:'Radis daikon',    'zh-CN':'白萝卜',   'zh-TW':'白蘿蔔' },
  spinach:      { e:'🥬', en:'Spinach',        fr:'Épinard',         'zh-CN':'菠菜',     'zh-TW':'菠菜' },
  sweetcorn:    { e:'🌽', en:'Sweetcorn',      fr:'Maïs doux',       'zh-CN':'甜玉米',   'zh-TW':'甜玉米' },
  tomato:       { e:'🍅', en:'Tomato',         fr:'Tomate',          'zh-CN':'番茄',     'zh-TW':'番茄' },
  turnip:       { e:'⚪', en:'Turnip',         fr:'Navet',           'zh-CN':'芜菁',     'zh-TW':'蕪菁' },
  beet:         { e:'🔴', en:'Beetroot',       fr:'Betterave',       'zh-CN':'甜菜根',   'zh-TW':'甜菜根' },
  kale:         { e:'🥬', en:'Kale',           fr:'Chou kale',       'zh-CN':'羽衣甘蓝', 'zh-TW':'羽衣甘藍' },
  brussels:     { e:'🥬', en:'Brussels sprouts', fr:'Choux de Bruxelles', 'zh-CN':'抱子甘蓝', 'zh-TW':'抱子甘藍' },
  artichoke:    { e:'🌿', en:'Artichoke',      fr:'Artichaut',       'zh-CN':'朝鲜蓟',   'zh-TW':'朝鮮薊' },
  okra:         { e:'🟢', en:'Okra',           fr:'Gombo',           'zh-CN':'秋葵',     'zh-TW':'秋葵' },
  olive:        { e:'🫒', en:'Olive',          fr:'Olive',           'zh-CN':'橄榄',     'zh-TW':'橄欖' },
  shiitake:     { e:'🍄', en:'Shiitake',       fr:'Shiitake',        'zh-CN':'香菇',     'zh-TW':'香菇' },
  lotusroot:    { e:'⚪', en:'Lotus root',     fr:'Racine de lotus', 'zh-CN':'莲藕',     'zh-TW':'蓮藕' },
  bamboo:       { e:'🎋', en:'Bamboo shoot',   fr:'Pousse de bambou','zh-CN':'竹笋',     'zh-TW':'竹筍' },
  waterspinach: { e:'🥬', en:'Water spinach',  fr:'Liseron d\'eau',  'zh-CN':'空心菜',   'zh-TW':'空心菜' },
  ginger:       { e:'🫚', en:'Ginger',         fr:'Gingembre',       'zh-CN':'生姜',     'zh-TW':'生薑' },
};

// Each region's seasons map: produce-id => array of months (1..12) when it is in season locally.
const SEASONAL_REGIONS = {
  'eu-west': {
    label: { en:'Western & Northern Europe', fr:'Europe de l\'Ouest & du Nord', 'zh-CN':'西欧 / 北欧', 'zh-TW':'西歐 / 北歐' },
    examples: 'UK · FR · DE · NL · BE · IE · DK · SE · NO · PL',
    seasons: {
      apple:        [8,9,10,11,12,1,2,3],
      pear:         [8,9,10,11,12,1],
      strawberry:   [5,6,7],
      raspberry:    [6,7,8,9],
      blueberry:    [7,8],
      blackcurrant: [6,7,8],
      cherry:       [6,7],
      plum:         [7,8,9],
      grape:        [9,10],
      rhubarb:      [3,4,5,6,7],
      asparagus:    [4,5,6],
      broccoli:     [6,7,8,9,10],
      cabbage:      [1,2,3,4,9,10,11,12],
      carrot:       [1,2,3,7,8,9,10,11,12],
      cauliflower:  [5,6,7,8,9,10,11],
      celery:       [8,9,10],
      zucchini:     [6,7,8,9],
      cucumber:     [5,6,7,8,9],
      eggplant:     [7,8,9],
      garlic:       [6,7,8],
      leek:         [1,2,3,4,9,10,11,12],
      lettuce:      [4,5,6,7,8,9],
      onion:        [1,2,3,8,9,10,11,12],
      parsnip:      [1,2,3,10,11,12],
      pea:          [5,6,7],
      pepper:       [7,8,9,10],
      potato:       [1,2,3,4,5,6,7,8,9,10,11,12],
      pumpkin:      [9,10,11],
      radish:       [4,5,6,7,8,9],
      spinach:      [3,4,5,6,9,10,11],
      sweetcorn:    [7,8,9],
      tomato:       [6,7,8,9,10],
      turnip:       [1,2,3,10,11,12],
      beet:         [6,7,8,9,10,11],
      kale:         [1,2,3,10,11,12],
      brussels:     [10,11,12,1,2],
      squash:       [9,10,11,12],
    }
  },
  'eu-south': {
    label: { en:'Southern Europe / Mediterranean', fr:'Europe du Sud / Méditerranée', 'zh-CN':'南欧 / 地中海', 'zh-TW':'南歐 / 地中海' },
    examples: 'ES · IT · PT · GR · MT · HR · CY',
    seasons: {
      orange:       [11,12,1,2,3,4],
      mandarin:     [11,12,1,2],
      lemon:        [1,2,3,4,5,11,12],
      pomegranate:  [9,10,11,12],
      fig:          [7,8,9],
      olive:        [10,11,12],
      artichoke:    [3,4,5,11,12,1],
      apricot:      [5,6,7],
      peach:        [6,7,8,9],
      nectarine:    [6,7,8,9],
      melon:        [6,7,8,9],
      watermelon:   [6,7,8,9],
      cherry:       [5,6],
      grape:        [8,9,10],
      strawberry:   [3,4,5,6],
      tomato:       [5,6,7,8,9,10],
      eggplant:     [6,7,8,9,10],
      zucchini:     [5,6,7,8,9],
      pepper:       [6,7,8,9,10],
      cucumber:     [5,6,7,8,9],
      garlic:       [5,6,7,8],
      onion:        [1,2,3,4,5,6,7,8,9,10,11,12],
      lettuce:      [3,4,5,6,9,10,11],
      spinach:      [10,11,12,1,2,3],
      cabbage:      [10,11,12,1,2,3],
      cauliflower:  [10,11,12,1,2,3,4],
      broccoli:     [10,11,12,1,2,3],
      potato:       [1,2,3,4,5,6,7,8,9,10,11,12],
      pumpkin:      [9,10,11,12],
      squash:       [9,10,11,12],
      apple:        [9,10,11,12,1,2],
      pear:         [8,9,10,11],
    }
  },
  'na-temperate': {
    label: { en:'North America (temperate)', fr:'Amérique du Nord (tempérée)', 'zh-CN':'北美（温带）', 'zh-TW':'北美（溫帶）' },
    examples: 'US · CA · northern MX',
    seasons: {
      apple:        [8,9,10,11,12,1],
      pear:         [8,9,10,11],
      strawberry:   [5,6,7],
      blueberry:    [6,7,8],
      raspberry:    [6,7,8],
      cherry:       [6,7],
      plum:         [7,8,9],
      peach:        [6,7,8,9],
      nectarine:    [6,7,8,9],
      grape:        [8,9,10],
      watermelon:   [6,7,8,9],
      melon:        [6,7,8,9],
      asparagus:    [4,5,6],
      broccoli:     [6,7,8,9,10],
      cabbage:      [1,2,3,4,9,10,11,12],
      carrot:       [1,2,3,7,8,9,10,11,12],
      cauliflower:  [9,10,11],
      celery:       [7,8,9,10],
      sweetcorn:    [7,8,9],
      zucchini:     [6,7,8,9],
      cucumber:     [6,7,8,9],
      eggplant:     [7,8,9],
      garlic:       [7,8],
      lettuce:      [4,5,6,9,10],
      onion:        [1,2,3,8,9,10,11,12],
      pea:          [5,6,7],
      pepper:       [7,8,9,10],
      potato:       [1,2,3,4,5,6,7,8,9,10,11,12],
      pumpkin:      [9,10,11],
      squash:       [9,10,11,12],
      sweetpotato:  [9,10,11,12,1],
      spinach:      [3,4,5,9,10,11],
      tomato:       [7,8,9],
      beet:         [7,8,9,10,11],
      kale:         [1,2,3,10,11,12],
      brussels:     [10,11,12,1,2],
      rhubarb:      [4,5,6],
    }
  },
  'ne-asia': {
    label: { en:'East Asia (temperate)', fr:'Asie de l\'Est (tempérée)', 'zh-CN':'东亚（温带）', 'zh-TW':'東亞（溫帶）' },
    examples: 'CN · JP · KR · TW · HK',
    seasons: {
      napa:         [10,11,12,1,2,3],
      bokchoy:      [1,2,3,4,5,6,7,8,9,10,11,12],
      daikon:       [10,11,12,1,2],
      ginger:       [9,10,11,12],
      garlic:       [6,7,8],
      shiitake:     [3,4,5,10,11,12],
      lotusroot:    [9,10,11,12,1,2],
      bamboo:       [3,4,5],
      waterspinach: [5,6,7,8,9],
      persimmon:    [10,11,12],
      pear:         [8,9,10,11],
      apple:        [9,10,11,12],
      mandarin:     [10,11,12,1,2],
      lychee:       [6,7],
      longan:       [7,8,9],
      dragonfruit:  [6,7,8,9,10],
      mango:        [6,7,8],
      strawberry:   [12,1,2,3,4],
      grape:        [7,8,9],
      tomato:       [6,7,8,9,10],
      cucumber:     [5,6,7,8,9],
      eggplant:     [6,7,8,9],
      pepper:       [6,7,8,9],
      zucchini:     [6,7,8,9],
      sweetcorn:    [7,8,9],
      sweetpotato:  [9,10,11,12,1],
      pumpkin:      [9,10,11,12],
      spinach:      [10,11,12,1,2,3],
      cabbage:      [10,11,12,1,2,3,4],
      onion:        [1,2,3,4,5,6,7,8,9,10,11,12],
      carrot:       [1,2,3,11,12],
      potato:       [1,2,3,4,5,6,7,8,9,10,11,12],
    }
  },
  'se-asia': {
    label: { en:'Southeast Asia (tropical)', fr:'Asie du Sud-Est (tropicale)', 'zh-CN':'东南亚（热带）', 'zh-TW':'東南亞（熱帶）' },
    examples: 'SG · TH · MY · ID · PH · VN',
    seasons: {
      banana:       [1,2,3,4,5,6,7,8,9,10,11,12],
      papaya:       [1,2,3,4,5,6,7,8,9,10,11,12],
      pineapple:    [1,2,3,4,5,6,7,8,9,10,11,12],
      mango:        [3,4,5,6,7,8],
      dragonfruit:  [5,6,7,8,9,10,11],
      passionfruit: [1,2,3,4,5,6,7,8,9,10,11,12],
      guava:        [1,2,3,4,5,6,7,8,9,10,11,12],
      lychee:       [5,6,7],
      longan:       [6,7,8,9],
      bokchoy:      [1,2,3,4,5,6,7,8,9,10,11,12],
      waterspinach: [1,2,3,4,5,6,7,8,9,10,11,12],
      cucumber:     [1,2,3,4,5,6,7,8,9,10,11,12],
      eggplant:     [1,2,3,4,5,6,7,8,9,10,11,12],
      okra:         [1,2,3,4,5,6,7,8,9,10,11,12],
      tomato:       [1,2,3,4,5,6,7,8,9,10,11,12],
      pepper:       [1,2,3,4,5,6,7,8,9,10,11,12],
      sweetcorn:    [1,2,3,4,5,6,7,8,9,10,11,12],
      garlic:       [1,2,3,4,5,6,7,8,9,10,11,12],
      onion:        [1,2,3,4,5,6,7,8,9,10,11,12],
      ginger:       [1,2,3,4,5,6,7,8,9,10,11,12],
      bamboo:       [3,4,5,6],
      sweetpotato:  [1,2,3,4,5,6,7,8,9,10,11,12],
    }
  },
  'aus-nz': {
    label: { en:'Australia & New Zealand', fr:'Australie & Nouvelle-Zélande', 'zh-CN':'澳大利亚 / 新西兰', 'zh-TW':'澳洲 / 紐西蘭' },
    examples: 'AU · NZ',
    seasons: {
      apple:        [3,4,5,6,7,8],
      pear:         [3,4,5,6,7],
      strawberry:   [10,11,12,1,2,3],
      raspberry:    [11,12,1,2,3],
      blueberry:    [12,1,2,3],
      cherry:       [11,12,1],
      peach:        [12,1,2,3],
      apricot:      [11,12,1],
      plum:         [12,1,2,3],
      nectarine:    [12,1,2,3],
      grape:        [2,3,4,5],
      melon:        [12,1,2,3],
      watermelon:   [12,1,2,3],
      mango:        [11,12,1,2,3],
      kiwi:         [3,4,5,6,7,8],
      avocado:      [4,5,6,7,8,9],
      orange:       [6,7,8,9,10],
      mandarin:     [5,6,7,8,9],
      lemon:        [1,2,3,4,5,6,7,8,9,10,11,12],
      asparagus:    [9,10,11,12],
      broccoli:     [4,5,6,7,8,9],
      cabbage:      [4,5,6,7,8],
      carrot:       [1,2,3,4,5,6,7,8,9,10,11,12],
      cauliflower:  [4,5,6,7,8,9],
      zucchini:     [11,12,1,2,3],
      cucumber:     [10,11,12,1,2,3],
      eggplant:     [12,1,2,3],
      lettuce:      [9,10,11,12,1,2,3],
      onion:        [1,2,3,4,5,6,7,8,9,10,11,12],
      pea:          [9,10,11],
      pepper:       [11,12,1,2,3,4],
      potato:       [1,2,3,4,5,6,7,8,9,10,11,12],
      pumpkin:      [3,4,5,6,7],
      spinach:      [3,4,5,6,7,8,9,10],
      sweetcorn:    [11,12,1,2,3],
      tomato:       [11,12,1,2,3,4],
      brussels:     [4,5,6,7,8],
      kale:         [4,5,6,7,8,9],
    }
  },
  's-america': {
    label: { en:'Southern South America', fr:'Cône Sud (Amérique du Sud)', 'zh-CN':'南美南部', 'zh-TW':'南美南部' },
    examples: 'AR · CL · UY · southern BR',
    seasons: {
      apple:        [2,3,4,5,6,7],
      pear:         [1,2,3,4,5],
      grape:        [1,2,3,4],
      peach:        [11,12,1,2],
      plum:         [11,12,1,2],
      strawberry:   [10,11,12,1,2,3],
      watermelon:   [12,1,2,3],
      melon:        [12,1,2,3],
      orange:       [5,6,7,8,9,10],
      mandarin:     [4,5,6,7,8,9],
      lemon:        [1,2,3,4,5,6,7,8,9,10,11,12],
      avocado:      [3,4,5,6,7,8,9],
      tomato:       [11,12,1,2,3,4],
      cucumber:     [11,12,1,2,3],
      eggplant:     [12,1,2,3],
      pepper:       [11,12,1,2,3,4],
      zucchini:     [11,12,1,2,3],
      potato:       [1,2,3,4,5,6,7,8,9,10,11,12],
      sweetpotato:  [3,4,5,6,7,8],
      pumpkin:      [3,4,5,6,7],
      cabbage:      [4,5,6,7,8,9],
      lettuce:      [9,10,11,12,1,2,3],
      spinach:      [4,5,6,7,8,9,10],
      onion:        [1,2,3,4,5,6,7,8,9,10,11,12],
      garlic:       [11,12,1,2],
      sweetcorn:    [11,12,1,2,3],
    }
  },
  's-africa': {
    label: { en:'Southern Africa', fr:'Afrique australe', 'zh-CN':'南部非洲', 'zh-TW':'南部非洲' },
    examples: 'ZA · NA · ZW · MZ',
    seasons: {
      apple:        [2,3,4,5,6,7],
      pear:         [2,3,4,5,6],
      grape:        [1,2,3,4],
      peach:        [11,12,1,2,3],
      plum:         [12,1,2,3],
      apricot:      [11,12,1],
      strawberry:   [9,10,11,12,1],
      watermelon:   [11,12,1,2,3],
      melon:        [11,12,1,2,3],
      mango:        [11,12,1,2],
      papaya:       [1,2,3,4,5,6,7,8,9,10,11,12],
      pineapple:    [1,2,3,4,5,6,7,8,9,10,11,12],
      banana:       [1,2,3,4,5,6,7,8,9,10,11,12],
      orange:       [5,6,7,8,9,10],
      mandarin:     [4,5,6,7,8,9],
      lemon:        [1,2,3,4,5,6,7,8,9,10,11,12],
      avocado:      [2,3,4,5,6,7,8,9],
      tomato:       [11,12,1,2,3,4],
      cucumber:     [11,12,1,2,3,4],
      eggplant:     [11,12,1,2,3],
      pepper:       [11,12,1,2,3,4],
      zucchini:     [11,12,1,2,3],
      pumpkin:      [3,4,5,6,7],
      potato:       [1,2,3,4,5,6,7,8,9,10,11,12],
      sweetpotato:  [3,4,5,6,7,8],
      spinach:      [4,5,6,7,8,9,10],
      cabbage:      [4,5,6,7,8],
      lettuce:      [9,10,11,12,1,2,3],
      onion:        [1,2,3,4,5,6,7,8,9,10,11,12],
      garlic:       [11,12,1,2],
      okra:         [11,12,1,2,3],
      sweetcorn:    [12,1,2,3,4],
    }
  },
};

function seasonalDetectRegion() {
  try {
    const tz = (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone || '' : '';
    if (/^Europe\/(London|Dublin|Paris|Berlin|Amsterdam|Brussels|Copenhagen|Stockholm|Oslo|Helsinki|Warsaw|Prague|Vienna|Zurich|Luxembourg|Riga|Tallinn|Vilnius|Reykjavik)/.test(tz)) return 'eu-west';
    if (/^Europe\/(Madrid|Rome|Lisbon|Athens|Malta|Sofia|Bucharest|Istanbul|Belgrade|Ljubljana|Zagreb|Sarajevo|Tirane|Nicosia|Skopje)/.test(tz)) return 'eu-south';
    if (/^America\/(New_York|Toronto|Chicago|Denver|Los_Angeles|Vancouver|Phoenix|Anchorage|Boise|Detroit|Indianapolis|Halifax|Edmonton|Winnipeg|Montreal|Mexico_City)/.test(tz)) return 'na-temperate';
    if (/^Asia\/(Shanghai|Tokyo|Seoul|Taipei|Hong_Kong|Macau|Pyongyang|Chongqing|Harbin)/.test(tz)) return 'ne-asia';
    if (/^Asia\/(Singapore|Bangkok|Jakarta|Kuala_Lumpur|Manila|Ho_Chi_Minh|Yangon|Phnom_Penh|Vientiane|Brunei|Makassar|Dili)/.test(tz)) return 'se-asia';
    if (/^(Australia\/|Pacific\/Auckland)/.test(tz)) return 'aus-nz';
    if (/^America\/(Sao_Paulo|Argentina|Santiago|Montevideo|Asuncion)/.test(tz)) return 's-america';
    if (/^Africa\/(Johannesburg|Maputo|Windhoek|Harare|Lusaka|Gaborone|Maseru|Mbabane)/.test(tz)) return 's-africa';
  } catch (_) {}
  return 'eu-west';
}

const seasonalState = {
  region: seasonalDetectRegion(),
  month: (new Date()).getMonth() + 1, // 1..12
  checked: new Set(), // keys: regionId|month|produceId
};

function seasonalCheckKey(region, month, id) { return region + '|' + month + '|' + id; }

function seasonalPopulateRegionSelect() {
  const sel = document.getElementById('seasonal-region');
  if (!sel) return;
  const lang = (window.i18n && window.i18n.getLang) ? window.i18n.getLang() : 'en';
  const current = seasonalState.region;
  sel.innerHTML = '';
  for (const id in SEASONAL_REGIONS) {
    const r = SEASONAL_REGIONS[id];
    const opt = document.createElement('option');
    opt.value = id;
    const label = (r.label[lang] || r.label.en) + ' — ' + r.examples;
    opt.textContent = label;
    if (id === current) opt.selected = true;
    sel.appendChild(opt);
  }
}

function seasonalPopulateMonthSelect() {
  const sel = document.getElementById('seasonal-month');
  if (!sel) return;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  sel.innerHTML = '';
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = String(m);
    opt.textContent = t('seasonal.month.' + m);
    if (m === seasonalState.month) opt.selected = true;
    sel.appendChild(opt);
  }
}

function seasonalProduceName(id) {
  const p = PRODUCE[id];
  if (!p) return id;
  const lang = (window.i18n && window.i18n.getLang) ? window.i18n.getLang() : 'en';
  return p[lang] || p.en || id;
}

function seasonalRenderProduceList(containerId, ids, opts) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  if (!ids.length) {
    const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
    wrap.innerHTML = `<div class="seasonal-empty">${escapeHTML(t('seasonal.emptyList'))}</div>`;
    return;
  }
  const checkable = !!(opts && opts.checkable);
  const muted     = !!(opts && opts.muted);
  const html = ids.map(id => {
    const p = PRODUCE[id];
    if (!p) return '';
    const name = seasonalProduceName(id);
    const key = seasonalCheckKey(seasonalState.region, seasonalState.month, id);
    const checked = seasonalState.checked.has(key);
    if (checkable) {
      return `
        <label class="seasonal-card${checked ? ' is-checked' : ''}">
          <input type="checkbox" class="seasonal-check" data-produce="${id}" ${checked ? 'checked' : ''} />
          <span class="seasonal-card-emoji">${p.e}</span>
          <span class="seasonal-card-name">${escapeHTML(name)}</span>
        </label>`;
    }
    return `
      <div class="seasonal-card${muted ? ' is-muted' : ''}">
        <span class="seasonal-card-emoji">${p.e}</span>
        <span class="seasonal-card-name">${escapeHTML(name)}</span>
      </div>`;
  }).join('');
  wrap.innerHTML = html;
}

function seasonalCurrentLists() {
  const r = SEASONAL_REGIONS[seasonalState.region];
  const m = seasonalState.month;
  const nextM = m === 12 ? 1 : m + 1;
  if (!r) return { inSeason: [], coming: [], imported: [] };
  const inSeason = [];
  const coming = [];
  const imported = [];
  for (const id in r.seasons) {
    const months = r.seasons[id];
    const here = months.includes(m);
    const next = months.includes(nextM);
    if (here) inSeason.push(id);
    else if (next) coming.push(id);
    else imported.push(id);
  }
  // Sort each list alphabetically by localized name for stable order
  const cmp = (a, b) => seasonalProduceName(a).localeCompare(seasonalProduceName(b));
  inSeason.sort(cmp);
  coming.sort(cmp);
  imported.sort(cmp);
  return { inSeason, coming, imported };
}

function seasonalRenderSummary(inSeason, coming) {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const lang = (window.i18n && window.i18n.getLang) ? window.i18n.getLang() : 'en';
  const r = SEASONAL_REGIONS[seasonalState.region];
  const regionName = r ? (r.label[lang] || r.label.en) : seasonalState.region;
  const monthName = t('seasonal.month.' + seasonalState.month);
  const checkedCount = [...seasonalState.checked].filter(k => k.startsWith(seasonalState.region + '|' + seasonalState.month + '|')).length;
  const wrap = document.getElementById('seasonal-summary');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="seasonal-summary-card">
      <div class="seasonal-summary-row">
        <span class="seasonal-summary-icon">📍</span>
        <strong>${escapeHTML(regionName)}</strong>
        <span class="seasonal-summary-sep">·</span>
        <span class="seasonal-summary-icon">📅</span>
        <strong>${escapeHTML(monthName)}</strong>
      </div>
      <div class="seasonal-summary-stats">
        <span class="seasonal-stat-pill seasonal-stat-ok">✅ ${inSeason.length} ${escapeHTML(t('seasonal.inSeasonPill'))}</span>
        <span class="seasonal-stat-pill">🌱 ${coming.length} ${escapeHTML(t('seasonal.comingPill'))}</span>
        <span class="seasonal-stat-pill seasonal-stat-checked">🛒 ${checkedCount} ${escapeHTML(t('seasonal.checkedPill'))}</span>
      </div>
    </div>
  `;
}

function seasonalRender() {
  const { inSeason, coming, imported } = seasonalCurrentLists();
  seasonalPopulateRegionSelect();
  seasonalPopulateMonthSelect();
  seasonalRenderSummary(inSeason, coming);
  seasonalRenderProduceList('seasonal-in-season', inSeason, { checkable: true });
  seasonalRenderProduceList('seasonal-coming',    coming,    {});
  seasonalRenderProduceList('seasonal-imported',  imported,  { muted: true });
}

function seasonalRefreshStatic() {
  // re-render in current language; preserves checked state since it lives in JS
  seasonalRender();
}

// Wire up
const seasonalRegionSel = document.getElementById('seasonal-region');
const seasonalMonthSel  = document.getElementById('seasonal-month');
const seasonalResetBtn  = document.getElementById('seasonal-reset-btn');
const seasonalInSection = document.getElementById('seasonal-in-season');
if (seasonalRegionSel) {
  seasonalRegionSel.addEventListener('change', e => {
    if (SEASONAL_REGIONS[e.target.value]) {
      seasonalState.region = e.target.value;
      seasonalRender();
    }
  });
}
if (seasonalMonthSel) {
  seasonalMonthSel.addEventListener('change', e => {
    const m = parseInt(e.target.value, 10);
    if (m >= 1 && m <= 12) {
      seasonalState.month = m;
      seasonalRender();
    }
  });
}
if (seasonalResetBtn) {
  seasonalResetBtn.addEventListener('click', () => {
    seasonalState.month = (new Date()).getMonth() + 1;
    seasonalRender();
  });
}
if (seasonalInSection) {
  // Delegated change handler for the checkboxes
  seasonalInSection.addEventListener('change', e => {
    if (!e.target.classList || !e.target.classList.contains('seasonal-check')) return;
    const id = e.target.dataset.produce;
    if (!id) return;
    const key = seasonalCheckKey(seasonalState.region, seasonalState.month, id);
    if (e.target.checked) seasonalState.checked.add(key);
    else seasonalState.checked.delete(key);
    const card = e.target.closest('.seasonal-card');
    if (card) card.classList.toggle('is-checked', e.target.checked);
    // Refresh just the summary so the "checked" counter updates
    const { inSeason, coming } = seasonalCurrentLists();
    seasonalRenderSummary(inSeason, coming);
  });
}

// Initial render once the DOM exists
seasonalRender();

// ── Meal Footprint Comparison Tool ─────────────────────────────
// Build two plates from local food items and compare their carbon &
// water footprints side-by-side. Per-serving values are typical averages
// from Poore & Nemecek 2018 (Science) for CO₂e and Mekonnen & Hoekstra
// (Water Footprint Network) for water.  All numbers are kg CO₂e and L
// water per typical serving (~150–300 g for mains, ~250 ml for drinks).
const MC_FOODS = [
  // ── Mains ─────────────────────────────────────────────────
  { id:'beef-burger',     cat:'main',    icon:'🍔', name:{en:'Beef burger (150 g)',           fr:'Burger de bœuf (150 g)',          'zh-CN':'牛肉汉堡 (150 g)',     'zh-TW':'牛肉漢堡 (150 g)'},     co2:6.0,  water:2200 },
  { id:'lentil-burger',   cat:'main',    icon:'🌱', name:{en:'Lentil burger (150 g)',         fr:'Burger de lentilles (150 g)',     'zh-CN':'扁豆汉堡 (150 g)',     'zh-TW':'扁豆漢堡 (150 g)'},     co2:0.40, water:100 },
  { id:'beanchili-burger',cat:'main',    icon:'🫘', name:{en:'Black bean burger (150 g)',     fr:'Burger haricots noirs (150 g)',   'zh-CN':'黑豆汉堡 (150 g)',     'zh-TW':'黑豆漢堡 (150 g)'},     co2:0.55, water:160 },
  { id:'chicken-burger',  cat:'main',    icon:'🍗', name:{en:'Chicken burger (150 g)',        fr:'Burger de poulet (150 g)',        'zh-CN':'鸡肉汉堡 (150 g)',     'zh-TW':'雞肉漢堡 (150 g)'},     co2:1.6,  water:660 },
  { id:'margherita',      cat:'main',    icon:'🍕', name:{en:'Margherita pizza (whole 300 g)',fr:'Pizza margherita (300 g)',        'zh-CN':'玛格丽特披萨 (300 g)', 'zh-TW':'瑪格麗特披薩 (300 g)'}, co2:3.0,  water:800 },
  { id:'pepperoni',       cat:'main',    icon:'🍕', name:{en:'Pepperoni pizza (whole 300 g)', fr:'Pizza pepperoni (300 g)',         'zh-CN':'意式辣肠披萨 (300 g)', 'zh-TW':'義式辣腸披薩 (300 g)'}, co2:6.0,  water:2200 },
  { id:'bolognese',       cat:'main',    icon:'🍝', name:{en:'Spaghetti bolognese (300 g)',   fr:'Spaghetti bolognaise (300 g)',    'zh-CN':'番茄肉酱意面 (300 g)', 'zh-TW':'番茄肉醬義大利麵 (300 g)'}, co2:3.5, water:1500 },
  { id:'pasta-tomato',    cat:'main',    icon:'🍝', name:{en:'Pasta with tomato sauce (300 g)',fr:'Pâtes sauce tomate (300 g)',     'zh-CN':'番茄意面 (300 g)',     'zh-TW':'番茄義大利麵 (300 g)'}, co2:0.60, water:330 },
  { id:'carbonara',       cat:'main',    icon:'🍝', name:{en:'Carbonara (300 g)',             fr:'Carbonara (300 g)',               'zh-CN':'培根蛋面 (300 g)',     'zh-TW':'培根蛋麵 (300 g)'},     co2:1.4,  water:600 },
  { id:'beef-tacos',      cat:'main',    icon:'🌮', name:{en:'Beef tacos (×2)',               fr:'Tacos de bœuf (×2)',              'zh-CN':'牛肉塔可 (×2)',        'zh-TW':'牛肉塔可 (×2)'},        co2:3.5,  water:1400 },
  { id:'veg-tacos',       cat:'main',    icon:'🌮', name:{en:'Veggie tacos (×2)',             fr:'Tacos veggie (×2)',               'zh-CN':'素塔可 (×2)',          'zh-TW':'素塔可 (×2)'},          co2:0.40, water:120 },
  { id:'salmon-sushi',    cat:'main',    icon:'🍣', name:{en:'Salmon sushi (8 pc)',           fr:'Sushi saumon (8 pc)',             'zh-CN':'三文鱼寿司 (8 件)',    'zh-TW':'鮭魚壽司 (8 件)'},      co2:0.90, water:450 },
  { id:'veg-sushi',       cat:'main',    icon:'🍣', name:{en:'Veggie sushi (8 pc)',           fr:'Sushi veggie (8 pc)',             'zh-CN':'素寿司 (8 件)',        'zh-TW':'素壽司 (8 件)'},        co2:0.30, water:200 },
  { id:'falafel-wrap',    cat:'main',    icon:'🌯', name:{en:'Falafel wrap',                  fr:'Wrap falafel',                    'zh-CN':'鹰嘴豆丸卷饼',         'zh-TW':'鷹嘴豆丸捲餅'},         co2:0.50, water:200 },
  { id:'chicken-wrap',    cat:'main',    icon:'🌯', name:{en:'Chicken wrap',                  fr:'Wrap au poulet',                  'zh-CN':'鸡肉卷饼',             'zh-TW':'雞肉捲餅'},             co2:1.2,  water:500 },
  { id:'steak',           cat:'main',    icon:'🥩', name:{en:'Beef steak (200 g)',            fr:'Steak de bœuf (200 g)',           'zh-CN':'牛排 (200 g)',         'zh-TW':'牛排 (200 g)'},         co2:13.0, water:3050 },
  { id:'lamb-chop',       cat:'main',    icon:'🍖', name:{en:'Lamb chop (150 g)',             fr:'Côtelette d\'agneau (150 g)',     'zh-CN':'羊排 (150 g)',         'zh-TW':'羊排 (150 g)'},         co2:3.9,  water:1500 },
  { id:'pork-chop',       cat:'main',    icon:'🥓', name:{en:'Pork chop (150 g)',             fr:'Côte de porc (150 g)',            'zh-CN':'猪排 (150 g)',         'zh-TW':'豬排 (150 g)'},         co2:1.4,  water:750 },
  { id:'chicken-breast',  cat:'main',    icon:'🍗', name:{en:'Chicken breast (150 g)',        fr:'Blanc de poulet (150 g)',         'zh-CN':'鸡胸肉 (150 g)',       'zh-TW':'雞胸肉 (150 g)'},       co2:1.6,  water:660 },
  { id:'salmon-fillet',   cat:'main',    icon:'🐟', name:{en:'Salmon fillet (150 g)',         fr:'Filet de saumon (150 g)',         'zh-CN':'三文鱼柳 (150 g)',     'zh-TW':'鮭魚排 (150 g)'},       co2:1.4,  water:570 },
  { id:'tofu',            cat:'main',    icon:'⬜', name:{en:'Tofu (150 g)',                  fr:'Tofu (150 g)',                    'zh-CN':'豆腐 (150 g)',         'zh-TW':'豆腐 (150 g)'},         co2:0.30, water:300 },
  { id:'tempeh',          cat:'main',    icon:'⬜', name:{en:'Tempeh (150 g)',                fr:'Tempeh (150 g)',                  'zh-CN':'天贝 (150 g)',         'zh-TW':'天貝 (150 g)'},         co2:0.50, water:400 },
  { id:'chickpea-curry',  cat:'main',    icon:'🍛', name:{en:'Chickpea curry (300 g)',        fr:'Curry de pois chiches (300 g)',   'zh-CN':'鹰嘴豆咖喱 (300 g)',   'zh-TW':'鷹嘴豆咖哩 (300 g)'},   co2:0.70, water:550 },
  { id:'beef-curry',      cat:'main',    icon:'🍛', name:{en:'Beef curry (300 g)',            fr:'Curry de bœuf (300 g)',           'zh-CN':'牛肉咖喱 (300 g)',     'zh-TW':'牛肉咖哩 (300 g)'},     co2:7.5,  water:2400 },

  // ── Sides ─────────────────────────────────────────────────
  { id:'fries',           cat:'side',    icon:'🍟', name:{en:'French fries (150 g)',          fr:'Frites (150 g)',                  'zh-CN':'薯条 (150 g)',         'zh-TW':'薯條 (150 g)'},         co2:0.30, water:60 },
  { id:'mash',            cat:'side',    icon:'🥔', name:{en:'Mashed potato (150 g)',         fr:'Purée (150 g)',                   'zh-CN':'土豆泥 (150 g)',       'zh-TW':'馬鈴薯泥 (150 g)'},     co2:0.15, water:50 },
  { id:'rice-white',      cat:'side',    icon:'🍚', name:{en:'White rice (150 g cooked)',     fr:'Riz blanc (150 g cuit)',          'zh-CN':'白米饭 (150 g)',       'zh-TW':'白米飯 (150 g)'},       co2:0.40, water:360 },
  { id:'rice-brown',      cat:'side',    icon:'🍚', name:{en:'Brown rice (150 g cooked)',     fr:'Riz complet (150 g cuit)',        'zh-CN':'糙米饭 (150 g)',       'zh-TW':'糙米飯 (150 g)'},       co2:0.40, water:340 },
  { id:'garden-salad',    cat:'side',    icon:'🥗', name:{en:'Garden salad',                  fr:'Salade verte',                    'zh-CN':'田园沙拉',             'zh-TW':'田園沙拉'},             co2:0.20, water:80 },
  { id:'steamed-veg',     cat:'side',    icon:'🥦', name:{en:'Steamed vegetables (200 g)',    fr:'Légumes vapeur (200 g)',          'zh-CN':'蒸蔬菜 (200 g)',       'zh-TW':'蒸蔬菜 (200 g)'},       co2:0.20, water:90 },
  { id:'roasted-veg',     cat:'side',    icon:'🔥', name:{en:'Roasted vegetables (200 g)',    fr:'Légumes rôtis (200 g)',           'zh-CN':'烤蔬菜 (200 g)',       'zh-TW':'烤蔬菜 (200 g)'},       co2:0.30, water:120 },
  { id:'garlic-bread',    cat:'side',    icon:'🥖', name:{en:'Garlic bread (50 g)',           fr:'Pain à l\'ail (50 g)',            'zh-CN':'蒜香面包 (50 g)',      'zh-TW':'蒜香麵包 (50 g)'},      co2:0.20, water:60 },
  { id:'naan',            cat:'side',    icon:'🫓', name:{en:'Naan bread (100 g)',            fr:'Pain naan (100 g)',               'zh-CN':'印度烤饼 (100 g)',     'zh-TW':'印度烤餅 (100 g)'},     co2:0.30, water:120 },
  { id:'coleslaw',        cat:'side',    icon:'🥗', name:{en:'Coleslaw (100 g)',              fr:'Coleslaw (100 g)',                'zh-CN':'卷心菜沙拉 (100 g)',   'zh-TW':'高麗菜沙拉 (100 g)'},   co2:0.25, water:90 },

  // ── Sauces & dips ─────────────────────────────────────────
  { id:'hummus',          cat:'sauce',   icon:'🧆', name:{en:'Hummus (60 g)',                 fr:'Houmous (60 g)',                  'zh-CN':'鹰嘴豆泥 (60 g)',      'zh-TW':'鷹嘴豆泥 (60 g)'},      co2:0.15, water:90 },
  { id:'guacamole',       cat:'sauce',   icon:'🥑', name:{en:'Guacamole (60 g)',              fr:'Guacamole (60 g)',                'zh-CN':'鳄梨酱 (60 g)',        'zh-TW':'酪梨醬 (60 g)'},        co2:0.25, water:120 },
  { id:'mayo',            cat:'sauce',   icon:'🥚', name:{en:'Mayonnaise (30 g)',             fr:'Mayonnaise (30 g)',               'zh-CN':'蛋黄酱 (30 g)',        'zh-TW':'美乃滋 (30 g)'},        co2:0.10, water:30 },
  { id:'ketchup',         cat:'sauce',   icon:'🍅', name:{en:'Ketchup (30 g)',                fr:'Ketchup (30 g)',                  'zh-CN':'番茄酱 (30 g)',        'zh-TW':'番茄醬 (30 g)'},        co2:0.03, water:10 },
  { id:'pesto',           cat:'sauce',   icon:'🌿', name:{en:'Pesto (30 g)',                  fr:'Pesto (30 g)',                    'zh-CN':'青酱 (30 g)',          'zh-TW':'青醬 (30 g)'},          co2:0.20, water:90 },
  { id:'soy-sauce',       cat:'sauce',   icon:'🍶', name:{en:'Soy sauce (15 ml)',             fr:'Sauce soja (15 ml)',              'zh-CN':'酱油 (15 ml)',         'zh-TW':'醬油 (15 ml)'},         co2:0.03, water:25 },

  // ── Drinks ────────────────────────────────────────────────
  { id:'tap-water',       cat:'drink',   icon:'💧', name:{en:'Tap water (500 ml)',            fr:'Eau du robinet (500 ml)',         'zh-CN':'自来水 (500 ml)',      'zh-TW':'自來水 (500 ml)'},      co2:0.0005,water:0.5 },
  { id:'bottled-water',   cat:'drink',   icon:'🧴', name:{en:'Bottled water (500 ml)',        fr:'Eau en bouteille (500 ml)',       'zh-CN':'瓶装水 (500 ml)',      'zh-TW':'瓶裝水 (500 ml)'},      co2:0.20, water:3 },
  { id:'cola',            cat:'drink',   icon:'🥤', name:{en:'Cola (330 ml)',                 fr:'Cola (330 ml)',                   'zh-CN':'可乐 (330 ml)',        'zh-TW':'可樂 (330 ml)'},        co2:0.17, water:170 },
  { id:'beer',            cat:'drink',   icon:'🍺', name:{en:'Beer pint (500 ml)',            fr:'Pinte de bière (500 ml)',         'zh-CN':'啤酒 (500 ml)',        'zh-TW':'啤酒 (500 ml)'},        co2:0.70, water:150 },
  { id:'wine',            cat:'drink',   icon:'🍷', name:{en:'Wine glass (175 ml)',           fr:'Verre de vin (175 ml)',           'zh-CN':'葡萄酒 (175 ml)',      'zh-TW':'葡萄酒 (175 ml)'},      co2:0.40, water:110 },
  { id:'coffee',          cat:'drink',   icon:'☕', name:{en:'Coffee (250 ml)',               fr:'Café (250 ml)',                   'zh-CN':'咖啡 (250 ml)',        'zh-TW':'咖啡 (250 ml)'},        co2:0.40, water:140 },
  { id:'tea',             cat:'drink',   icon:'🍵', name:{en:'Tea (250 ml)',                  fr:'Thé (250 ml)',                    'zh-CN':'茶 (250 ml)',          'zh-TW':'茶 (250 ml)'},          co2:0.05, water:30 },
  { id:'milk-cow',        cat:'drink',   icon:'🥛', name:{en:'Cow milk (250 ml)',             fr:'Lait de vache (250 ml)',          'zh-CN':'牛奶 (250 ml)',        'zh-TW':'牛奶 (250 ml)'},        co2:0.80, water:250 },
  { id:'milk-oat',        cat:'drink',   icon:'🌾', name:{en:'Oat milk (250 ml)',             fr:'Lait d\'avoine (250 ml)',         'zh-CN':'燕麦奶 (250 ml)',      'zh-TW':'燕麥奶 (250 ml)'},      co2:0.18, water:12 },
  { id:'milk-soy',        cat:'drink',   icon:'🫘', name:{en:'Soy milk (250 ml)',             fr:'Lait de soja (250 ml)',           'zh-CN':'豆奶 (250 ml)',        'zh-TW':'豆奶 (250 ml)'},        co2:0.20, water:70 },
  { id:'milk-almond',     cat:'drink',   icon:'🥜', name:{en:'Almond milk (250 ml)',          fr:'Lait d\'amande (250 ml)',         'zh-CN':'杏仁奶 (250 ml)',      'zh-TW':'杏仁奶 (250 ml)'},      co2:0.20, water:180 },
  { id:'orange-juice',    cat:'drink',   icon:'🧃', name:{en:'Orange juice (250 ml)',         fr:'Jus d\'orange (250 ml)',          'zh-CN':'橙汁 (250 ml)',        'zh-TW':'柳橙汁 (250 ml)'},      co2:0.40, water:290 },

  // ── Desserts ──────────────────────────────────────────────
  { id:'choc-cake',       cat:'dessert', icon:'🍰', name:{en:'Chocolate cake slice (100 g)',  fr:'Part de gâteau au chocolat (100 g)','zh-CN':'巧克力蛋糕 (100 g)','zh-TW':'巧克力蛋糕 (100 g)'}, co2:1.10, water:600 },
  { id:'icecream',        cat:'dessert', icon:'🍨', name:{en:'Ice cream scoop (60 g)',        fr:'Boule de glace (60 g)',           'zh-CN':'冰淇淋球 (60 g)',      'zh-TW':'冰淇淋球 (60 g)'},      co2:0.30, water:120 },
  { id:'sorbet',          cat:'dessert', icon:'🍧', name:{en:'Fruit sorbet (60 g)',           fr:'Sorbet aux fruits (60 g)',        'zh-CN':'水果冰沙 (60 g)',      'zh-TW':'水果雪酪 (60 g)'},      co2:0.08, water:50 },
  { id:'apple',           cat:'dessert', icon:'🍎', name:{en:'Apple (1 piece)',               fr:'Pomme (1 unité)',                 'zh-CN':'苹果 (1 个)',          'zh-TW':'蘋果 (1 顆)'},          co2:0.10, water:120 },
  { id:'yogurt',          cat:'dessert', icon:'🥣', name:{en:'Yogurt (150 g)',                fr:'Yaourt (150 g)',                  'zh-CN':'酸奶 (150 g)',         'zh-TW':'優格 (150 g)'},         co2:0.40, water:150 },
];

const MC_CATEGORIES = ['main','side','sauce','drink','dessert'];

const MC_PRESETS = {
  burger:    { a: { name:{en:'Beef Burger Combo',     fr:'Combo burger bœuf',      'zh-CN':'牛肉汉堡套餐',    'zh-TW':'牛肉漢堡套餐'},    items:['beef-burger','fries','cola','ketchup'] },
               b: { name:{en:'Lentil Burger Combo',   fr:'Combo burger lentilles', 'zh-CN':'扁豆汉堡套餐',    'zh-TW':'扁豆漢堡套餐'},    items:['lentil-burger','fries','tap-water','ketchup'] } },
  steakbowl: { a: { name:{en:'Steak Dinner',          fr:'Dîner steak',            'zh-CN':'牛排晚餐',        'zh-TW':'牛排晚餐'},        items:['steak','mash','steamed-veg','wine'] },
               b: { name:{en:'Vegan Bowl',            fr:'Bol végan',              'zh-CN':'纯素碗',          'zh-TW':'純素碗'},          items:['chickpea-curry','rice-brown','steamed-veg','tap-water'] } },
  pizza:     { a: { name:{en:'Pepperoni Night',       fr:'Soirée pepperoni',       'zh-CN':'辣肠披萨之夜',    'zh-TW':'辣腸披薩之夜'},    items:['pepperoni','garden-salad','beer'] },
               b: { name:{en:'Margherita Night',      fr:'Soirée margherita',      'zh-CN':'玛格丽特之夜',    'zh-TW':'瑪格麗特之夜'},    items:['margherita','garden-salad','tap-water'] } },
  taco:      { a: { name:{en:'Beef Taco Plate',       fr:'Assiette tacos bœuf',    'zh-CN':'牛肉塔可餐',      'zh-TW':'牛肉塔可餐'},      items:['beef-tacos','guacamole','cola'] },
               b: { name:{en:'Veggie Taco Plate',     fr:'Assiette tacos veggie',  'zh-CN':'素塔可餐',        'zh-TW':'素塔可餐'},        items:['veg-tacos','guacamole','tap-water'] } },
  milk:      { a: { name:{en:'Dairy Latte',           fr:'Latte au lait',          'zh-CN':'牛奶拿铁',        'zh-TW':'牛奶拿鐵'},        items:['coffee','milk-cow'] },
               b: { name:{en:'Oat Milk Latte',        fr:'Latte avoine',           'zh-CN':'燕麦拿铁',        'zh-TW':'燕麥拿鐵'},        items:['coffee','milk-oat'] } },
};

function mcFoodById(id) { return MC_FOODS.find(f => f.id === id); }
function mcCatLabel(cat) {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  return t('mc.cat.' + cat);
}
function mcFoodName(food) {
  if (!food) return '';
  const lang = (window.i18n && window.i18n.getLang) ? window.i18n.getLang() : 'en';
  return (food.name[lang] || food.name.en);
}
function mcPresetName(p, side) {
  const lang = (window.i18n && window.i18n.getLang) ? window.i18n.getLang() : 'en';
  return p[side].name[lang] || p[side].name.en;
}

const mcState = {
  A: { name: 'Beef Burger Combo', items: ['beef-burger','fries','cola','ketchup'], cat: 'main' },
  B: { name: 'Lentil Burger Combo', items: ['lentil-burger','fries','tap-water','ketchup'], cat: 'main' },
};

function mcPopulateCatSelect(side) {
  const sel = document.querySelector(`[data-mc-cat="${side}"]`);
  if (!sel) return;
  sel.innerHTML = '';
  for (const c of MC_CATEGORIES) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = mcCatLabel(c);
    if (c === mcState[side].cat) opt.selected = true;
    sel.appendChild(opt);
  }
}
function mcPopulateItemSelect(side) {
  const sel = document.querySelector(`[data-mc-item="${side}"]`);
  if (!sel) return;
  const cat = mcState[side].cat;
  sel.innerHTML = '';
  MC_FOODS.filter(f => f.cat === cat).forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.icon + ' ' + mcFoodName(f);
    sel.appendChild(opt);
  });
}

function mcAddItem(side, id) {
  if (!mcFoodById(id)) return;
  mcState[side].items.push(id);
  mcRender();
}
function mcRemoveItem(side, idx) {
  mcState[side].items.splice(idx, 1);
  mcRender();
}
function mcClearPlate(side) {
  mcState[side].items = [];
  mcRender();
}
function mcLoadPreset(key) {
  const p = MC_PRESETS[key];
  if (!p) return;
  mcState.A.name  = mcPresetName(p, 'a');
  mcState.A.items = p.a.items.slice();
  mcState.B.name  = mcPresetName(p, 'b');
  mcState.B.items = p.b.items.slice();
  const nameA = document.querySelector('[data-mc-name="A"]');
  const nameB = document.querySelector('[data-mc-name="B"]');
  if (nameA) nameA.value = mcState.A.name;
  if (nameB) nameB.value = mcState.B.name;
  mcRender();
}

function mcPlateTotals(side) {
  let co2 = 0, water = 0;
  for (const id of mcState[side].items) {
    const f = mcFoodById(id);
    if (f) { co2 += f.co2; water += f.water; }
  }
  return { co2, water };
}

function mcFmtCO2(kg)   { if (kg < 1)   return (kg * 1000).toFixed(0) + ' g'; return kg.toFixed(kg < 10 ? 2 : 1) + ' kg'; }
function mcFmtWater(L)  { if (L < 1)    return (L * 1000).toFixed(0) + ' ml'; if (L >= 1000) return (L / 1000).toFixed(1) + ' m³'; return Math.round(L) + ' L'; }

function mcRenderPlateList(side) {
  const list = document.querySelector(`[data-mc-list="${side}"]`);
  const totals = document.querySelector(`[data-mc-totals="${side}"]`);
  if (!list || !totals) return;
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  if (mcState[side].items.length === 0) {
    list.innerHTML = `<li class="mc-plate-empty">${escapeHTML(t('mc.empty'))}</li>`;
  } else {
    list.innerHTML = mcState[side].items.map((id, idx) => {
      const f = mcFoodById(id);
      if (!f) return '';
      return `<li class="mc-plate-item">
        <span class="mc-item-icon">${f.icon}</span>
        <span class="mc-item-name">${escapeHTML(mcFoodName(f))}</span>
        <span class="mc-item-co2">${escapeHTML(mcFmtCO2(f.co2))}</span>
        <span class="mc-item-water">${escapeHTML(mcFmtWater(f.water))}</span>
        <button type="button" class="mc-item-remove" data-mc-remove="${side}" data-mc-idx="${idx}" aria-label="remove">×</button>
      </li>`;
    }).join('');
  }
  const tot = mcPlateTotals(side);
  totals.innerHTML = `
    <div class="mc-total-row">
      <span class="mc-total-label">🌫️ ${escapeHTML(t('mc.co2'))}</span>
      <strong class="mc-total-val">${escapeHTML(mcFmtCO2(tot.co2))}</strong>
    </div>
    <div class="mc-total-row">
      <span class="mc-total-label">💧 ${escapeHTML(t('mc.water'))}</span>
      <strong class="mc-total-val">${escapeHTML(mcFmtWater(tot.water))}</strong>
    </div>
  `;
}

function mcRenderChart(totA, totB) {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const chart = document.getElementById('mc-chart');
  if (!chart) return;
  const maxCo2   = Math.max(totA.co2,   totB.co2,   0.001);
  const maxWater = Math.max(totA.water, totB.water, 0.1);
  const pct = (v, m) => Math.max(2, Math.min(100, (v / m) * 100));

  chart.innerHTML = `
    <div class="mc-chart-group">
      <h4 class="mc-chart-group-title">🌫️ ${escapeHTML(t('mc.co2'))}</h4>
      <div class="mc-bar-row">
        <span class="mc-bar-label">${escapeHTML(mcState.A.name || 'A')}</span>
        <div class="mc-bar-track"><div class="mc-bar mc-bar-a" style="width:${pct(totA.co2, maxCo2)}%"></div></div>
        <span class="mc-bar-value">${escapeHTML(mcFmtCO2(totA.co2))}</span>
      </div>
      <div class="mc-bar-row">
        <span class="mc-bar-label">${escapeHTML(mcState.B.name || 'B')}</span>
        <div class="mc-bar-track"><div class="mc-bar mc-bar-b" style="width:${pct(totB.co2, maxCo2)}%"></div></div>
        <span class="mc-bar-value">${escapeHTML(mcFmtCO2(totB.co2))}</span>
      </div>
    </div>
    <div class="mc-chart-group">
      <h4 class="mc-chart-group-title">💧 ${escapeHTML(t('mc.water'))}</h4>
      <div class="mc-bar-row">
        <span class="mc-bar-label">${escapeHTML(mcState.A.name || 'A')}</span>
        <div class="mc-bar-track"><div class="mc-bar mc-bar-water-a" style="width:${pct(totA.water, maxWater)}%"></div></div>
        <span class="mc-bar-value">${escapeHTML(mcFmtWater(totA.water))}</span>
      </div>
      <div class="mc-bar-row">
        <span class="mc-bar-label">${escapeHTML(mcState.B.name || 'B')}</span>
        <div class="mc-bar-track"><div class="mc-bar mc-bar-water-b" style="width:${pct(totB.water, maxWater)}%"></div></div>
        <span class="mc-bar-value">${escapeHTML(mcFmtWater(totB.water))}</span>
      </div>
    </div>
  `;
}

function mcRenderVerdict(totA, totB) {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('mc-verdict');
  if (!wrap) return;
  if (mcState.A.items.length === 0 && mcState.B.items.length === 0) {
    wrap.innerHTML = `<div class="mc-verdict-empty">${escapeHTML(t('mc.verdictEmpty'))}</div>`;
    return;
  }
  if (totA.co2 === totB.co2 && totA.water === totB.water) {
    wrap.innerHTML = `<div class="mc-verdict-tie">⚖️ ${escapeHTML(t('mc.verdictTie'))}</div>`;
    return;
  }
  // Identify the "lighter" plate (lower CO₂)
  const lighter   = totA.co2 <= totB.co2 ? 'A' : 'B';
  const heavier   = lighter === 'A' ? 'B' : 'A';
  const tLight    = lighter === 'A' ? totA : totB;
  const tHeavy    = heavier === 'A' ? totA : totB;
  const co2Saved   = tHeavy.co2   - tLight.co2;
  const waterSaved = tHeavy.water - tLight.water;
  const co2Pct     = tHeavy.co2   > 0 ? Math.round((co2Saved   / tHeavy.co2)   * 100) : 0;
  const waterPct   = tHeavy.water > 0 ? Math.round((waterSaved / tHeavy.water) * 100) : 0;
  // Equivalents
  const carKm    = (co2Saved * 1000) / 170;   // 170 g CO2/km, avg ICE car
  const showers  = waterSaved / 65;           // ~65 L per 8-min shower
  const lighterName = mcState[lighter].name || (lighter === 'A' ? 'Plate A' : 'Plate B');
  const heavierName = mcState[heavier].name || (heavier === 'A' ? 'Plate A' : 'Plate B');

  wrap.innerHTML = `
    <div class="mc-verdict-card mc-verdict-card-${lighter.toLowerCase()}">
      <div class="mc-verdict-headline">🌍 <strong>${escapeHTML(lighterName)}</strong> ${escapeHTML(t('mc.verdictWinsOver'))} <strong>${escapeHTML(heavierName)}</strong></div>
      <div class="mc-verdict-stats">
        <div class="mc-verdict-stat">
          <span class="mc-verdict-icon">🌫️</span>
          <span class="mc-verdict-num">−${escapeHTML(mcFmtCO2(co2Saved))}</span>
          <span class="mc-verdict-sub">${escapeHTML(t('mc.co2Saved'))} (${co2Pct}%)</span>
        </div>
        <div class="mc-verdict-stat">
          <span class="mc-verdict-icon">💧</span>
          <span class="mc-verdict-num">−${escapeHTML(mcFmtWater(waterSaved))}</span>
          <span class="mc-verdict-sub">${escapeHTML(t('mc.waterSaved'))} (${waterPct}%)</span>
        </div>
      </div>
      <div class="mc-verdict-equiv">
        <span>🚗 ≈ ${Math.round(carKm)} ${escapeHTML(t('mc.kmCar'))}</span>
        <span>🚿 ≈ ${showers.toFixed(1)} ${escapeHTML(t('mc.showers'))}</span>
      </div>
    </div>
  `;
}

function mcRender() {
  mcPopulateCatSelect('A');
  mcPopulateCatSelect('B');
  mcPopulateItemSelect('A');
  mcPopulateItemSelect('B');
  mcRenderPlateList('A');
  mcRenderPlateList('B');
  const totA = mcPlateTotals('A');
  const totB = mcPlateTotals('B');
  mcRenderChart(totA, totB);
  mcRenderVerdict(totA, totB);
}

function mcRefreshStatic() {
  // Re-render to pick up the new language for category labels, names, etc.
  mcRender();
}

// Wire up
document.querySelectorAll('[data-mc-cat]').forEach(sel => {
  sel.addEventListener('change', e => {
    const side = sel.dataset.mcCat;
    mcState[side].cat = e.target.value;
    mcPopulateItemSelect(side);
  });
});
document.querySelectorAll('[data-mc-add]').forEach(btn => {
  btn.addEventListener('click', () => {
    const side = btn.dataset.mcAdd;
    const itemSel = document.querySelector(`[data-mc-item="${side}"]`);
    if (itemSel && itemSel.value) mcAddItem(side, itemSel.value);
  });
});
document.querySelectorAll('[data-mc-name]').forEach(inp => {
  inp.addEventListener('input', e => {
    const side = inp.dataset.mcName;
    mcState[side].name = (e.target.value || '').trim();
    const totA = mcPlateTotals('A');
    const totB = mcPlateTotals('B');
    mcRenderChart(totA, totB);
    mcRenderVerdict(totA, totB);
  });
});
document.querySelectorAll('.mc-plate-items').forEach(ul => {
  ul.addEventListener('click', e => {
    const btn = e.target.closest('.mc-item-remove');
    if (!btn) return;
    const side = btn.dataset.mcRemove;
    const idx  = parseInt(btn.dataset.mcIdx, 10);
    if (side && !isNaN(idx)) mcRemoveItem(side, idx);
  });
});
document.querySelectorAll('[data-mc-preset]').forEach(btn => {
  btn.addEventListener('click', () => mcLoadPreset(btn.dataset.mcPreset));
});

mcRender();

// ── Vampire Power Calculator ─────────────────────────────────────────
const VAMP_APPLIANCES = [
  { id: 'tv',           e: '📺', w: 1.0, name: { en: 'TV (LED, standby)',         fr: 'Téléviseur (LED, veille)',      'zh-CN': '电视 (LED, 待机)',     'zh-TW': '電視 (LED, 待機)' } },
  { id: 'console',      e: '🎮', w: 10,  name: { en: 'Game console (rest mode)',  fr: 'Console de jeu (veille)',       'zh-CN': '游戏主机 (待机)',      'zh-TW': '遊戲主機 (待機)' } },
  { id: 'setbox',       e: '📡', w: 17,  name: { en: 'Set-top / cable box',       fr: 'Décodeur TV',                   'zh-CN': '机顶盒',             'zh-TW': '機上盒' } },
  { id: 'router',       e: '📶', w: 7,   name: { en: 'Wi-Fi router / modem',      fr: 'Box internet / routeur',        'zh-CN': '路由器 / 调制解调器',  'zh-TW': '路由器 / 數據機' } },
  { id: 'desktop',      e: '🖥️', w: 5,  name: { en: 'Desktop PC (sleep)',        fr: 'Ordinateur de bureau (veille)', 'zh-CN': '台式电脑 (睡眠)',      'zh-TW': '桌上型電腦 (睡眠)' } },
  { id: 'monitor',      e: '🖥️', w: 1.5,name: { en: 'External monitor (standby)',fr: 'Écran externe (veille)',        'zh-CN': '外接显示器 (待机)',    'zh-TW': '外接螢幕 (待機)' } },
  { id: 'laptopcharger',e: '💻', w: 0.3, name: { en: 'Laptop charger (no laptop)',fr: 'Chargeur portable (sans PC)',   'zh-CN': '笔电充电器 (未接电脑)','zh-TW': '筆電充電器 (未接電腦)' } },
  { id: 'phonecharger', e: '📱', w: 0.2, name: { en: 'Phone charger (empty)',     fr: 'Chargeur de téléphone (vide)',  'zh-CN': '手机充电器 (未接)',    'zh-TW': '手機充電器 (未接)' } },
  { id: 'microwave',    e: '🍲', w: 3,   name: { en: 'Microwave (clock)',         fr: 'Micro-ondes (horloge)',         'zh-CN': '微波炉 (时钟)',       'zh-TW': '微波爐 (時鐘)' } },
  { id: 'coffee',       e: '☕', w: 2,   name: { en: 'Coffee maker (clock)',      fr: 'Cafetière (horloge)',           'zh-CN': '咖啡机 (时钟)',       'zh-TW': '咖啡機 (時鐘)' } },
  { id: 'oven',         e: '🍞', w: 2,   name: { en: 'Toaster oven / oven clock', fr: 'Four (horloge)',                'zh-CN': '烤箱 (时钟)',         'zh-TW': '烤箱 (時鐘)' } },
  { id: 'ac',           e: '❄️', w: 2,  name: { en: 'Air conditioner (off)',     fr: 'Climatiseur (éteint)',          'zh-CN': '空调 (待机)',         'zh-TW': '冷氣 (待機)' } },
  { id: 'washer',       e: '🧺', w: 1,   name: { en: 'Washing machine',           fr: 'Lave-linge',                    'zh-CN': '洗衣机',             'zh-TW': '洗衣機' } },
  { id: 'dishwasher',   e: '🍽️', w: 1.5,name: { en: 'Dishwasher',                fr: 'Lave-vaisselle',                'zh-CN': '洗碗机',             'zh-TW': '洗碗機' } },
  { id: 'stereo',       e: '🔊', w: 5,   name: { en: 'Stereo / hi-fi',            fr: 'Chaîne hi-fi',                  'zh-CN': '音响 / Hi-Fi',       'zh-TW': '音響 / Hi-Fi' } },
  { id: 'smartspk',     e: '🗣️', w: 2,  name: { en: 'Smart speaker (always-on)', fr: 'Enceinte connectée',            'zh-CN': '智能音箱',           'zh-TW': '智慧喇叭' } },
  { id: 'smarthub',     e: '🏠', w: 3,   name: { en: 'Smart-home hub',            fr: 'Hub domotique',                 'zh-CN': '智能家居中枢',        'zh-TW': '智慧家庭中樞' } },
  { id: 'dvd',          e: '💿', w: 5,   name: { en: 'DVD / Blu-ray player',      fr: 'Lecteur DVD / Blu-ray',         'zh-CN': 'DVD / 蓝光播放器',    'zh-TW': 'DVD / 藍光播放器' } },
  { id: 'printer',      e: '🖨️', w: 4,  name: { en: 'Printer (idle)',            fr: 'Imprimante (en veille)',        'zh-CN': '打印机 (待机)',       'zh-TW': '印表機 (待機)' } },
  { id: 'toothbrush',   e: '🪥', w: 1,   name: { en: 'Electric toothbrush base',  fr: 'Base brosse à dents élec.',     'zh-CN': '电动牙刷底座',        'zh-TW': '電動牙刷底座' } },
  { id: 'drillcharger', e: '🔧', w: 1,   name: { en: 'Power-tool charger',        fr: 'Chargeur outils élec.',         'zh-CN': '电动工具充电座',      'zh-TW': '電動工具充電座' } },
  { id: 'lamp',         e: '💡', w: 1,   name: { en: 'Touch / smart lamp (off)',  fr: 'Lampe tactile / connectée',     'zh-CN': '触控 / 智能灯',       'zh-TW': '觸控 / 智慧燈' } },
  { id: 'kettle',       e: '🫖', w: 2,   name: { en: 'Electric kettle (smart)',   fr: 'Bouilloire électrique',         'zh-CN': '电热水壶 (智能)',     'zh-TW': '電熱水壺 (智慧)' } },
  { id: 'subwoofer',    e: '🎵', w: 3,   name: { en: 'Subwoofer / amplifier',     fr: 'Caisson de basses / ampli',     'zh-CN': '低音炮 / 功放',       'zh-TW': '重低音 / 擴大機' } },
];

const VAMP_REGIONS = [
  { id: 'us', price: 0.16, currency: '$',   grid: 380, label: { en: '🇺🇸 United States', fr: '🇺🇸 États-Unis',   'zh-CN': '🇺🇸 美国',     'zh-TW': '🇺🇸 美國' } },
  { id: 'eu', price: 0.28, currency: '€',   grid: 250, label: { en: '🇪🇺 EU average',    fr: '🇪🇺 Moyenne UE',   'zh-CN': '🇪🇺 欧盟平均', 'zh-TW': '🇪🇺 歐盟平均' } },
  { id: 'uk', price: 0.27, currency: '£',   grid: 200, label: { en: '🇬🇧 United Kingdom',fr: '🇬🇧 Royaume-Uni',  'zh-CN': '🇬🇧 英国',     'zh-TW': '🇬🇧 英國' } },
  { id: 'fr', price: 0.21, currency: '€',   grid: 60,  label: { en: '🇫🇷 France',        fr: '🇫🇷 France',       'zh-CN': '🇫🇷 法国',     'zh-TW': '🇫🇷 法國' } },
  { id: 'de', price: 0.36, currency: '€',   grid: 380, label: { en: '🇩🇪 Germany',       fr: '🇩🇪 Allemagne',    'zh-CN': '🇩🇪 德国',     'zh-TW': '🇩🇪 德國' } },
  { id: 'cn', price: 0.55, currency: '¥',   grid: 580, label: { en: '🇨🇳 China',         fr: '🇨🇳 Chine',        'zh-CN': '🇨🇳 中国',     'zh-TW': '🇨🇳 中國' } },
  { id: 'tw', price: 3.50, currency: 'NT$', grid: 500, label: { en: '🇹🇼 Taiwan',        fr: '🇹🇼 Taïwan',       'zh-CN': '🇹🇼 台湾',     'zh-TW': '🇹🇼 台灣' } },
  { id: 'jp', price: 30,   currency: '¥',   grid: 480, label: { en: '🇯🇵 Japan',         fr: '🇯🇵 Japon',        'zh-CN': '🇯🇵 日本',     'zh-TW': '🇯🇵 日本' } },
  { id: 'au', price: 0.34, currency: 'A$',  grid: 500, label: { en: '🇦🇺 Australia',     fr: '🇦🇺 Australie',    'zh-CN': '🇦🇺 澳大利亚', 'zh-TW': '🇦🇺 澳洲' } },
  { id: 'ca', price: 0.17, currency: 'C$',  grid: 130, label: { en: '🇨🇦 Canada',        fr: '🇨🇦 Canada',       'zh-CN': '🇨🇦 加拿大',   'zh-TW': '🇨🇦 加拿大' } },
  { id: 'in', price: 6,    currency: '₹',   grid: 720, label: { en: '🇮🇳 India',         fr: '🇮🇳 Inde',         'zh-CN': '🇮🇳 印度',     'zh-TW': '🇮🇳 印度' } },
];

const VAMP_TYPICAL = ['tv','console','setbox','router','phonecharger','microwave','coffee'];

const vampState = {
  region: 'us',
  price: 0.16,
  currency: '$',
  grid: 380,
  counts: Object.create(null),
};

function vampDetectRegion() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const loc = (navigator.language || 'en-US').toLowerCase();
    if (/Tokyo/i.test(tz) || loc.startsWith('ja')) return 'jp';
    if (/Taipei/i.test(tz) || loc === 'zh-tw') return 'tw';
    if (/Shanghai|Chongqing|Hong_Kong/i.test(tz) || loc === 'zh-cn') return 'cn';
    if (/Sydney|Melbourne|Brisbane|Perth/i.test(tz)) return 'au';
    if (/Toronto|Vancouver|Montreal|Halifax|Edmonton|Winnipeg/i.test(tz)) return 'ca';
    if (/London/i.test(tz) || loc === 'en-gb') return 'uk';
    if (/Paris/i.test(tz) || loc.startsWith('fr')) return 'fr';
    if (/Berlin|Munich/i.test(tz) || loc.startsWith('de')) return 'de';
    if (/Kolkata|Calcutta|Delhi/i.test(tz)) return 'in';
    if (/New_York|Chicago|Los_Angeles|Denver|Phoenix|Anchorage|Honolulu/i.test(tz) || loc === 'en-us') return 'us';
    if (/Europe\//.test(tz)) return 'eu';
  } catch (_) {}
  return 'us';
}

function vampRegion(id) { return VAMP_REGIONS.find(r => r.id === id) || VAMP_REGIONS[0]; }
function vampApplianceName(a) {
  const lang = (window.i18n && window.i18n.lang) ? window.i18n.lang : 'en';
  return a.name[lang] || a.name.en;
}
function vampRegionLabel(r) {
  const lang = (window.i18n && window.i18n.lang) ? window.i18n.lang : 'en';
  return r.label[lang] || r.label.en;
}

function vampPopulateRegions() {
  const sel = document.getElementById('vamp-region');
  if (!sel) return;
  sel.innerHTML = VAMP_REGIONS.map(r => `<option value="${r.id}">${escapeHTML(vampRegionLabel(r))}</option>`).join('');
  sel.value = vampState.region;
}

function vampApplyRegion(id) {
  const r = vampRegion(id);
  vampState.region = r.id;
  vampState.price = r.price;
  vampState.currency = r.currency;
  vampState.grid = r.grid;
  const priceInput = document.getElementById('vamp-price');
  const gridInput = document.getElementById('vamp-grid');
  const cur = document.getElementById('vamp-price-currency');
  if (priceInput) priceInput.value = r.price;
  if (gridInput) gridInput.value = r.grid;
  if (cur) cur.textContent = `${r.currency} / kWh`;
}

function vampFmtMoney(v) {
  if (v >= 100) return v.toFixed(0);
  return v.toFixed(2);
}

function vampRenderList() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('vamp-grid-list');
  if (!wrap) return;
  wrap.innerHTML = VAMP_APPLIANCES.map(a => {
    const count = vampState.counts[a.id] || 0;
    const on = count > 0;
    const kwh = (a.w * 24 * 365 / 1000);
    const wDisplay = a.w < 1 ? a.w.toFixed(1) : a.w.toFixed(0);
    return `
      <label class="vamp-item${on ? ' on' : ''}">
        <input type="checkbox" class="vamp-check" data-vamp-check="${a.id}"${on ? ' checked' : ''}>
        <span class="vamp-item-icon">${a.e}</span>
        <span class="vamp-item-body">
          <span class="vamp-item-name">${escapeHTML(vampApplianceName(a))}</span>
          <span class="vamp-item-meta">${wDisplay} W · ${kwh.toFixed(1)} kWh/${escapeHTML(t('vamp.yearShort'))}</span>
        </span>
        <span class="vamp-item-qty">
          <button type="button" class="vamp-qty-btn" data-vamp-qty="-" data-vamp-id="${a.id}" aria-label="decrease">−</button>
          <span class="vamp-qty-val">${count}</span>
          <button type="button" class="vamp-qty-btn" data-vamp-qty="+" data-vamp-id="${a.id}" aria-label="increase">+</button>
        </span>
      </label>
    `;
  }).join('');
}

function vampCompute() {
  let kwh = 0;
  const breakdown = [];
  VAMP_APPLIANCES.forEach(a => {
    const c = vampState.counts[a.id] || 0;
    if (c <= 0) return;
    const item_kwh = a.w * 24 * 365 / 1000 * c;
    kwh += item_kwh;
    breakdown.push({ a, c, kwh: item_kwh });
  });
  breakdown.sort((x, y) => y.kwh - x.kwh);
  const cost = kwh * (parseFloat(vampState.price) || 0);
  const co2 = kwh * (parseFloat(vampState.grid) || 0) / 1000;
  return { kwh, cost, co2, breakdown };
}

function vampRenderResults() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('vamp-results');
  if (!wrap) return;
  const { kwh, cost, co2, breakdown } = vampCompute();
  if (breakdown.length === 0) {
    wrap.innerHTML = `<div class="vamp-empty">${escapeHTML(t('vamp.empty'))}</div>`;
    return;
  }
  const phoneCharges = Math.round(kwh / 0.015);
  const ledHours     = Math.round(kwh / 0.01);
  const trees        = (co2 / 21).toFixed(1);
  const kmCar        = Math.round(co2 / 0.17);

  const breakdownHTML = breakdown.slice(0, 8).map(b => {
    const pct = Math.max(2, Math.min(100, b.kwh / kwh * 100));
    return `
      <div class="vamp-bar-row">
        <span class="vamp-bar-name">${b.a.e} ${escapeHTML(vampApplianceName(b.a))}${b.c > 1 ? ' ×' + b.c : ''}</span>
        <div class="vamp-bar-track"><div class="vamp-bar" style="width:${pct}%"></div></div>
        <span class="vamp-bar-val">${b.kwh.toFixed(1)} kWh</span>
      </div>
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="vamp-headline-grid">
      <div class="vamp-headline">
        <div class="vamp-headline-icon">⚡</div>
        <div class="vamp-headline-num">${kwh.toFixed(1)}</div>
        <div class="vamp-headline-unit">kWh / ${escapeHTML(t('vamp.year'))}</div>
      </div>
      <div class="vamp-headline">
        <div class="vamp-headline-icon">💸</div>
        <div class="vamp-headline-num">${escapeHTML(vampState.currency)}${vampFmtMoney(cost)}</div>
        <div class="vamp-headline-unit">/ ${escapeHTML(t('vamp.year'))}</div>
      </div>
      <div class="vamp-headline">
        <div class="vamp-headline-icon">🌍</div>
        <div class="vamp-headline-num">${co2.toFixed(1)}</div>
        <div class="vamp-headline-unit">kg CO₂ / ${escapeHTML(t('vamp.year'))}</div>
      </div>
    </div>

    <div class="vamp-equiv">
      <div class="vamp-equiv-item">📱 <strong>${phoneCharges.toLocaleString()}</strong> ${escapeHTML(t('vamp.phoneCharges'))}</div>
      <div class="vamp-equiv-item">💡 <strong>${ledHours.toLocaleString()}</strong> ${escapeHTML(t('vamp.ledHours'))}</div>
      <div class="vamp-equiv-item">🌳 ≈ <strong>${trees}</strong> ${escapeHTML(t('vamp.trees'))}</div>
      <div class="vamp-equiv-item">🚗 ≈ <strong>${kmCar.toLocaleString()}</strong> ${escapeHTML(t('vamp.kmCar'))}</div>
    </div>

    <h4 class="vamp-breakdown-title">📊 ${escapeHTML(t('vamp.breakdownTitle'))}</h4>
    <div class="vamp-breakdown">${breakdownHTML}</div>

    <div class="vamp-tip">${escapeHTML(t('vamp.tip'))}</div>
  `;
}

function vampRender() {
  vampRenderList();
  vampRenderResults();
}

function vampToggle(id, on) {
  if (on) {
    if (!vampState.counts[id]) vampState.counts[id] = 1;
  } else {
    delete vampState.counts[id];
  }
}
function vampSetQty(id, delta) {
  const cur = vampState.counts[id] || 0;
  const next = Math.max(0, Math.min(20, cur + delta));
  if (next === 0) delete vampState.counts[id];
  else vampState.counts[id] = next;
}
function vampLoadTypical() {
  Object.keys(vampState.counts).forEach(k => delete vampState.counts[k]);
  VAMP_TYPICAL.forEach(id => { vampState.counts[id] = 1; });
  vampRender();
}
function vampCheckAll() {
  VAMP_APPLIANCES.forEach(a => { if (!vampState.counts[a.id]) vampState.counts[a.id] = 1; });
  vampRender();
}
function vampClearAll() {
  Object.keys(vampState.counts).forEach(k => delete vampState.counts[k]);
  vampRender();
}
function vampResetDefaults() {
  vampApplyRegion(vampDetectRegion());
  vampLoadTypical();
}
function vampRefreshStatic() {
  vampPopulateRegions();
  vampRender();
}

// Init
vampState.region = vampDetectRegion();
vampPopulateRegions();
vampApplyRegion(vampState.region);
VAMP_TYPICAL.forEach(id => { vampState.counts[id] = 1; });

(function wireVamp() {
  const regionSel = document.getElementById('vamp-region');
  if (regionSel) regionSel.addEventListener('change', () => { vampApplyRegion(regionSel.value); vampRenderResults(); });
  const priceInput = document.getElementById('vamp-price');
  if (priceInput) priceInput.addEventListener('input', () => { vampState.price = parseFloat(priceInput.value) || 0; vampRenderResults(); });
  const gridInput = document.getElementById('vamp-grid');
  if (gridInput) gridInput.addEventListener('input', () => { vampState.grid = parseFloat(gridInput.value) || 0; vampRenderResults(); });
  const resetBtn = document.getElementById('vamp-reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', vampResetDefaults);
  const allBtn = document.getElementById('vamp-all-btn');
  if (allBtn) allBtn.addEventListener('click', vampCheckAll);
  const noneBtn = document.getElementById('vamp-none-btn');
  if (noneBtn) noneBtn.addEventListener('click', vampClearAll);
  const typBtn = document.getElementById('vamp-typical-btn');
  if (typBtn) typBtn.addEventListener('click', vampLoadTypical);

  const listEl = document.getElementById('vamp-grid-list');
  if (listEl) {
    listEl.addEventListener('change', e => {
      const cb = e.target.closest('[data-vamp-check]');
      if (!cb) return;
      vampToggle(cb.dataset.vampCheck, cb.checked);
      vampRender();
    });
    listEl.addEventListener('click', e => {
      const btn = e.target.closest('[data-vamp-qty]');
      if (!btn) return;
      e.preventDefault();
      const delta = btn.dataset.vampQty === '+' ? 1 : -1;
      vampSetQty(btn.dataset.vampId, delta);
      vampRender();
    });
  }
})();

vampRender();

// ── Eco-Laundry Scheduler ────────────────────────────────────────────
const LAUNDRY_GEOCODE_URL  = 'https://geocoding-api.open-meteo.com/v1/search';
const LAUNDRY_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const laundryState = {
  cityLabel: '',
  lat: null,
  lon: null,
  hourly: null,
  daily: null,
  lastCity: '',
  loading: false,
  loaded: false,
  error: null,
};

function laundryDefaultCity() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const parts = tz.split('/');
    const city = (parts[parts.length - 1] || '').replace(/_/g, ' ');
    return city || 'London';
  } catch (_) { return 'London'; }
}

async function laundryGeocode(city) {
  const url = `${LAUNDRY_GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('geocode_failed');
  const j = await r.json();
  if (!j.results || j.results.length === 0) throw new Error('city_not_found');
  return j.results[0];
}

async function laundryFetchForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: 'temperature_2m,relativehumidity_2m,precipitation_probability,cloudcover,windspeed_10m,is_day',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    forecast_days: '2',
  });
  const r = await fetch(`${LAUNDRY_FORECAST_URL}?${params.toString()}`);
  if (!r.ok) throw new Error('forecast_failed');
  return r.json();
}

function laundryDryScore(h) {
  // Heavy rain → essentially 0
  if (h.precip >= 60) return 0;
  const humF   = 1 - Math.max(0, Math.min(1, (h.humidity - 30) / 60));   // best when ≤30%, worst at ≥90%
  const tempF  = Math.max(0, Math.min(1, (h.temp - 5) / 25));            // 0 at 5°C, 1 at 30°C+
  const windF  = Math.max(0, Math.min(1, h.wind / 20));                  // saturates at 20 km/h
  const cloudF = 1 - Math.min(1, (h.cloud || 0) / 100) * 0.3;
  const dayF   = h.is_day ? 1 : 0.55;
  const precipPenalty = Math.max(0, 1 - h.precip / 40);                  // 1 at 0%, 0 at ≥40%
  const raw = (humF * 0.45 + tempF * 0.25 + windF * 0.15 + cloudF * 0.15) * dayF * precipPenalty;
  return Math.round(Math.max(0, Math.min(100, raw * 100)));
}

function laundryClassify(score) {
  if (score >= 75) return { level: 'excellent', cls: 'level-excellent' };
  if (score >= 55) return { level: 'good',      cls: 'level-good' };
  if (score >= 35) return { level: 'ok',        cls: 'level-ok' };
  if (score >= 15) return { level: 'poor',      cls: 'level-poor' };
  return                  { level: 'bad',       cls: 'level-bad' };
}

function laundryBuildHourly(d) {
  const out = [];
  const h = d.hourly;
  const n = h.time.length;
  for (let i = 0; i < n; i++) {
    const obj = {
      iso: h.time[i],
      time: new Date(h.time[i]),
      temp: h.temperature_2m[i],
      humidity: h.relativehumidity_2m[i],
      precip: h.precipitation_probability[i] || 0,
      cloud: h.cloudcover[i] || 0,
      wind: h.windspeed_10m[i] || 0,
      is_day: !!h.is_day[i],
    };
    obj.score = laundryDryScore(obj);
    out.push(obj);
  }
  return out;
}

function laundryFindBestWashSlot(hours) {
  const now = Date.now();
  let best = null;
  for (let i = 0; i < hours.length - 3; i++) {
    if (hours[i].time.getTime() < now - 30 * 60 * 1000) continue;
    if (!hours[i].is_day) continue;
    const win = hours.slice(i, i + 4);
    const avg = win.reduce((s, x) => s + x.score, 0) / 4;
    if (!best || avg > best.avg) best = { start: hours[i], avg };
  }
  return best;
}

function laundryFindDryWindows(hours, threshold = 55) {
  const wins = [];
  let cur = null;
  for (const h of hours) {
    if (h.score >= threshold) {
      if (!cur) cur = { start: h, end: h, scores: [h.score] };
      else { cur.end = h; cur.scores.push(h.score); }
    } else {
      if (cur && cur.scores.length >= 2) wins.push(cur);
      cur = null;
    }
  }
  if (cur && cur.scores.length >= 2) wins.push(cur);
  return wins;
}

function laundryFmtHour(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}
function laundryFmtDateTime(d) {
  const today = new Date();
  const sameDay = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  const opts = sameDay
    ? { hour: 'numeric', hour12: true }
    : { weekday: 'short', hour: 'numeric', hour12: true };
  return d.toLocaleString(undefined, opts);
}

function laundryTips(now, windows, t) {
  const tips = [t('laundry.tip.cold'), t('laundry.tip.full')];
  if (windows.length > 0) tips.push(t('laundry.tip.lineDry'));
  else                    tips.push(t('laundry.tip.rack'));
  if (now && now.humidity > 78)  tips.push(t('laundry.tip.highHum'));
  if (now && now.wind > 15)      tips.push(t('laundry.tip.wind'));
  if (now && now.temp < 8)       tips.push(t('laundry.tip.cold_weather'));
  return tips.map(s => `<li>${escapeHTML(s)}</li>`).join('');
}

function laundryRender() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('laundry-results');
  const status = document.getElementById('laundry-status');
  if (!wrap) return;
  if (laundryState.loading) {
    if (status) status.textContent = '⏳ ' + t('laundry.loading');
    wrap.innerHTML = `<div class="laundry-empty">⏳ ${escapeHTML(t('laundry.loading'))}</div>`;
    return;
  }
  if (laundryState.error) {
    if (status) status.textContent = '';
    const msg = laundryState.error === 'city_not_found'
      ? t('laundry.errCity')
      : t('laundry.errLoad');
    wrap.innerHTML = `<div class="laundry-empty">⚠️ ${escapeHTML(msg)}</div>`;
    return;
  }
  if (!laundryState.hourly) {
    if (status) status.textContent = '';
    wrap.innerHTML = `<div class="laundry-empty">${escapeHTML(t('laundry.empty'))}</div>`;
    return;
  }
  if (status) status.textContent = '📍 ' + laundryState.cityLabel;
  const all = laundryState.hourly;
  const now = Date.now();
  const future = all.filter(h => h.time.getTime() >= now - 30 * 60 * 1000).slice(0, 24);
  const bestWash = laundryFindBestWashSlot(future);
  const windows  = laundryFindDryWindows(future);

  let headline;
  if (bestWash) {
    const cls = laundryClassify(bestWash.start.score);
    headline = `
      <div class="laundry-headline laundry-${cls.cls}">
        <div class="laundry-headline-icon">🧺</div>
        <div class="laundry-headline-body">
          <div class="laundry-headline-label">${escapeHTML(t('laundry.bestWash'))}</div>
          <div class="laundry-headline-time">${escapeHTML(laundryFmtDateTime(bestWash.start.time))}</div>
          <div class="laundry-headline-sub">${escapeHTML(t('laundry.dryScore'))}: <strong>${Math.round(bestWash.avg)}/100</strong> · ${escapeHTML(t('laundry.level.' + cls.level))}</div>
        </div>
      </div>`;
  } else {
    headline = `
      <div class="laundry-headline laundry-level-bad">
        <div class="laundry-headline-icon">☔</div>
        <div class="laundry-headline-body">
          <div class="laundry-headline-label">${escapeHTML(t('laundry.bestWash'))}</div>
          <div class="laundry-headline-time">${escapeHTML(t('laundry.noGoodSlot'))}</div>
          <div class="laundry-headline-sub">${escapeHTML(t('laundry.useDryer'))}</div>
        </div>
      </div>`;
  }

  const nowH = future[0];
  const conditions = nowH ? `
    <div class="laundry-conditions">
      <div class="laundry-cond"><span class="laundry-cond-icon">🌡️</span><strong>${nowH.temp.toFixed(0)}°C</strong><span>${escapeHTML(t('laundry.temp'))}</span></div>
      <div class="laundry-cond"><span class="laundry-cond-icon">💧</span><strong>${nowH.humidity.toFixed(0)}%</strong><span>${escapeHTML(t('laundry.humidity'))}</span></div>
      <div class="laundry-cond"><span class="laundry-cond-icon">🌬️</span><strong>${nowH.wind.toFixed(0)} km/h</strong><span>${escapeHTML(t('laundry.wind'))}</span></div>
      <div class="laundry-cond"><span class="laundry-cond-icon">☔</span><strong>${nowH.precip.toFixed(0)}%</strong><span>${escapeHTML(t('laundry.precip'))}</span></div>
    </div>` : '';

  const stripHTML = future.map(h => {
    const cls = laundryClassify(h.score).cls;
    const hr = h.time.getHours();
    const label = (hr === 0 ? '12a' : hr < 12 ? hr + 'a' : hr === 12 ? '12p' : (hr - 12) + 'p');
    const tooltip = `${laundryFmtDateTime(h.time)} · ${h.score}/100 · ${h.temp.toFixed(0)}°C · ${h.humidity.toFixed(0)}% RH · ${h.precip.toFixed(0)}% rain`;
    return `<div class="laundry-hour ${cls}" title="${escapeHTML(tooltip)}">
      <span class="laundry-hour-time">${label}</span>
      <span class="laundry-hour-score">${h.score}</span>
      <span class="laundry-hour-precip">${h.precip >= 10 ? '💧' + h.precip.toFixed(0) + '%' : ''}</span>
    </div>`;
  }).join('');

  const windowsHTML = windows.length === 0
    ? `<div class="laundry-window-empty">${escapeHTML(t('laundry.noWindow'))}</div>`
    : windows.map(w => {
        const avg = Math.round(w.scores.reduce((a, b) => a + b, 0) / w.scores.length);
        const cls = laundryClassify(avg).cls;
        const endTime = new Date(w.end.time.getTime() + 60 * 60 * 1000);
        return `<div class="laundry-window laundry-${cls}">
          <span class="laundry-window-icon">🌤️</span>
          <span class="laundry-window-time">${escapeHTML(laundryFmtDateTime(w.start.time))} → ${escapeHTML(laundryFmtHour(endTime))}</span>
          <span class="laundry-window-score">${avg}/100</span>
        </div>`;
      }).join('');

  const tipsHTML = laundryTips(nowH, windows, t);

  wrap.innerHTML = `
    ${headline}
    ${conditions}
    <h4 class="laundry-section-title">📊 ${escapeHTML(t('laundry.hourlyTitle'))}</h4>
    <div class="laundry-strip">${stripHTML}</div>
    <h4 class="laundry-section-title">🌤️ ${escapeHTML(t('laundry.windowsTitle'))}</h4>
    <div class="laundry-windows">${windowsHTML}</div>
    <h4 class="laundry-section-title">💡 ${escapeHTML(t('laundry.tipsTitle'))}</h4>
    <ul class="laundry-tip-list">${tipsHTML}</ul>
  `;
}

async function laundryLoad(cityName) {
  if (!cityName) return;
  laundryState.lastCity = cityName;
  laundryState.loading = true;
  laundryState.error = null;
  laundryRender();
  try {
    const geo = await laundryGeocode(cityName);
    laundryState.lat = geo.latitude;
    laundryState.lon = geo.longitude;
    laundryState.cityLabel = `${geo.name}${geo.country_code ? ', ' + geo.country_code : ''}`;
    const forecast = await laundryFetchForecast(geo.latitude, geo.longitude);
    laundryState.hourly = laundryBuildHourly(forecast);
    laundryState.daily = forecast.daily;
    laundryState.loaded = true;
  } catch (err) {
    laundryState.error = (err && err.message) || 'load_failed';
  } finally {
    laundryState.loading = false;
    laundryRender();
  }
}

function laundryUseGeolocation() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  if (!navigator.geolocation) { alert(t('laundry.errLocation')); return; }
  const status = document.getElementById('laundry-status');
  if (status) status.textContent = '⏳ ' + t('laundry.locating');
  navigator.geolocation.getCurrentPosition(async pos => {
    laundryState.loading = true;
    laundryState.error = null;
    laundryState.lat = pos.coords.latitude;
    laundryState.lon = pos.coords.longitude;
    laundryState.cityLabel = `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`;
    laundryRender();
    try {
      const forecast = await laundryFetchForecast(pos.coords.latitude, pos.coords.longitude);
      laundryState.hourly = laundryBuildHourly(forecast);
      laundryState.daily = forecast.daily;
      laundryState.loaded = true;
    } catch (err) {
      laundryState.error = (err && err.message) || 'forecast_failed';
    } finally {
      laundryState.loading = false;
      laundryRender();
    }
  }, () => {
    if (status) status.textContent = '';
    alert(t('laundry.errLocation'));
  }, { timeout: 10000 });
}

function laundryRefreshStatic() {
  laundryRender();
}

(function wireLaundry() {
  const input = document.getElementById('laundry-city');
  const btn = document.getElementById('laundry-city-btn');
  const geoBtn = document.getElementById('laundry-geo-btn');
  const def = laundryDefaultCity();
  if (input && !input.value) input.value = def;
  if (btn) btn.addEventListener('click', () => { const v = (input && input.value || '').trim(); if (v) laundryLoad(v); });
  if (input) input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); const v = input.value.trim(); if (v) laundryLoad(v); }
  });
  if (geoBtn) geoBtn.addEventListener('click', laundryUseGeolocation);
  // Lazy auto-load on first visit to the tab
  const tabBtn = document.querySelector('[data-tab="laundry"]');
  if (tabBtn) {
    tabBtn.addEventListener('click', () => {
      if (!laundryState.loaded && !laundryState.loading) laundryLoad(def);
    });
  }
})();

laundryRender();

// ── Personal Footprint Tracker Dashboard ─────────────────────────────
const TRK_STORAGE = 'ecotrack.tracker.entries';
const TRK_TARGET = 2.5;          // kg CO₂ / day — IPCC 1.5°C-aligned per-capita by 2030
const TRK_GLOBAL_AVG = 12.5;     // global per-capita average

const TRK_FACTORS = {
  carKm:      0.170,
  busKm:      0.090,
  trainKm:    0.035,
  flightKm:   0.255,
  beefMeals:  6.000,
  chickMeals: 1.600,
  plantMeals: 0.500,
  kwh:        0.380,
};

const TRK_PRESETS = {
  typical: { carKm: 25, busKm: 0, trainKm: 0,  flightKm: 0, beefMeals: 0, chickMeals: 1, plantMeals: 1, kwh: 8 },
  eco:     { carKm: 0,  busKm: 4, trainKm: 12, flightKm: 0, beefMeals: 0, chickMeals: 0, plantMeals: 3, kwh: 4 },
  travel:  { carKm: 30, busKm: 0, trainKm: 0,  flightKm: 800, beefMeals: 1, chickMeals: 1, plantMeals: 0, kwh: 5 },
};

const TRK_BADGES = [
  { id: 'first',    icon: '🌱', name: { en: 'First Step',     fr: 'Premier pas',      'zh-CN': '迈出第一步',  'zh-TW': '邁出第一步' }, desc: { en: 'Log your first entry',            fr: 'Enregistrez votre premier suivi',   'zh-CN': '记录你的第一条数据',           'zh-TW': '記錄你的第一條資料' } },
  { id: 'streak3',  icon: '🔥', name: { en: '3-Day Streak',   fr: 'Série de 3 jours', 'zh-CN': '连续 3 天',    'zh-TW': '連續 3 天' }, desc: { en: 'Log 3 consecutive days',          fr: 'Enregistrez 3 jours consécutifs',   'zh-CN': '连续记录 3 天',                'zh-TW': '連續記錄 3 天' } },
  { id: 'streak7',  icon: '🏆', name: { en: '7-Day Streak',   fr: 'Série de 7 jours', 'zh-CN': '连续 7 天',    'zh-TW': '連續 7 天' }, desc: { en: 'Log 7 consecutive days',          fr: 'Enregistrez 7 jours consécutifs',   'zh-CN': '连续记录 7 天',                'zh-TW': '連續記錄 7 天' } },
  { id: 'streak30', icon: '💪', name: { en: '30-Day Streak',  fr: 'Série de 30 jours','zh-CN': '连续 30 天',   'zh-TW': '連續 30 天' }, desc: { en: 'Log 30 consecutive days',         fr: 'Enregistrez 30 jours consécutifs',  'zh-CN': '连续记录 30 天',               'zh-TW': '連續記錄 30 天' } },
  { id: 'paris',    icon: '🌟', name: { en: 'Paris Hero',     fr: 'Héros de Paris',   'zh-CN': '巴黎英雄',    'zh-TW': '巴黎英雄' }, desc: { en: 'A day below the 2.5 kg target',   fr: 'Une journée sous les 2,5 kg',       'zh-CN': '单日低于 2.5 kg 目标',         'zh-TW': '單日低於 2.5 kg 目標' } },
  { id: 'eco',      icon: '🚲', name: { en: 'Eco Warrior',    fr: 'Éco-guerrier',     'zh-CN': '环保斗士',    'zh-TW': '環保鬥士' }, desc: { en: 'A day below 5 kg CO₂',            fr: 'Une journée sous 5 kg de CO₂',      'zh-CN': '单日低于 5 kg CO₂',           'zh-TW': '單日低於 5 kg CO₂' } },
  { id: 'plant',    icon: '🥗', name: { en: 'Plant Power',    fr: 'Force végétale',   'zh-CN': '植物力量',    'zh-TW': '植物力量' }, desc: { en: '7+ plant-based meals logged',     fr: '7+ repas végétaux enregistrés',     'zh-CN': '累计记录 7+ 顿植物餐',         'zh-TW': '累計記錄 7+ 頓植物餐' } },
  { id: 'walker',   icon: '🚶', name: { en: 'Walker',         fr: 'Marcheur',         'zh-CN': '步行者',      'zh-TW': '步行者' }, desc: { en: '5 zero-car days',                 fr: '5 jours sans voiture',              'zh-CN': '累计 5 个零汽车日',           'zh-TW': '累計 5 個零汽車日' } },
  { id: 'improver', icon: '📉', name: { en: 'Improver',       fr: 'Amélioration',     'zh-CN': '进步者',      'zh-TW': '進步者' }, desc: { en: 'Weekly avg down 20 % vs prior',   fr: 'Moy. hebdo en baisse de 20 %',      'zh-CN': '本周均值比上周低 20%',         'zh-TW': '本週均值比上週低 20%' } },
  { id: 'defender', icon: '🌍', name: { en: 'Earth Defender', fr: 'Défenseur de la Terre','zh-CN': '地球卫士','zh-TW': '地球衛士' }, desc: { en: '10 days under the 2.5 kg target', fr: '10 jours sous les 2,5 kg',          'zh-CN': '累计 10 天低于目标',           'zh-TW': '累計 10 天低於目標' } },
];

const trkState = {
  entries: [],   // [{ date: 'YYYY-MM-DD', carKm, busKm, ..., total }]
  saveTimer: null,
};

function trkLoadEntries() {
  try {
    const raw = localStorage.getItem(TRK_STORAGE);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (_) { return []; }
}
function trkPersist() {
  try { localStorage.setItem(TRK_STORAGE, JSON.stringify(trkState.entries)); } catch (_) {}
}
function trkComputeTotal(e) {
  let total = 0;
  for (const k in TRK_FACTORS) total += (parseFloat(e[k]) || 0) * TRK_FACTORS[k];
  return total;
}
function trkTodayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function trkParseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function trkDaysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function trkEntryByDate(iso) {
  return trkState.entries.find(e => e.date === iso) || null;
}

function trkReadForm() {
  const id = (k) => parseFloat((document.getElementById('trk-' + k) || {}).value) || 0;
  return {
    carKm: id('carKm'), busKm: id('busKm'), trainKm: id('trainKm'), flightKm: id('flightKm'),
    beefMeals: id('beefMeals'), chickMeals: id('chickMeals'), plantMeals: id('plantMeals'),
    kwh: id('kwh'),
  };
}
function trkWriteForm(e) {
  ['carKm','busKm','trainKm','flightKm','beefMeals','chickMeals','plantMeals','kwh'].forEach(k => {
    const el = document.getElementById('trk-' + k);
    if (el) el.value = (e && e[k] != null) ? e[k] : 0;
  });
}
function trkUpdateLiveTotal() {
  const data = trkReadForm();
  const total = trkComputeTotal(data);
  const el = document.getElementById('trk-live-total');
  if (el) el.textContent = total.toFixed(1) + ' kg CO₂';
}

function trkSaveEntry() {
  const dateEl = document.getElementById('trk-date');
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  if (!dateEl || !dateEl.value) return;
  const iso = dateEl.value;
  const data = trkReadForm();
  data.date = iso;
  data.total = trkComputeTotal(data);
  const idx = trkState.entries.findIndex(e => e.date === iso);
  if (idx >= 0) trkState.entries[idx] = data;
  else trkState.entries.push(data);
  trkState.entries.sort((a, b) => a.date < b.date ? -1 : 1);
  trkPersist();
  trkRender();
  trkFlashSaveMsg('✅ ' + t('trk.savedMsg'));
}

function trkDeleteEntry() {
  const dateEl = document.getElementById('trk-date');
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  if (!dateEl || !dateEl.value) return;
  const idx = trkState.entries.findIndex(e => e.date === dateEl.value);
  if (idx >= 0) {
    trkState.entries.splice(idx, 1);
    trkPersist();
  }
  trkWriteForm(null);
  trkUpdateLiveTotal();
  trkRender();
  trkFlashSaveMsg('🗑️ ' + t('trk.deletedMsg'));
}

function trkClearAll() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  if (!confirm(t('trk.confirmClear'))) return;
  trkState.entries = [];
  trkPersist();
  trkWriteForm(null);
  trkUpdateLiveTotal();
  trkRender();
  trkFlashSaveMsg('🧹 ' + t('trk.clearedMsg'));
}

function trkLoadPreset(id) {
  const p = TRK_PRESETS[id];
  if (!p) return;
  trkWriteForm(p);
  trkUpdateLiveTotal();
}

function trkFlashSaveMsg(text) {
  const el = document.getElementById('trk-save-msg');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(trkState.saveTimer);
  trkState.saveTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function trkCurrentStreak() {
  if (trkState.entries.length === 0) return 0;
  const dates = new Set(trkState.entries.map(e => e.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (dates.has(iso)) streak++;
    else if (i === 0) continue; // allow no-entry today
    else break;
  }
  return streak;
}

function trkLast7Avg() {
  if (trkState.entries.length === 0) return null;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
  const cutoffISO = cutoff.getFullYear() + '-' + String(cutoff.getMonth() + 1).padStart(2, '0') + '-' + String(cutoff.getDate()).padStart(2, '0');
  const recent = trkState.entries.filter(e => e.date >= cutoffISO);
  if (recent.length === 0) return null;
  return recent.reduce((s, e) => s + (e.total || 0), 0) / recent.length;
}
function trkPriorWeekAvg() {
  if (trkState.entries.length === 0) return null;
  const today = new Date();
  const startCur = new Date(today); startCur.setDate(today.getDate() - 6);
  const startPrev = new Date(today); startPrev.setDate(today.getDate() - 13);
  const fmt = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const startPrevISO = fmt(startPrev);
  const endPrevISO   = fmt(new Date(startCur.getTime() - 86400000));
  const prev = trkState.entries.filter(e => e.date >= startPrevISO && e.date <= endPrevISO);
  if (prev.length === 0) return null;
  return prev.reduce((s, e) => s + (e.total || 0), 0) / prev.length;
}

function trkEarnedBadges() {
  const earned = new Set();
  if (trkState.entries.length >= 1) earned.add('first');
  const streak = trkCurrentStreak();
  if (streak >= 3)  earned.add('streak3');
  if (streak >= 7)  earned.add('streak7');
  if (streak >= 30) earned.add('streak30');
  const anyParis = trkState.entries.some(e => (e.total || 0) > 0 && e.total <= TRK_TARGET);
  if (anyParis) earned.add('paris');
  const anyEco = trkState.entries.some(e => (e.total || 0) > 0 && e.total <= 5);
  if (anyEco) earned.add('eco');
  const plantSum = trkState.entries.reduce((s, e) => s + (e.plantMeals || 0), 0);
  if (plantSum >= 7) earned.add('plant');
  const carless = trkState.entries.filter(e => (e.carKm || 0) === 0 && e.total > 0).length;
  if (carless >= 5) earned.add('walker');
  const cur = trkLast7Avg();
  const prev = trkParseISO ? trkPriorWeekAvg() : null;
  if (cur != null && prev != null && prev > 0 && cur <= prev * 0.8) earned.add('improver');
  const parisDays = trkState.entries.filter(e => (e.total || 0) > 0 && e.total <= TRK_TARGET).length;
  if (parisDays >= 10) earned.add('defender');
  return earned;
}

function trkBadgeName(b)  { const lang = (window.i18n && window.i18n.lang) ? window.i18n.lang : 'en'; return b.name[lang] || b.name.en; }
function trkBadgeDesc(b)  { const lang = (window.i18n && window.i18n.lang) ? window.i18n.lang : 'en'; return b.desc[lang] || b.desc.en; }

function trkRenderHeadlines() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const el = document.getElementById('trk-headlines');
  if (!el) return;
  const today = trkEntryByDate(trkTodayISO());
  const avg7 = trkLast7Avg();
  const prev = trkPriorWeekAvg();
  const streak = trkCurrentStreak();

  const todayHTML = today
    ? `<strong>${today.total.toFixed(1)}</strong> <span class="trk-unit">kg CO₂</span>`
    : `<strong>—</strong> <span class="trk-unit">${escapeHTML(t('trk.notLogged'))}</span>`;

  let avgHTML = `<strong>—</strong> <span class="trk-unit">kg CO₂</span>`;
  let avgDelta = '';
  if (avg7 != null) {
    avgHTML = `<strong>${avg7.toFixed(1)}</strong> <span class="trk-unit">kg CO₂</span>`;
    if (prev != null && prev > 0) {
      const pctChange = (avg7 - prev) / prev * 100;
      const arrow = pctChange < 0 ? '▼' : pctChange > 0 ? '▲' : '·';
      const cls = pctChange < 0 ? 'down' : pctChange > 0 ? 'up' : 'flat';
      avgDelta = `<div class="trk-delta trk-delta-${cls}">${arrow} ${Math.abs(pctChange).toFixed(0)}% ${escapeHTML(t('trk.vsPrior'))}</div>`;
    }
  }

  el.innerHTML = `
    <div class="trk-card">
      <div class="trk-card-icon">🗓️</div>
      <div class="trk-card-label">${escapeHTML(t('trk.today'))}</div>
      <div class="trk-card-value">${todayHTML}</div>
    </div>
    <div class="trk-card">
      <div class="trk-card-icon">📊</div>
      <div class="trk-card-label">${escapeHTML(t('trk.avg7'))}</div>
      <div class="trk-card-value">${avgHTML}</div>
      ${avgDelta}
    </div>
    <div class="trk-card">
      <div class="trk-card-icon">🔥</div>
      <div class="trk-card-label">${escapeHTML(t('trk.streak'))}</div>
      <div class="trk-card-value"><strong>${streak}</strong> <span class="trk-unit">${escapeHTML(t('trk.days'))}</span></div>
    </div>
    <div class="trk-card">
      <div class="trk-card-icon">📝</div>
      <div class="trk-card-label">${escapeHTML(t('trk.entries'))}</div>
      <div class="trk-card-value"><strong>${trkState.entries.length}</strong></div>
    </div>
  `;
}

function trkRenderProgress() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const el = document.getElementById('trk-progress');
  if (!el) return;
  const avg7 = trkLast7Avg();
  // Progress = how far the user has moved from "global average" toward "net zero target"
  // 0%  = at TRK_GLOBAL_AVG
  // 100% = at or below TRK_TARGET
  let pct = 0;
  let label = t('trk.progressNoData');
  if (avg7 != null) {
    if (avg7 <= TRK_TARGET) pct = 100;
    else if (avg7 >= TRK_GLOBAL_AVG) pct = 0;
    else pct = Math.round((TRK_GLOBAL_AVG - avg7) / (TRK_GLOBAL_AVG - TRK_TARGET) * 100);
    if (pct >= 100)        label = '🌟 ' + t('trk.atNetZero');
    else if (pct >= 75)    label = '🚀 ' + t('trk.almostThere');
    else if (pct >= 50)    label = '💪 ' + t('trk.halfWay');
    else if (pct >= 25)    label = '🌱 ' + t('trk.gettingStarted');
    else                   label = '🐣 ' + t('trk.earlyDays');
  }
  el.innerHTML = `
    <div class="trk-progress-header">
      <span class="trk-progress-title">${escapeHTML(t('trk.netZeroTitle'))}</span>
      <span class="trk-progress-pct">${pct}%</span>
    </div>
    <div class="trk-progress-bar"><div class="trk-progress-fill" style="width:${pct}%"></div></div>
    <div class="trk-progress-label">${escapeHTML(label)}</div>
    <div class="trk-progress-scale">
      <span>${TRK_GLOBAL_AVG} kg ${escapeHTML(t('trk.globalAvg'))}</span>
      <span>${TRK_TARGET} kg ${escapeHTML(t('trk.parisTarget'))}</span>
    </div>
  `;
}

// SVG line chart with Catmull-Rom→Bezier smoothing
function trkRenderChart() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('trk-chart-wrap');
  if (!wrap) return;
  // Build 30-day series
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const iso = trkDaysAgoISO(i);
    const entry = trkEntryByDate(iso);
    days.push({ date: iso, total: entry ? entry.total : null });
  }
  const dataPoints = days.filter(d => d.total != null);
  if (dataPoints.length === 0) {
    wrap.innerHTML = `<div class="trk-chart-empty">${escapeHTML(t('trk.chartEmpty'))}</div>`;
    return;
  }

  const W = 720, H = 240;
  const padL = 38, padR = 14, padT = 18, padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxVal = Math.max(TRK_GLOBAL_AVG, ...days.map(d => d.total || 0)) * 1.1;
  const yScale = v => padT + innerH - (v / maxVal) * innerH;
  const xScale = i => padL + (i / 29) * innerW;

  // Build smooth path through non-null points only
  const pts = days.map((d, i) => d.total != null ? { x: xScale(i), y: yScale(d.total), v: d.total, date: d.date } : null);
  const real = pts.filter(p => p);

  let pathD = '';
  if (real.length === 1) {
    pathD = `M ${real[0].x} ${real[0].y}`;
  } else {
    pathD = `M ${real[0].x} ${real[0].y}`;
    for (let i = 0; i < real.length - 1; i++) {
      const p0 = real[i - 1] || real[i];
      const p1 = real[i];
      const p2 = real[i + 1];
      const p3 = real[i + 2] || p2;
      const tension = 0.5;
      const c1x = p1.x + (p2.x - p0.x) / 6 * tension;
      const c1y = p1.y + (p2.y - p0.y) / 6 * tension;
      const c2x = p2.x - (p3.x - p1.x) / 6 * tension;
      const c2y = p2.y - (p3.y - p1.y) / 6 * tension;
      pathD += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
  }
  // Area fill path: close down to baseline
  let areaD = '';
  if (real.length > 0) {
    areaD = pathD + ` L ${real[real.length - 1].x} ${padT + innerH} L ${real[0].x} ${padT + innerH} Z`;
  }

  // Y gridlines
  const ySteps = 4;
  const gridLines = [];
  for (let i = 1; i <= ySteps; i++) {
    const v = (maxVal / ySteps) * i;
    const y = yScale(v);
    gridLines.push(`<line class="trk-grid" x1="${padL}" y1="${y.toFixed(2)}" x2="${W - padR}" y2="${y.toFixed(2)}"></line>`);
    gridLines.push(`<text class="trk-axis-label" x="${padL - 6}" y="${(y + 4).toFixed(2)}" text-anchor="end">${v.toFixed(0)}</text>`);
  }
  // X labels (every 5 days)
  const xLabels = [];
  for (let i = 0; i < 30; i += 5) {
    const x = xScale(i);
    const d = trkParseISO(days[i].date);
    const label = (d.getMonth() + 1) + '/' + d.getDate();
    xLabels.push(`<text class="trk-axis-label" x="${x.toFixed(2)}" y="${H - 8}" text-anchor="middle">${label}</text>`);
  }
  // Target & global reference lines
  const yTarget = yScale(TRK_TARGET);
  const yGlobal = yScale(TRK_GLOBAL_AVG);
  // Points
  const circles = real.map(p =>
    `<circle class="trk-point" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3.5">
       <title>${escapeHTML(p.date)}: ${p.v.toFixed(1)} kg CO₂</title>
     </circle>`
  ).join('');

  wrap.innerHTML = `
    <svg class="trk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      ${gridLines.join('')}
      <line class="trk-ref trk-ref-global" x1="${padL}" y1="${yGlobal.toFixed(2)}" x2="${W - padR}" y2="${yGlobal.toFixed(2)}"></line>
      <line class="trk-ref trk-ref-target" x1="${padL}" y1="${yTarget.toFixed(2)}" x2="${W - padR}" y2="${yTarget.toFixed(2)}"></line>
      <path class="trk-area" d="${areaD}"></path>
      <path class="trk-line" d="${pathD}"></path>
      ${circles}
      ${xLabels.join('')}
    </svg>
  `;
}

function trkRenderBadges() {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);
  const wrap = document.getElementById('trk-badges');
  if (!wrap) return;
  const earned = trkEarnedBadges();
  wrap.innerHTML = TRK_BADGES.map(b => {
    const got = earned.has(b.id);
    return `
      <div class="trk-badge ${got ? 'earned' : 'locked'}" title="${escapeHTML(trkBadgeDesc(b))}">
        <div class="trk-badge-icon">${b.icon}</div>
        <div class="trk-badge-name">${escapeHTML(trkBadgeName(b))}</div>
        <div class="trk-badge-desc">${escapeHTML(trkBadgeDesc(b))}</div>
      </div>
    `;
  }).join('');
  // Earned summary
  const got = earned.size;
  const total = TRK_BADGES.length;
  const titleEl = wrap.parentElement && wrap.parentElement.querySelector('.trk-section-title');
  if (titleEl) {
    titleEl.innerHTML = `🏆 ${escapeHTML(t('trk.badgesTitle'))} <span class="trk-badges-count">${got}/${total}</span>`;
  }
}

function trkRender() {
  trkRenderHeadlines();
  trkRenderProgress();
  trkRenderChart();
  trkRenderBadges();
}
function trkRefreshStatic() {
  trkRender();
  trkUpdateLiveTotal();
}

// Init
trkState.entries = trkLoadEntries();
(function wireTracker() {
  const dateEl = document.getElementById('trk-date');
  if (dateEl) {
    dateEl.value = trkTodayISO();
    dateEl.addEventListener('change', () => {
      const ex = trkEntryByDate(dateEl.value);
      trkWriteForm(ex);
      trkUpdateLiveTotal();
    });
  }
  // Prefill form if today has an entry
  const todayEntry = trkEntryByDate(trkTodayISO());
  if (todayEntry) trkWriteForm(todayEntry);
  trkUpdateLiveTotal();

  // Live total recompute on any number input
  ['carKm','busKm','trainKm','flightKm','beefMeals','chickMeals','plantMeals','kwh'].forEach(k => {
    const el = document.getElementById('trk-' + k);
    if (el) el.addEventListener('input', trkUpdateLiveTotal);
  });

  const saveBtn = document.getElementById('trk-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', trkSaveEntry);
  const delBtn = document.getElementById('trk-delete-btn');
  if (delBtn) delBtn.addEventListener('click', trkDeleteEntry);
  const clrBtn = document.getElementById('trk-clear-btn');
  if (clrBtn) clrBtn.addEventListener('click', trkClearAll);

  document.querySelectorAll('[data-trk-preset]').forEach(b => {
    b.addEventListener('click', () => trkLoadPreset(b.dataset.trkPreset));
  });
})();

trkRender();

// ── Event listeners — World features ─────────────────────────────
(function wireWorld() {
  const seaSlider = document.getElementById('sea-slider');
  if (seaSlider) {
    seaSlider.addEventListener('input', e => {
      seaState.idx = parseInt(e.target.value, 10);
      renderSeaLevel();
    });
  }
  document.querySelectorAll('.sea-level-btn').forEach(b => {
    b.addEventListener('click', () => {
      seaState.idx = parseInt(b.dataset.level, 10);
      renderSeaLevel();
    });
  });

  document.querySelectorAll('.activism-city-btn').forEach(btn => {
    btn.addEventListener('click', () => renderActivism(btn.dataset.city));
  });
  window.addEventListener('ecotrack:langchange', () => {
    if (lastActivismCity) renderActivism(lastActivismCity);
  });

  const corpSearch = document.getElementById('corp-search');
  if (corpSearch) {
    corpSearch.addEventListener('input', e => {
      corpState.search = e.target.value;
      renderCorporate();
    });
  }
  document.querySelectorAll('.corp-filter').forEach(b => {
    b.addEventListener('click', () => {
      corpState.filter = b.dataset.filter;
      renderCorporate();
    });
  });

  const policySearch = document.getElementById('policy-search');
  if (policySearch) {
    policySearch.addEventListener('input', e => {
      policyState.search = e.target.value;
      renderPolicy();
    });
  }
  document.querySelectorAll('.policy-filter').forEach(b => {
    b.addEventListener('click', () => {
      policyState.filter = b.dataset.filter;
      renderPolicy();
    });
  });

  const joinSearch = document.getElementById('join-search');
  if (joinSearch) {
    joinSearch.addEventListener('input', e => {
      joinState.search = e.target.value;
      renderJoin();
    });
  }
  document.querySelectorAll('.join-filter').forEach(b => {
    b.addEventListener('click', () => {
      joinState.filter = b.dataset.filter;
      renderJoin();
    });
  });
})();

// ── Initial renders ──────────────────────────────────────────────
renderSeaLevel();
renderStories();
renderCorporate();
renderPolicy();
renderJoin();

// Re-render dynamic content when the user switches language
document.addEventListener('ecotrack:langchange', () => {
  const t = (window.i18n && window.i18n.t) ? window.i18n.t : (k => k);

  // Learn tabs + corporate
  renderSeaLevel();
  renderStories();
  renderCorporate();
  renderPolicy();
  renderJoin();
  renderActivism(lastActivismCity);

  // If SDG modal is open, refresh its content in the new language
  if (activeSdg !== null) openSdgModal(activeSdg);

  // If an SDG-actions card is selected, re-render in the new language
  if (activeSdgAction !== null) renderSdgActions(activeSdgAction);

  // Real-time CO₂ tool: refresh key status + any rendered result
  if (typeof rtRefreshStaticLabels === 'function') rtRefreshStaticLabels();

  // Grid widget: refresh key status + re-render last status in new language
  if (typeof gridRefreshStatic === 'function') gridRefreshStatic();

  // Fridge Raid: re-render chrome (and any current results) in the new language
  if (typeof fridgeRefreshStatic === 'function') fridgeRefreshStatic();

  // Seasonal & Local: re-render produce + region/month labels in the new language
  if (typeof seasonalRefreshStatic === 'function') seasonalRefreshStatic();

  // Meal Footprint Compare: re-render category labels, plate items, verdict
  if (typeof mcRefreshStatic === 'function') mcRefreshStatic();

  // Vampire Power: re-render region select + appliance names in new language
  if (typeof vampRefreshStatic === 'function') vampRefreshStatic();

  // Eco-Laundry Scheduler: re-render labels in new language
  if (typeof laundryRefreshStatic === 'function') laundryRefreshStatic();

  // Footprint Tracker: re-render headline cards, badges, chart in new language
  if (typeof trkRefreshStatic === 'function') trkRefreshStatic();

  // Sorter game: refresh bin labels
  if (typeof buildBins === 'function') buildBins();

  // Thrift tab
  if (typeof renderThriftChart === 'function') renderThriftChart();
  if (typeof renderSavingsCalc === 'function') renderSavingsCalc();

  // Circular Economy tab: re-render current product + update play/pause button
  if (typeof renderLifecycle === 'function' && cycle && cycle.product) {
    renderLifecycle(cycle.product);
    const cpBtn = document.getElementById('cycle-play');
    if (cpBtn) cpBtn.textContent = cycle.playing ? t('circ.pause') : t('circ.play');
  }

  // Live game screens
  const quizScreen = document.getElementById('quiz-screen');
  if (quizScreen && !quizScreen.classList.contains('hidden') && typeof loadQuestion === 'function') {
    loadQuestion();
  }
  const energyScreen = document.getElementById('energy-game');
  if (energyScreen && !energyScreen.classList.contains('hidden') && typeof loadEnergyLevel === 'function') {
    loadEnergyLevel();
  }
  const questScreen = document.getElementById('quest-game');
  if (questScreen && !questScreen.classList.contains('hidden') && typeof loadQuestLevel === 'function') {
    loadQuestLevel();
  }
});
