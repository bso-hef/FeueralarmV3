import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConsentService } from '../../services/consent.service';

@Component({
  selector: 'app-consent-modal',
  templateUrl: './consent.modal.html',
  styleUrls: ['./consent.modal.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class ConsentModal implements OnInit {
  privacyAccepted = false;
  termsAccepted = false;
  showDetails = false;

  constructor(
    private modalController: ModalController,
    private consentService: ConsentService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('📋 Consent Modal opened');
  }

  /**
   * Bestätigt die Zustimmung und schließt das Modal
   */
  async acceptAndContinue() {
    if (!this.privacyAccepted) {
      console.warn('⚠️ Datenschutzerklärung muss akzeptiert werden');
      return;
    }

    // Speichere Zustimmung
    this.consentService.saveConsent(this.privacyAccepted, this.termsAccepted);

    console.log('✅ Zustimmung erteilt');

    // Schließe Modal
    await this.modalController.dismiss({
      accepted: true,
    });
  }

  /**
   * Lehnt Zustimmung ab - App kann nicht genutzt werden
   */
  async decline() {
    await this.modalController.dismiss({
      accepted: false,
    });
  }

  /**
   * Öffnet die vollständige Datenschutzerklärung
   */
  async openPrivacyPolicy() {
    // Schließe Modal temporär
    await this.modalController.dismiss({
      openPrivacy: true,
    });
  }

  /**
   * Togglet Details-Anzeige
   */
  toggleDetails() {
    this.showDetails = !this.showDetails;
  }

  /**
   * Prüft ob "Fortfahren"-Button aktiviert werden kann
   */
  canContinue(): boolean {
    return this.privacyAccepted;
  }
}
