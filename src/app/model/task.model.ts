import {Category} from './category.model';

export class Task {
  id: number;
  name: string;
  archived: boolean;
  goalCount: number;
  maxCount: number;
  unit: string;
  multiplier: number;
  expectedTimesOfCompletion: string[];
  details?: string;
  // subentryDetails?: object;

  category: Category;
  categoryId?: number;

  constructor(category, name, archived, goalCount, unit, expectedTimesOfCompletion) {
    this.category = category;
    this.name = name;
    this.archived = archived;
    this.goalCount = goalCount;
    this.unit = unit;
    this.expectedTimesOfCompletion = expectedTimesOfCompletion;
  }
}
