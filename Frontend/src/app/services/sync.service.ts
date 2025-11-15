import { Injectable, inject, Injector } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { RestService } from './rest.service';
import { SocketService } from './socket.service';

/**
 * UAP 3.3.2: Sync bei Netzverfügbarkeit
 *
 * Dieser Service verwaltet die Synchronisation zwischen Offline- und Online-Modus.
 * - Speichert Änderungen lokal wenn offline
 * - Synchronisiert automatisch bei Netzwerkverfügbarkeit
 * - Nutzt IndexedDB für lokale Datenhaltung
 */

interface SyncAction {
  id: string;
  type: 'update' | 'create' | 'delete' | 'comment';
  timestamp: number;
  data: any;
  retryCount: number;
  synced: boolean;
}

interface CachedPost {
  id: string;
  data: any;
  timestamp: number;
  version: number;
}

@Injectable({
  providedIn: 'root',
})
export class SyncService {
  private readonly DB_NAME = 'feueralarm-offline-db';
  private readonly DB_VERSION = 1;
  private readonly SYNC_QUEUE_KEY = 'sync-queue';
  private readonly CACHED_POSTS_KEY = 'cached-posts';
  private readonly MAX_RETRY_COUNT = 3;

  private db: IDBDatabase | null = null;
  private syncQueue: SyncAction[] = [];
  private cachedPosts: Map<string, CachedPost> = new Map();

  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  private isSyncingSubject = new BehaviorSubject<boolean>(false);
  private lastSyncSubject = new BehaviorSubject<Date | null>(null);
  private pendingActionsSubject = new BehaviorSubject<number>(0);

  // SocketService optional
  private socketService?: SocketService;

  constructor(private restService: RestService) {
    // Socket Service optional injizieren
    try {
      const injector = inject(Injector);
      this.socketService = injector.get(SocketService, null) ?? undefined;
      if (this.socketService) {
        console.log('✅ SocketService in SyncService verfügbar');
      } else {
        console.warn(
          '⚠️ SocketService nicht verfügbar - SyncService läuft ohne Socket'
        );
      }
    } catch (error) {
      console.warn(
        '⚠️ SocketService konnte nicht in SyncService geladen werden:',
        error
      );
    }

    this.initDatabase();
    this.loadSyncQueue();
    this.loadCachedPosts();
    this.setupNetworkListeners();
  }

