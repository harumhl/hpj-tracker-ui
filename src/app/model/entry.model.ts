import {Task} from './task.model';

export class Entry {
  doneDate: string;
  name: string;
  count: number;
  goalCount: number;
  maxCount: number;
  hide: boolean;
  multiplier: number;
  // subentryDetails: object;

  task: Task;

  // For edit mode
  checked?: boolean;

  // For display
  category: string;
  unit?: string;
  details?: string;
  time?: any; // 'expectedTimesOfCompletion' in database in goals
}
