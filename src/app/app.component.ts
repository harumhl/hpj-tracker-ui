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
    'Body Care': '#ffeacc',
    Workout: '#e6fbff',
    Mind: '#fffbd8',
    ProgramAI: '#f3f3f3',
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
  interval = null;
  chartLoaded = false;

  display = { // whether to display each component or not
    allOptions: false,
    inSchedules: true, // todo if goal has multiple expected times of completion and there's future one then hide the past one
    incompleteAndUnhiddenOnly: true,
    fullInfo: true,
    topChart: false, // todo display more dates, display per category
    notes: false,
  };

  editMode = false;

  testing = false;
  categoryList: string[] = [];
  goalList: string[] = [];
  categories: Category[] = [];
  goals: Goal[] = []; // TODO most and least accomplished goals in the past 7 days
  activeGoals: Goal[] = [];
  archivedGoals: Goal[] = [];
  saveMessage = '';
  yesterday = '';
  headersPast: string[] = ['name', 'count', 'goalCount', 'unit'];
  dataQueriedPast: any[] = []; // similar to Subentry, but 7-8 days of entries instead of single 'count'

  // TODO calculate overall percentage and save whenever changes
  // todo bigger input boxes on web - testing
  // todo ngstyle instead for css

  // TODO document ID can have spaces, so don't try to remove the spaces when writing
  // TODO optimize read in order to prevent meeting quota - e.g. displaying chart (instead of calculating daily % on read, calculate it when modifying entry (aka on write)
  // todo prevent accessing test_* if 80% of the quota is met (read & write separately)
  // todo display firebase quota and how much I used it on UI
  // todo allow modify archive
  constructor(public dbService: DbService, private utilService: UtilService) {
    // todo make this a progressive web app?
    // TODO figure out a better way to display success-error message on UI (less relying on console.log) => improve callback systems
    // TODO better input validation & showing messages when failed e.g. if validation_success => make sure to cover else case too
    // Setting up Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.dbService.firebaseDb = firebase.firestore();

    // For testing - allowing yesterday's entry to be modified
    const yesterday: any = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.yesterday = this.dbService._getDateKey(yesterday);

    if (!this.mobile) { // Display 'category' column only on desktop by default
      this.headers = this.utilService.addElemInArray(this.headers, 'category', true);
    }

    // If already signed in, then hide login related HTML components and add any missing sub-entries
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.postLogin();
      }
    });

    this.dbService.refreshChartSubject.subscribe(refresh => {
      if (refresh) {
        this.reloadChart();
      }
    });

    this.utilService.setInterval(288, 1000 * 60 * 5, this.calculateTimeToHighlight); // refresh every 5 mins X 288 times = 1 full day
  }

  // Attempt to reload the chart, since this.overallCompletionRates can take awhile to generate
  reloadChart() {
    if (this.interval === null) { // if reloadChart() gets called multiple times at once, setting this up once should be enough
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
          this.interval = null;
        }
      }, 1000);
    }
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
    times = this.utilService.toIterable(times) as string[];
    times = times.sort();

    // Create an array to return that will be used for display
    // Sorted by time: string (aka expectedTimesOfCompletion: string[] in database)
    const dataToDisplay = [];
    for (const t of times) {
      for (const data of queriedData) {
        // If a sub-entry is partially done, then do not show it in the early schedules (based on the percentage done and the number of showings in schedule aka expectedTimesOfCompletion.length)
        // e.g. [10:00, 16:00, 18:00] -> display all three if <1/3 done, display the last two if 1/3 ~ <2/3 done, display only the last if >2/3 done
        const completionRate = data.count / data.goalCount;
        let remainingTimes = this.utilService.deepCopy(data.time);
        for (let i = 1; i <= data.time.length; i++) {
          if (i / data.time.length > completionRate) {
            remainingTimes = remainingTimes.slice(i - 1);
            break;
          }
        }
        // If a subentry with matching time exists, then addAed to dataToDisplay
        if (remainingTimes.some(d => d === t)) {
          const newData = this.utilService.deepCopy(data);
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
      this.notes = this.utilService.toIterable(querySnapshot);
      for (const note of this.notes) { // Firestore keeps it as '\n' and '\t', but it's read in as '\\n' and '\\t'
        note.text = note.text.replace(/\\n/g, '\n');
        note.text = note.text.replace(/\\t/g, '\t');
      }
      this.toggle('notes', true);
    });

    // Subscribe to goals from database
    this.dbService.readAll(true, DbService.collections.goals, [], (querySnapshot: QuerySnapshot) => {
      this.goals = this.utilService.toIterable(querySnapshot);
      this.goalList = this.goals.map(goal => goal.name);

      this.activeGoals = this.goals.filter(g => g.archived === false);
      this.archivedGoals = this.goals.filter(g => g.archived);
    });

    // Set up overall completion rates array for the top chart (modified in two different sections of code)
    this.overallCompletionRates = [];
    for (let i = 0; i < this.numberOfDaysToDisplay; i++) {
      this.overallCompletionRates.push({date: '0', percent: 0}); // initialize
    }

    // Subscribe to today's entry (especially its subcollection) from database (for display)
    this.dbService.readSubcollectionsInAnEntryOfADay(true, 'today', (querySnapshot: QuerySnapshot) => {
      this.dataQueried = this.utilService.toIterable(querySnapshot); // todo order by category first then by custom
      this.dataQueried = this.sortByCategory(this.dataQueried);

      // Add 'unit' and 'details' from goals to subcollections in entry for display
      for (const queriedSubentry of this.dataQueried) {
        // TODO with a new goal, this.dataQueried is updated but this.goals is not, thus below statement fails (returns an empty array)
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
      const todayStrDD = this.dbService.today.substring(this.dbService.today.length - 2, this.dbService.today.length) + this.dbService.findDayOfTheWeek()[0];
      this.overallCompletionRates[this.numberOfDaysToDisplay - 1] = {date: todayStrDD, percent: this.overallCompletionRate};
      this.processPastData(this.dbService._getDateKey(), this.dataQueried);
    });

    /* De-prioritize tasks that do not contribute to displaying sub-entries in the main table */
    // Subscribe to categories from database
    this.dbService.readAll(false, DbService.collections.categories, [], (querySnapshot: QuerySnapshot) => {
      this.categories = this.utilService.toIterable(querySnapshot);
      this.categoryList = this.categories.map(category => category.category);
    });
    // Computing overall completion rates of the past 7 days (today will be added from above as the last element)
    this.reloadChart();
    for (let i = 0; i < this.numberOfDaysToDisplay - 1; i++) {
      // date object has to be created one by one, since readSubcollections..() callback needs access to different dates
      const date = new Date();
      date.setDate(date.getDate() - (this.numberOfDaysToDisplay - 1) + i);

      // TODO allow modifying sub-entries of the past 7 days since I read these in anyway
      // Subscribe only to yesterday's entry, since testing section allows yesterday's subentries to be modified
      this.dbService.readSubcollectionsInAnEntryOfADay(this.dbService._getDateKey(date) === this.yesterday, this.dbService._getDateKey(date), (querySnapshot: QuerySnapshot) => {
        const dataQueried = this.utilService.toIterable(querySnapshot);
        const dateStr = this.dbService._getDateKey(date);
        const dateStrDD = dateStr.substring(dateStr.length - 2, dateStr.length) + this.dbService.findDayOfTheWeek(date)[0];
        this.overallCompletionRates[i] = {date: dateStrDD, percent: this.computeOverallCompletionRate(dataQueried)};
        this.processPastData(dateStr, dataQueried);
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

  toggle(id: string, value?: any) {
    // actually toggling on/off
    this.display[id] = value;

    if (id === 'allOptions') { // Nothing to perform
      return;
    } else if (id === 'fullInfo') { // Change headers for displaying full info
      if (this.display.fullInfo) {
        this.headers = this.utilService.addElemInArray(this.headers, 'category', true);
        this.headers = this.utilService.addElemInArray(this.headers, 'time', true);
        this.headers = this.utilService.addElemInArray(this.headers, 'unit');
        this.headers = this.utilService.addElemInArray(this.headers, 'details');
      } else {
        this.headers = this.utilService.removeElemInArray(this.headers, 'category');
        this.headers = this.utilService.removeElemInArray(this.headers, 'unit');
        this.headers = this.utilService.removeElemInArray(this.headers, 'details');
      }
    }

    if (id === 'incompleteAndUnhiddenOnly' || id === 'inSchedules') {
      if (this.display.incompleteAndUnhiddenOnly) { // Filter out completed and/or hidden sub-entries (no deep-copy, but just filtering from the queried data))
        if (this.display.inSchedules) {
          this.dataToDisplay = this.dataQueriedInSchedules.filter(subentry => subentry.count < subentry.goalCount && subentry.hide === false);
        } else {
          this.dataToDisplay = this.dataQueried.filter(subentry => subentry.count < subentry.goalCount && subentry.hide === false);
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
        this.headers = this.utilService.addElemInArray(this.headers, 'time', true);

        if (this.dataToDisplay.length > 0) {
          this.calculateTimeToHighlight();
        }
      } else {
        this.headers = this.utilService.removeElemInArray(this.headers, 'time');
      }
    }

    this.headers = this.utilService.getUniqueInArray(this.headers);
  }

  // Figure out which time in schedule to highlight
  calculateTimeToHighlight = () => {
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
  };

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
      const category = (document.getElementById('newGoalCategory') as HTMLInputElement).value || this.categories[0].category;
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
        () => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'New Goal successful'; }, () => { this.saveMessage = ''; }); },
        () => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'New Goal failed'; }, () => { this.saveMessage = ''; }); });
    } else if (type === 'Modify Goal') {
      const name = (document.getElementById('modifyGoalName') as HTMLInputElement).value || this.goals[0].name;
      const goalCount = (document.getElementById('modifyGoalGoalCount') as HTMLInputElement).value;
      const unit = (document.getElementById('modifyGoalUnit') as HTMLInputElement).value;
      let expectedTimesOfCompletion: any = (document.getElementById('modifyGoalExpectedTimesOfCompletion') as HTMLInputElement).value;
      const details = (document.getElementById('modifyGoalDetails') as HTMLInputElement).value;

      (document.getElementById('modifyGoalName') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalGoalCount') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalUnit') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalExpectedTimesOfCompletion') as HTMLInputElement).value = '';
      (document.getElementById('modifyGoalDetails') as HTMLInputElement).value = '';

      if (expectedTimesOfCompletion) {
        expectedTimesOfCompletion = expectedTimesOfCompletion.split(',');
      }

      this.dbService.updateGoal(name, Number(goalCount), unit, expectedTimesOfCompletion, details,
        () => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Modify Goal successful'; }, () => { this.saveMessage = ''; }); },
        (error) => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Modify Goal failed'; }, () => {this.saveMessage = ''; }); });
    }
  }

  applyEditMode(editType: string) {
    if (editType === 'hide' || editType === 'unhide') {
      const hide = editType === 'hide';
      for (const subentry of this.dataToDisplay) {
        if (subentry.checked === true) {
          this.dbService.updateSubentry(subentry.documentId, null, hide, subentry.doneDate);
        }
      }
    } else if (editType === 'unhideAll') {
      for (const subentry of this.dataQueried) {
        if (subentry.hide === true) {
          console.log(subentry.name);
          this.dbService.updateSubentry(subentry.documentId, null, false, subentry.doneDate);
        }
      }
    }
    this.editMode = false;
  }

  // todo allow other days to be modified? - with drop down selection and 'count' has different date (then subscription should change too)
  // Restructure past data to display 7-8 days data into one table
  processPastData(date: string, entry: Subentry[]) {
    // Adding a date to headers
    if (this.headersPast.indexOf(date) === -1) { // this condition exists because this function can be called to initialize AND when yesterday's subentry is updated
      this.headersPast.push(date);
      this.headersPast = this.headersPast.sort();
    }

    // Adding the entry into the array
    if (this.dataQueriedPast.length === 0) { // if the array is empty, then keep all the other metadata such as goal name
      this.dataQueriedPast = this.utilService.deepCopy(entry);
      for (const data of this.dataQueriedPast) {
        data[date] = data.count;
      }
    } else {
      // if this 'entry' variable has more subentries than this.dataQueriedPast, then add those new subentries
      const newEntries = [];
      for (const data2 of entry) {
        let data2Found = false;

        for (const data1 of this.dataQueriedPast) {
          if (data1.documentId === data2.documentId) {
            data2Found = true;
          }
        }
        if (data2Found === false) {
          newEntries.push(data2);
        }
      }
      this.dataQueriedPast = this.dataQueriedPast.concat(newEntries);

      // Not assuming that the entries from different dates are identical, because goals can change
      for (const data2 of entry) {
        for (const data1 of this.dataQueriedPast) {
          if (data1.documentId === data2.documentId) {
            data1[date] = data2.count;

            // Currently, 'count' key allows for modification, which will be yesterday's data
            if (this.yesterday === date) {
              data1.count = data2.count;
            }
          }
        }
      }
    }
  }
}
