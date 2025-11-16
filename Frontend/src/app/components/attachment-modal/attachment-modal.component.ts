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

  // Für Notizen
  noteText = '';
  noteTitle = '';

  constructor(
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    public photoService: PhotoService,
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
          text: 'Foto aufnehmen',
          icon: 'camera',
          handler: () => {
            this.takePhoto();
          },
        },
        {
          text: 'Foto aus Galerie',
          icon: 'image',
          handler: () => {
            this.selectPhoto();
          },
        },
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

  async takePhoto() {
    try {
      await this.feedbackService.showLoading('Kamera wird geöffnet...');

      const photoData = await this.photoService.takePhoto();

      await this.feedbackService.hideLoading();

      if (!photoData) {
        await this.feedbackService.showWarningToast('Kein Foto aufgenommen');
        return;
      }

      await this.uploadPhoto(photoData);
    } catch (error) {
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(error, 'Fehler beim Aufnehmen');
    }
  }

  async selectPhoto() {
    try {
      await this.feedbackService.showLoading('Galerie wird geöffnet...');

      const photoData = await this.photoService.selectPhoto();

      await this.feedbackService.hideLoading();

      if (!photoData) {
        await this.feedbackService.showWarningToast('Kein Foto ausgewählt');
        return;
      }

      await this.uploadPhoto(photoData);
    } catch (error) {
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(error, 'Fehler beim Auswählen');
    }
  }

  async selectFile() {
    try {
      const fileData = await this.photoService.selectFile();

      if (!fileData) {
        await this.feedbackService.showWarningToast('Keine Datei ausgewählt');
        return;
      }

      await this.uploadFile(fileData.data, fileData.filename);
    } catch (error) {
      await this.feedbackService.showError(error, 'Fehler beim Hochladen');
    }
  }

  async createNote() {
    const noteContent = await this.feedbackService.showPrompt(
      'Notiz erstellen',
      'Notiz eingeben...',
      'textarea',
      ''
    );

    if (!noteContent || noteContent.trim() === '') {
      return;
    }

    const noteTitle = await this.feedbackService.showPrompt(
      'Notiz-Titel',
      'Titel (optional)',
      'text',
      ''
    );

    try {
      await this.feedbackService.showLoading('Notiz wird hochgeladen...');

      this.isUploading = true;

      const response = await this.photoService
        .uploadNote(this.teacher.id, noteContent.trim(), noteTitle || undefined)
        .toPromise();

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
      await this.feedbackService.hideLoading();
      this.isUploading = false;
      await this.feedbackService.showError(error, 'Fehler beim Speichern');
    }
  }

  // ==========================================
  // UPLOAD HELPERS
  // ==========================================

  async uploadPhoto(base64Data: string) {
    try {
      await this.feedbackService.showLoading('Foto wird hochgeladen...');

      this.isUploading = true;

      const response = await this.photoService
        .uploadPhoto(this.teacher.id, base64Data)
        .toPromise();

      await this.feedbackService.hideLoading();
      this.isUploading = false;

      if (response && response.success) {
        await this.feedbackService.showSuccessToast(
          'Foto erfolgreich hochgeladen!'
        );
        await this.loadAttachments();
      } else {
        throw new Error(response?.error || 'Upload fehlgeschlagen');
      }
    } catch (error) {
      await this.feedbackService.hideLoading();
      this.isUploading = false;
      await this.feedbackService.showError(error, 'Upload fehlgeschlagen');
    }
  }

  async uploadFile(base64Data: string, filename: string) {
    try {
      await this.feedbackService.showLoading('Datei wird hochgeladen...');

      this.isUploading = true;

      const response = await this.photoService
        .uploadFile(this.teacher.id, base64Data, filename)
        .toPromise();

      await this.feedbackService.hideLoading();
      this.isUploading = false;

      if (response && response.success) {
        await this.feedbackService.showSuccessToast(
          'Datei erfolgreich hochgeladen!'
        );
        await this.loadAttachments();
      } else {
        throw new Error(response?.error || 'Upload fehlgeschlagen');
      }
    } catch (error) {
      await this.feedbackService.hideLoading();
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

  openAttachment(url: string): void {
    window.open(url, '_blank');
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
