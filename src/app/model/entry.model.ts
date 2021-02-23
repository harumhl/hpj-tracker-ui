import {Goal} from './task.model';

export class Entry {
  doneDate: string;
  category: string;
  name: string;
  count: number;
  goalCount: number;
  countToMinutes: number;
  hide: boolean;
  subentryDetails: object;

  documentId: string;
  id?: string; // From document-id in Firestore db

  // For edit mode
  checked?: boolean;

  // For display
  unit?: string;
  details?: string;
  time?: any; // 'expectedTimesOfCompletion' in database in goals

  task: Goal;
}
