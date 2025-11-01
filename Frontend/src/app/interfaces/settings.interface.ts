import { TeacherState } from './teacher.interface';

export interface AppSettings {
  sortBy: 'teacher' | 'class';
  showNotifications: boolean;
  defaultStatus: TeacherState | 'all';
  selectedArchive?: string;
  theme?: 'light' | 'dark' | 'auto';
}
