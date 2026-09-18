/**
 * `cookie_domain` : le parc est servi sous un SUFFIXE PUBLIC.
 *
 * LE DÉFAUT QUE CE TEST REND IMPOSSIBLE À REPRODUIRE. Les vingt sites du parc
 * vivent sous `mister-guiiug.github.io`, et `github.io` est inscrit à la
 * Public Suffix List : aucun site ne peut y poser de cookie — c'est la règle
 * qui empêche un `mechant.github.io` d'écrire un cookie que tous les autres
 * liraient. Or le défaut de gtag, `cookie_domain: 'auto'`, commence par viser
 * le domaine enregistrable. Firefox l'annonce au visiteur, à chaque
 * chargement :
 *
 *   Le cookie « _ga_XXXXXXXX » a été rejeté car le domaine est invalide.
 *   Le cookie « _ga » a été rejeté car le domaine est invalide.
 *
 * Mesuré le 18/09/2026 dans un navigateur, sur la production de
 * `mister-puzzle` : `domain=.github.io` REFUSÉ, `domain=github.io` REFUSÉ,
 * `domain=mister-guiiug.github.io` accepté, sans domaine accepté.
 *
 * ON NE DEVINE PAS UN SUFFIXE PUBLIC EN LISANT UNE CHAÎNE. La liste ne se
 * calcule pas — `github.io` en est un, `exemple.com` non, `co.uk` aussi. D'où
 * la sonde : un cookie jetable par candidat, du plus large au plus étroit.
 * C'est ce comportement-là que ce fichier verrouille, avec un document dont le
 * bocal à cookies applique la même règle que le navigateur.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  domaineDeCookie,
  initAnalytics,
  resetAnalytics,
} from '../analytics.js';
import { setupDom } from './helpers/dom.mjs';

/**
 * Un document dont `cookie` se comporte comme un navigateur : il REFUSE en
 * silence un `domain=` qui n'est pas un suffixe du nom d'hôte, ou qui tombe
 * sur un suffixe public.
 */
function documentFactice({ hote, suffixesPublics = [] }) {
  const bocal = new Map();
  const essais = [];
  return {
    essais,
    bocal,
    get cookie() {
      return [...bocal].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    set cookie(brut) {
      const [paire, ...attrs] = brut.split(';').map(s => s.trim());
      const [nom, valeur] = paire.split('=');
      const domaine = attrs
        .map(a => /^domain=(.+)$/i.exec(a)?.[1])
        .find(Boolean)
        ?.replace(/^\./, '');
      const expire = attrs.some(a => /^max-age=0$/i.test(a));
      if (expire) {
        bocal.delete(nom);
        return;
      }
      if (domaine) {
        essais.push(domaine);
        const suffixe = hote === domaine || hote.endsWith('.' + domaine);
        if (!suffixe || suffixesPublics.includes(domaine)) return; // refusé
      }
      bocal.set(nom, valeur);
    },
  };
}

test('sous un suffixe public, la sonde descend jusqu’au nom d’hôte', () => {
  const doc = documentFactice({
    hote: 'mister-guiiug.github.io',
    suffixesPublics: ['github.io'],
  });
  assert.equal(
    domaineDeCookie(doc, 'mister-guiiug.github.io'),
    'mister-guiiug.github.io'
  );
  // Elle a bien ESSAYÉ le plus large d'abord : c'est l'ordre qui compte, un
  // domaine plus étroit priverait les sous-domaines de l'identifiant client.
  assert.deepEqual(doc.essais, ['github.io', 'mister-guiiug.github.io']);
  // Aucune sonde laissée derrière elle.
  assert.equal(doc.cookie, '');
});

test('sur un domaine ordinaire, elle rend le domaine ENREGISTRABLE', () => {
  const doc = documentFactice({ hote: 'www.exemple.fr' });
  assert.equal(domaineDeCookie(doc, 'www.exemple.fr'), 'exemple.fr');
  assert.deepEqual(doc.essais, ['exemple.fr']);
});

test('sur un sous-domaine profond derrière un suffixe public à deux niveaux', () => {
  const doc = documentFactice({
    hote: 'app.client.co.uk',
    suffixesPublics: ['co.uk'],
  });
  assert.equal(domaineDeCookie(doc, 'app.client.co.uk'), 'client.co.uk');
  assert.deepEqual(doc.essais, ['co.uk', 'client.co.uk']);
});

test('sans point, sans DOM ou sur une IP, elle rend « none »', () => {
  const doc = documentFactice({ hote: 'localhost' });
  assert.equal(domaineDeCookie(doc, 'localhost'), 'none');
  assert.equal(domaineDeCookie(doc, '127.0.0.1'), 'none');
  assert.equal(domaineDeCookie(undefined, 'exemple.fr'), 'none');
  assert.equal(domaineDeCookie(doc, undefined), 'none');
  assert.deepEqual(
    doc.essais,
    [],
    'aucun cookie ne doit être tenté dans ces cas'
  );
});

test('un document qui refuse l’accès aux cookies ne fait pas lever', () => {
  const doc = {
    get cookie() {
      throw new DOMException('blocked');
    },
    set cookie(_) {
      throw new DOMException('blocked');
    },
  };
  assert.equal(domaineDeCookie(doc, 'a.exemple.fr'), 'none');
});

test('quand RIEN n’est acceptable, elle rend « none » plutôt que d’inventer', () => {
  const doc = documentFactice({
    hote: 'exemple.fr',
    suffixesPublics: ['exemple.fr'],
  });
  assert.equal(domaineDeCookie(doc, 'exemple.fr'), 'none');
});

/*
 * LA SONDE NE SERT À RIEN SI SA VALEUR N'ARRIVE PAS À GTAG. Ce test-ci vérifie
 * le seul point qui compte pour le visiteur : la commande `config` réellement
 * poussée dans `dataLayer` porte un `cookie_domain`. Sans lui, gtag reprend son
 * défaut `'auto'` et vise à nouveau le suffixe public.
 */
test('la commande config poussée porte bien cookie_domain', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({ gaMeasurementId: 'G-ABC123', requireConsent: false });
    const config = (window.dataLayer ?? [])
      .filter(e => typeof e?.length === 'number')
      .map(e => [...e])
      .find(c => c[0] === 'config');
    assert.ok(config, 'aucune commande config poussée');
    assert.equal(config[2].send_page_view, false);
    assert.ok(
      'cookie_domain' in config[2],
      'cookie_domain absent : gtag retomberait sur « auto »'
    );
    // `exemple.test` est le domaine enregistrable du document de test, et il
    // accepte le cookie : la sonde doit le rendre, pas « none ».
    assert.equal(config[2].cookie_domain, 'exemple.test');
  } finally {
    resetAnalytics();
    dom.restore();
  }
});
