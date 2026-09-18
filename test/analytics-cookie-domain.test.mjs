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

import { domaineDeCookie } from '../analytics.js';

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
 * LA SONDE NE SERT À RIEN SI PERSONNE N'EN TIENT COMPTE. Du temps de GA4, ce
 * test vérifiait que la commande `config` poussée portait bien un
 * `cookie_domain` — sans quoi gtag reprenait son défaut `'auto'` et visait à
 * nouveau le suffixe public.
 *
 * AVEC POSTHOG, LE GESTE EST DIFFÉRENT ET LE PIÈGE EST LE MÊME. On ne lui donne
 * pas un domaine : on lui INTERDIT d'en chercher un plus large, par
 * `cross_subdomain_cookie: false`. Le contrôle vit donc dans
 * `analytics.test.mjs`, avec les autres options d'initialisation, parce que
 * c'est là qu'il se lit — et la sonde reste ici, exportée et éprouvée, parce
 * qu'elle redeviendra nécessaire le jour où le parc passera sur un domaine à
 * lui, où les sous-domaines devront partager l'identifiant de client.
 */
