import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Observable } from 'rxjs';
import { RestService } from './rest.service';
import { SyncService } from './sync.service'; // ← NEU
import { Archive } from '../interfaces/archive.interface';

import { environment } from '../../environments/environment';

export class SocketService {
  private readonly SERVER_URL = environment.socketUrl;

  private postsSubject = new BehaviorSubject<any>(null);
  private updateSubject = new BehaviorSubject<any>(null);
  private archiveSubject = new BehaviorSubject<Archive[]>([]);

  private socketId = '';
  private lastChangeSocketId = '';
  private isConnected = false;
  private isFetched = false;

  constructor(
    private socket: Socket,
    private restService: RestService,
    private syncService: SyncService // ← NEU
  ) {}

  // ==========================================
  // CONNECTION MANAGEMENT
  // ==========================================

  async connect(): Promise<void> {
    console.log('🔌 Connecting to socket server...');

    this.socket.connect();

    // Setup event listeners
    this.setupSocketListeners();

    // Authenticate
    const token = this.restService.getToken();
    if (token) {
      this.socket.emit('authenticate', { token });
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting from socket server...');
    this.socket.disconnect();
    this.isConnected = false;
  }

  private setupSocketListeners(): void {
    // Type casting to fix ngx-socket-io types issue
    const socketAny = this.socket as any;

    // Connection events
    socketAny.on('connect', async () => {
      // ← GEÄNDERT: async
      console.log('✅ Socket connected');
      this.isConnected = true;

      // *** NEU: Sync nach Reconnect ***
      try {
        await this.syncService.syncOfflineChanges();
      } catch (error) {
        console.error('❌ Sync fehlgeschlagen:', error);
      }
    });

    socketAny.on('disconnect', (reason: string) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;

      // Auto-reconnect if not manual disconnect
      if (reason !== 'io client disconnect') {
        setTimeout(() => {
          if (!this.isConnected) {
            console.log('🔄 Attempting to reconnect...');
            this.connect();
          }
        }, 5000);
      }
    });

    socketAny.on('error', (error: any) => {
      console.error('❌ Socket error:', error);
    });

    // Socket ID
    socketAny.on('emitSocketId', (data: any) => {
      this.socketId = data.msg;
      console.log('🆔 Socket ID:', this.socketId);
    });

    // Authentication
    socketAny.on('authenticated', () => {
      console.log('✅ Socket authenticated');
    });

    socketAny.on('unauthorized', (error: any) => {
      console.error('❌ Socket unauthorized:', error);
    });

    // Data events
    socketAny.on('emitPosts', (data: any) => {
      console.log('📦 Posts received:', data);
      this.isFetched = true;
      this.postsSubject.next(data);
    });

    socketAny.on('emitAlerts', (data: any) => {
      console.log('🔔 Alerts received:', data);
      if (data.posts) {
        this.archiveSubject.next(data.posts);
      }
    });

    socketAny.on('emitUpdate', (data: any) => {
      console.log('🔄 Update received:', data);
      this.lastChangeSocketId = data.msg || '';
      if (data.posts && data.posts[0]) {
        this.updateSubject.next(data.posts[0]);
      }
    });

    socketAny.on('emitError', (error: any) => {
      console.error('❌ Server error:', error);
    });
  }

  // ==========================================
  // OBSERVABLES
  // ==========================================

  get posts$(): Observable<any> {
    return this.postsSubject.asObservable();
  }

  get update$(): Observable<any> {
    return this.updateSubject.asObservable();
  }

  get archive$(): Observable<Archive[]> {
    return this.archiveSubject.asObservable();
  }

  // ==========================================
  // API METHODS
  // ==========================================

  getPosts(alertId?: string): void {
    console.log('📤 Fetching posts...', alertId || 'latest');
    this.socket.emit('fetchPosts', { alertId: alertId || null });
  }

  async updatePost(
    id: string,
    status?: string,
    comment?: string
  ): Promise<void> {
    // ← GEÄNDERT: async Promise
    // *** NEU: Offline-Check ***
    if (!this.syncService.isOnline()) {
      console.log('📴 Offline - speichere in Queue');
      await this.syncService.queueUpdate(id, status, comment);
      return;
    }

    // Online: Normal senden
    console.log('📤 Updating post:', id, status, comment);
    const payload: any = { id };
    if (status) payload.status = status;
    if (comment !== undefined) payload.comment = comment;

    this.socket.emit('updatePost', payload);
  }

  async updateComment(id: string, comment: string): Promise<void> {
    // ← GEÄNDERT: async Promise
    // *** NEU: Offline-Check ***
    if (!this.syncService.isOnline()) {
      console.log('📴 Offline - speichere Kommentar in Queue');
      await this.syncService.queueComment(id, comment);
      return;
    }

    // Online: Normal senden
    console.log('📤 Updating comment:', id, comment);
    this.socket.emit('updatePost', {
      id,
      comment: comment || ' ',
    });
  }

  fetchAlerts(): void {
    console.log('📤 Fetching alerts...');
    this.socket.emit('fetchAlerts');
  }

  triggerAlert(time: string, day: string): void {
    console.log('🚨 Triggering alarm:', time, day);
    const token = this.restService.getToken();
    this.socket.emit('alert', { token, time, day });
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getSocketId(): string {
    return this.socketId;
  }

  getLastChangeSocketId(): string {
    return this.lastChangeSocketId;
  }

  isSocketConnected(): boolean {
    return this.isConnected;
  }

  hasFetchedData(): boolean {
    return this.isFetched;
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