  // ==========================================
  // DATABASE SETUP
  // ==========================================

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('❌ IndexedDB Fehler:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB bereit');
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Object Store für Sync-Queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
          });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('synced', 'synced', { unique: false });
          console.log('📦 syncQueue Store erstellt');
        }

        // Object Store für gecachte Posts
        if (!db.objectStoreNames.contains('cachedPosts')) {
          const postsStore = db.createObjectStore('cachedPosts', {
            keyPath: 'id',
          });
          postsStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📦 cachedPosts Store erstellt');
        }

        console.log('✅ IndexedDB Schema aktualisiert');
      };
    });
  }

  // ==========================================
  // NETWORK MONITORING
  // ==========================================

  private setupNetworkListeners(): void {
    // Online/Offline Events
    const online$ = fromEvent(window, 'online');
    const offline$ = fromEvent(window, 'offline');

    merge(online$, offline$)
      .pipe(
        debounceTime(1000), // Verhindere zu häufige Trigger
        distinctUntilChanged()
      )
      .subscribe(() => {
        const isOnline = navigator.onLine;
        console.log(
          isOnline ? '🟢 Netzwerk verfügbar' : '🔴 Netzwerk nicht verfügbar'
        );

        this.isOnlineSubject.next(isOnline);

        if (isOnline) {
          this.handleNetworkReconnect();
        }
      });

    // Initial Status
    this.isOnlineSubject.next(navigator.onLine);
  }

  private async handleNetworkReconnect(): Promise<void> {
    console.log('🔄 Netzwerk wiederhergestellt - starte Synchronisation...');

    // 1. Versuche Socket-Reconnect (nur wenn verfügbar)
    if (this.socketService && !this.socketService.isSocketConnected()) {
      try {
        await this.socketService.connect();
        console.log('✅ Socket verbunden');
      } catch (error) {
        console.error('❌ Socket-Verbindung fehlgeschlagen:', error);
      }
    }

    // 2. Synchronisiere Offline-Änderungen
    await this.syncOfflineChanges();

    // 3. Aktualisiere Daten vom Server
    await this.refreshDataFromServer();
  }

  // ==========================================
  // SYNC QUEUE MANAGEMENT
  // ==========================================

  private async loadSyncQueue(): Promise<void> {
    try {
      if (!this.db) {
        await this.initDatabase();
      }

      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        this.syncQueue = request.result || [];
        this.updatePendingActionsCount();
        console.log(
          `📋 ${this.syncQueue.length} Aktionen in Sync-Queue geladen`
        );
      };

      request.onerror = () => {
        console.error('❌ Fehler beim Laden der Sync-Queue:', request.error);
      };
    } catch (error) {
      console.error('❌ Fehler beim Laden der Sync-Queue:', error);
    }
  }

  private async saveSyncAction(action: SyncAction): Promise<void> {
    try {
      if (!this.db) {
        await this.initDatabase();
      }

      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      await store.put(action);

      this.syncQueue.push(action);
      this.updatePendingActionsCount();

      console.log('💾 Sync-Aktion gespeichert:', action.type, action.id);
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Sync-Aktion:', error);
    }
  }

  private async removeSyncAction(actionId: string): Promise<void> {
    try {
      if (!this.db) return;

      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');

      await store.delete(actionId);

      this.syncQueue = this.syncQueue.filter((a) => a.id !== actionId);
      this.updatePendingActionsCount();

      console.log('🗑️ Sync-Aktion entfernt:', actionId);
    } catch (error) {
      console.error('❌ Fehler beim Entfernen der Sync-Aktion:', error);
    }
  }

  private updatePendingActionsCount(): void {
    const pending = this.syncQueue.filter((a) => !a.synced).length;
    this.pendingActionsSubject.next(pending);
  }

  // ==========================================
  // CACHED POSTS MANAGEMENT
  // ==========================================

  private async loadCachedPosts(): Promise<void> {
    try {
      if (!this.db) {
        await this.initDatabase();
      }

      const transaction = this.db!.transaction(['cachedPosts'], 'readonly');
      const store = transaction.objectStore('cachedPosts');
      const request = store.getAll();

      request.onsuccess = () => {
        const posts = request.result || [];
        this.cachedPosts.clear();
        posts.forEach((post: CachedPost) => {
          this.cachedPosts.set(post.id, post);
        });
        console.log(`📦 ${posts.length} Posts aus Cache geladen`);
      };

      request.onerror = () => {
        console.error(
          '❌ Fehler beim Laden der gecachten Posts:',
          request.error
        );
      };
    } catch (error) {
      console.error('❌ Fehler beim Laden der gecachten Posts:', error);
    }
  }

  async cachePost(id: string, data: any): Promise<void> {
    try {
      if (!this.db) {
        await this.initDatabase();
      }

      const cachedPost: CachedPost = {
        id,
        data,
        timestamp: Date.now(),
        version: (this.cachedPosts.get(id)?.version || 0) + 1,
      };

      const transaction = this.db!.transaction(['cachedPosts'], 'readwrite');
      const store = transaction.objectStore('cachedPosts');

      await store.put(cachedPost);

      this.cachedPosts.set(id, cachedPost);

      console.log('💾 Post gecached:', id);
    } catch (error) {
      console.error('❌ Fehler beim Cachen des Posts:', error);
    }
  }

  getCachedPost(id: string): any | null {
    const cached = this.cachedPosts.get(id);
    return cached ? cached.data : null;
  }

  getAllCachedPosts(): any[] {
    return Array.from(this.cachedPosts.values()).map((c) => c.data);
  }

  // ==========================================
  // OFFLINE ACTIONS
  // ==========================================

  async queueUpdate(
    postId: string,
    status?: string,
    comment?: string
  ): Promise<void> {
    console.log('📝 Queue Update (Offline):', postId);

    const action: SyncAction = {
      id: `update-${postId}-${Date.now()}`,
      type: 'update',
      timestamp: Date.now(),
      data: { postId, status, comment },
      retryCount: 0,
      synced: false,
    };

    await this.saveSyncAction(action);

    // Aktualisiere lokalen Cache
    const cachedPost = this.getCachedPost(postId);
    if (cachedPost) {
      if (status) cachedPost.status = status;
      if (comment !== undefined) cachedPost.comment = comment;
      await this.cachePost(postId, cachedPost);
    }
  }

  async queueComment(postId: string, comment: string): Promise<void> {
    console.log('💬 Queue Comment (Offline):', postId);

    const action: SyncAction = {
      id: `comment-${postId}-${Date.now()}`,
      type: 'comment',
      timestamp: Date.now(),
      data: { postId, comment },
      retryCount: 0,
      synced: false,
    };

    await this.saveSyncAction(action);

    // Aktualisiere lokalen Cache
    const cachedPost = this.getCachedPost(postId);
    if (cachedPost) {
      cachedPost.comment = comment;
      await this.cachePost(postId, cachedPost);
    }
  }

  // ==========================================
  // SYNCHRONIZATION
  // ==========================================

  async syncOfflineChanges(): Promise<void> {
    if (this.isSyncingSubject.value) {
      console.log('⏳ Synchronisation läuft bereits...');
      return;
    }

    const unsynced = this.syncQueue.filter((a) => !a.synced);

    if (unsynced.length === 0) {
      console.log('✅ Keine ausstehenden Änderungen zum Synchronisieren');
      return;
    }

    console.log(`🔄 Starte Synchronisation von ${unsynced.length} Aktionen...`);
    this.isSyncingSubject.next(true);

    let successCount = 0;
    let failCount = 0;

    for (const action of unsynced) {
      try {
        await this.syncAction(action);
        await this.removeSyncAction(action.id);
        successCount++;
      } catch (error) {
        console.error(`❌ Sync fehlgeschlagen für Aktion ${action.id}:`, error);

        // Erhöhe Retry-Count
        action.retryCount++;

        if (action.retryCount >= this.MAX_RETRY_COUNT) {
          console.error(
            `❌ Maximale Versuche erreicht für Aktion ${action.id} - wird entfernt`
          );
          await this.removeSyncAction(action.id);
        }

        failCount++;
      }
    }

    this.isSyncingSubject.next(false);
    this.lastSyncSubject.next(new Date());

    console.log(
      `✅ Synchronisation abgeschlossen: ${successCount} erfolgreich, ${failCount} fehlgeschlagen`
    );
  }

  private async syncAction(action: SyncAction): Promise<void> {
    console.log(`🔄 Synchronisiere Aktion: ${action.type}`, action.id);

    switch (action.type) {
      case 'update':
        await this.syncUpdateAction(action);
        break;
      case 'comment':
        await this.syncCommentAction(action);
        break;
      default:
        console.warn(`⚠️ Unbekannter Action-Type: ${action.type}`);
    }
  }

  private async syncUpdateAction(action: SyncAction): Promise<void> {
    const { postId, status, comment } = action.data;

    if (this.socketService?.isSocketConnected()) {
      // Via Socket
      await this.socketService.updatePost(postId, status, comment);
      // Warte kurz für Socket-Bestätigung
      await this.delay(500);
    } else {
      // Via REST API
      if (status) {
        await this.restService.updateTeacherState(postId, status).toPromise();
      }
      if (comment !== undefined) {
        await this.restService.updateComment(postId, comment).toPromise();
      }
    }

    console.log(`✅ Update synchronisiert: ${postId}`);
  }

  private async syncCommentAction(action: SyncAction): Promise<void> {
    const { postId, comment } = action.data;

    if (this.socketService?.isSocketConnected()) {
      // Via Socket
      await this.socketService.updateComment(postId, comment);
      await this.delay(500);
    } else {
      // Via REST API
      await this.restService.updateComment(postId, comment).toPromise();
    }

    console.log(`✅ Kommentar synchronisiert: ${postId}`);
  }

  private async refreshDataFromServer(): Promise<void> {
    console.log('🔄 Aktualisiere Daten vom Server...');

    try {
      if (this.socketService?.isSocketConnected()) {
        // Via Socket
        this.socketService.getPosts();
        await this.delay(1000);
      } else {
        // Via REST API
        const posts = await this.restService.getAllPosts().toPromise();

        // Cache alle Posts
        if (posts && Array.isArray(posts)) {
          for (const post of posts) {
            await this.cachePost(post._id || post.id, post);
          }
        }
      }

      console.log('✅ Daten vom Server aktualisiert');
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Daten:', error);
    }
  }

  // ==========================================
  // PUBLIC API
  // ==========================================

  isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  getOnlineStatus(): Observable<boolean> {
    return this.isOnlineSubject.asObservable();
  }

  isSyncing(): Observable<boolean> {
    return this.isSyncingSubject.asObservable();
  }

  getLastSync(): Observable<Date | null> {
    return this.lastSyncSubject.asObservable();
  }

  getPendingActionsCount(): Observable<number> {
    return this.pendingActionsSubject.asObservable();
  }

  async forceSyncNow(): Promise<void> {
    if (!this.isOnline()) {
      console.warn('⚠️ Offline - Synchronisation nicht möglich');
      return;
    }

    await this.syncOfflineChanges();
    await this.refreshDataFromServer();
  }

  async clearCache(): Promise<void> {
    try {
      if (!this.db) return;

      // Lösche alle cached Posts
      const transaction = this.db.transaction(['cachedPosts'], 'readwrite');
      const store = transaction.objectStore('cachedPosts');
      await store.clear();

      this.cachedPosts.clear();

      console.log('🗑️ Cache geleert');
    } catch (error) {
      console.error('❌ Fehler beim Leeren des Caches:', error);
    }
  }

  async clearSyncQueue(): Promise<void> {
    try {
      if (!this.db) return;

      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      await store.clear();

      this.syncQueue = [];
      this.updatePendingActionsCount();

      console.log('🗑️ Sync-Queue geleert');
    } catch (error) {
      console.error('❌ Fehler beim Leeren der Sync-Queue:', error);
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
