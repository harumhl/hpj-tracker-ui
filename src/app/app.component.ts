import {Component} from '@angular/core';
import firebase from 'firebase';
import {DbService} from './db.service';
import {environment} from '../environments/environment';
import {version} from '../../package.json';
import {UtilService} from './util.service';

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

  headers: string[] = ['name', 'count', 'goalCount'];
  data: object[];
  overallCompletionRate: string; // todo

  constructor(private dbService: DbService) {
    // Setting up Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.firebaseDb = firebase.database();
    this.dbService.firebaseDb = this.firebaseDb;

    // Read in the data
    this.dbService.readEntriesToday(true, (snapshot) => { // have to have the underscore before date
      this.data = UtilService.objectToIterable(snapshot.val());
      this.overallCompletionRate = '';  // todo
    });
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
      })
      .catch((error) => {
        console.error(`Failed to login: ${error.code} - ${error.message}`);
      });
  }

  // todo add more
  initializeDatabase() { // Only to be run after clearing/refreshing the database
    this.dbService.newCategory('Basic');
    this.dbService.newCategory('Workout');
    this.dbService.newCategory('Hazel');
    this.dbService.newCategory('Mind');

    this.dbService.newGoal('Basic', 'Wake up at 6am', false, 1, 'count');
    this.dbService.newGoal('Basic', 'Eat fruits', false, 2, 'count');

    this.dbService.newEntry('Basic', 'Eat fruits', 1, '2020-12-11');
  }

  newEntriesOfTheDay() { // Creating an empty list of entries for the day
    this.dbService._read(false, DbService.paths.goals, (snapshot) => {
      const goals = snapshot.val();

      this.dbService.readEntriesToday(false, (snapshot2) => {
        for (const goal of UtilService.objectToIterable(goals)) {
          ; // todo
          //// Looking for an entry which includes today's date and the iterating goal -> if not found, then make an empty entry
          //// todo structure in 'entries' will change
          //if (Object.keys(value.entries).some(key => key.includes(today) && key.includes(DbService._removeAllSpaces(goal.name))) ===false) {
          //  this.dbService.newEntry(goal.category, goal.name, 0, null, goal.goalCount);
          //}
        }
      });
    });
  }
}
