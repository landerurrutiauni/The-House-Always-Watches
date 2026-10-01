// Datos del juego (sin DOM). Los textos viven en locales/*.json con claves derivadas de estos ids:
//   item.<id>.name/desc · tool.<id>.name/desc · card.<id>.name/desc · char.<id> · event.<id>.title/text/a/b/ra/rb[/h/rh]
//   boss.<id>.a/w/l · mem.<id>.name/text · know.<id>.name/text · ending.<id>.title/text/epi · wing.<id>.name/desc
export const ITEMS = ['moneda_mordida', 'espejo_roto', 'llave_hueso', 'ceniza', 'ficha_negra', 'ojo_vidrio', 'campanilla', 'guante_crupier', 'reloj_parado', 'diente_leche', 'cuchilla_oxidada', 'libro_cuentas'];
export const ITEM_PRICE = { moneda_mordida: 55, espejo_roto: 50, llave_hueso: 70, ceniza: 45, ficha_negra: 60, ojo_vidrio: 65, campanilla: 50, guante_crupier: 75, reloj_parado: 55, diente_leche: 45, cuchilla_oxidada: 50, libro_cuentas: 45 };

// Herramientas consumibles (máx. 3). ctx: dónde se usan.
export const TOOLS = { testigo: { ctx: 'duel', price: 25 }, mala_memoria: { ctx: 'duel', price: 25 }, contrato: { ctx: 'duel', price: 30 }, sal: { ctx: 'round', price: 28 }, vela_corta: { ctx: 'any', price: 35 } };
export const MAX_TOOLS = 3;

export const CHARACTERS = ['dealer', 'girl', 'chair', 'child', 'merchant', 'woman', 'drowned', 'archivist'];

export const WING_INFO = {
  salon: { boss: 'girl', bg: 'casino', unlock: 0 },
  pasillo: { boss: 'chair', bg: 'corridor', unlock: 1 },
  sotano: { boss: 'drowned', bg: 'basement', unlock: 1 }
};

// Jefes. `rule`: reglas de oponente activas.
export const BOSSES = {
  girl: { rule: ['no_repeat'], foe: 'girl', bg: 'casino' },
  chair: { rule: ['cold_blood'], foe: 'chair', bg: 'corridor' },
  drowned: { rule: ['drown'], foe: 'drowned', bg: 'basement' },
  child: { rule: ['remember', 'blind_eyes'], foe: 'child', bg: 'corridor', secret: true },
  dealer: { rule: ['watched', 'interest'], foe: 'final', bg: 'casino', final: true }
};

export const GENERIC_OPPS = ['gambler_a', 'gambler_b', 'gambler_c', 'dealer', 'girl', 'chair', 'drowned', 'child'];
export const DUEL_FOES = ['gambler', 'dealer', 'girl', 'chair', 'drowned'];
export const KINDS = ['game', 'event', 'merchant', 'rest', 'shotgun', 'secret', 'boss'];

// Conocimiento (meta). Se obtiene en eventos/jefes y abre opciones/finales.
export const KNOWLEDGE = ['k_moon', 'k_dealer_deck', 'k_girl_lies', 'k_reflection', 'k_players', 'k_dealer_no_name', 'k_child_self', 'k_chair_founder', 'k_drowned_paid', 'k_door_same', 'k_watcher', 'k_dealer_ledger', 'k_room13'];
export const DEALER_CLUES = ['k_dealer_deck', 'k_dealer_no_name', 'k_dealer_ledger', 'k_moon'];

// Recuerdos: ventajas permanentes tras conseguirlos. `when` se evalúa con checkMemories().
export const MEMORIES = {
  m01: { perk: { money: 10 } },
  m02: { perk: { discards: 1 } },
  m03: { perk: { maxHealth: 10 } },
  m04: { perk: { level: 'pair' } },
  m05: { perk: { tool: 'sal' } },
  m06: { perk: { sanityWin: 3 } },
  m07: { perk: { plays: 1 } },
  m08: { perk: { tool: 'testigo' } },
  m09: { perk: { listen: 0.85 } },
  m10: { perk: { interest: 0.5 } },
  m11: { perk: { card: 'hueso_liso' } },
  m12: { perk: { money: 5 } }
};
export const MEMORY_ORDER = Object.keys(MEMORIES);

