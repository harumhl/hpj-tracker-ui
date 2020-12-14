import {Component} from '@angular/core';
import firebase from 'firebase';
import {DbService} from './db.service';
import {environment} from '../environments/environment';
import {version} from '../../package.json';
import {UtilService} from './util.service';
import {Category} from './model/category.model';
import {Entry} from './model/entry.model';
import {Goal} from './model/goal.model';

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

  headers: string[] = ['category', 'name', 'count', 'goalCount']; // todo display 'unit'
  categoryColors: object = { // todo instead of here, category in db should have another key/column to have this color value stored.
    Hazel: '#e6efff',
    Workout: '#e6fbff',
    Mind: '#fff7e1',
    ProgrammingAI: '#f3f3f3',
    Basic: '#FFFFFF',
    Interpersonal: '#f5f0ff',
    Hobby: '#f5f0ff'
  };
  categoryList: string[];
  goalList: string[];
  dataQueried: Entry[];
  dataToDisplay: Entry[];
  overallCompletionRate = 0;
  displayIncompleteOnly = true;

  testing = false;
  categories: Category[];
  goals: Goal[];

  constructor(private dbService: DbService) {
    // Setting up Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.firebaseDb = firebase.database();
    this.dbService.firebaseDb = this.firebaseDb;

    // Read in the data
    this.dbService.readEntriesToday(true, (snapshot) => { // have to have the underscore before date
      const data = snapshot.val() || {}; // in case there is no entry
      this.dataQueried = UtilService.objectToIterable(data); // todo order by category first then by custom
      this.dataQueried.sort((a, b) => {if (a.category > b.category) { return 1; } else if (a.category < b.category) { return -1; } else { return 0; }}); // todo temp

      this.toggle('incomplete', this.displayIncompleteOnly);

      // todo use priorities to calculate % (so I don't always try to do easy stuff to get the percentage up)
      this.overallCompletionRate = 0;
      for (const entry of this.dataQueried) { // todo do only un-archived ones
        const ratio = entry.count / entry.goalCount;
        this.overallCompletionRate += ratio > 1 ? 1 : ratio;
      }
      this.overallCompletionRate /= this.dataQueried.length ;
      this.overallCompletionRate *= 100;
    });
    this.dbService._read(true, DbService.paths.categories, (snapshot) => {
      this.categories = UtilService.objectToIterable(snapshot.val());
      this.categoryList = this.categories.map(category => category.category);
    });
    this.dbService._read(true, DbService.paths.goals, (snapshot) => {
      this.goals = UtilService.objectToIterable(snapshot.val());
      this.goalList = this.goals.map(goal => goal.name);
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
    const mins = 'mins';
    const count = 'count';
    this.dbService.newGoal('Hazel', 'Makeup practice', false, 3, mins, '');
    this.dbService.newGoal('Hazel', 'Stretching', false, 10, mins, '');
    this.dbService.newGoal('Hazel', 'Skincare', false, 2, 'twice a day', '');
    this.dbService.newGoal('Hazel', 'Haircare', false, 2, 'twice a day', '');
    this.dbService.newGoal('Hazel', 'Smile', false, 5, mins, '');
    this.dbService.newGoal('Hazel', 'Learn more', false, 10, mins, '');
    this.dbService.newGoal('Hazel', 'Posture', false, 3, mins, '');
    this.dbService.newGoal('Hazel', 'Dress up', true, 10, mins, '');
    this.dbService.newGoal('Hazel', 'Voice practice', false, 3, mins, '');
    this.dbService.newGoal('Hazel', 'Anal', true, 1, mins, '');
    this.dbService.newGoal('Workout', 'Push-ups', false, 50, count, '');
    this.dbService.newGoal('Workout', 'Ab workout', false, 50, count, '');
    this.dbService.newGoal('Workout', 'Leg workout', false, 50, count, '');
    this.dbService.newGoal('Workout', 'Running', false, 1.0, 'miles', '');
    this.dbService.newGoal('Workout', 'Walking', false, 20, mins, '');
    this.dbService.newGoal('Mind', 'Mindful', false, 5, mins, '');
    this.dbService.newGoal('Mind', 'Mirror', false, 3, mins, '');
    this.dbService.newGoal('Mind', 'Read', false, 5, mins, '');
    this.dbService.newGoal('Mind', 'Meditate Hypnosis', false, 5, mins, '');
    this.dbService.newGoal('ProgrammingAI', 'Programming', false, 10, mins, '');
    this.dbService.newGoal('ProgrammingAI', 'AI', false, 10, mins, '');
    this.dbService.newGoal('Basic', 'Sleep 7 hours', false, 1, count, '');
    this.dbService.newGoal('Basic', 'Wake up at 6am', false, 1, count, '');
    this.dbService.newGoal('Basic', 'Eat fruits', false, 2, 'fruits', '');
    this.dbService.newGoal('Basic', 'Eat healthy', false, 2, 'meals', '');
    // this.dbService.newGoal('Basic', 'Red meat limit', false, 3, 'meals per week', '');
    this.dbService.newGoal('Basic', 'Drink water', false, 6, 'cups', '');
    this.dbService.newGoal('Basic', 'Shave', false, 1, count, '');
    this.dbService.newGoal('Basic', 'Brush teeth', false, 2, count, '');
    // this.dbService.newGoal('Basic', 'Floss', false, 1, count, 'weekly');
    this.dbService.newGoal('Basic', 'Poop', false, 1, count, '');
    this.dbService.newGoal('Basic', 'Shower', false, 2, count, '');
    this.dbService.newGoal('Basic', 'Remove body hair', false, 30, 'hair', '');
    this.dbService.newGoal('Basic', 'Chores', false, 5, mins, '');
    this.dbService.newGoal('Basic', 'Write diary', false, 1, count, '');
    this.dbService.newGoal('Interpersonal', 'Text or call', false, 1, count, '');
    this.dbService.newGoal('Hobby', 'hobby', false, 5, mins, '');
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
    const newCount = parseInt(event.target.value || 0, 10);
    if (row.count !== newCount) {
      this.dbService.updateEntryCount(row.category, row.name, newCount);
    }
  }

  toggle(id: string, value?: any) {
    if (id === 'incomplete') {
      this.displayIncompleteOnly = value; // actually toggling on/off
      if (this.displayIncompleteOnly) {
        this.dataToDisplay = UtilService.deepCopyArray(this.dataQueried).filter(entry => entry.count < entry.goalCount);
      } else {
        this.dataToDisplay = this.dataQueried;
      }
    }
  }

  save(type: string) {
    if (type === 'New Goal') {
      const category = (document.getElementById('newGoalCategory') as HTMLInputElement).value;
      const name = (document.getElementById('newGoalName') as HTMLInputElement).value;
      const goalCount = (document.getElementById('newGoalGoalCount') as HTMLInputElement).value;
      const unit = (document.getElementById('newGoalUnit') as HTMLInputElement).value;
      const details = (document.getElementById('newGoalDetails') as HTMLInputElement).value;

      (document.getElementById('newGoalName') as HTMLInputElement).value = '';
      (document.getElementById('newGoalGoalCount') as HTMLInputElement).value = '';
      (document.getElementById('newGoalUnit') as HTMLInputElement).value = '';
      (document.getElementById('newGoalDetails') as HTMLInputElement).value = '';

      this.dbService.newGoal(category, name, false, Number(goalCount), unit, details);
      this.dbService.newEntry(category, name, 0);
    } else if (type === 'Modify Goal') {
      const name = (document.getElementById('modifyGoalName') as HTMLInputElement).value;
      const goalCount = (document.getElementById('modifyGoalGoalCount') as HTMLInputElement).value;
      const unit = (document.getElementById('modifyGoalUnit') as HTMLInputElement).value;
      const details = (document.getElementById('modifyGoalDetails') as HTMLInputElement).value;

      (document.getElementById('modifyGoalName') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalGoalCount') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalUnit') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalDetails') as HTMLInputElement).value = '';

      this.dbService.updateGoal(name, Number(goalCount), unit, details);
    }
  }
}
