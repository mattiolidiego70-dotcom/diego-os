/* OutfitEngine — motore di regole di stile v0.2
 * Profilo target: uomo, 35 anni, manager, BMI ~28 (normale-robusto).
 * Registri: business/smart casual al lavoro, dal casual pulito allo street
 * adulto la sera e nel weekend, elegante quando serve.
 * Fit ammessi: regular, straight, relaxed, oversize moderato. Vietati: slim, skinny.
 * File unico usabile sia nel browser (window.OutfitEngine) sia in Node (module.exports).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.OutfitEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FIT_VIETATI = ['slim', 'skinny', 'super-skinny', 'aderente'];
  var FIT_AMMESSI = ['regular', 'straight', 'relaxed', 'oversize-moderato'];

  // Colori neutri: si abbinano a tutto. Gli accenti si contano: massimo uno per outfit.
  var NEUTRI = ['bianco', 'nero', 'grigio', 'navy', 'azzurro', 'beige', 'cammello',
    'crema', 'marrone', 'cognac', 'denim', 'tortora', 'oliva'];

  // Registro per occasione: formalità obiettivo e finestra ammessa.
  var OCCASIONI = {
    lavoro:  { target: 6, min: 4, max: 8, label: 'Lavoro — business/smart casual' },
    serale:  { target: 5, min: 3, max: 8, label: 'Serale — uscita, cena, aperitivo' },
    weekend: { target: 4, min: 2, max: 6, label: 'Weekend — tempo libero' }
  };

  // Il filtro stile può spostare il registro: street scende, elegante sale.
  var STILE_BIAS = { street: -1, casual: 0, smart: 0, elegante: 1 };

  var SLOT_BASE = ['top', 'bottom', 'shoes'];

  function isAccento(colore) { return NEUTRI.indexOf(colore) === -1; }
  function hasFlag(item, f) { return (item.flags || []).indexOf(f) !== -1; }

  function fitOk(item) {
    if (FIT_VIETATI.indexOf(item.fit) !== -1) return false;
    return FIT_AMMESSI.indexOf(item.fit) !== -1;
  }

  function meteoOk(item, temp) {
    if (!item.caldo) return true;
    return temp >= item.caldo[0] && temp <= item.caldo[1];
  }

  function livelloOuter(temp, meteo) {
    if (temp < 8) return 'pesante';
    if (temp <= 16) return 'medio';
    if (meteo === 'pioggia' && temp <= 22) return 'leggero';
    return 'nessuno';
  }

  function outerOk(item, livello, meteo) {
    if (livello === 'nessuno') return false;
    if (meteo === 'pioggia' && item.antipioggia) return true;
    if (livello === 'pesante') return item.caldo && item.caldo[0] <= 0;
    // 'leggero' = pioggia col tepore (fino a 22°): l'antipioggia è preferito e
    // viene ordinato per primo, ma non è obbligatorio — con 20° e pioggia fine
    // si esce anche con un'overshirt. Prima era un obbligo, e con soli tre
    // impermeabili in guardaroba il contesto restava povero e monotono.
    return true;
  }

  function scoreColori(a, b) {
    var s = 0;
    var i, j, ca, cb;
    for (i = 0; i < a.colori.length; i++) {
      for (j = 0; j < b.colori.length; j++) {
        ca = a.colori[i]; cb = b.colori[j];
        if ((ca === 'nero' && (cb === 'marrone' || cb === 'cognac' || cb === 'cammello')) ||
            (cb === 'nero' && (ca === 'marrone' || ca === 'cognac' || ca === 'cammello'))) s -= 2;
        if ((ca === 'navy' && cb === 'nero') || (ca === 'nero' && cb === 'navy')) s -= 1;
        var caldi = ['bianco', 'crema', 'beige', 'cammello', 'tortora'];
        var blu = ['navy', 'azzurro', 'denim'];
        if (ca !== cb && caldi.indexOf(ca) !== -1 && caldi.indexOf(cb) !== -1) s += 1;
        if (ca !== cb && blu.indexOf(ca) !== -1 && blu.indexOf(cb) !== -1) s += 1;
      }
    }
    return s;
  }

  function contaAccenti(items) {
    var n = 0;
    items.forEach(function (it) { if (it.colori.some(isAccento)) n++; });
    return n;
  }

  function doppioDenim(items) {
    return items.filter(function (it) { return it.colori.indexOf('denim') !== -1; }).length > 1;
  }

  // ——— silhouette (BMI ~28): la colonna allunga, i volumi si contano ———

  var SCURI = ['nero', 'navy', 'grigio', 'marrone', 'oliva', 'bordeaux'];
  function colonnaScura(items) {
    // top e bottom condividono un colore scuro → linea verticale continua
    var top = items.filter(function (i) { return i.slot === 'top'; })[0];
    var bot = items.filter(function (i) { return i.slot === 'bottom'; })[0];
    if (!top || !bot) return false;
    return top.colori.some(function (c) {
      return SCURI.indexOf(c) !== -1 && bot.colori.indexOf(c) !== -1;
    });
  }

  function scoreSilhouette(items) {
    var s = 0;
    if (colonnaScura(items)) s += 1;
    var volumi = items.filter(function (i) { return hasFlag(i, 'volume'); }).length;
    if (volumi > 1) s -= 2;                    // un solo volume alla volta
    if (items.some(function (i) { return hasFlag(i, 'righe'); })) s -= 1; // le righe si pesano
    if (items.some(function (i) { return hasFlag(i, 'vita-alta'); })) s += 1;
    return s;
  }

  function notaSilhouette(items) {
    var frasi = [];
    if (colonnaScura(items)) frasi.push('Sopra e sotto nello stesso tono scuro: la colonna di colore allunga la figura e asciuga il punto vita.');
    if (items.some(function (i) { return hasFlag(i, 'vita-alta'); })) frasi.push('La vita più alta con pinces fa cadere il tessuto dal punto più stretto, non dal più largo: il taglio giusto per un fisico robusto.');
    if (items.some(function (i) { return hasFlag(i, 'struttura'); })) frasi.push('La spalla strutturata del capospalla disegna una V che ridimensiona il busto.');
    if (items.some(function (i) { return hasFlag(i, 'scollo-v'); })) frasi.push('L’apertura verticale sul collo allunga otticamente.');
    var volumi = items.filter(function (i) { return hasFlag(i, 'volume'); });
    if (volumi.length === 1) frasi.push('Un solo capo voluminoso (' + volumi[0].nome.toLowerCase() + '): il resto resta asciutto per bilanciare.');
    if (volumi.length > 1) frasi.push('Attenzione: due volumi insieme appesantiscono — meglio sostituirne uno con un capo più asciutto.');
    if (items.some(function (i) { return hasFlag(i, 'righe'); })) frasi.push('Le righe orizzontali allargano: qui reggono solo se il capo sopra resta aperto o scuro.');
    return frasi.slice(0, 2).join(' ');
  }

  // ——— punteggio ———

  function targetFormalita(ctx) {
    var o = OCCASIONI[ctx.occasione];
    var bias = (ctx.stile && STILE_BIAS[ctx.stile]) || 0;
    return { target: o.target + bias, min: Math.max(1, o.min + bias), max: Math.min(10, o.max + bias) };
  }

  function scoreOutfit(items, occ) {
    var o = OCCASIONI[occ];
    var s = 0, i, j;
    var media = items.reduce(function (acc, it) { return acc + it.formalita; }, 0) / items.length;
    s -= Math.abs(media - o.target) * 2;
    for (i = 0; i < items.length; i++) {
      for (j = i + 1; j < items.length; j++) {
        if (Math.abs(items[i].formalita - items[j].formalita) > 3) s -= 2;
        s += scoreColori(items[i], items[j]);
      }
    }
    var accenti = contaAccenti(items);
    if (accenti > 1) s -= 3 * (accenti - 1);
    if (doppioDenim(items)) s -= 4;
    items.forEach(function (it) { if (it.occasioni.indexOf(occ) !== -1) s += 1; });
    s += scoreSilhouette(items);
    return s;
  }

  function filtraCandidati(capi, slot, ctx, anchorId) {
    var w = targetFormalita(ctx);
    return capi.filter(function (it) {
      if (it.id === anchorId) return false;
      if (it.slot !== slot) return false;
      if (!fitOk(it)) return false;
      if (!meteoOk(it, ctx.temperatura)) return false;
      if (it.formalita < w.min || it.formalita > w.max) return false;
      if (ctx.stile && ctx.stile !== 'tutti' && it.stile.indexOf(ctx.stile) === -1) return false;
      if (it.occasioni.indexOf(ctx.occasione) === -1 && it.occasioni.length < 2) return false;
      return true;
    });
  }

  // ——— testo descrittivo ———

  function registroLabel(media, ctx) {
    if (ctx && ctx.stile === 'street') return 'street pulito';
    if (media >= 7) return 'elegante contemporaneo';
    if (media >= 6) return 'business casual';
    if (media >= 4.6) return 'smart casual';
    return 'casual pulito';
  }

  function notaColore(items) {
    var accenti = [];
    items.forEach(function (it) {
      it.colori.forEach(function (c) { if (isAccento(c) && accenti.indexOf(c) === -1) accenti.push(c); });
    });
    if (accenti.length === 0) return 'Palette tutta neutra: impossibile sbagliare, autorevole senza sforzo.';
    return 'Un solo punto di colore (' + accenti.join(', ') + '), il resto neutro: la regola dei 35 anni portati bene.';
  }

  function notaMeteo(ctx, outer) {
    if (ctx.temperatura < 8) return 'Con ' + ctx.temperatura + '°C il capospalla è pesante e la maglia sotto lavora: niente eroismi col freddo.';
    if (outer) {
      if (ctx.meteo === 'pioggia') return 'Pioggia prevista: il capospalla scelto la regge senza ombrello da supermercato.';
      return 'Mezza stagione: il capospalla chiude l’outfit e si toglie in ambiente senza rovinare il look.';
    }
    if (ctx.temperatura >= 24) return 'Caldo vero: tessuti che respirano e niente strati inutili.';
    return 'Temperatura gestibile senza capospalla: il look regge da solo.';
  }

  var NOTA_FIT = 'Vestibilità regular/relaxed pensata per un fisico normale-robusto: il tessuto scivola sul punto vita senza segnarlo e la gamba cade dritta sulla scarpa. Mai slim.';

  function descriviOutfit(items, ctx, anchor) {
    var media = items.reduce(function (a, it) { return a + it.formalita; }, 0) / items.length;
    var reg = registroLabel(media, ctx);
    var outer = items.filter(function (it) { return it.slot === 'outer'; })[0];
    var pezzi = items.filter(function (it) { return it.id !== anchor.id && it.slot !== 'accessorio'; })
      .map(function (it) { return it.nome.toLowerCase(); });
    var frasi = [];
    frasi.push('Partendo da ' + anchor.nome.toLowerCase() + ', il registro giusto è ' + reg +
      (pezzi.length ? ': ' + pezzi.join(', ') + '.' : '.'));
    frasi.push(notaColore(items));
    var sil = notaSilhouette(items);
    if (sil) frasi.push(sil);
    frasi.push(notaMeteo(ctx, outer));
    frasi.push(NOTA_FIT);
    return frasi.join(' ');
  }

  // ——— generazione ———

  function normalizzaCtx(ctx) {
    ctx = ctx || {};
    return {
      occasione: ctx.occasione || 'serale',
      stile: ctx.stile || 'tutti',
      temperatura: typeof ctx.temperatura === 'number' ? ctx.temperatura : 18,
      meteo: ctx.meteo || 'sole'
    };
  }

  // Costruisce TUTTE le combinazioni valide per un anchor in un contesto,
  // con punteggio. Usata sia dalla UI (top 3) sia dal generatore d'archivio.
  function costruisciCombos(capi, anchor, ctx, limiti) {
    limiti = limiti || {};
    var perSlot = limiti.perSlot || 6;
    var livello = livelloOuter(ctx.temperatura, ctx.meteo);
    var slotsNecessari = SLOT_BASE.filter(function (s) { return s !== anchor.slot; });
    var serveOuter = livello !== 'nessuno' && anchor.slot !== 'outer';

    var candidatiPerSlot = slotsNecessari.map(function (slot) {
      return filtraCandidati(capi, slot, ctx, anchor.id).slice(0, perSlot);
    });
    candidatiPerSlot = candidatiPerSlot.map(function (cands, i) {
      if (cands.length > 0) return cands;
      return capi.filter(function (it) {
        return it.slot === slotsNecessari[i] && fitOk(it) && meteoOk(it, ctx.temperatura) && it.id !== anchor.id;
      }).slice(0, 4);
    });

    var outers = [];
    if (serveOuter) {
      outers = filtraCandidati(capi, 'outer', ctx, anchor.id)
        .filter(function (it) { return outerOk(it, livello, ctx.meteo); });
      if (outers.length === 0) {
        outers = capi.filter(function (it) {
          return it.slot === 'outer' && fitOk(it) && meteoOk(it, ctx.temperatura) &&
            outerOk(it, livello, ctx.meteo) && it.id !== anchor.id;
        });
      }
      // Livello 'leggero' (pioggia col caldo): se nessun antipioggia regge la
      // temperatura, meglio nessun capospalla che uno sbagliato.
      if (outers.length === 0 && livello === 'leggero') serveOuter = false;
      if (ctx.meteo === 'pioggia') {
        outers.sort(function (a, b) { return (b.antipioggia ? 1 : 0) - (a.antipioggia ? 1 : 0); });
      }
      outers = outers.slice(0, limiti.perOuter || 3);
    }

    var combos = [[]];
    slotsNecessari.forEach(function (slot, idx) {
      var next = [];
      combos.forEach(function (parziale) {
        candidatiPerSlot[idx].forEach(function (item) { next.push(parziale.concat([item])); });
      });
      combos = next;
    });

    var outfits = [];
    combos.forEach(function (combo) {
      var base = [anchor].concat(combo);
      if (serveOuter && outers.length) {
        outers.forEach(function (o) {
          var items = base.concat([o]);
          outfits.push({ items: items, score: scoreOutfit(items, ctx.occasione) });
        });
      } else {
        outfits.push({ items: base, score: scoreOutfit(base, ctx.occasione) });
      }
    });
    return outfits;
  }

  /**
   * generaOutfit(capi, anchorId, ctx) → { anchor, outfits: [{items, score, testo}], contesto }
   */
  function generaOutfit(capi, anchorId, ctx) {
    ctx = normalizzaCtx(ctx);
    var anchor = capi.filter(function (c) { return c.id === anchorId; })[0];
    if (!anchor) return { errore: 'capo non trovato: ' + anchorId };
    if (!fitOk(anchor)) return { errore: 'capo escluso dal fit check (slim/skinny non ammessi)' };

    if (anchor.slot === 'look') {
      return {
        anchor: anchor,
        outfits: [{ items: [anchor], score: 10, testo: anchor.nota + ' ' + NOTA_FIT }],
        contesto: ctx
      };
    }

    var outfits = costruisciCombos(capi, anchor, ctx);
    outfits.sort(function (a, b) { return b.score - a.score; });

    var scelti = [], visteScarpe = {}, vistiOuter = {};
    for (var i = 0; i < outfits.length && scelti.length < 3; i++) {
      var of = outfits[i];
      var scarpa = of.items.filter(function (it) { return it.slot === 'shoes'; })[0];
      var outer = of.items.filter(function (it) { return it.slot === 'outer'; })[0];
      var kS = scarpa ? scarpa.id : '-';
      var kO = outer ? outer.id : '-';
      if (visteScarpe[kS] && vistiOuter[kO]) continue;
      visteScarpe[kS] = true; vistiOuter[kO] = true;
      scelti.push(of);
    }

    var accessori = filtraCandidati(capi, 'accessorio', ctx, anchor.id);
    scelti.forEach(function (of, idx) {
      if (accessori[idx]) of.items = of.items.concat([accessori[idx]]);
      of.testo = descriviOutfit(of.items, ctx, anchor);
    });

    return { anchor: anchor, outfits: scelti, contesto: ctx, occasione: OCCASIONI[ctx.occasione] };
  }

  /**
   * enumeraOutfit — per il generatore d'archivio: tutte le combo di un anchor
   * in un contesto con punteggio >= sogliaMin, senza testi (si generano a video).
   */
  function enumeraOutfit(capi, anchorId, ctx, opts) {
    opts = opts || {};
    ctx = normalizzaCtx(ctx);
    var anchor = capi.filter(function (c) { return c.id === anchorId; })[0];
    if (!anchor || !fitOk(anchor) || anchor.slot === 'look' || anchor.slot === 'accessorio') return [];
    if (!meteoOk(anchor, ctx.temperatura)) return [];
    var outfits = costruisciCombos(capi, anchor, ctx, { perSlot: opts.perSlot || 6, perOuter: opts.perOuter || 3 });
    var soglia = typeof opts.sogliaMin === 'number' ? opts.sogliaMin : 3;
    outfits = outfits.filter(function (o) { return o.score >= soglia; });
    outfits.sort(function (a, b) { return b.score - a.score; });
    if (opts.cap) outfits = outfits.slice(0, opts.cap);
    return outfits;
  }

  return {
    generaOutfit: generaOutfit,
    enumeraOutfit: enumeraOutfit,
    descriviOutfit: descriviOutfit,
    fitOk: fitOk,
    meteoOk: meteoOk,
    livelloOuter: livelloOuter,
    scoreOutfit: scoreOutfit,
    notaSilhouette: notaSilhouette,
    OCCASIONI: OCCASIONI,
    FIT_VIETATI: FIT_VIETATI,
    FIT_AMMESSI: FIT_AMMESSI,
    NEUTRI: NEUTRI
  };
});
