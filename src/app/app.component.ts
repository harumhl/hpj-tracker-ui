import {Component, ViewChild} from '@angular/core';
import firebase from 'firebase';
import {DbService} from './db.service';
import {environment} from '../environments/environment';
import {version} from '../../package.json';
import {UtilService} from './util.service';
import {Category} from './model/category.model';
import {Subentry} from './model/subentry.model';
import {Goal} from './model/goal.model';
import QuerySnapshot = firebase.firestore.QuerySnapshot;
import {ChartComponent} from '@syncfusion/ej2-angular-charts';
import {Note} from './model/note.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'HPJ Tracker';
  version = 'v' + version;
  buildTimestamp = environment.buildTimestamp;
  environment = environment.environment;
  mobile: boolean = window.screen.height <= 896;

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

  notes: Note[] = [];

  headers: string[] = ['name', 'count', 'goalCount', 'unit', 'details'];
  categoryColors: object = { // TODO instead of here, category in db should have another key/column to have this color value stored
    Hazel: '#e6efff',
    Workout: '#e6fbff',
    Mind: '#fff7e1',
    ProgrammingAI: '#f3f3f3',
    Basic: '#FFFFFF',
    Interpersonal: '#f5f0ff',
    Hobby: '#f5f0ff'
  };
  dataQueried: Subentry[] = [];
  dataQueriedInSchedules: Subentry[] = [];
  timeToHighlight: string;
  // TODO hide for the rest of the day (wake up 6am)
  // TODO select a few to focus now
  dataToDisplay: Subentry[] = [];
  overallCompletionRate = 0;

  @ViewChild('topChart')
  public chart: ChartComponent;
  numberOfDaysToDisplay = 8;
  overallCompletionRates: any[] = [];
  interval;
  chartLoaded = false;

  display = { // whether to display each component or not
    allOptions: false,
    inSchedules: true, // todo if goal has multiple expected times of completion and there's future one then hide the past one
    incompleteOnly: true,
    fullInfo: true,
    topChart: false, // todo display more dates, display per category
    notes: false,
  };

  testing = false;
  categoryList: string[];
  goalList: string[];
  categories: Category[];
  goals: Goal[];
  activeGoals: Goal[] = [];
  archivedGoals: Goal[] = [];
  saveMessage = '';
  dataQueriedPast: object = {}; // object of Subentry[]
  pastDates: string[] = []; // 7 past dates to select from
  pastDate = ''; // date of selection

  // TODO calculate overall percentage and save whenever changes
  // todo bigger input boxes on web - testing
  // todo ngstyle instead for css

  // TODO document ID can have spaces, so don't try to remove the spaces when writing
  // TODO optimize read in order to prevent meeting quota - e.g. displaying chart (instead of calculating daily % on read, calculate it when modifying entry (aka on write)
  // todo prevent accessing test_* if 80% of the quota is met (read & write separately)
  // todo display firebase quota and how much I used it on UI
  // todo allow modify archive
  constructor(public dbService: DbService) {
    // todo make this a progressive web app?
    // TODO figure out a better way to display success-error message on UI (less relying on console.log) => improve callback systems
    // TODO better input validation & showing messages when failed e.g. if validation_success => make sure to cover else case too
    // Setting up Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.dbService.firebaseDb = firebase.firestore();

    if (!this.mobile) { // Display 'category' column only on desktop by default
      this.headers = UtilService.addElemInArray(this.headers, 'category', true);
    }

    // If already signed in, then hide login related HTML components and add any missing sub-entries
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.postLogin();
      }
    });
  }

  // Attempt to reload the chart, since this.overallCompletionRates can take awhile to generate
  reloadChart() {
    this.interval = setInterval(() => {
      // If the data is ready, then enable the chart
      if (this.chartLoaded === false && this.overallCompletionRates.length > 0 && this.overallCompletionRates.every(elem => elem.date !== '0')) {
        this.display.topChart = true;
      }
      // If the chart is enabled, then actually display the data on chart by refreshing/rerendering
      if (this.chart !== undefined) {
        this.chart.refresh();
        this.toggle('topChart', true);
        this.chartLoaded = true;
        clearInterval(this.interval);
      }
    }, 1000);
  }

  // Convert raw data format from the database to a format for schedule view (deep-copying since 'time' goes string[] -> string)
  convertArrayForScheduleDisplay(queriedData: Subentry[]) {
    // Get all possible times
    let times: any = {};
    for (const data of queriedData) {
      for (const t of data.time) {
        // With object (aka dict), no 'duplicate' sub-entries are introduced
        times[t] = t;
      }
    }
    // Change object (aka dict) to array and sort them
    times = UtilService.toIterable(times) as string[];
    times = times.sort();

    // Create an array to return that will be used for display
    // Sorted by time: string (aka expectedTimesOfCompletion: string[] in database)
    const dataToDisplay = [];
    for (const t of times) {
      for (const data of queriedData) {
        // If a sub-entry is partially done, then do not show it in the early schedules (based on the percentage done and the number of showings in schedule aka expectedTimesOfCompletion.length)
        // e.g. [10:00, 16:00, 18:00] -> display all three if <1/3 done, display the last two if 1/3 ~ <2/3 done, display only the last if >2/3 done
        const completionRate = data.count / data.goalCount;
        let remainingTimes = UtilService.deepCopy(data.time);
        for (let i = 1; i <= data.time.length; i++) {
          if (i / data.time.length > completionRate) {
            remainingTimes = remainingTimes.slice(i - 1);
            break;
          }
        }
        // If a subentry with matching time exists, then addAed to dataToDisplay
        if (remainingTimes.some(d => d === t)) {
          const newData = UtilService.deepCopy(data);
          newData.time = t;  // string time, instead of string[]
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

    this.readAndWriteAfterLogin();
  }

  sortByCategory(array: any[]) {
    array.sort((a, b) => {if (a.category > b.category) { return 1; } else if (a.category < b.category) { return -1; } else { return 0; }});
    return array;
  }

  readAndWriteAfterLogin() {
    // this.initializeDatabase(); // to be performed only after db refresh - though its content is outdated

    // Add any missing entry & sub-entries
    this.dbService.newEntry(this.dbService.today);

    // Read notes
    this.dbService.readAll(false, DbService.collections.notes, [], (querySnapshot) => {
      this.notes = UtilService.toIterable(querySnapshot);
      for (const note of this.notes) { // Firestore keeps it as '\n' and '\t', but it's read in as '\\n' and '\\t'
        note.text = note.text.replace(/\\n/g, '\n');
        note.text = note.text.replace(/\\t/g, '\t');
      }
      this.toggle('notes', true);
    });

    // Subscribe to goals from database
    this.dbService.readAll(false, DbService.collections.goals, [], (querySnapshot: QuerySnapshot) => {
      this.goals = UtilService.toIterable(querySnapshot);
      this.goalList = this.goals.map(goal => goal.name);

      this.activeGoals = this.goals.filter(g => g.archived === false);
      this.archivedGoals = this.goals.filter(g => g.archived);
    });

    // Set up overall completion rates array for the top chart (modified in two different sections of code)
    this.overallCompletionRates = [];
    for (let i = 0; i < this.numberOfDaysToDisplay; i++) {
      this.overallCompletionRates.push({date: '0', percent: 0}); // initialize
      this.pastDates.push('');
    }

    // Subscribe to today's entry (especially its subcollection) from database (for display)
    this.dbService.readSubcollectionsInAnEntryOfADay(true, 'today', (querySnapshot: QuerySnapshot) => {
      this.dataQueried = UtilService.toIterable(querySnapshot); // todo order by category first then by custom
      this.dataQueried = this.sortByCategory(this.dataQueried);

      // Add 'unit' and 'details' from goals to subcollections in entry for display
      for (const queriedSubentry of this.dataQueried) {
        const goal = this.goals.filter(g => g.name === queriedSubentry.name)[0];
        queriedSubentry.unit = goal.unit;
        queriedSubentry.details = goal.details;
        queriedSubentry.time = goal.expectedTimesOfCompletion; // string[] for now
      }

      this.dataQueriedInSchedules = this.convertArrayForScheduleDisplay(this.dataQueried);
      this.toggle('inSchedules', this.display.inSchedules);

      // todo use priorities to calculate % (so I don't always try to do easy stuff to get the percentage up)
      // Calculate overall completion rate to display
      this.overallCompletionRate = this.computeOverallCompletionRate(this.dataQueried);
      const todayStrDD = this.dbService.today.substring(this.dbService.today.length - 2, this.dbService.today.length);
      this.overallCompletionRates[this.numberOfDaysToDisplay - 1] = {date: todayStrDD, percent: this.overallCompletionRate};
      this.dataQueriedPast[this.dbService._getDateKey()] = this.dataQueried;
      this.pastDates[this.numberOfDaysToDisplay - 1] = this.dbService._getDateKey();
    });

    /* De-prioritize tasks that do not contribute to displaying sub-entries in the main table */
    // Subscribe to categories from database
    this.dbService.readAll(false, DbService.collections.categories, [], (querySnapshot: QuerySnapshot) => {
      this.categories = UtilService.toIterable(querySnapshot);
      this.categoryList = this.categories.map(category => category.category);
    });
    // Computing overall completion rates of the past 7 days (today will be added from above as the last element)
    this.reloadChart();
    for (let i = 0; i < this.numberOfDaysToDisplay - 1; i++) {
      // date object has to be created one by one, since readSubcollections..() callback needs access to different dates
      const date = new Date();
      date.setDate(date.getDate() - (this.numberOfDaysToDisplay - 1) + i);

      // TODO allow modifying sub-entries of the past 7 days since I read these in anyway
      this.dbService.readSubcollectionsInAnEntryOfADay(false, this.dbService._getDateKey(date), (querySnapshot: QuerySnapshot) => {
        const dataQueried = UtilService.toIterable(querySnapshot);
        const dateStr = this.dbService._getDateKey(date);
        const dateStrDD = dateStr.substring(dateStr.length - 2, dateStr.length);
        this.overallCompletionRates[i] = {date: dateStrDD, percent: this.computeOverallCompletionRate(dataQueried)};
        this.dataQueriedPast[dateStr] = dataQueried;
        this.pastDates[i] = dateStr;
        console.log('Overall completion rates in %: ', dateStr, this.overallCompletionRates[i].percent.toFixed(2));
      });
    }
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

    // todo add display order / priorities
    // todo unit with numbers (e.g. push-ups 3 sets of 20 push-ups)
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
    const newCount = parseFloat(event.target.value || 0);
    if (row.count !== newCount) {
      this.dbService.updateSubentryCount(row.name, newCount);
    }
  }

  toggle(id: string, value?: any) {
    // actually toggling on/off
    this.display[id] = value;

    if (id === 'allOptions') { // Nothing to perform
      return;
    } else if (id === 'fullInfo') { // Change headers for displaying full info
      if (this.display.fullInfo) {
        this.headers = UtilService.addElemInArray(this.headers, 'category', true);
        this.headers = UtilService.addElemInArray(this.headers, 'time', true);
        this.headers = UtilService.addElemInArray(this.headers, 'unit');
        this.headers = UtilService.addElemInArray(this.headers, 'details');
      } else {
        this.headers = UtilService.removeElemInArray(this.headers, 'category');
        this.headers = UtilService.removeElemInArray(this.headers, 'unit');
        this.headers = UtilService.removeElemInArray(this.headers, 'details');
      }
    }

    if (id === 'incompleteOnly' || id === 'inSchedules') {
      if (this.display.incompleteOnly) { // Filter out completed sub-entries (no deep-copy, but just filtering from the queried data))
        if (this.display.inSchedules) {
          this.dataToDisplay = this.dataQueriedInSchedules.filter(subentry => subentry.count < subentry.goalCount);
        } else {
          this.dataToDisplay = this.dataQueried.filter(subentry => subentry.count < subentry.goalCount);
        }
      } else {
        if (this.display.inSchedules) { // Deep-copy happens when this.dataQueried is pulled from database (so already done by now)
          this.dataToDisplay = this.dataQueriedInSchedules;
        } else {
          this.dataToDisplay = this.dataQueried;
        }
      }

      // Display time to complete with restructured data (deep-copying since 'time' goes string[] -> string)
      if (this.display.inSchedules) {
        this.headers = UtilService.addElemInArray(this.headers, 'time', true);

        // Figure out which time in schedule to highlight
        if (this.dataToDisplay.length > 0) {
          const now = this.dbService.datePipe.transform(Date(), 'HH:mm');
          for (let i = 1; i < this.dataToDisplay.length; i++) {
            if (this.dataToDisplay[i - 1].time <= now && now <= this.dataToDisplay[i].time) {
              this.timeToHighlight = this.dataToDisplay[i - 1].time;
            }
          }
          // (edge cases)
          if (now < this.dataToDisplay[0].time) {
            this.timeToHighlight = this.dataToDisplay[0].time;
          } else if (this.dataToDisplay[this.dataToDisplay.length - 1].time < now) {
            this.timeToHighlight = this.dataToDisplay[this.dataToDisplay.length - 1].time;
          }
        }
      } else {
        this.headers = UtilService.removeElemInArray(this.headers, 'time');
      }
    }

    this.headers = UtilService.getUniqueInArray(this.headers);
  }

  computeOverallCompletionRate(array: Subentry[]) {
    if (array.length === 0) {
      return 0;
    } else {
      let overallCompletionRate = 0;
      for (const subentry of array) {
        const ratio = subentry.count / subentry.goalCount;
        overallCompletionRate += ratio > 1 ? 1 : ratio;
      }
      overallCompletionRate /= array.length;
      overallCompletionRate *= 100;
      return overallCompletionRate;
    }
  }

  // Fill up input elements automatically based on name selection
  updateModifyInputElements(type: string) {
    if (this.testing) {
      if (type === 'Modify Goal') {
        if (document.getElementById('modifyGoalName') as HTMLInputElement === null) {
          (document.getElementById('modifyGoalName') as HTMLInputElement).value = this.goals[0].name;
        }
        const goalName = (document.getElementById('modifyGoalName') as HTMLInputElement).value;
        const goalInfo = this.goals.filter(g => g.name === goalName)[0];
        if (goalInfo !== null && goalInfo !== undefined) {
          (document.getElementById('modifyGoalGoalCount') as HTMLInputElement).value = goalInfo.goalCount.toString();
          (document.getElementById('modifyGoalUnit') as HTMLInputElement).value = goalInfo.unit;
          (document.getElementById('modifyGoalExpectedTimesOfCompletion') as HTMLInputElement).value = goalInfo.expectedTimesOfCompletion.join(',');
          (document.getElementById('modifyGoalDetails') as HTMLInputElement).value = goalInfo.details;
        }
      }
    }
  }

  // todo ability to archive or un-archive goals
  // Save new goal or modified goal
  save(type: string) {
    if (type === 'New Goal') {
      const category = (document.getElementById('newGoalCategory') as HTMLInputElement).value;
      const name = (document.getElementById('newGoalName') as HTMLInputElement).value;
      const archived = false;
      const goalCount = Number((document.getElementById('newGoalGoalCount') as HTMLInputElement).value);
      const unit = (document.getElementById('newGoalUnit') as HTMLInputElement).value;
      let expectedTimesOfCompletion: any = (document.getElementById('newGoalExpectedTimesOfCompletion') as HTMLInputElement).value;
      const details = (document.getElementById('newGoalDetails') as HTMLInputElement).value;

      (document.getElementById('newGoalName') as HTMLInputElement).value = '';
      (document.getElementById('newGoalGoalCount') as HTMLInputElement).value = '';
      (document.getElementById('newGoalUnit') as HTMLInputElement).value = '';
      (document.getElementById('newGoalExpectedTimesOfCompletion') as HTMLInputElement).value = '';
      (document.getElementById('newGoalDetails') as HTMLInputElement).value = '';

      expectedTimesOfCompletion = expectedTimesOfCompletion.split(',');

      this.dbService.newGoal(category, name, archived, goalCount, unit, expectedTimesOfCompletion, details,
        () => { UtilService.setInterval(10, 1000, () => { this.saveMessage = 'New Goal successful'; }, () => { this.saveMessage = ''; }); },
        () => { UtilService.setInterval(10, 1000, () => { this.saveMessage = 'New Goal failed'; }, () => { this.saveMessage = ''; }); });
    } else if (type === 'Modify Goal') {
      const name = (document.getElementById('modifyGoalName') as HTMLInputElement).value;
      const goalCount = (document.getElementById('modifyGoalGoalCount') as HTMLInputElement).value;
      const unit = (document.getElementById('modifyGoalUnit') as HTMLInputElement).value;
      let expectedTimeOfCompletion: any = (document.getElementById('modifyGoalExpectedTimesOfCompletion') as HTMLInputElement).value;
      const details = (document.getElementById('modifyGoalDetails') as HTMLInputElement).value;

      (document.getElementById('modifyGoalName') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalGoalCount') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalUnit') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalExpectedTimesOfCompletion') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalDetails') as HTMLInputElement).value = '';

      expectedTimeOfCompletion = expectedTimeOfCompletion.split(',');

      this.dbService.updateGoal(name, Number(goalCount), unit, expectedTimeOfCompletion, details,
        () => { UtilService.setInterval(10, 1000, () => { this.saveMessage = 'Modify Goal successful'; }, () => { this.saveMessage = ''; }); },
        () => { UtilService.setInterval(10, 1000, () => { this.saveMessage = 'Modify Goal failed'; }, () => { this.saveMessage = ''; }); });
    }
  }
}