// Finales. `req`: condiciones (ver effects.check).
export const ENDINGS = {
  deuda: { req: [] },
  puerta: { req: [['item', 'llave_hueso']] },
  crupier: { req: [['clues', 3]] },
  partida: { req: [['know', 'k_players'], ['chars', 5]] },
  espectador: { req: [['know', 'k_watcher'], ['know', 'k_reflection']] },
  verdad: { req: [['endings', 5], ['know', 'k_door_same']] }
};
export const ENDING_ORDER = ['deuda', 'puerta', 'crupier', 'partida', 'espectador', 'verdad'];

// ---------------- Eventos ----------------
// Efectos (tuplas): money, sanity, health, debt, destiny, flag, know, rel[char,trust,fear], card, mod, item, tool, level, remove, gamble[p,win,lose], boss[id]
// Condiciones: know, flag, item, deaths, money, sanityLt, debtGt, seen(eventId)
export const EVENTS = {
  first_chip: { who: 'dealer', bg: 'casino', a: [['money', 20], ['debt', 10], ['rel', 'dealer', 1, 0]], b: [['sanity', 3], ['rel', 'dealer', 0, 1]] },
  mirror_hall: { bg: 'corridor', a: [['sanity', -6], ['know', 'k_reflection']], b: [['sanity', 2]], hid: { req: ['know', 'k_reflection'], fx: [['sanity', 6], ['flag', 'mirror_named'], ['destiny', 1]] } },
  wet_footprints: { bg: 'basement', a: [['sanity', -3], ['money', 25], ['flag', 'followed_prints']], b: [['sanity', 2]] },
  debt_collector: { bg: 'corridor', a: [['money', -30], ['debt', -60]], b: [['debt', 30], ['sanity', -3]] },
  cracked_clock: { bg: 'casino', a: [['item', 'reloj_parado'], ['sanity', -4]], b: [['destiny', 1], ['money', 10]] },
  dice_pit: { bg: 'casino', a: [['gamble', 0.5, [['money', 40]], [['money', -20], ['sanity', -3]]]], b: [['sanity', 1]] },
  confession_booth: { bg: 'corridor', a: [['sanity', 8], ['debt', 20]], b: [['health', 5]], hid: { req: ['know', 'k_dealer_ledger'], fx: [['debt', -40], ['sanity', 3]] } },
  old_photograph: { bg: 'casino', a: [['know', 'k_players'], ['sanity', -3]], b: [['sanity', 2], ['health', 4]] },
  blood_vending: { bg: 'basement', a: [['health', -10], ['card', 'random']], b: [['sanity', 1]] },
  signed_receipt: { bg: 'corridor', a: [['know', 'k_dealer_ledger'], ['debt', 30]], b: [['sanity', 3]] },
  moon_window: { bg: 'corridor', a: [['know', 'k_moon'], ['sanity', -5]], b: [['sanity', 2]] },
  phone_call: { bg: 'casino', a: [['sanity', -6], ['know', 'k_watcher']], b: [['sanity', 2]], req: ['deaths', 1] },
  dealer_tea: { who: 'dealer', bg: 'casino', chain: 'dealer', a: [['health', 20], ['sanity', -5], ['rel', 'dealer', 1, 0]], b: [['rel', 'dealer', 0, 1], ['sanity', 2]] },
  dealer_question: { who: 'dealer', bg: 'casino', chain: 'dealer', a: [['sanity', -2], ['destiny', -1]], b: [['know', 'k_dealer_no_name']], hid: { req: ['know', 'k_dealer_ledger'], fx: [['know', 'k_dealer_deck'], ['sanity', -4]] } },
  dealer_offer: { who: 'dealer', bg: 'casino', chain: 'dealer', a: [['debt', -80], ['tool', 'contrato'], ['flag', 'dealer_contract'], ['rel', 'dealer', 1, 0]], b: [['rel', 'dealer', 0, 1], ['money', 15]] },
  girl_1: { who: 'girl', bg: 'casino', chain: 'girl', a: [['gamble', 0.5, [['money', 30], ['rel', 'girl', 1, 0]], [['money', -15], ['sanity', -2]]]], b: [['rel', 'girl', 0, 1]] },
  girl_2: { who: 'girl', bg: 'casino', chain: 'girl', a: [['sanity', -3], ['money', 20]], b: [['know', 'k_girl_lies'], ['rel', 'girl', 1, 0]] },
  girl_3: { who: 'girl', bg: 'casino', chain: 'girl', a: [['item', 'ojo_vidrio'], ['sanity', -8], ['rel', 'girl', 2, 0]], b: [['rel', 'girl', 0, 1], ['sanity', 3]] },
  chair_bet: { who: 'chair', bg: 'corridor', chain: 'chair', a: [['gamble', 0.5, [['money', 45]], [['health', -12]]]], b: [['rel', 'chair', 0, 1]] },
  chair_secret: { who: 'chair', bg: 'corridor', chain: 'chair', a: [['know', 'k_chair_founder'], ['sanity', -4], ['rel', 'chair', 1, 0]], b: [['sanity', 2]] },
  child_1: { who: 'child', bg: 'corridor', chain: 'child', a: [['sanity', -2], ['rel', 'child', 1, 0]], b: [['know', 'k_child_self'], ['sanity', -2]], req: ['deaths', 1] },
  child_2: { who: 'child', bg: 'corridor', chain: 'child', a: [['know', 'k_room13'], ['flag', 'room13_hint']], b: [['sanity', 2]] },
  woman_dress: { who: 'woman', bg: 'casino', a: [['card', 'la_mujer'], ['flag', 'took_woman']], b: [['rel', 'woman', 0, 1], ['sanity', 2]] },
  drowned_pier: { who: 'drowned', bg: 'basement', a: [['know', 'k_drowned_paid'], ['sanity', -4], ['tool', 'sal']], b: [['sanity', 1]] },
  archive_ledger: { who: 'archivist', bg: 'corridor', a: [['know', 'k_dealer_ledger'], ['know', 'k_door_same'], ['sanity', -4]], b: [['money', 10]] },
  merchant_memory: { who: 'merchant', bg: 'basement', a: [['money', -40], ['level', 'random']], b: [['rel', 'merchant', 0, 1]] },
  room_13: { bg: 'corridor', secretOnly: false, req: ['flag', 'room13_hint'], a: [['boss', 'child']], b: [['sanity', 2]] },
  secret_bone_door: { bg: 'secret', secret: true, a: [['item', 'llave_hueso'], ['sanity', -6]], b: [['money', 20]] },
  secret_watcher: { bg: 'secret', secret: true, a: [['know', 'k_watcher'], ['sanity', -10], ['destiny', 1]], b: [['sanity', 4]] },
  secret_stage: { bg: 'secret', secret: true, a: [['know', 'k_players'], ['know', 'k_door_same'], ['sanity', -6]], b: [['health', 10]] }
};
export const EVENT_IDS = Object.keys(EVENTS);
export const CHAINS = {
  dealer: ['dealer_tea', 'dealer_question', 'dealer_offer'],
  girl: ['girl_1', 'girl_2', 'girl_3'],
  chair: ['chair_bet', 'chair_secret'],
  child: ['child_1', 'child_2']
};
// Qué "slots" de evento se colocan en el mapa (los encadenados se resuelven al entrar).
const GENERAL = ['mirror_hall', 'wet_footprints', 'debt_collector', 'cracked_clock', 'dice_pit', 'confession_booth', 'old_photograph', 'blood_vending', 'signed_receipt', 'moon_window', 'phone_call', 'woman_dress', 'drowned_pier', 'archive_ledger', 'merchant_memory'];
export function eventPool(wing) {
  const extra = { salon: ['chain:girl', 'chain:girl', 'chain:dealer', 'chain:dealer'], pasillo: ['chain:chair', 'chain:chair', 'chain:child', 'chain:dealer'], sotano: ['chain:child', 'chain:dealer', 'drowned_pier', 'drowned_pier'] };
  return GENERAL.concat(extra[wing] || []);
}
export const SECRET_EVENTS = ['secret_bone_door', 'secret_watcher', 'secret_stage'];
export const MERCHANT_STOCK = { services: ['heal', 'level', 'remove'] };

// Suma de ventajas de los recuerdos obtenidos.
export function perksFrom(ids = []) {
  const P = { money: 0, discards: 0, maxHealth: 0, plays: 0, sanityWin: 0, listen: 0, interest: 1, tools: [], cards: [], levels: [] };
  for (const id of ids) {
    const p = MEMORIES[id] && MEMORIES[id].perk; if (!p) continue;
    if (p.money) P.money += p.money;
    if (p.discards) P.discards += p.discards;
    if (p.maxHealth) P.maxHealth += p.maxHealth;
    if (p.plays) P.plays += p.plays;
    if (p.sanityWin) P.sanityWin += p.sanityWin;
    if (p.listen) P.listen = Math.max(P.listen, p.listen);
    if (p.interest) P.interest *= p.interest;
    if (p.tool) P.tools.push(p.tool);
    if (p.card) P.cards.push(p.card);
    if (p.level) P.levels.push(p.level);
  }
  return P;
}
