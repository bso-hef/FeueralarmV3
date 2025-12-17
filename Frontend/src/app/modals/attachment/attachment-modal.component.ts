import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonTextarea,
  IonSpinner,
  IonThumbnail,
  IonActionSheet,
  ModalController,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  camera,
  image,
  document,
  text,
  cloudUpload,
  trash,
  eyeOutline,
} from 'ionicons/icons';

import { Teacher, Attachment } from '../../interfaces/teacher.interface';
import { PhotoService } from '../../services/photo.service';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-attachment-modal',
  templateUrl: './attachment-modal.component.html',
  styleUrls: ['./attachment-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonTextarea,
    IonSpinner,
    IonThumbnail,
  ],
})
export class AttachmentModalComponent implements OnInit {
  @Input() teacher!: Teacher;

  attachments: Attachment[] = [];
  isLoading = false;
  isUploading = false;

  constructor(
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private photoService: PhotoService,
    private feedbackService: FeedbackService
  ) {
    addIcons({
      close,
      camera,
      image,
      document,
      text,
      cloudUpload,
      trash,
      eyeOutline,
    });
  }

  ngOnInit() {
    this.loadAttachments();
  }

  // ==========================================
  // DATA LOADING
  // ==========================================

  async loadAttachments() {
    this.isLoading = true;

    try {
      const response = await this.photoService
        .getAttachments(this.teacher.id)
        .toPromise();

      if (response && response.attachments) {
        this.attachments = response.attachments;
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Attachments:', error);
      await this.feedbackService.showError(
        error,
        'Fehler beim Laden der Anhänge'
      );
    } finally {
      this.isLoading = false;
    }
  }

  // ==========================================
  // UPLOAD ACTIONS
  // ==========================================

  async showUploadOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Anhang hinzufügen',
      buttons: [
        {
          text: 'Datei hochladen',
          icon: 'document',
          handler: () => {
            this.selectFile();
          },
        },
        {
          text: 'Notiz erstellen',
          icon: 'text',
          handler: () => {
            this.createNote();
          },
        },
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async selectFile() {
    try {
      console.log('📄 1. Opening file picker...');
      const fileData = await this.photoService.selectFile();
      console.log(
        '📄 2. File data received:',
        fileData
          ? `${fileData.filename} (${fileData.data.length} chars)`
          : 'null'
      );

      if (!fileData) {
        console.log('❌ 3. No file data');
        await this.feedbackService.showWarningToast('Keine Datei ausgewählt');
        return;
      }

      console.log('📄 4. Showing confirmation dialog...');
      // ✅ NEU: Bestätigung vor Upload
      const confirmed = await this.feedbackService.showConfirm(
        'Datei hochladen',
        `Möchtest du "${fileData.filename}" wirklich hochladen?`,
        'Hochladen',
        'Abbrechen'
      );
      console.log('📄 5. Confirmation result:', confirmed);

      if (!confirmed) {
        console.log('❌ 6. Upload cancelled');
        await this.feedbackService.showWarningToast('Upload abgebrochen');
        return;
      }

      console.log('📄 7. Starting upload...');
      await this.uploadFile(fileData.data, fileData.filename);
      console.log('✅ 8. Upload completed');
    } catch (error) {
      console.error('❌ Error in selectFile:', error);
      await this.feedbackService.showError(error, 'Fehler beim Hochladen');
    }
  }

  async createNote() {
    console.log('📝 createNote() called!');

    const noteContent = await this.feedbackService.showPrompt(
      'Notiz erstellen',
      'Notiz eingeben...',
      'textarea',
      ''
    );

    console.log('📝 Note content:', noteContent);

    if (!noteContent || noteContent.trim() === '') {
      console.log('📝 No content, returning');
      return;
    }

    console.log('📝 Showing title prompt...'); // ← NEU
    const noteTitle = await this.feedbackService.showPrompt(
      'Notiz-Titel',
      'Titel (optional)',
      'text',
      ''
    );
    console.log('📝 Note title:', noteTitle); // ← NEU

    try {
      console.log('📝 Starting upload...'); // ← NEU
      await this.feedbackService.showLoading('Notiz wird hochgeladen...');

      this.isUploading = true;

      console.log('📝 Calling photoService.uploadNote...'); // ← NEU
      const response = await this.photoService
        .uploadNote(this.teacher.id, noteContent.trim(), noteTitle || undefined)
        .toPromise();

      console.log('📝 Response:', response); // ← NEU

      await this.feedbackService.hideLoading();
      this.isUploading = false;

      if (response && response.success) {
        await this.feedbackService.showSuccessToast(
          'Notiz erfolgreich gespeichert!'
        );
        await this.loadAttachments();
      } else {
        throw new Error(response?.error || 'Upload fehlgeschlagen');
      }
    } catch (error) {
      console.error('📝 Error:', error); // ← NEU
      await this.feedbackService.hideLoading();
      this.isUploading = false;
      await this.feedbackService.showError(error, 'Fehler beim Speichern');
    }
  }
  // ==========================================
  // UPLOAD HELPERS
  // ==========================================

  async uploadFile(base64Data: string, filename: string) {
    try {
      console.log('📤 uploadFile called:', {
        filename,
        teacherId: this.teacher.id,
        dataLength: base64Data.length,
      });
      console.log('📤 Checking services...');
      console.log('📤 feedbackService:', !!this.feedbackService);
      console.log('📤 photoService:', !!this.photoService);
      console.log('📤 teacher:', this.teacher);

      // ⚠️ TEMPORÄR DEAKTIVIERT - showLoading hängt
      // console.log('📤 Showing loading...');
      // await this.feedbackService.showLoading('Datei wird hochgeladen...');
      // console.log('📤 Loading shown');

      this.isUploading = true;

      console.log('📤 Calling photoService.uploadFile...');
      console.log(
        '📤 URL will be:',
        `https://18.193.97.54/api/teachers/${this.teacher.id}/files`
      );

      let response;
      try {
        response = await this.photoService
          .uploadFile(this.teacher.id, base64Data, filename)
          .toPromise();
        console.log('📤 Upload response received:', response);
      } catch (httpError: any) {
        console.error('❌ HTTP Error during upload:', httpError);
        console.error('❌ Error status:', httpError.status);
        console.error('❌ Error message:', httpError.message);
        console.error('❌ Error body:', httpError.error);
        throw httpError;
      }

      // await this.feedbackService.hideLoading();
      this.isUploading = false;

      if (response && response.success) {
        console.log('✅ File upload successful!');
        await this.feedbackService.showSuccessToast(
          'Datei erfolgreich hochgeladen!'
        );
        await this.loadAttachments();
      } else {
        console.error('❌ File upload failed:', response);
        throw new Error(response?.error || 'Upload fehlgeschlagen');
      }
    } catch (error: any) {
      console.error('❌ Error in uploadFile:', error);
      console.error('❌ Error stack:', error.stack);
      // await this.feedbackService.hideLoading();
      this.isUploading = false;
      await this.feedbackService.showError(error, 'Upload fehlgeschlagen');
    }
  }

  // ==========================================
  // DELETE
  // ==========================================

  async deleteAttachment(attachment: Attachment) {
    const confirmed = await this.feedbackService.showConfirm(
      'Anhang löschen',
      `Möchtest du "${attachment.filename}" wirklich löschen?`,
      'Löschen',
      'Abbrechen'
    );

    if (!confirmed) return;

    try {
      await this.feedbackService.showLoading('Wird gelöscht...');

      await this.photoService
        .deleteAttachment(this.teacher.id, attachment.id)
        .toPromise();

      await this.feedbackService.hideLoading();
      await this.feedbackService.showSuccessToast('Anhang gelöscht');

      await this.loadAttachments();
    } catch (error) {
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(error, 'Fehler beim Löschen');
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  getAttachmentIcon(type: string): string {
    const icons: { [key: string]: string } = {
      photo: 'image',
      document: 'document',
      note: 'text',
    };
    return icons[type] || 'document';
  }

  isImage(attachment: Attachment): boolean {
    return (
      attachment.type === 'photo' ||
      attachment.mimeType?.startsWith('image/') ||
      false
    );
  }

  openAttachment(attachment: Attachment): void {
    // Öffne in neuem Tab/Browser
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return dateString;
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
