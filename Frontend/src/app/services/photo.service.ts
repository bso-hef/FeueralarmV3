import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RestService } from './rest.service';

export interface PhotoUploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PhotoService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient, private restService: RestService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.restService.getToken()}`,
    });
  }

  // ==========================================
  // CAMERA & FILE SELECTION
  // ==========================================

  /**
   * Nimmt ein Foto mit der Kamera auf
   */
  async takePhoto(): Promise<string | null> {
    try {
      // ✅ WEB: Verwende File Input (Kamera nicht verfügbar)
      if (Capacitor.getPlatform() === 'web') {
        console.log('📸 Camera not available on web, using file input...');
        return this.selectPhoto(); // Fallback zu File Input
      }

      // ✅ NATIVE: Verwende Capacitor Camera
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
        allowEditing: false,
        correctOrientation: true,
      });

      return photo.dataUrl || null;
    } catch (error) {
      console.error('❌ Fehler beim Aufnehmen des Fotos:', error);
      return null;
    }
  }

  /**
   * Wählt ein Foto aus der Galerie
   */
  async selectPhoto(): Promise<string | null> {
    try {
      // ✅ WEB: Verwende File Input
      if (Capacitor.getPlatform() === 'web') {
        console.log('📸 Using web file input for photo...');
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';

          input.onchange = (event: any) => {
            const file = event.target.files[0];
            if (!file) {
              console.log('❌ No file selected');
              resolve(null);
              return;
            }

            console.log('📸 File selected:', file.name, file.size);
            const reader = new FileReader();
            reader.onload = () => {
              console.log('📸 File read successfully');
              resolve(reader.result as string);
            };
            reader.onerror = () => {
              console.error('❌ Error reading file');
              resolve(null);
            };
            reader.readAsDataURL(file);
          };

          input.click();
        });
      }

      // ✅ NATIVE: Verwende Capacitor Camera
      console.log('📸 Using native camera plugin...');
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 80,
        allowEditing: false,
      });

      return photo.dataUrl || null;
    } catch (error) {
      console.error('❌ Fehler beim Auswählen des Fotos:', error);
      return null;
    }
  }

  /**
   * Wählt eine Datei (Document Picker)
   * Für Web: Input File
   */
  async selectFile(): Promise<{ data: string; filename: string } | null> {
    console.log('📄 Opening file picker...');

    alert('File Picker wird jetzt geöffnet!');

    if (Capacitor.getPlatform() === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf,.doc,.docx,.txt';

        input.onchange = (event: any) => {
          alert('Datei wurde ausgewählt!');
          const file = event.target.files[0];
          if (!file) {
            console.log('❌ No file selected');
            resolve(null);
            return;
          }

          console.log('📄 File selected:', file.name, file.size);
          const reader = new FileReader();
          reader.onload = () => {
            console.log('📄 File read successfully');
            resolve({
              data: reader.result as string,
              filename: file.name,
            });
          };
          reader.onerror = () => {
            console.error('❌ Error reading file');
            resolve(null);
          };
          reader.readAsDataURL(file);
        };

        input.click();
      });
    } else {
      // TODO: Native File Picker für iOS/Android
      console.warn('⚠️ File Picker noch nicht für native Apps implementiert');
      return null;
    }
  }

  // ==========================================
  // AWS S3 UPLOAD
  // ==========================================

  /**
   * Lädt ein Foto zu AWS S3 hoch
   */
  uploadPhoto(
    teacherId: string,
    base64Data: string,
    filename?: string
  ): Observable<PhotoUploadResult> {
    console.log('📤 uploadPhoto called:', {
      teacherId,
      dataLength: base64Data?.length,
    });

    // Entferne Data-URL-Prefix falls vorhanden
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

    const payload = {
      teacherId,
      photo: base64,
      filename: filename || `photo_${Date.now()}.jpg`,
    };

    console.log(
      '📤 Sending request to:',
      `${this.API_URL}/teachers/${teacherId}/photos`
    );

    return this.http.post<PhotoUploadResult>(
      `${this.API_URL}/teachers/${teacherId}/photos`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Lädt eine Datei zu AWS S3 hoch
   */
  uploadFile(
    teacherId: string,
    base64Data: string,
    filename: string
  ): Observable<PhotoUploadResult> {
    console.log('📤 uploadFile called:', {
      teacherId,
      filename,
      dataLength: base64Data?.length,
    });

    // Entferne Data-URL-Prefix
    const base64 = base64Data.replace(/^data:[^;]+;base64,/, '');

    const payload = {
      teacherId,
      file: base64,
      filename,
    };

    console.log(
      '📤 Sending request to:',
      `${this.API_URL}/teachers/${teacherId}/files`
    );

    return this.http.post<PhotoUploadResult>(
      `${this.API_URL}/teachers/${teacherId}/files`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Lädt eine Notiz/Freitext als Text-Datei zu S3 hoch
   */
  uploadNote(
    teacherId: string,
    noteContent: string,
    title?: string
  ): Observable<PhotoUploadResult> {
    console.log('📝 uploadNote called:', {
      teacherId,
      title,
      contentLength: noteContent?.length,
    });

    const filename = title
      ? `${this.sanitizeFilename(title)}.txt`
      : `note_${Date.now()}.txt`;

    // Konvertiere Text zu Base64
    const base64 = btoa(unescape(encodeURIComponent(noteContent)));

    const payload = {
      teacherId,
      file: base64,
      filename,
      mimeType: 'text/plain',
    };

    console.log(
      '📤 Sending request to:',
      `${this.API_URL}/teachers/${teacherId}/files`
    );

    return this.http.post<PhotoUploadResult>(
      `${this.API_URL}/teachers/${teacherId}/files`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  // ==========================================
  // ATTACHMENT MANAGEMENT
  // ==========================================

  /**
   * Lädt alle Attachments für einen Teacher
   */
  getAttachments(teacherId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/teachers/${teacherId}/attachments`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Löscht ein Attachment
   */
  deleteAttachment(teacherId: string, attachmentId: string): Observable<any> {
    return this.http.delete(
      `${this.API_URL}/teachers/${teacherId}/attachments/${attachmentId}`,
      { headers: this.getHeaders() }
    );
  }

  // ==========================================
  // OFFLINE SUPPORT
  // ==========================================

  /**
   * Speichert Foto lokal für Offline-Upload später
   */
  async savePhotoLocally(
    teacherId: string,
    base64Data: string
  ): Promise<string | null> {
    try {
      const filename = `offline_photo_${teacherId}_${Date.now()}.jpg`;
      const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

      await Filesystem.writeFile({
        path: `feueralarm/${filename}`,
        data: base64,
        directory: Directory.Data,
      });

      console.log('💾 Foto lokal gespeichert:', filename);
      return filename;
    } catch (error) {
      console.error('❌ Fehler beim lokalen Speichern:', error);
      return null;
    }
  }

  /**
   * Lädt lokal gespeicherte Fotos
   */
  async loadLocalPhoto(filename: string): Promise<string | null> {
    try {
      const result = await Filesystem.readFile({
        path: `feueralarm/${filename}`,
        directory: Directory.Data,
      });

      return `data:image/jpeg;base64,${result.data}`;
    } catch (error) {
      console.error('❌ Fehler beim Laden des lokalen Fotos:', error);
      return null;
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Bereinigt Dateinamen (entfernt Sonderzeichen)
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9_\-\.]/gi, '_')
      .toLowerCase()
      .substring(0, 100);
  }

  /**
   * Gibt die Dateigröße in lesbarer Form zurück
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Extrahiert MIME-Type aus Data-URL
   */
  getMimeType(dataUrl: string): string {
    const match = dataUrl.match(/^data:([^;]+);/);
    return match ? match[1] : 'application/octet-stream';
  }

  /**
   * Formatiert Datum für Anzeige
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
