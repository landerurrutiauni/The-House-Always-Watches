// screens/howto.js — pantalla «Cómo se juega»: ayuda general abierta desde el menú, la barra superior (?) o la tecla «?».
// Es un modal (no cambia de pantalla ni toca la partida), con secciones plegables. Las manos y los palos están en la guía de cada mesa.
import { t } from '../i18n.js';
import { h, act, modal, closeTopModal } from '../ui.js';
import { openHelp } from './table.js';

const SECTIONS = 9;
export function openHowTo() {
  const body = h('div', { class: 'howto' });
  for (let i = 1; i <= SECTIONS; i++) {
    const content = h('div', { class: 'howto-body' });
    let ul = null;
    for (const line of t(`howto.s${i}.t`).split('\n')) {
      if (line.startsWith('• ')) { if (!ul) { ul = h('ul'); content.append(ul); } ul.append(h('li', null, line.slice(2))); }
      else { ul = null; content.append(h('p', null, line)); }
    }
    body.append(h('details', { class: 'howto-sec', open: i === 1 }, h('summary', null, t(`howto.s${i}.h`)), content));
  }
  body.append(h('div', { class: 'row' },
    h('button', { class: 'btn', type: 'button', onclick: () => openHelp() }, t('howto.cards')),
    h('button', { class: 'btn primary', type: 'button', onclick: () => closeTopModal() }, t('ui.close'))));
  return modal(body, { title: t('howto.title'), cls: 'howto-modal' });
}
act.howto = () => openHowTo();
