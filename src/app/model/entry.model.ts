import {Task} from './task.model';

export class Entry {
  id: number;
  doneDate: string;
  name: string;
  count: number;
  goalCount: number;
  maxCount: number;
  hide: boolean;
  multiplier: number;
  // subentryDetails: object;

  task: Task;
  taskId: number;

  // For edit mode
  checked?: boolean;

  // For display
  category: string;
  unit?: string;
  impact?: string;
  details?: string;
  time?: any; // 'expectedTimesOfCompletion' in database in goals
}
