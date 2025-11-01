export interface Teacher {
  id: string;
  names: string[];
  class?: string;
  classNumber?: string;
  room?: string[];
  state?: TeacherState;
  comment?: string;
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
