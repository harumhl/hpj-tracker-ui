export class Goal {
  category: string; // from Category.category
  name: string; // primary key
  archived: boolean;
  goalCount: number;
  unit: string;
  details?: string;
}
