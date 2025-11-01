import { Injectable } from '@angular/core';
import { Teacher, TeacherState } from '../interfaces/teacher.interface';
import { AppInformation } from '../interfaces/information.interface';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private appInfo: AppInformation = {};

  constructor() {}

  // ==========================================
  // DATA TRANSFORMATION
  // ==========================================

  parseTeachersFromAPI(data: any[]): Teacher[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    const teachers: Teacher[] = [];

    data.forEach((item: any) => {
      try {
        const teacher: Teacher = {
          id: item._id,
          names: Array.isArray(item.teachers) ? item.teachers : [],
          class: item.class?.name || '',
          classNumber: item.class?.number || '',
          room: Array.isArray(item.rooms)
            ? item.rooms.map((r: any) => r.number || r)
            : [],
          state: this.parseStatus(item.status),
          comment: this.parseComment(item.comment),
        };

        teachers.push(teacher);
      } catch (error) {
        console.error('Error parsing teacher:', item, error);
      }
    });

    return teachers;
  }

  private parseStatus(status: string | undefined): TeacherState {
    if (!status || status === 'undefined') {
      return TeacherState.OPEN;
    }

    switch (status.toLowerCase()) {
      case 'complete':
        return TeacherState.PRESENT;
      case 'incomplete':
        return TeacherState.INCOMPLETE;
      default:
        return TeacherState.OPEN;
    }
  }

  private parseComment(comment: string | undefined): string {
    if (!comment || comment === ' ' || comment === 'undefined') {
      return '';
    }
    return comment.trim();
  }

  statusToAPIString(state: TeacherState): string {
    switch (state) {
      case TeacherState.PRESENT:
        return 'complete';
      case TeacherState.INCOMPLETE:
        return 'incomplete';
      default:
        return 'undefined';
    }
  }

  // ==========================================
  // SORTING
  // ==========================================

  sortTeachersByName(teachers: Teacher[]): Teacher[] {
    return [...teachers].sort((a, b) => {
      const nameA = this.getLastName(a.names[0] || '');
      const nameB = this.getLastName(b.names[0] || '');
      return nameA.localeCompare(nameB, 'de');
    });
  }

  sortTeachersByClass(teachers: Teacher[]): Teacher[] {
    return [...teachers].sort((a, b) => {
      const classA = (a.class || '') + (a.classNumber || '');
      const classB = (b.class || '') + (b.classNumber || '');
      return classA.localeCompare(classB, 'de');
    });
  }

  private getLastName(fullName: string): string {
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1];
  }

  // ==========================================
  // FILTERING
  // ==========================================

  filterTeachers(
    teachers: Teacher[],
    searchTerm: string,
    statusFilter: TeacherState | 'all' = 'all'
  ): Teacher[] {
    let filtered = teachers;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.state === statusFilter);
    }

    // Filter by search term
    if (searchTerm && searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((teacher) => {
        // Search in teacher names
        const nameMatch = teacher.names.some((name) =>
          name.toLowerCase().includes(search)
        );

        // Search in class
        const classMatch =
          teacher.class?.toLowerCase().includes(search) ||
          teacher.classNumber?.toLowerCase().includes(search);

        // Search in rooms
        const roomMatch = teacher.room?.some((room) =>
          room.toLowerCase().includes(search)
        );

        return nameMatch || classMatch || roomMatch;
      });
    }

    return filtered;
  }

  // ==========================================
  // APP INFORMATION
  // ==========================================

  setAppInformation(info: Partial<AppInformation>): void {
    this.appInfo = { ...this.appInfo, ...info };
  }

  getAppInformation(): AppInformation {
    return this.appInfo;
  }

  setInformationFromAPIData(data: any[]): void {
    if (data && data.length > 0) {
      this.setAppInformation({
        date: new Date(data[0].created),
      });
    }
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  getTeacherStats(teachers: Teacher[]): {
    total: number;
    open: number;
    present: number;
    incomplete: number;
  } {
    return {
      total: teachers.length,
      open: teachers.filter((t) => t.state === TeacherState.OPEN).length,
      present: teachers.filter((t) => t.state === TeacherState.PRESENT).length,
      incomplete: teachers.filter((t) => t.state === TeacherState.INCOMPLETE)
        .length,
    };
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  formatTeacherNames(names: string[]): string {
    if (!names || names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(' & ');

    const lastIndex = names.length - 1;
    return names.slice(0, lastIndex).join(', ') + ' & ' + names[lastIndex];
  }

  formatRooms(rooms: string[]): string {
    if (!rooms || rooms.length === 0) return 'Kein Raum';
    return rooms.join(', ');
  }
}
