// `crawler.js` — reconnaître un robot à son agent utilisateur, et `createI18n`
// qui lui sert la langue par défaut de l'app.
//
// Le constat qui l'a fait naître (Search Console, 29/09/2026) : le test en
// direct de `miss-contraction` rendait la page EN ANGLAIS — « Start
// contraction » — alors qu'elle est française, parce que le moteur de rendu de
// Google se présente en `en-US` et que la langue suivait `navigator.language`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { isCrawlerUserAgent } from '../crawler.js';
import { createI18n } from '../react/i18n.js';
import { mount, setupDom } from './helpers/dom.mjs';

/** Des agents de robots RÉELS, tels qu'ils se présentent. */
const ROBOTS = {
  'Googlebot (smartphone)':
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.137 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Google-InspectionTool (test en direct)':
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.137 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0;)',
  'Storebot-Google':
    'Mozilla/5.0 (X11; Linux x86_64; Storebot-Google/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
  'AdsBot-Google': 'AdsBot-Google (+http://www.google.com/adsbot.html)',
  bingbot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  BingPreview:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) BingPreview/1.0b',
  Applebot:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  DuckDuckBot: 'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
  YandexBot: 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
  Baiduspider:
    'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
  GPTBot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
  'OAI-SearchBot':
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  'ChatGPT-User':
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  ClaudeBot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'Claude-User': 'Claude-User (+https://support.anthropic.com/)',
  'Claude-SearchBot': 'Claude-SearchBot/1.0 (+https://www.anthropic.com)',
  PerplexityBot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  'Perplexity-User':
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)',
  facebookexternalhit:
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  Twitterbot: 'Twitterbot/1.0',
  LinkedInBot:
    'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  // Le repli générique : un jeton entier en bot, crawler ou spider.
  SemrushBot:
    'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
  AhrefsBot:
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  'Sogou web spider':
    'Sogou web spider/4.0(+http://www.sogou.com/docs/help/webmasters.htm#07)',
  'un crawler anonyme': 'MonCrawler/2.1',
};

/** Des NAVIGATEURS réels : aucun ne doit passer pour un robot. */
const NAVIGATEURS = {
  'Chrome (Windows)':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Chrome (Android, Pixel)':
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  'Safari (iPhone)':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  Firefox:
    'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
  Edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
  'Samsung Internet':
    'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  Opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/113.0.0.0',
  // Un TÉLÉPHONE dont le nom finit en « bot » : un navigateur, pas un robot.
  'Chrome sur CUBOT':
    'Mozilla/5.0 (Linux; Android 10; CUBOT X30 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  'Chrome sur CUBOT_KINGKONG':
    'Mozilla/5.0 (Linux; Android 11; CUBOT_KINGKONG_5_PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  'Facebook (navigateur intégré)':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/478.0.0.40.109;FBBV/650000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.6;FBSS/3;FBID/phone;FBLC/fr_FR;FBOP/5]',
  'Instagram (navigateur intégré)':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.0.0 (iPhone15,2; iOS 17_6; fr_FR; fr; scale=3.00; 1179x2556; 634000000)',
  'DuckDuckGo (navigateur)':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 DuckDuckGo/7 Safari/605.1.15',
};

test('les robots nommés et génériques sont reconnus', () => {
  for (const [nom, ua] of Object.entries(ROBOTS)) {
    assert.equal(isCrawlerUserAgent(ua), true, nom);
    // Sans égard à la casse.
    assert.equal(
      isCrawlerUserAgent(ua.toUpperCase()),
      true,
      `${nom} (majuscules)`
    );
  }
});

test('aucun navigateur courant n’est pris pour un robot', () => {
  for (const [nom, ua] of Object.entries(NAVIGATEURS)) {
    assert.equal(isCrawlerUserAgent(ua), false, nom);
  }
});

test('une valeur absente, vide ou démesurée ne casse rien', () => {
  assert.equal(isCrawlerUserAgent(undefined), false);
  assert.equal(isCrawlerUserAgent(null), false);
  assert.equal(isCrawlerUserAgent(''), false);
  // Linéaire, même sur une entrée conçue pour faire reculer un motif.
  const debut = performance.now();
  assert.equal(isCrawlerUserAgent(`${'a-'.repeat(50_000)}x`), false);
  assert.ok(performance.now() - debut < 200, 'trop lent');
});

const MESSAGES = {
  fr: { titre: 'Démarrer une contraction' },
  en: { titre: 'Start contraction' },
};

/** La langue initiale que `createI18n` choisit dans ce navigateur. */
async function langueInitiale({ userAgent, langue, stockee }) {
  const dom = setupDom({ userAgent });
  try {
    Object.defineProperty(dom.window.navigator, 'language', {
      get: () => langue,
      configurable: true,
    });
    if (stockee) localStorage.setItem('robot_locale', stockee);
    const { I18nProvider, useI18n } = createI18n({
      messages: MESSAGES,
      locales: ['fr', 'en'],
      fallbackLocale: 'fr',
      storageKey: 'robot_locale',
      labels: false,
    });
    const vu = { locale: '', titre: '' };
    function Sonde() {
      const { locale, t } = useI18n();
      vu.locale = locale;
      vu.titre = t('titre');
      return null;
    }
    const view = await mount(h(I18nProvider, null, h(Sonde)));
    await view.unmount();
    return vu;
  } finally {
    dom.restore();
  }
}

test('un robot reçoit la langue par défaut, pas celle qu’il annonce', async () => {
  const vu = await langueInitiale({
    userAgent: ROBOTS['Google-InspectionTool (test en direct)'],
    langue: 'en-US',
  });
  assert.equal(vu.locale, 'fr');
  assert.equal(vu.titre, 'Démarrer une contraction');
});

test('un navigateur anglais reçoit toujours l’anglais', async () => {
  const vu = await langueInitiale({
    userAgent: NAVIGATEURS['Chrome (Windows)'],
    langue: 'en-US',
  });
  assert.equal(vu.locale, 'en');
  assert.equal(vu.titre, 'Start contraction');
});

test('une préférence stockée garde la priorité, robot ou non', async () => {
  const robot = await langueInitiale({
    userAgent: ROBOTS['Googlebot (smartphone)'],
    langue: 'en-US',
    stockee: 'en',
  });
  assert.equal(robot.locale, 'en');
  const navigateur = await langueInitiale({
    userAgent: NAVIGATEURS['Chrome (Windows)'],
    langue: 'en-US',
    stockee: 'fr',
  });
  assert.equal(navigateur.locale, 'fr');
});
