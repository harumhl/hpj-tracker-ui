import {Category} from './category.model';

export class Goal {
  documentId: string; // primary key: 'category'_'name'

  //category: string; // from Category.category
  name: string;
  archived: boolean;
  goalCount: number;
  unit: string;
  countToMinutes: number;
  expectedTimesOfCompletion: string[];

  details?: string;
  subentryDetails?: object;

  category: Category;

  constructor(category, name, archived, goalCount, unit, countToMinutes, expectedTimesOfCompletion) {
    this.category = category;
    this.name = name;
    this.archived = archived;
    this.goalCount = goalCount;
    this.unit = unit;
    this.countToMinutes = countToMinutes;
    this.expectedTimesOfCompletion = expectedTimesOfCompletion;
  }
}
