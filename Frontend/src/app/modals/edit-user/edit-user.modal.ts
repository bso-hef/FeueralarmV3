import { Component, Input, OnInit } from '@angular/core';
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
  IonToggle,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, checkmark } from 'ionicons/icons';

import {
  UserManagementService,
  User,
  UpdateUserData,
} from '../../services/user-management.service';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-edit-user-modal',
  templateUrl: './edit-user.modal.html',
  styleUrls: ['./edit-user.modal.scss'],
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
    IonToggle,
  ],
})
export class EditUserModal implements OnInit {
  @Input() user!: User;

  updateData: UpdateUserData = {
    username: '',
    role: '',
    password: '',
  };

  changePassword = false;
  isSubmitting = false;

  constructor(
    private modalCtrl: ModalController,
    private userManagementService: UserManagementService,
    private feedbackService: FeedbackService
  ) {
    addIcons({ close, checkmark });
  }

  ngOnInit() {
    if (this.user) {
      this.updateData.username = this.user.username;
      this.updateData.role = this.user.role;
    }
  }

  async updateUser() {
    // Validation
    if (!this.updateData.username) {
      await this.feedbackService.showWarningToast('Benutzername erforderlich');
      return;
    }

    if (this.changePassword) {
      if (!this.updateData.password || this.updateData.password.length < 6) {
        await this.feedbackService.showWarningToast(
          'Passwort muss mindestens 6 Zeichen lang sein'
        );
        return;
      }
    }

    this.isSubmitting = true;

    try {
      // Nur geänderte Felder senden
      const payload: UpdateUserData = {
        username: this.updateData.username,
        role: this.updateData.role,
      };

      if (this.changePassword && this.updateData.password) {
        payload.password = this.updateData.password;
      }

      this.userManagementService.updateUser(this.user._id, payload).subscribe({
        next: async () => {
          this.isSubmitting = false;
          await this.modalCtrl.dismiss({ updated: true });
        },
        error: async (error) => {
          this.isSubmitting = false;
          await this.feedbackService.showError(
            error,
            'Fehler beim Aktualisieren'
          );
        },
      });
    } catch (error) {
      this.isSubmitting = false;
      await this.feedbackService.showError(error, 'Fehler beim Aktualisieren');
    }
  }

  cancel() {
    this.modalCtrl.dismiss({ updated: false });
  }

  onPasswordToggleChange() {
    if (!this.changePassword) {
      this.updateData.password = '';
    }
  }
}
