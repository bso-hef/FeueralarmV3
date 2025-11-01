export interface Archive {
  _id: string;
  id?: string; // Alias für _id
  created: string | Date;
  date?: Date; // Parsed date
  time?: string;
  day?: string;
  posts?: any[];
}
