import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CatalogService } from './core/catalog.service';
import { OfflineIndicator } from './shared/ui/offline-indicator';

@Component({
  imports: [RouterOutlet, OfflineIndicator],
  selector: 'app-root',
  template: '<app-offline-indicator /><router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor() {
    // Données embarquées tout de suite, catalogue de l'API dès qu'il arrive.
    void inject(CatalogService).load();
  }
}
