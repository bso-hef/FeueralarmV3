import { Injectable } from '@angular/core';
import {
  LoadingController,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  close,
  checkmarkCircle,
  closeCircle,
  warningOutline,
  informationCircle,
} from 'ionicons/icons';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private currentLoading: HTMLIonLoadingElement | null = null;

  constructor(
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    // Register icons for toasts and alerts
    addIcons({
      close,
      checkmarkCircle,
      closeCircle,
      warningOutline,
      informationCircle,
    });
  }

  // ==========================================
  // LOADING
  // ==========================================

  async showLoading(message: string = 'Laden...'): Promise<void> {
    // Schließe vorheriges Loading falls vorhanden
    if (this.currentLoading) {
      await this.hideLoading();
    }

    this.currentLoading = await this.loadingCtrl.create({
      message,
      spinner: 'crescent',
      cssClass: 'custom-loading',
      backdropDismiss: false,
    });

    await this.currentLoading.present();
  }

  async hideLoading(): Promise<void> {
    if (this.currentLoading) {
      await this.currentLoading.dismiss();
      this.currentLoading = null;
    }
  }

  // ==========================================
  // ALERTS
  // ==========================================

  async showAlert(
    title: string,
    message: string,
    buttons: string[] = ['OK']
  ): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: title,
      message,
      buttons,
      cssClass: 'custom-alert',
    });

    await alert.present();
  }

  async showConfirm(
    title: string,
    message: string,
    confirmText: string = 'Ja',
    cancelText: string = 'Nein'
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: title,
        message,
        buttons: [
          {
            text: cancelText,
            role: 'cancel',
            handler: () => resolve(false),
          },
          {
            text: confirmText,
            handler: () => resolve(true),
          },
        ],
        cssClass: 'custom-alert',
      });

      await alert.present();
    });
  }

  async showPrompt(
    title: string,
    placeholder: string = '',
    inputType: 'text' | 'textarea' = 'text',
    initialValue: string = ''
  ): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header: title,
        inputs: [
          {
            name: 'input',
            type: inputType,
            placeholder,
            value: initialValue,
          },
        ],
        buttons: [
          {
            text: 'Abbrechen',
            role: 'cancel',
            handler: () => resolve(null),
          },
          {
            text: 'OK',
            handler: (data) => {
              resolve(data.input || null);
            },
          },
        ],
        cssClass: 'custom-alert',
      });

      await alert.present();

      // Focus auf Input
      setTimeout(() => {
        const input = document.querySelector(
          'ion-alert input, ion-alert textarea'
        ) as HTMLElement;
        if (input) {
          input.focus();
        }
      }, 300);
    });
  }

  // ==========================================
  // TOAST
  // ==========================================

  async showToast(
    message: string,
    duration: number = 2500,
    position: 'top' | 'middle' | 'bottom' = 'top',
    color?: string
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration,
      position,
      color,
      cssClass: 'custom-toast',
      buttons: [
        {
          text: '✕',
          role: 'cancel',
        },
      ],
    });

    await toast.present();
  }

  async showSuccessToast(message: string): Promise<void> {
    await this.showToast(message, 2000, 'top', 'success');
  }

  async showErrorToast(message: string): Promise<void> {
    await this.showToast(message, 3000, 'top', 'danger');
  }

  async showWarningToast(message: string): Promise<void> {
    await this.showToast(message, 2500, 'top', 'warning');
  }

  async showInfoToast(message: string): Promise<void> {
    await this.showToast(message, 2000, 'top', 'primary');
  }

  // ==========================================
  // SPECIAL ALERTS
  // ==========================================

  async showError(error: any, customMessage?: string): Promise<void> {
    const message =
      customMessage ||
      error?.message ||
      error?.error?.message ||
      'Ein unbekannter Fehler ist aufgetreten';

    await this.showAlert('Fehler', message);
  }

  async showSuccess(message: string): Promise<void> {
    await this.showToast(message, 2000, 'top', 'success');
  }
}
