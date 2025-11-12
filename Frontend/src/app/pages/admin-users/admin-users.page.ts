import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  IonBadge,
  IonSearchbar,
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ModalController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  add,
  person,
  shieldCheckmark,
  createOutline,
  trashOutline,
  searchOutline,
} from 'ionicons/icons';

import {
  UserManagementService,
  User,
} from '../../services/user-management.service';
import { FeedbackService } from '../../services/feedback.service';
import { RestService } from '../../services/rest.service';
import { CreateUserModal } from '..//../modals/create-user/create-user.modal';
import { EditUserModal } from '../../modals/edit-user/edit-user.modal';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.page.html',
  styleUrls: ['./admin-users.page.scss'],
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
    IonBadge,
    IonSearchbar,
    IonFab,
    IonFabButton,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
  ],
})
export class AdminUsersPage implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm = '';
  isLoading = true;
  currentUserId = '';

  constructor(
    private userManagementService: UserManagementService,
    private feedbackService: FeedbackService,
    private restService: RestService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private router: Router
  ) {
    addIcons({
      arrowBack,
      add,
      person,
      shieldCheckmark,
      createOutline,
      trashOutline,
      searchOutline,
    });
  }

  ngOnInit() {
    // Get current user ID from auth token
    const authValue = this.restService.getAuthValue() as any;
    const token = authValue?.token || localStorage.getItem('auth-token');

    if (token) {
      try {
        // Decode JWT Token to get userId
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(window.atob(base64));
        this.currentUserId = decoded.userId || '';
        console.log('🔑 Current User ID:', this.currentUserId);
      } catch (error) {
        console.error('Error decoding token:', error);
        this.currentUserId = '';
      }
    }

    this.loadUsers();
  }

  // ==========================================
  // DATA LOADING
  // ==========================================

  async loadUsers() {
    try {
      this.isLoading = true;

      this.userManagementService.getAllUsers().subscribe({
        next: (response) => {
          this.users = response.users;
          this.applyFilter();
          this.isLoading = false;
        },
        error: async (error) => {
          this.isLoading = false;
          await this.feedbackService.showError(
            error,
            'Fehler beim Laden der Benutzer'
          );
        },
      });
    } catch (error) {
      this.isLoading = false;
      await this.feedbackService.showError(
        error,
        'Fehler beim Laden der Benutzer'
      );
    }
  }

  async doRefresh(event: any) {
    await this.loadUsers();
    event.target.complete();
  }

  // ==========================================
  // FILTERING
  // ==========================================

  applyFilter() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredUsers = [...this.users];
      return;
    }

    const search = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = this.users.filter((user) =>
      user.username.toLowerCase().includes(search)
    );
  }

  onSearch() {
    this.applyFilter();
  }

  // ==========================================
  // USER ACTIONS
  // ==========================================

  async createUser() {
    const modal = await this.modalCtrl.create({
      component: CreateUserModal,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data?.created) {
      await this.feedbackService.showSuccessToast('Benutzer erstellt!');
      await this.loadUsers();
    }
  }

  async editUser(user: User) {
    const modal = await this.modalCtrl.create({
      component: EditUserModal,
      componentProps: {
        user,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data?.updated) {
      await this.feedbackService.showSuccessToast('Benutzer aktualisiert!');
      await this.loadUsers();
    }
  }

  async deleteUser(user: User) {
    alert('DELETE BUTTON CLICKED FOR: ' + user.username);

    console.log('🗑️ Delete User clicked:', user.username, 'ID:', user._id);
    console.log('🔑 Current User ID:', this.currentUserId);

    // Verhindere selbst-löschen
    if (user._id === this.currentUserId) {
      await this.feedbackService.showWarningToast(
        'Du kannst dich nicht selbst löschen!'
      );
      return;
    }

    const confirmed = await this.feedbackService.showConfirm(
      'Benutzer löschen',
      `Möchtest du den Benutzer "${user.username}" wirklich löschen?`,
      'Löschen',
      'Abbrechen'
    );

    console.log('✅ Confirmed:', confirmed);

    if (confirmed) {
      try {
        await this.feedbackService.showLoading('Lösche Benutzer...');

        this.userManagementService.deleteUser(user._id).subscribe({
          next: async (response) => {
            console.log('✅ Delete Response:', response);
            await this.feedbackService.hideLoading();
            await this.feedbackService.showSuccessToast('Benutzer gelöscht!');
            await this.loadUsers();
          },
          error: async (error) => {
            console.error('❌ Delete Error:', error);
            await this.feedbackService.hideLoading();
            await this.feedbackService.showError(error, 'Fehler beim Löschen');
          },
        });
      } catch (error) {
        console.error('❌ Delete Catch Error:', error);
        await this.feedbackService.hideLoading();
        await this.feedbackService.showError(error, 'Fehler beim Löschen');
      }
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  getRoleLabel(role: string): string {
    return this.userManagementService.getRoleLabel(role);
  }

  getRoleIcon(role: string): string {
    return this.userManagementService.getRoleIcon(role);
  }

  getRoleColor(role: string): string {
    return this.userManagementService.getRoleColor(role);
  }

  isCurrentUser(userId: string): boolean {
    return userId === this.currentUserId;
  }

  testMethod() {
    alert('TEST BUTTON WORKS!');
    console.log('🧪 TEST BUTTON CLICKED');
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
