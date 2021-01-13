export class Subentry {
  doneDate: string;
  category: string;
  name: string;
  count: number;
  goalCount: number;
  hide: boolean;

  documentId: string;

  // For edit mode
  checked?: boolean;

  // For display
  unit?: string;
  details?: string;
  time?: any; // 'expectedTimesOfCompletion' in database in goals
}
