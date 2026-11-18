// Inferensi kategori lokal murni JavaScript. Tanpa jaringan atau modul native.
// Algoritma, normalisasi, dan pemetaan alias harus sama dengan ml/train_kategori.py.
const PREPROCESSING = [
  'ascii_lowercase_words_unigram_bigram_sublinear_tf_l2_v1',
  'unicode_nfkd_ascii_words_unigram_bigram_sublinear_tf_l2_v1',
];

function createKategoriClassifier(model) {
  if (model.schema_version !== 1 || !PREPROCESSING.includes(model.preprocessing)) {
    throw new Error('Format model kategori tidak didukung');
  }
  if (!Array.isArray(model.labels) || model.labels.length < 2
    || model.weights.length !== model.labels.length
    || model.weights.some((row) => row.length !== model.idf.length)
    || model.bias.length !== model.labels.length) {
    throw new Error('Bentuk bobot model kategori tidak konsisten');
  }
  const owns = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  return function classify(text) {
    if (typeof text !== 'string') throw new TypeError('text must be a string');
    const normalized = model.preprocessing.startsWith('unicode_')
      ? text.replace(/<[^>]*>/g, ' ').normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '').toLowerCase()
      : text.toLowerCase();
    const words = (normalized.match(/[a-z0-9]+/g) || [])
      .map((w) => (owns(model.aliases, w) ? model.aliases[w] : w));
    const grams = words.concat(words.slice(1).map((w, i) => `${words[i]} ${w}`));
    const counts = new Map();
    for (const gram of grams) {
      if (owns(model.vocabulary, gram)) {
        const index = model.vocabulary[gram];
        counts.set(index, (counts.get(index) || 0) + 1);
      }
    }
    if (counts.size === 0) {
      return {
        label: null,
        status: words.length ? 'unknown_vocabulary' : 'empty_input',
        scores: null,
        scoreType: 'none',
        experimental: true,
      };
    }
    const values = Array.from(counts, ([i, count]) => [i, (1 + Math.log(count)) * model.idf[i]]);
    const norm = Math.sqrt(values.reduce((sum, pair) => sum + pair[1] ** 2, 0));
    const scores = model.weights.map((weights, c) =>
      values.reduce((score, [i, value]) => score + (weights[i] * value) / norm, model.bias[c]));
    let best = 0;
    for (let c = 1; c < scores.length; c += 1) if (scores[c] > scores[best]) best = c;
    return {
      label: model.labels[best],
      status: 'predicted',
      scores,
      scoreType: model.algorithm === 'LinearSVC' ? 'decision_margin' : 'log_score',
      experimental: model.status !== 'production',
    };
  };
}

module.exports = { createKategoriClassifier };
