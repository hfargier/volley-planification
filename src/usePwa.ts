import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { showToast } from './toast';

/** L'événement n'est pas encore typé dans le DOM standard. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INTERVALLE_VERIF_MS = 60 * 1000;

/** L'app tourne-t-elle déjà en mode installé (hors navigateur) ? */
const estAutonome = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS expose l'information hors standard
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

/**
 * Gère le cycle de vie de l'app installée :
 *  - détection d'une nouvelle version en ligne, puis rechargement,
 *  - proposition d'installation sur l'écran d'accueil.
 */
export const usePwa = () => {
  const [invite, setInvite] = useState<BeforeInstallPromptEvent | null>(null);
  // Évalué une seule fois au montage : évite un rendu supplémentaire.
  const [dejaInstallee, setDejaInstallee] = useState(() => estAutonome());

  useRegisterSW({
    onNeedRefresh() {
      // Une nouvelle version est prête : on prévient puis on recharge, pour
      // qu'un coach ne reste jamais bloqué sur un ancien bundle.
      showToast('success', 'Nouvelle version disponible — mise à jour en cours…');
      window.setTimeout(() => window.location.reload(), 2500);
    },
    onOfflineReady() {
      showToast('success', 'Application disponible hors connexion.');
    },
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      // On interroge le serveur régulièrement : sur un téléphone laissé
      // ouvert des heures au gymnase, rien ne déclencherait la vérification.
      const verifier = () => {
        if (registration.installing || !navigator.onLine) return;
        fetch(swUrl, { cache: 'no-store' })
          .then((r) => {
            if (r?.status === 200) registration.update();
          })
          .catch(() => {
            /* hors ligne : on retentera */
          });
      };

      window.setInterval(verifier, INTERVALLE_VERIF_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') verifier();
      });
    },
  });

  // Filet de sécurité : indépendant du comportement interne de
  // registerType 'autoUpdate', on recharge dès qu'un nouveau service worker
  // prend le contrôle de la page.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let recharge = false;
    const onChangement = () => {
      if (recharge) return;
      recharge = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onChangement);
    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onChangement);
  }, []);

  // Installation sur l'écran d'accueil
  useEffect(() => {
    const onInvite = (e: Event) => {
      e.preventDefault(); // on déclenche nous-mêmes, au bon moment
      setInvite(e as BeforeInstallPromptEvent);
    };
    const onInstallee = () => {
      setInvite(null);
      setDejaInstallee(true);
      showToast('success', 'JSA Planif est installée sur votre écran d’accueil.');
    };

    window.addEventListener('beforeinstallprompt', onInvite);
    window.addEventListener('appinstalled', onInstallee);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInvite);
      window.removeEventListener('appinstalled', onInstallee);
    };
  }, []);

  const installer = async () => {
    if (!invite) return;
    await invite.prompt();
    const { outcome } = await invite.userChoice;
    if (outcome === 'dismissed') {
      showToast('error', "Installation annulée. Vous pourrez la relancer plus tard.");
    }
    // L'événement ne peut être rejoué : on le retire dans tous les cas.
    setInvite(null);
  };

  return {
    /** Vrai si le navigateur propose l'installation et qu'elle n'est pas déjà faite. */
    peutInstaller: invite !== null && !dejaInstallee,
    dejaInstallee,
    installer,
    version: __APP_VERSION__,
    dateBuild: __BUILD_DATE__,
  };
};
