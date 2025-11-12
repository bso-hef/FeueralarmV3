import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, checkmark } from 'ionicons/icons';

import {
  UserManagementService,
  CreateUserData,
} from '../../services/user-management.service';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-create-user-modal',
  templateUrl: './create-user.modal.html',
  styleUrls: ['./create-user.modal.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
  ],
})
export class CreateUserModal {
  userData: CreateUserData = {
    username: '',
    password: '',
    role: 'user',
  };

  isSubmitting = false;

  constructor(
    private modalCtrl: ModalController,
    private userManagementService: UserManagementService,
    private feedbackService: FeedbackService
  ) {
    addIcons({ close, checkmark });
  }

  async createUser() {
    // Validation
    if (!this.userData.username || !this.userData.password) {
      await this.feedbackService.showWarningToast(
        'Bitte alle Felder ausfüllen'
      );
      return;
    }

    if (this.userData.password.length < 6) {
      await this.feedbackService.showWarningToast(
        'Passwort muss mindestens 6 Zeichen lang sein'
      );
      return;
    }

    this.isSubmitting = true;

    try {
      this.userManagementService.createUser(this.userData).subscribe({
        next: async () => {
          this.isSubmitting = false;
          await this.modalCtrl.dismiss({ created: true });
        },
        error: async (error) => {
          this.isSubmitting = false;
          await this.feedbackService.showError(
            error,
            'Fehler beim Erstellen des Benutzers'
          );
        },
      });
    } catch (error) {
      this.isSubmitting = false;
      await this.feedbackService.showError(
        error,
        'Fehler beim Erstellen des Benutzers'
      );
    }
  }

  cancel() {
    this.modalCtrl.dismiss({ created: false });
  }
}
