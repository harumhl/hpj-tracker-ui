import {Component} from '@angular/core';
import firebase from 'firebase';
import {DbService} from './db.service';
import {environment} from '../environments/environment';
import {version} from '../../package.json';
import {UtilService} from './util.service';
import {Category} from './model/category.model';
import {Subentry} from './model/subentry.model';
import {Goal} from './model/goal.model';
import QuerySnapshot = firebase.firestore.QuerySnapshot;
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;

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

  headers: string[] = ['category', 'name', 'count', 'goalCount', 'unit', 'details'];
  categoryColors: object = { // todo instead of here, category in db should have another key/column to have this color value stored.
    Hazel: '#e6efff',
    Workout: '#e6fbff',
    Mind: '#fff7e1',
    ProgrammingAI: '#f3f3f3',
    Basic: '#FFFFFF',
    Interpersonal: '#f5f0ff',
    Hobby: '#f5f0ff'
  };
  dataQueried: Subentry[] = [];
  dataToDisplay: Subentry[] = [];
  overallCompletionRate = 0;
  displayInSchedules = true; // schedules <-> category-ordered
  displayIncompleteOnly = true;
  displayFullInfo = true;

  timeToHighlight: string;

  testing = false;
  categoryList: string[];
  goalList: string[];
  categories: Category[];
  goals: Goal[];

  constructor(public dbService: DbService) {
    // Setting up Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.dbService.firebaseDb = firebase.firestore();

    // Subscribe to goals from database
    this.dbService.readAll(true, DbService.collections.goals, [], (querySnapshot: QuerySnapshot) => {
      this.goals = UtilService.toIterable(querySnapshot);
      this.goalList = this.goals.map(goal => goal.name);
    });

    // Subscribe to today's entry (especially its subcollection) from database (for display)
    this.dbService.readSubcollectionsInAnEntryOfADay(true, 'today', (querySnapshot: QuerySnapshot) => { // have to have the underscore before date
      this.dataQueried = UtilService.toIterable(querySnapshot); // TODO order by category first then by custom
      this.dataQueried.sort((a, b) => {if (a.category > b.category) { return 1; } else if (a.category < b.category) { return -1; } else { return 0; }}); // todo temp

      // Add 'unit' and 'details' from goals to subcollections in entry for display
      for (const queriedSubentry of this.dataQueried) {
        const goal = this.goals.filter(g => g.name === queriedSubentry.name)[0];
        queriedSubentry.unit = goal.unit;
        queriedSubentry.details = goal.details;
        queriedSubentry.time = goal.expectedTimesOfCompletion; // string[] for now
      }

      this.toggle('incomplete', this.displayIncompleteOnly);

      // todo use priorities to calculate % (so I don't always try to do easy stuff to get the percentage up)
      // Calculate overall completion rate to display
      this.overallCompletionRate = 0;
      for (const subentry of this.dataQueried) {
        const ratio = subentry.count / subentry.goalCount;
        this.overallCompletionRate += ratio > 1 ? 1 : ratio;
      }
      this.overallCompletionRate /= this.dataQueried.length ;
      this.overallCompletionRate *= 100;
    });

    /* De-prioritize tasks that do not contribute to displaying sub-entries in the main table */
    firebase.auth().onAuthStateChanged((user) => {
      // If already signed in, then hide login related HTML components and add any missing sub-entries
      if (user) {
        this.postLogin();
      }
    });
    // Subscribe to categories from database
    this.dbService.readAll(true, DbService.collections.categories, [], (querySnapshot: QuerySnapshot) => {
      this.categories = UtilService.toIterable(querySnapshot);
      this.categoryList = this.categories.map(category => category.category);
    });
  }

  // .
  convertArrayForScheduleDisplay(array: any) {
    // Get all possible times
    let time: any = {};
    for (const data of array) {
      for (const t of data.time) {
        // With object (aka dict), no 'duplicate' sub-entries are introduced
        time[t] = t;
      }
    }
    // Get unique time and sort them
    time = UtilService.toIterable(time);
    time = time.sort();

    // Create an array to return that will be used for display
    // Sorted by time: string (aka expectedTimesOfCompletion: string[] in database)
    const dataToDisplay = [];
    for (const t of time) {
      for (const data of array) {
        // If a subentry with matching time exists, then addAed to dataToDisplay
        if (data.time.some(d => d === t)) {
          const newData = UtilService.deepCopy(data);
          newData.time = t;
          dataToDisplay.push(newData);
        }
      }
    }
    return dataToDisplay;
  }

  login() { // Login, hide login HTML components, read data
    (document.getElementById('login') as HTMLInputElement).disabled = true;

    this.email = (document.getElementById('emailInput') as HTMLInputElement).value;
    const password = (document.getElementById('passwordInput') as HTMLInputElement).value;
    firebase.auth().signInWithEmailAndPassword(this.email, password)
      .then((user) => {
        console.log(`Successfully logged in as ${this.email}`);
        this.postLogin();
      })
      .catch((error) => {
        (document.getElementById('login') as HTMLInputElement).disabled = false;
        console.error(`Failed to login: ${error.code} - ${error.message}`);
      });
  }

  postLogin() {
    this.loggedIn = true;

    // Hide login-related HTML components
    document.getElementById('emailLabel').hidden = true;
    document.getElementById('emailInput').hidden = true;
    document.getElementById('passwordLabel').hidden = true;
    document.getElementById('passwordInput').hidden = true;
    document.getElementById('login').hidden = true;

    // this.initializeDatabase();

    // Add any missing entry & sub-entries
    this.dbService.newEntry(this.dbService.today);
  }

  // Can't & Shouldn't rely on this much longer, since deleting the whole collections and adding them new will eat up the quota in the newer (Firestore) database
  //   Once the "DDL" is almost finalized, then rely on UI to add and modify goals and entries/sub-entries
  initializeDatabase() { // Only to be run after clearing/refreshing the database
    this.dbService.newCategory('Hazel');
    this.dbService.newCategory('Workout');
    this.dbService.newCategory('Mind');
    this.dbService.newCategory('ProgrammingAI');
    this.dbService.newCategory('Basic');
    this.dbService.newCategory('Interpersonal');
    this.dbService.newCategory('Hobby');
    this.dbService.newCategory('Others');

    // TODO - add display order, unit with numbers (e.g. push-ups 3 sets of 20 push-ups), priorities
    // TODO copy details from 2020 HPJ tracker spreadsheet
    const mins = 'mins';
    const count = 'count';
    this.dbService.newGoal('Hazel', 'Makeup practice', false, 3, mins, ['10:00'], '');
    this.dbService.newGoal('Hazel', 'Stretching', false, 10, mins, ['07:00'], '');
    this.dbService.newGoal('Hazel', 'Toner Lotion VitaminC on face', false, 2, 'twice a day', ['07:45', '21:00'], '');
    this.dbService.newGoal('Hazel', 'Body lotion', false, 2, 'twice a day', ['07:45', '21:00'], '');
    this.dbService.newGoal('Hazel', 'Haircare', false, 2, 'twice a day', ['07:45', '21:00'], '');
    this.dbService.newGoal('Hazel', 'Brush hair', false, 200, 'strokes', ['07:45', '21:00'], '');
    this.dbService.newGoal('Hazel', 'Cold blow dry hair', false, 5, mins, ['07:45'], '');
    this.dbService.newGoal('Hazel', 'Smile', false, 5, mins, ['10:00', '14:00', '18:00'], '');
    this.dbService.newGoal('Hazel', 'Face muscle stretch', false, 5, mins, ['10:00', '14:00', '18:00'], '');
    this.dbService.newGoal('Hazel', 'Mewing', false, 5, mins, ['10:00', '14:00', '18:00'], '');
    this.dbService.newGoal('Hazel', 'Learn more', false, 10, mins, ['11:00'], '');
    this.dbService.newGoal('Hazel', 'Posture', false, 3, mins, ['10:00'], '');
    this.dbService.newGoal('Hazel', 'Posture correction stretch', false, 3, mins, ['10:00'], '');
    this.dbService.newGoal('Hazel', 'Dress up', true, 10, mins, ['10:00'], '');
    this.dbService.newGoal('Hazel', 'Voice practice', false, 3, mins, ['10:00'], '');
    this.dbService.newGoal('Hazel', 'Anal', true, 1, mins, ['10:00'], '');
    this.dbService.newGoal('Workout', 'Push-ups', false, 50, count, ['10:00', '14:00', '18:00'], '');
    this.dbService.newGoal('Workout', 'Ab workout', false, 50, count, ['10:00', '14:00', '18:00'], '');
    this.dbService.newGoal('Workout', 'Squats & Lunges', false, 50, count, ['10:00', '14:00', '18:00'], '');
    this.dbService.newGoal('Workout', 'Donkey kicks & Fire hydrants', false, 50, count, ['10:00', '14:00', '18:00'], 'with a band');
    this.dbService.newGoal('Workout', 'Glute bridge', false, 30, count, ['10:00', '14:00', '18:00'], '');
    this.dbService.newGoal('Workout', 'Running', false, 1.0, 'miles', ['06:00'], '');
    this.dbService.newGoal('Workout', 'Walking', false, 20, mins, ['06:30'], '');
    this.dbService.newGoal('Workout', 'No red-meat dish', false, 1, count, ['12:00', '19:00'], '');
    this.dbService.newGoal('Mind', 'Mindful', false, 5, mins, ['10:00'], '');
    this.dbService.newGoal('Mind', 'Mirror', false, 3, mins, ['10:00'], '');
    this.dbService.newGoal('Mind', 'Read', false, 5, mins, ['10:00'], '');
    this.dbService.newGoal('Mind', 'Talk with Rhami', false, 5, mins, ['10:00'], '');
    this.dbService.newGoal('Mind', 'Meditate Hypnosis', false, 5, mins, ['10:00'], '');
    this.dbService.newGoal('ProgrammingAI', 'Programming', false, 10, mins, ['10:00'], '');
    this.dbService.newGoal('ProgrammingAI', 'AI', false, 10, mins, ['10:00'], '');
    this.dbService.newGoal('ProgrammingAI', 'Maintain HPJ tracker web', false, 10, mins, ['10:00'], '');
    this.dbService.newGoal('Basic', 'Sleep 7 hours', false, 1, count, ['06:00'], '');
    this.dbService.newGoal('Basic', 'Wake up at 6am', false, 1, count, ['06:00'], '');
    this.dbService.newGoal('Basic', 'Eat fruits', false, 2, 'fruits', ['07:00'], '');
    this.dbService.newGoal('Basic', 'Eat healthy', false, 2, 'meals', ['12:00', '19:00'], '');
    // this.dbService.newGoal('Basic', 'Red meat limit', false, 3, 'meals per week', ['10:00'], '');
    this.dbService.newGoal('Basic', 'Drink water', false, 6, 'cups', ['08:00', '11:00', '14:00', '17:00'], '');
    this.dbService.newGoal('Basic', 'Shave', false, 1, count, ['07:30'], '');
    this.dbService.newGoal('Basic', 'Brush teeth', false, 2, count, ['07:30'], '');
    this.dbService.newGoal('Basic', 'Retainer', false, 2, count, ['21:00'], '');
    // this.dbService.newGoal('Basic', 'Floss', false, 1, count, 'weekly');
    this.dbService.newGoal('Basic', 'Poop', false, 1, count, ['08:00'], '');
    this.dbService.newGoal('Basic', 'Shower', false, 2, count, ['08:00'], '');
    this.dbService.newGoal('Basic', 'Condition hair', false, 2, count, ['08:30'], 'conditioner & leave-in conditioner daily');
    // this.dbService.newGoal('Basic', 'Hair pack', false, 2, count, ['10:00'], '');
    this.dbService.newGoal('Basic', 'Remove body hair', false, 30, 'hair', ['08:30'], '');
    this.dbService.newGoal('Basic', 'Chores', false, 5, mins, ['17:00'], '');
    this.dbService.newGoal('Basic', 'Nap', false, 5, mins, ['13:00'], '');
    this.dbService.newGoal('Basic', 'Write diary', false, 1, count, ['22:00'], '');
    this.dbService.newGoal('Interpersonal', 'Text or call', false, 1, count, ['14:00'], '');
    this.dbService.newGoal('Hobby', 'hobby', false, 5, mins, ['17:00'], '');
    this.dbService.newGoal('Hobby', 'study constellations', false, 5, mins, ['22:00'], '');
    this.dbService.newGoal('Others', 'Read Korean out loud', false, 5, mins, ['17:00'], '');
    this.dbService.newGoal('Others', 'Read English out loud', false, 5, mins, ['17:00'], '');
  }

  updateSubentryCount(row, event) {
    const newCount = parseInt(event.target.value || 0, 10);
    if (row.count !== newCount) {
      this.dbService.updateSubentryCount(row.name, newCount);
    }
  }

  toggle(id: string, value?: any) {
    // actually toggling on/off
    if (id === 'displayIncompleteOnly') {
      this.displayIncompleteOnly = value;
    } else if (id === 'displayFullInfo') {
      this.displayFullInfo = value;
    } else if (id === 'displayInSchedules') {
      this.displayInSchedules = value;
    }

    // Change headers for displaying full info
    if (this.displayFullInfo) {
      this.headers = this.addElemInArray(this.headers, 'category', true);
      this.headers = this.addElemInArray(this.headers, 'unit');
      this.headers = this.addElemInArray(this.headers, 'details');
    } else {
      this.headers = this.removeElemInArray(this.headers, 'category');
      this.headers = this.removeElemInArray(this.headers, 'unit');
      this.headers = this.removeElemInArray(this.headers, 'details');
    }

    if (this.displayIncompleteOnly || this.displayInSchedules) {
      this.dataToDisplay = UtilService.deepCopy(this.dataQueried);
    }

    // Filter out completed sub-entries
    if (this.displayIncompleteOnly) {
      this.dataToDisplay = this.dataToDisplay.filter(subentry => subentry.count < subentry.goalCount); // todo for multiple level of filtering, dataQueried shouldn't be used
    }

    // Display time to complete with restructured data
    if (this.displayInSchedules) {
      this.dataToDisplay = this.convertArrayForScheduleDisplay(this.dataToDisplay);
      this.headers = this.addElemInArray(this.headers, 'time', true);

      // Figure out which time in schedule to highlight
      const now = this.dbService.datePipe.transform(Date(), 'HH:mm');
      for (let i = 1; i <= this.dataToDisplay.length; i++) {
        if (this.dataToDisplay[i - 1].time <= now && now <= this.dataToDisplay[i].time) {
          this.timeToHighlight = this.dataToDisplay[i - 1].time;
        }
      }
    } else {
      this.headers = this.removeElemInArray(this.headers, 'time');
    }

    this.headers = this.getUniqueInArray(this.headers);
  }

  getUniqueInArray(array: any[]) {
    return array.filter((value, index, self) => self.indexOf(value) === index);
  }

  addElemInArray(array: any[], elem: any, front = false) {
    if (front) {
      return [elem].concat(array);
    } else {
      return array.concat([elem]);
    }
  }
  removeElemInArray(array: any[], elem: any) {
    const index = array.indexOf(elem, 0);
    if (index > -1) {
      array.splice(index, 1);
    }
    return array;
  }
}
