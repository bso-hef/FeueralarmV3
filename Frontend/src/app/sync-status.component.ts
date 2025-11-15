import { Component, OnInit, OnDestroy } from '@angular/core';
import { SyncService } from '../app/services/sync.service';
import { Subscription } from 'rxjs';

/**
 * Wiederverwendbare Komponente für Sync-Status-Anzeige
 * Zeigt Online/Offline Status und Sync-Informationen
 */
@Component({
  selector: 'app-sync-status',
  template: `
    <ion-card
      *ngIf="showCard"
      class="sync-status-card"
      [color]="getCardColor()"
    >
      <ion-card-content>
        <ion-grid>
          <ion-row class="ion-align-items-center">
            <!-- Status Icon -->
            <ion-col size="auto">
              <ion-icon
                [name]="getStatusIcon()"
                [color]="getIconColor()"
                size="large"
              >
              </ion-icon>
            </ion-col>

            <!-- Status Text -->
            <ion-col>
              <div class="status-text">
                <strong>{{ getStatusTitle() }}</strong>
                <p class="status-message">{{ getStatusMessage() }}</p>
              </div>
            </ion-col>

            <!-- Sync Button -->
            <ion-col size="auto" *ngIf="showSyncButton">
              <ion-button
                size="small"
                (click)="onSyncClick()"
                [disabled]="!isOnline || isSyncing"
              >
                <ion-icon
                  slot="start"
                  [name]="isSyncing ? 'sync' : 'cloud-upload'"
                >
                </ion-icon>
                <ion-spinner *ngIf="isSyncing" name="crescent"></ion-spinner>
                <span *ngIf="!isSyncing">Sync</span>
              </ion-button>
            </ion-col>
          </ion-row>

          <!-- Progress Bar (während Sync) -->
          <ion-row *ngIf="isSyncing">
            <ion-col>
              <ion-progress-bar type="indeterminate"></ion-progress-bar>
            </ion-col>
          </ion-row>

          <!-- Details (erweiterbar) -->
          <ion-row *ngIf="showDetails">
            <ion-col>
              <div class="sync-details">
                <small>
                  <ion-icon name="time"></ion-icon>
                  Letzter Sync:
                  {{ lastSync ? (lastSync | date : 'short') : 'Nie' }}
                </small>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .sync-status-card {
        margin: 8px;
        --background: var(--ion-color-light);
      }

      .status-text {
        line-height: 1.4;
      }

      .status-text p {
        margin: 4px 0 0 0;
        font-size: 0.9em;
        opacity: 0.8;
      }

      .status-message {
        color: var(--ion-color-medium);
      }

      .sync-details {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
      }

      .sync-details small {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--ion-color-medium);
      }

      ion-icon[size='large'] {
        font-size: 32px;
      }
    `,
  ],
})
export class SyncStatusComponent implements OnInit, OnDestroy {
  isOnline = true;
  isSyncing = false;
  pendingActions = 0;
  lastSync: Date | null = null;

  // Config
  showCard = true;
  showSyncButton = true;
  showDetails = true;

  private subscriptions: Subscription[] = [];

  constructor(private syncService: SyncService) {}

  ngOnInit() {
    this.subscribeToSyncStatus();
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private subscribeToSyncStatus(): void {
    this.subscriptions.push(
      this.syncService.getOnlineStatus().subscribe((online) => {
        this.isOnline = online;
        this.updateCardVisibility();
      })
    );

    this.subscriptions.push(
      this.syncService.isSyncing().subscribe((syncing) => {
        this.isSyncing = syncing;
        this.updateCardVisibility();
      })
    );

    this.subscriptions.push(
      this.syncService.getPendingActionsCount().subscribe((count) => {
        this.pendingActions = count;
        this.updateCardVisibility();
      })
    );

    this.subscriptions.push(
      this.syncService.getLastSync().subscribe((date) => {
        this.lastSync = date;
      })
    );
  }

  private updateCardVisibility(): void {
    // Zeige Card nur wenn:
    // - Offline ODER
    // - Ausstehende Aktionen vorhanden ODER
    // - Gerade am Syncen
    this.showCard = !this.isOnline || this.pendingActions > 0 || this.isSyncing;
  }

  getStatusIcon(): string {
    if (!this.isOnline) return 'cloud-offline';
    if (this.isSyncing) return 'sync';
    if (this.pendingActions > 0) return 'cloud-upload';
    return 'cloud-done';
  }

  getIconColor(): string {
    if (!this.isOnline) return 'warning';
    if (this.isSyncing) return 'primary';
    if (this.pendingActions > 0) return 'primary';
    return 'success';
  }

  getCardColor(): string {
    if (!this.isOnline) return 'warning';
    if (this.isSyncing) return 'primary';
    return 'light';
  }

  getStatusTitle(): string {
    if (!this.isOnline) return 'Offline-Modus';
    if (this.isSyncing) return 'Synchronisiere...';
    if (this.pendingActions > 0)
      return `${this.pendingActions} ausstehende Änderungen`;
    return 'Synchronisiert';
  }

  getStatusMessage(): string {
    if (!this.isOnline) {
      return 'Änderungen werden lokal gespeichert und automatisch synchronisiert';
    }
    if (this.isSyncing) {
      return 'Daten werden mit dem Server abgeglichen';
    }
    if (this.pendingActions > 0) {
      return 'Klicke auf "Sync" um jetzt zu synchronisieren';
    }
    return 'Alle Änderungen sind synchronisiert';
  }

  async onSyncClick(): Promise<void> {
    if (!this.isOnline || this.isSyncing) return;

    try {
      await this.syncService.forceSyncNow();
    } catch (error) {
      console.error('Sync fehlgeschlagen:', error);
    }
  }
}
