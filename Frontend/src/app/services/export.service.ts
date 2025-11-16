import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as Papa from 'papaparse';

/**
 * UAP 6.1.1: PDF/CSV Exportfunktionen
 *
 * Dieser Service stellt Export-Funktionen für Alarme und Anwesenheitsdaten bereit.
 *
 * Features:
 * - PDF-Export für Alarm-Berichte
 * - CSV-Export für Datenanalyse
 * - Automatische Formatierung
 * - Download-Funktionalität
 */

export interface ExportAlarmData {
  _id: string;
  created: string;
  updated: string;
  archived: boolean;
  classCount?: number;
  triggeredBy?: string;
  description?: string;
  location?: string;
}

export interface ExportTeacherData {
  name: string;
  klasse: string;
  status: string;
  comment?: string;
  raum?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  constructor() {
    console.log('📤 ExportService initialisiert');
  }

  // ==========================================
  // PDF EXPORT
  // ==========================================

  /**
   * Exportiert einen Alarm-Bericht als PDF
   */
  exportAlarmToPDF(
    alarm: ExportAlarmData,
    teachers: ExportTeacherData[]
  ): void {
    try {
      console.log('📄 Erstelle PDF für Alarm:', alarm._id);

      const doc = new jsPDF();

      // Header
      this.addPDFHeader(doc);

      // Alarm-Informationen
      this.addAlarmInfo(doc, alarm);

      // Statistiken
      this.addStatistics(doc, teachers);

      // Lehrer-Tabelle
      this.addTeachersTable(doc, teachers);

      // Footer
      this.addPDFFooter(doc);

      // Download
      const filename = `Feueralarm_${this.formatDateForFilename(
        alarm.created
      )}.pdf`;
      doc.save(filename);

      console.log('✅ PDF erfolgreich erstellt:', filename);
    } catch (error) {
      console.error('❌ Fehler beim PDF-Export:', error);
      throw error;
    }
  }

  /**
   * PDF Header hinzufügen
   */
  private addPDFHeader(doc: jsPDF): void {
    // Titel
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Feueralarm-Bericht', 14, 20);

    // Linie
    doc.setLineWidth(0.5);
    doc.line(14, 25, 196, 25);
  }

