export interface Teacher {
  id: string;
  names: string[];
  class?: string;
  classNumber?: string;
  room?: string[];
  state?: TeacherState;
  comment?: string;
  attachments?: Attachment[]; // ← NEU: Fotos & Dateien
}

export interface Attachment {
  id: string;
  type: 'photo' | 'document' | 'note';
  url: string;
  filename: string;
  mimeType?: string;
  size?: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export enum TeacherState {
  OPEN = 1,
  PRESENT = 2,
  INCOMPLETE = 3,
}

export const TeacherStateLabel = {
  [TeacherState.OPEN]: 'Offen',
  [TeacherState.PRESENT]: 'Anwesend',
  [TeacherState.INCOMPLETE]: 'Unvollständig',
};

export const TeacherStateColor = {
  [TeacherState.OPEN]: '#f8d93d',
  [TeacherState.PRESENT]: '#22B152',
  [TeacherState.INCOMPLETE]: '#f32843',
};
