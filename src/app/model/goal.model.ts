export class Goal {
  category: string; // from Category.category
  name: string;
  documentId: string; // primary key: 'category'_'name'
  archived: boolean;
  goalCount: number;
  unit: string;
  countToMinutes: number;
  expectedTimesOfCompletion: string[];
  details?: string;
  subentryDetails?: object;
}
