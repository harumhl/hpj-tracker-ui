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
  loggedIn = false;

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
  data: {'category', 'name', 'count', 'doneDate', 'goalCount'}[];
  overallCompletionRate = '0%'; // todo

  constructor(private dbService: DbService) {
    // Setting up Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.firebaseDb = firebase.database();
    this.dbService.firebaseDb = this.firebaseDb;

    // Read in the data
    this.dbService.readEntriesToday(true, (snapshot) => { // have to have the underscore before date
      const data = snapshot.val() || {}; // in case there is no entry
      this.data = UtilService.objectToIterable(data); // todo order by category first then by custom

      let overallCompletionRate = 0;
      for (const entry of this.data) { // todo do only un-archived ones
        overallCompletionRate += entry.count / entry.goalCount;
      }
      overallCompletionRate /= this.data.length ;
      overallCompletionRate *= 100;
      this.overallCompletionRate = overallCompletionRate.toFixed(2) + '%';  // todo
    });
  }

  login() { // Login, hide login HTML components, read data
    (document.getElementById('login') as HTMLInputElement).disabled = true;

    this.email = (document.getElementById('emailInput') as HTMLInputElement).value;
    const password = (document.getElementById('passwordInput') as HTMLInputElement).value;
    firebase.auth().signInWithEmailAndPassword(this.email, password)
      .then((user) => {
        console.log(`Successfully logged in as ${this.email}`);
        this.loggedIn = true;

        // Hide login-related HTML components
        document.getElementById('emailLabel').hidden = true;
        document.getElementById('emailInput').hidden = true;
        document.getElementById('passwordLabel').hidden = true;
        document.getElementById('passwordInput').hidden = true;
        document.getElementById('login').hidden = true;

        // this.initializeDatabase();

        // Get data upon successful login
        this.newEntriesOfTheDay();
      })
      .catch((error) => {
        (document.getElementById('login') as HTMLInputElement).disabled = false;
        console.error(`Failed to login: ${error.code} - ${error.message}`);
      });
  }

  initializeDatabase() { // Only to be run after clearing/refreshing the database
    this.dbService.newCategory('Hazel');
    this.dbService.newCategory('Workout');
    this.dbService.newCategory('Mind');
    this.dbService.newCategory('ProgrammingAI');
    this.dbService.newCategory('Basic');
    this.dbService.newCategory('Interpersonal');
    this.dbService.newCategory('Hobby');

    // todo - add display order, unit with numbers (e.g. push-ups 3 sets of 20 push-ups), details/descriptions, priorities
    const minutes = 'minutes';
    const count = 'count';
    this.dbService.newGoal('Hazel', 'Makeup practice', false, 3, minutes);
    this.dbService.newGoal('Hazel', 'Stretching', false, 10, minutes);
    this.dbService.newGoal('Hazel', 'Skincare', false, 2, 'twice a day');
    this.dbService.newGoal('Hazel', 'Haircare', false, 2, 'twice a day');
    this.dbService.newGoal('Hazel', 'Smile', false, 5, minutes);
    this.dbService.newGoal('Hazel', 'Learn more', false, 10, minutes);
    this.dbService.newGoal('Hazel', 'Posture', false, 3, minutes);
    this.dbService.newGoal('Hazel', 'Dress up', true, 10, minutes);
    this.dbService.newGoal('Hazel', 'Voice practice', false, 3, minutes);
    this.dbService.newGoal('Hazel', 'Anal', true, 1, minutes);
    this.dbService.newGoal('Workout', 'Push-ups', false, 50, count);
    this.dbService.newGoal('Workout', 'Ab workout', false, 50, count);
    this.dbService.newGoal('Workout', 'Leg workout', false, 50, count);
    this.dbService.newGoal('Workout', 'Running', false, 1.0, 'miles');
    this.dbService.newGoal('Workout', 'Walking', false, 20, minutes);
    this.dbService.newGoal('Mind', 'Mind', false, 5, minutes);
    this.dbService.newGoal('Mind', 'Mirror', false, 3, minutes);
    this.dbService.newGoal('Mind', 'Read', false, 5, minutes);
    this.dbService.newGoal('Mind', 'Meditate Hypnosis', false, 5, minutes);
    this.dbService.newGoal('ProgrammingAI', 'Programming', false, 10, minutes);
    this.dbService.newGoal('ProgrammingAI', 'AI', false, 10, minutes);
    this.dbService.newGoal('Basic', 'Sleep 7 hours', false, 1, count);
    this.dbService.newGoal('Basic', 'Wake up at 6am', false, 1, count);
    this.dbService.newGoal('Basic', 'Eat fruits', false, 2, 'fruits');
    this.dbService.newGoal('Basic', 'Eat healthy', false, 2, 'meals');
    this.dbService.newGoal('Basic', 'Drink water', false, 6, 'cups');
    this.dbService.newGoal('Basic', 'Shave', false, 1, count);
    this.dbService.newGoal('Basic', 'Brush teeth', false, 2, count);
    this.dbService.newGoal('Basic', 'Poop', false, 1, count);
    this.dbService.newGoal('Basic', 'Shower', false, 2, count);
    this.dbService.newGoal('Basic', 'Chores', false, 5, minutes);
    this.dbService.newGoal('Basic', 'Write diary', false, 1, count);
    this.dbService.newGoal('Interpersonal', 'Text or call', false, 1, count);
    this.dbService.newGoal('Hobby', 'hobby', false, 5, minutes);
  }

  newEntriesOfTheDay() { // Creating an empty list of entries for the day - if such entry doesn't exist
    this.dbService._read(false, DbService.paths.goals, (snapshot) => {
      const goals = snapshot.val();

      this.dbService.readEntriesToday(false, (snapshot2) => {
        const entriesToday = snapshot2.val() || []; // in case there is no entry
        for (const goal of UtilService.objectToIterable(goals)) {
          if (UtilService.objectToIterable(entriesToday).some(entry => entry.name === goal.name) === false) {
            this.dbService.newEntry(goal.category, goal.name, 0, null, goal.goalCount);
          }
        }
      });
    });
  }

  updateEntryCount(row, event) {
    const newCount = parseInt(event.target.value, 10);
    if (row.count !== newCount) {
      this.dbService.updateEntryCount(row.category, row.name, newCount);
    }
  }
}
