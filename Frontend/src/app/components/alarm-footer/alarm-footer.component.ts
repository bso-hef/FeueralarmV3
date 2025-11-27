import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonFooter,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkDoneOutline,
  documentTextOutline,
  gridOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-alarm-footer',
  templateUrl: './alarm-footer.component.html',
  styleUrls: ['./alarm-footer.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonFooter,
    IonToolbar,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class AlarmFooterComponent {
  @Input() hasActiveAlarm = false;
  @Input() isProcessing = false;

  @Output() endAlarm = new EventEmitter<void>();
  @Output() exportPDF = new EventEmitter<void>();
  @Output() exportCSV = new EventEmitter<void>();

  constructor() {
    addIcons({
      checkmarkDoneOutline,
      documentTextOutline,
      gridOutline,
    });
  }

  onEndAlarm(): void {
    this.endAlarm.emit();
  }

  onExportPDF(): void {
    this.exportPDF.emit();
  }

  onExportCSV(): void {
    this.exportCSV.emit();
  }
}
