import { Component } from '@angular/core';
import firebase from 'firebase';
import {CategoryModel} from './models/category.model';
import {DbService} from './db.service';
import {GoalModel} from './models/goal.model';
import {DatePipe} from '@angular/common';
import {environment} from '../environments/environment';
import { version } from '../../package.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'HPJ Tracker';
  version = 'v' + version;

  email = 'haru.mhl@gmail.com';

  // Found it at https://console.firebase.google.com/project/hpj-tracker/settings/general, 'Config' under 'Firebase SDK snippet'
  firebaseConfig = {
    apiKey: environment.firebaseApiKey,
    authDomain: environment.firebaseAuthDomain,
    databaseURL: environment.firebaseDatabaseURL,
    projectId: environment.firebaseProjectId,
    storageBucket: environment.firebaseStorageBucket,
    messagingSenderId: environment.firebaseMessagingSenderId,
    appId: environment.firebaseAppId,
    measurementId: environment.firebaseMeasurementId
  };
  firebaseDb: firebase.database.Database = null;

  today: string;
  headers: string[];
  data: object[];

  constructor(private dbService: DbService,
              private datePipe: DatePipe) {
    // Setting up Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.firebaseDb = firebase.database();
    this.dbService.firebaseDb = this.firebaseDb;

    this.today = Date();
  }

  _getDateKey(date?) {
    if (date === null || date === undefined) {
      date = this.today;
    }
    return this.datePipe.transform(date, 'yyyy-MM-dd');
  }

  _objectToIterable(obj: object) {
    const iterable = [];
    Object.keys(obj).forEach((key) => iterable.push(obj[key]));
    return iterable;
  }

  login() { // Login, hide login HTML components, read data
    document.getElementById('login').hidden = true;

    this.email = (document.getElementById('emailInput') as HTMLInputElement).value;
    const password = (document.getElementById('passwordInput') as HTMLInputElement).value;
    firebase.auth().signInWithEmailAndPassword(this.email, password)
      .then((user) => {
        console.log(`Successfully logged in as ${this.email}`);

        // Hide login-related HTML components
        document.getElementById('emailLabel').hidden = true;
        document.getElementById('emailInput').hidden = true;
        document.getElementById('passwordLabel').hidden = true;
        document.getElementById('passwordInput').hidden = true;

        // Get data upon successful login
        this.newEntriesOfTheDay();
        this.headers = ['name', 'count', 'goalCount'];
        this.dbService.readSubscribe('/entries').on('value', (snap) => {
          const data = snap.val();
          const newData = [];
          const today = this._getDateKey();
          Object.keys(data).filter(key => {
            if (key.includes(today)) {
              newData.push(data[key]);
            }
          });

          this.data = newData;
        });
      })
      .catch((error) => {
        console.error(`Failed to login: ${error.code} - ${error.message}`);
      });
  }

  initAddToDb() { // Only to be run after clearing/refreshing the database
    this.dbService.writeNew('/categories', {category: 'Basic'} as CategoryModel);
    this.dbService.writeNew('/categories', {category: 'Workout'} as CategoryModel);
    this.dbService.writeNew('/categories', {category: 'Hazel'} as CategoryModel);
    this.dbService.writeNew('/categories', {category: 'Mind'} as CategoryModel);

    this.dbService.writeNew('/goals', {category: 'Basic', name: 'Wake up at 6am', archived: false, goalCount: 1, unit: 'count'} as GoalModel);
    this.dbService.writeNew('/goals', {category: 'Basic', name: 'Eat fruits', archived: false, goalCount: 2, unit: 'count'} as GoalModel);

    this.dbService.writeNew('/entries', {doneDate: '2020-12-11', category: 'Basic', name: 'Eat fruits', count: 1, goalCount: 2, updatedTs: Date()});

    this.dbService.update('/entries', '_2020-12-11_Eatfruits', {count: 2});
  }

  newEntry(category: string, name: string, count: number, doneDate?: string, goalCount?: number) { // Entering what I did
    const key = DbService._keysToKey('/goals', {category, name});
    if (doneDate === null || doneDate === undefined) {
      doneDate = this._getDateKey();
    }

    if (goalCount) {
      this.dbService.writeNew('/entries', {doneDate, category, name, count, goalCount, updatedTs: Date()});
    } else {
      this.dbService.readAllOnce('/goals/' + key).then((snapshot) => {
        const value = snapshot.val();
        goalCount = value.goalCount;
        this.dbService.writeNew('/entries', {doneDate, category, name, count, goalCount, updatedTs: Date()});
      });
    }
  }

  newEntriesOfTheDay() { // Creating an empty list of entries for the day
    this.dbService.readAllOnce().then((snapshot) => {
      const value = snapshot.val();
      const today = this._getDateKey();

      for (const goal of this._objectToIterable(value.goals)) {
        // Looking for an entry which includes today's date and the iterating goal -> if not found, then make an empty entry
        if (Object.keys(value.entries).some(key => key.includes(today) && key.includes(DbService._removeAllSpaces(goal.name))) === false) {
          this.newEntry(goal.category, goal.name, 0, null, goal.goalCount);
        }
      }
    });
  }
}
