import { Component } from '@angular/core';
import firebase from 'firebase';
import {CategoryModel} from './models/category.model';
import {DbService} from './db.service';
import {GoalModel} from './models/goal.model';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Tour of Heroes';

  // Found it at https://console.firebase.google.com/project/hpj-tracker/settings/general, 'Config' under 'Firebase SDK snippet'
  firebaseConfig = {
  };
  firebaseDb: firebase.database.Database = null;

  data: object;

  constructor(private dbService: DbService,
              private datePipe: DatePipe) {
    firebase.initializeApp(this.firebaseConfig);
    this.firebaseDb = firebase.database();

    this.dbService.firebaseDb = this.firebaseDb;

    // this.initAddToDb();
    this.newEntry('Basic', 'Wake up at 6am', 1);
  }

  initAddToDb() {
    this.dbService.writeNew('/categories', {category: 'Basic'} as CategoryModel);
    this.dbService.writeNew('/categories', {category: 'Workout'} as CategoryModel);
    this.dbService.writeNew('/categories', {category: 'Hazel'} as CategoryModel);
    this.dbService.writeNew('/categories', {category: 'Mind'} as CategoryModel);

    this.dbService.writeNew('/goals', {category: 'Basic', name: 'Wake up at 6am', archived: false, goalCount: 1, unit: 'count'} as GoalModel);
    this.dbService.writeNew('/goals', {category: 'Basic', name: 'Eat fruits', archived: false, goalCount: 2, unit: 'count'} as GoalModel);

    this.dbService.writeNew('/entries', {doneDate: '2020-12-11', category: 'Basic', name: 'Eat fruits', count: 1, goalCount: 2, updatedTs: Date()});

    this.dbService.update('/entries', '_2020-12-11_Eatfruits', {count: 2});
  }

  newEntry(category: string, name: string, count: number, doneDate?: string) {
    const key = DbService.keysToKey('/goals', {category, name});
    if (doneDate === null || doneDate === undefined) {
      doneDate = this.datePipe.transform(Date(), 'yyyy-MM-dd');
    }

    this.dbService.readAll('/goals/' + key).then((snapshot) => {
      const value = snapshot.val();
      const goalCount = value.goalCount;
      this.dbService.writeNew('/entries', {doneDate, category, name, count, goalCount, updatedTs: Date()});
    });
  }
}
