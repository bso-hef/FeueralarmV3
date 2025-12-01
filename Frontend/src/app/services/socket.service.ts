import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { BehaviorSubject, Observable } from 'rxjs';
import { RestService } from './rest.service';
import { SyncService } from './sync.service';
import { Archive } from '../interfaces/archive.interface';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
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
    private syncService: SyncService
  ) {}

  // ==========================================
  // CONNECTION MANAGEMENT
  // ==========================================

  async connect(): Promise<void> {
    console.log('🔌 Connecting to socket server...');

    // 🔧 FIX: Token ZUERST holen und setzen (VOR connect!)
    const token = this.restService.getToken();

    if (token) {
      // Token in Socket-Auth setzen BEVOR connect() aufgerufen wird
      (this.socket.ioSocket as any).auth = { token };
      console.log('🔐 Token set for socket authentication');
    } else {
      console.warn('⚠️ No token available for socket authentication!');
    }

    // DANN verbinden
    this.socket.connect();

    // Setup event listeners
    this.setupSocketListeners();
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
      console.log('✅ Socket connected');
      this.isConnected = true;
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

    socketAny.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
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
    // Online: Normal senden
    console.log('📤 Updating post:', id, status, comment);
    const payload: any = { id };
    if (status) payload.status = status;
    if (comment !== undefined) payload.comment = comment;

    this.socket.emit('updatePost', payload);
  }

  async updateComment(id: string, comment: string): Promise<void> {
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
    // Token wird nicht mehr hier mitgeschickt - ist bereits in socket.auth!
    this.socket.emit('alert', { time, day });
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