  /**
   * Alarm-Informationen hinzufügen
   */
  private addAlarmInfo(doc: jsPDF, alarm: ExportAlarmData): void {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    let yPos = 35;

    // Datum
    doc.setFont('helvetica', 'bold');
    doc.text('Datum:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDateTime(alarm.created), 50, yPos);
    yPos += 7;

    // Status
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(alarm.archived ? 'Archiviert' : 'Aktiv', 50, yPos);
    yPos += 7;

    // Anzahl Klassen
    if (alarm.classCount !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.text('Anzahl Klassen:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(alarm.classCount.toString(), 50, yPos);
      yPos += 7;
    }

    // Ausgelöst von
    if (alarm.triggeredBy) {
      doc.setFont('helvetica', 'bold');
      doc.text('Ausgelöst von:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(alarm.triggeredBy, 50, yPos);
      yPos += 7;
    }

    // Beschreibung
    if (alarm.description) {
      doc.setFont('helvetica', 'bold');
      doc.text('Beschreibung:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(alarm.description, 140);
      doc.text(descLines, 50, yPos);
      yPos += descLines.length * 7;
    }

    // Standort
    if (alarm.location) {
      doc.setFont('helvetica', 'bold');
      doc.text('Standort:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(alarm.location, 50, yPos);
    }
  }

  /**
   * Statistiken hinzufügen
   */
  private addStatistics(doc: jsPDF, teachers: ExportTeacherData[]): void {
    const stats = this.calculateStatistics(teachers);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Statistiken', 14, 85);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    let yPos = 93;

    doc.text(`Gesamt: ${stats.total}`, 14, yPos);
    yPos += 6;
    doc.text(
      `Anwesend: ${stats.anwesend} (${stats.anwesendPercent}%)`,
      14,
      yPos
    );
    yPos += 6;
    doc.text(
      `Abwesend: ${stats.abwesend} (${stats.abwesendPercent}%)`,
      14,
      yPos
    );
    yPos += 6;
    doc.text(
      `Vollständig: ${stats.vollstaendig} (${stats.vollstaendigPercent}%)`,
      14,
      yPos
    );
    yPos += 6;
    doc.text(
      `Unbekannt: ${stats.unbekannt} (${stats.unbekanntPercent}%)`,
      14,
      yPos
    );
  }

  /**
   * Lehrer-Tabelle hinzufügen
   */
  private addTeachersTable(doc: jsPDF, teachers: ExportTeacherData[]): void {
    const tableData = teachers.map((t) => [
      t.name || '-',
      t.klasse || '-',
      this.translateStatus(t.status),
      t.raum || '-',
      t.comment || '-',
    ]);

    autoTable(doc, {
      head: [['Name', 'Klasse', 'Status', 'Raum', 'Kommentar']],
      body: tableData,
      startY: 120,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 40 }, // Name
        1: { cellWidth: 25 }, // Klasse
        2: { cellWidth: 30 }, // Status
        3: { cellWidth: 25 }, // Raum
        4: { cellWidth: 'auto' }, // Kommentar
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });
  }

  /**
   * PDF Footer hinzufügen
   */
  private addPDFFooter(doc: jsPDF): void {
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Seite ${i} von ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
      doc.text(
        `Erstellt am ${this.formatDateTime(new Date().toISOString())}`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    }
  }

  // ==========================================
  // CSV EXPORT
  // ==========================================

  /**
   * Exportiert einen Alarm-Bericht als CSV
   */
  exportAlarmToCSV(
    alarm: ExportAlarmData,
    teachers: ExportTeacherData[]
  ): void {
    try {
      console.log('📊 Erstelle CSV für Alarm:', alarm._id);

      const csvData = teachers.map((t) => ({
        Name: t.name || '',
        Klasse: t.klasse || '',
        Status: this.translateStatus(t.status),
        Raum: t.raum || '',
        Kommentar: t.comment || '',
        'Alarm-Datum': this.formatDateTime(alarm.created),
        'Alarm-Status': alarm.archived ? 'Archiviert' : 'Aktiv',
      }));

      const csv = Papa.unparse(csvData, {
        delimiter: ';', // Semikolon für Excel (Deutschland)
        header: true,
      });

      // BOM für korrekte Umlaute in Excel
      const bom = '\uFEFF';
      const csvWithBom = bom + csv;

      // Download
      const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const filename = `Feueralarm_${this.formatDateForFilename(
        alarm.created
      )}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ CSV erfolgreich erstellt:', filename);
    } catch (error) {
      console.error('❌ Fehler beim CSV-Export:', error);
      throw error;
    }
  }

  /**
   * Exportiert alle Alarme als CSV-Übersicht
   */
  exportAllAlarmsToCSV(alarms: ExportAlarmData[]): void {
    try {
      console.log('📊 Erstelle CSV für alle Alarme');

      const csvData = alarms.map((a) => ({
        'Alarm-ID': a._id,
        Datum: this.formatDateTime(a.created),
        Status: a.archived ? 'Archiviert' : 'Aktiv',
        'Anzahl Klassen': a.classCount || 0,
        'Ausgelöst von': a.triggeredBy || '',
        Beschreibung: a.description || '',
        Standort: a.location || '',
      }));

      const csv = Papa.unparse(csvData, {
        delimiter: ';',
        header: true,
      });

      const bom = '\uFEFF';
      const csvWithBom = bom + csv;

      const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const filename = `Feueralarm_Übersicht_${this.formatDateForFilename(
        new Date().toISOString()
      )}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ CSV-Übersicht erfolgreich erstellt:', filename);
    } catch (error) {
      console.error('❌ Fehler beim CSV-Export:', error);
      throw error;
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Berechnet Statistiken für Lehrer
   */
  private calculateStatistics(teachers: ExportTeacherData[]): {
    total: number;
    anwesend: number;
    abwesend: number;
    vollstaendig: number;
    unbekannt: number;
    anwesendPercent: number;
    abwesendPercent: number;
    vollstaendigPercent: number;
    unbekanntPercent: number;
  } {
    const total = teachers.length;
    const anwesend = teachers.filter((t) => t.status === 'anwesend').length;
    const abwesend = teachers.filter((t) => t.status === 'abwesend').length;
    const vollstaendig = teachers.filter(
      (t) => t.status === 'vollständig'
    ).length;
    const unbekannt = teachers.filter(
      (t) => t.status === 'unbekannt' || !t.status
    ).length;

    return {
      total,
      anwesend,
      abwesend,
      vollstaendig,
      unbekannt,
      anwesendPercent: total > 0 ? Math.round((anwesend / total) * 100) : 0,
      abwesendPercent: total > 0 ? Math.round((abwesend / total) * 100) : 0,
      vollstaendigPercent:
        total > 0 ? Math.round((vollstaendig / total) * 100) : 0,
      unbekanntPercent: total > 0 ? Math.round((unbekannt / total) * 100) : 0,
    };
  }

  /**
   * Übersetzt Status ins Deutsche
   */
  private translateStatus(status: string): string {
    const translations: { [key: string]: string } = {
      anwesend: 'Anwesend',
      abwesend: 'Abwesend',
      vollständig: 'Vollständig',
      unbekannt: 'Unbekannt',
    };

    return translations[status] || status || 'Unbekannt';
  }

  /**
   * Formatiert Datum/Zeit für Anzeige
   */
  private formatDateTime(dateString: string): string {
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

  /**
   * Formatiert Datum für Dateinamen
   */
  private formatDateForFilename(dateString: string): string {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${year}-${month}-${day}_${hours}-${minutes}`;
    } catch (error) {
      return 'export';
    }
  }
}
