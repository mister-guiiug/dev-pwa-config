import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Scan de QR par la caméra — la peer OPTIONNELLE `qr-scanner`, sous cycle de
 * vie géré.
 *
 * `qr-scanner` EST DORMANT, ET ON LE GARDE QUAND MÊME — décision du 14/09/2026,
 * à revoir sur un signal précis. Sa dernière version date de 1 391 jours et son
 * dépôt de 897 ; il fonctionne, ne porte aucune alerte de sécurité, et vit
 * derrière ce hook, donc il se remplace en touchant ce seul fichier.
 *
 * QUATRE relèves ont été examinées, aucune ne rapporte ce qu'elle coûte. Les
 * poids sont mesurés à l'identique — esbuild, minifié, secoué, gzip -9 — et pas
 * lus dans le `unpackedSize` du registre, qui compte les sources et tous les
 * formats de build : `@zxing/library` y pèse 11,8 Mo pour quelques dizaines de
 * ko réellement embarqués.
 *
 * L'ÉTALON : `qr-scanner` coûte **25,4 ko** — 15,4 de module, 10,0 de worker,
 * un second fichier que le bundler recopie et qui ne descend qu'au scan.
 *
 * - `BarcodeDetector`, l'API NATIVE, n'est exposée par Chrome que sur Android,
 *   ChromeOS et macOS — mesuré absent de Chrome 152 sous Windows — et Safari ne
 *   l'implémente pas. Sur un parc de PWA ouvertes sur iPhone et sur poste, le
 *   natif serait l'exception.
 * - Le ponyfill `barcode-detector` retombe donc sur ZXing en WebAssembly :
 *   15,1 ko de JS gzippé, mais **1,04 Mo de WASM** au premier scan. Pour un
 *   écran d'un seul dépôt, c'est un mauvais échange.
 * - `@zxing/browser` est le seul candidat VIVANT — 0.2.1 le 06/07/2026, après
 *   deux ans de sommeil. Mais son `BrowserQRCodeReader`, importé seul, pèse
 *   **122,9 ko**, soit presque CINQ fois l'étalon. Et ce poids descend au
 *   moment précis où l'utilisateur veut la caméra tout de suite.
 * - `html5-qrcode` pèse **107,2 ko** et n'a rien publié depuis le 15/04/2023 :
 *   il est plus endormi que ce qu'il remplacerait. Échanger un paquet dormant
 *   contre un autre, quatre fois plus lourd, ne s'achète pas.
 *
 * ET AUCUN DES QUATRE NE FORCE LA MAIN : `npm audit` ne rend aucune alerte, sur
 * `qr-scanner` comme sur les trois relèves. La question est donc entièrement un
 * arbitrage poids contre maintenance, et le poids tranche.
 *
 * LE SIGNAL QUI INVERSE LE CALCUL : `BarcodeDetector` disponible sur Safari iOS.
 * Le ponyfill devient alors gratuit là où il sert, et ce fichier change.
 *
 * PROVENANCE : mister-molkky (`src/react/views/JoinLiveView.tsx`), seul scan
 * caméra de la famille, avec deux pièges payés là-bas et repris ici :
 *
 * 1. **La `<video>` n'existe pas encore au clic.** Le bouton « scanner »
 *    rend la branche qui contient la vidéo ; au moment du clic, la ref est
 *    nulle et `new QrScanner(video, …)` échouait EN SILENCE — le bug
 *    d'origine de molkky. Ici, `start()` ne fait que lever `scanning` ; le
 *    scanner se câble dans un EFFET, une fois le DOM commité.
 *
 * 2. **La caméra doit s'éteindre, toujours.** `stop()` + `destroy()` dans le
 *    nettoyage de l'effet : démontage, annulation, décodage réussi — aucun
 *    chemin ne laisse le flux (ni la lampe torche) allumé.
 *
 * Le décodeur est importé PARESSEUSEMENT au premier `start()` — le motif de
 * `map/leaflet.js` : le module reste importable partout (SSR, tests), le
 * poids n'est téléchargé que si un scan commence. Peer absente : erreur
 * explicite dans `error` (et `onError`), pas un import cassé.
 *
 * Les options vivent dans une ref : l'effet ne dépend que de `scanning`, et
 * un rendu qui recrée `onScan` ne redémarre pas la caméra. Pour changer de
 * caméra en cours de scan : `stop()` puis `start()`.
 *
 * @param {{ onScan?: (data: string) => void,
 *   onError?: (error: Error) => void,
 *   preferredCamera?: string, highlight?: boolean, stopOnScan?: boolean,
 *   loader?: () => Promise<unknown> }} [options]
 * @returns {{ videoRef: { current: HTMLVideoElement | null },
 *   scanning: boolean, error: Error | null,
 *   start: () => void, stop: () => void }}
 */
export function useQrScanner(options = {}) {
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!scanning) return undefined;
    const video = videoRef.current;
    if (!video) {
      // La branche vidéo n'est pas rendue : le dire, plutôt que le silence
      // qui a coûté le bug d'origine.
      setError(
        new Error('useQrScanner : aucune <video> n’est reliée à videoRef.')
      );
      setScanning(false);
      return undefined;
    }

    let cancelled = false;
    let scanner = null;
    let done = false;

    void (async () => {
      const opts = optionsRef.current;
      let QrScanner;
      try {
        const mod = await (opts.loader ? opts.loader() : import('qr-scanner'));
        QrScanner = mod.default ?? mod;
      } catch (cause) {
        if (cancelled) return;
        const failure = new Error(
          'La peer optionnelle `qr-scanner` est requise pour scanner un ' +
            'QR code — `npm install qr-scanner`.',
          { cause }
        );
        setError(failure);
        optionsRef.current.onError?.(failure);
        setScanning(false);
        return;
      }
      if (cancelled) return;

      scanner = new QrScanner(
        video,
        result => {
          // `returnDetailedScanResult` : `{ data }` ; un loader injecté peut
          // renvoyer la chaîne nue de l'ancienne API.
          const text =
            typeof result === 'string' ? result : (result?.data ?? '');
          if (done || !text) return;
          if (optionsRef.current.stopOnScan ?? true) {
            // Arrêt SYNCHRONE : le décodeur tourne en continu, attendre le
            // prochain commit React livrerait le même code plusieurs fois.
            done = true;
            scanner?.stop();
            setScanning(false);
          }
          optionsRef.current.onScan?.(text);
        },
        {
          preferredCamera: opts.preferredCamera ?? 'environment',
          highlightScanRegion: opts.highlight ?? true,
          highlightCodeOutline: opts.highlight ?? true,
          returnDetailedScanResult: true,
        }
      );

      try {
        await scanner.start();
      } catch (cause) {
        if (cancelled) return;
        // Caméra refusée, absente, ou occupée : l'app affiche `error`.
        const failure =
          cause instanceof Error ? cause : new Error(String(cause));
        setError(failure);
        optionsRef.current.onError?.(failure);
        setScanning(false);
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, [scanning]);

  const start = useCallback(() => {
    setError(null);
    setScanning(true);
  }, []);
  const stop = useCallback(() => setScanning(false), []);

  return { videoRef, scanning, error, start, stop };
}
