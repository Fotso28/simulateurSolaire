import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { Router } from '@angular/router';
import { appRoutes } from './app.routes';
import { RESULT_ACTIONS, ResultActions } from './core/extensions';
import { OfflineQueue } from './core/offline-queue';
import { ShareService } from './core/share.service';
import { PdfExportService } from './features/export/pdf-export.service';

/** Actions du récapitulatif (L5) : partage, PDF, demande de devis. */
function resultActions(): ResultActions {
  const share = inject(ShareService);
  const pdf = inject(PdfExportService);
  const router = inject(Router);
  return {
    share: () => share.shareUrl(),
    exportPdf: () => pdf.download(share.knownUrl()),
    requestCallback: () => void router.navigate(['/devis']),
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    { provide: RESULT_ACTIONS, useFactory: resultActions },
    // File hors-ligne : envoi des simulations en attente au démarrage et au
    // retour du réseau.
    provideAppInitializer(() => void inject(OfflineQueue).flush()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
