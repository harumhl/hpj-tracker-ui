import {Task} from './task.model';
import {TreeNode} from 'primeng/api';

export class Entry {
  id: number;
  doneDate: string;
  name: string;
  count: number;
  goalCount: number;
  maxCount: number;
  hide: boolean;
  multiplier: number;
  // entryDetails: object;

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
  detailsInEditMode: boolean;
  detailsInTree: TreeNode[] = [];
}
