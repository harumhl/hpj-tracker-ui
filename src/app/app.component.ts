import {Component, ViewChild} from '@angular/core';
import firebase from 'firebase';
import {DbService} from './db.service';
import {environment} from '../environments/environment';
import {version} from '../../package.json';
import {UtilService} from './util.service';
import {Category} from './model/category.model';
import {Entry} from './model/entry.model';
import {Task} from './model/task.model';
import {ChartComponent} from '@syncfusion/ej2-angular-charts';
import {Note} from './model/note.model';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {ToastrService} from 'ngx-toastr';

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

  tempMessage = '';

  headers: string[] = ['name', 'count', 'goalCount', 'unit', 'subentryDetails', 'details'];
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
  disableInput = false;
  dataQueried: Entry[] = [];
  dataQueriedInSchedules: Entry[] = [];
  timeToHighlight: string;
  // TODO select a few to focus now
  dataToDisplay: Entry[] = [];
  overallCompletionRate = 0;

  @ViewChild('topChart')
  public chart: ChartComponent;
  completionPercentageByCategories: any[] = [
    { category: 'Mind-ProgramAI-Interpersonal-Hobby', minutes: 30, percent: 0 },
    { category: 'Workout', minutes: 45, percent: 0 },
    { category: 'Body Care', minutes: 30, percent: 0 },
    { category: 'Basic', minutes: 60, percent: 0 },
    { category: 'Hazel', minutes: 90, percent: 0 },
  ];
  interval = null;
  chartLoaded = false;

  display = { // whether to display each component or not
    allOptions: false,
    //inSchedules: true,
    inSchedules: false,
    incompleteAndUnhiddenOnly: true,
    fullInfo: true,
    topChart: true, // todo display more dates, display per category
    notes: false,
    testing: false,
    basics: true,
  };

  editMode = false;

  basics: any[] = [];
  categoryList: string[] = [];
  goalList: string[] = [];
  categories: Category[] = [];
  goals: Task[] = []; // TODO most and least accomplished goals in the past 7 days
  activeGoals: Task[] = [];
  archivedGoals: Task[] = [];
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
  // todo allow modify archive
  constructor(public dbService: DbService, private utilService: UtilService, private http: HttpClient, private toastr: ToastrService) {
    // TODO figure out a better way to display success-error message on UI (less relying on console.log) => improve callback systems
    // TODO better input validation & showing messages when failed e.g. if validation_success => make sure to cover else case too
    // Setting up Firebase
    firebase.initializeApp(this.firebaseConfig);
    this.dbService.firebaseDb = firebase.firestore(); // todo not needed?

    // For testing - allowing yesterday's entry to be modified
    const yesterday: any = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.yesterday = this.utilService.formatDate(this.dbService._getDateKey(yesterday), 'MM-DD');

    if (!this.mobile) { // Display 'category' column only on desktop by default
      this.headers = this.utilService.addElemInArray(this.headers, 'category', true);
    }

    // If already signed in, then hide login related HTML components and add any missing sub-entries
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.postLogin();
      }
    });

    this.dbService.updateDisplaySubject.subscribe(update => {
      if (update) {
        this.disableInput = true;
        this.readEntiresOfToday();
        this.computeCompletionPercentageByCategories();
      }
    });
    this.utilService.updateTempMessageSubject.subscribe(object => {
      const type = object.type;
      const message = object.message;
      const title = object.message;

      if (type === 'success') {
        this.toastr.success(message, title);
      } else if (type === 'error') {
        this.toastr.error(message, title);
      } else if (type === 'info') {
        this.toastr.info(message, title);
      } else if (type === 'warning') {
        this.toastr.warning(message, title);
      }
    });

    this.utilService.setInterval(288, 1000 * 60 * 5, this.calculateTimeToHighlight); // refresh every 5 mins X 288 times = 1 full day
  }

  // What to do first: remove above goal in the firestore
  testFunctionalities() {/*
    const goalName = 'unit test';

    this.dbService.newGoal('Hazel', goalName, false, 1, 'unit', 1, ['01:00'], '', {},
      () => { this.dbService.readAll(false, DbService.collections.goals, ['name', '==', goalName],
              () => { console.log('Testing: successful to add a goal'); }); },
      () => { console.error('Testing: failed to add a goal'); });
      */
  }

  // Attempt to reload the chart, since this.overallCompletionRates can take awhile to generate
  reloadChart() {
    if (this.interval === null) { // if reloadChart() gets called multiple times at once, setting this up once should be enough
      this.interval = setInterval(() => {
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
  convertArrayForScheduleDisplay(queriedData: Entry[]) {
    // Get all possible times
    let times: any = {};
    for (const data of queriedData) {
      for (const t of data.time) {
        // With object (aka dict), no 'duplicate' sub-entries are introduced
        times[t] = t;
      }
    }
    // Change object (aka dict) to array and sort them
    times = [];
    Object.keys(times).forEach(key => times.push(times[key])); // = this.utilService.toIterable();
    // times = this.utilService.toIterable(times) as string[];
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

  readEntiresOfToday(recurse: boolean = true) {
    // Read today's entry (especially its subcollection) from database (for display)
    this.utilService.displayToast('info', 'retriving entries', 'retrieving');
    this.http.get('https://hpj-tracker.herokuapp.com/entries/today', this.dbService.httpOption).subscribe(entries => {
      this.dataQueried = entries as Entry[];
      if (this.dataQueried.length > 0) {
        this.utilService.displayToast('success', 'entries retrieved');
        for (const entry of this.dataQueried) {
          entry.category = entry.task.category.name;
        }
        this.dataQueried = this.dataQueried.sort((a, b) => {if (a.id > b.id) { return 1; } else if (a.id < b.id) { return -1; } else { return 0; }});
        this.dataToDisplay = this.dataQueried.filter(subentry => subentry.count < subentry.goalCount && subentry.hide === false);
        this.disableInput = false;

      } else if (recurse) {
        // If nothing got retrieved, then add entries for today
        this.utilService.displayToast('info', 'creating new entries for today', 'Creating');
        this.http.post('https://hpj-tracker.herokuapp.com/entries/today', {}, this.dbService.httpOption).subscribe(e => {
          this.readEntiresOfToday(false);
        });
      }
    }, (error) => {
      this.utilService.displayToast('error', `Failed to load: ${error.error.toString()}`);
    });
  }

  readAndWriteAfterLogin() {
    // this.initializeDatabase(); // to be performed only after db refresh - though its content is outdated

    // Add any missing entry & sub-entries
    this.dbService.newEntry(this.dbService.today);

    // Read notes
/*
    this.dbService.readAll(false, DbService.collections.notes, [], (querySnapshot) => {
      this.notes = this.utilService.toIterable(querySnapshot);
      for (const note of this.notes) { // Firestore keeps it as '\n' and '\t', but it's read in as '\\n' and '\\t'
        note.text = note.text.replace(/\\n/g, '\n');
        note.text = note.text.replace(/\\t/g, '\t');
      }
      this.toggle('notes', true);
    });
*/

    // Subscribe to goals from database
/*
    this.dbService.readAll(true, DbService.collections.goals, [], (querySnapshot: QuerySnapshot) => {
      this.goals = this.utilService.toIterable(querySnapshot);
      this.goalList = this.goals.map(goal => goal.name);

      this.activeGoals = this.goals.filter(g => g.archived === false);
      this.archivedGoals = this.goals.filter(g => g.archived);
    });
*/
    this.readEntiresOfToday();
/*
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
      this.computeCompletionPercentageByCategories();
    });
*/

    /* De-prioritize tasks that do not contribute to displaying sub-entries in the main table */
    // Subscribe today's 'basic' entry
/*
    this.dbService.readSubcollectionsOfSingleDoc(false, DbService.collections.entries, this.dbService.today, [], DbService.collections.basics, (querySnapshot: QuerySnapshot) => {
      this.basics = this.utilService.toIterable(querySnapshot);
    });
*/
    // Subscribe to categories from database
/*
    this.dbService.readAll(false, DbService.collections.categories, [], (querySnapshot: QuerySnapshot) => {
      this.categories = this.utilService.toIterable(querySnapshot);
      this.categoryList = this.categories.map(category => category.category);
    });
*/
    this.computeCompletionPercentageByCategories();
  }

  toggle(id: string, value?: any) {
    // actually toggling on/off
    this.display[id] = value;

    // Automatically close options after an option selection (except clicking to open all options)
    if (this.display.allOptions && id !== 'allOptions') {
      this.display.allOptions = false;
    }

    if (id === 'allOptions') { // Nothing to perform
      return;
    } else if (id === 'fullInfo') { // Change headers for displaying full info
      if (this.display.fullInfo) {
        this.headers = this.utilService.addElemInArray(this.headers, 'category', true);
        this.headers = this.utilService.addElemInArray(this.headers, 'time', true);
        this.headers = this.utilService.addElemInArray(this.headers, 'unit');
        this.headers = this.utilService.addElemInArray(this.headers, 'subentryDetails');
        this.headers = this.utilService.addElemInArray(this.headers, 'details');
      } else {
        this.headers = this.utilService.removeElemInArray(this.headers, 'category');
        this.headers = this.utilService.removeElemInArray(this.headers, 'unit');
        this.headers = this.utilService.removeElemInArray(this.headers, 'subentryDetails');
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

  computeOverallCompletionRate(array: Entry[]) {
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
    if (this.display.testing) {
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
          //(document.getElementById('modifyGoalSubentryDetails') as HTMLInputElement).value = this.utilService.objectKeysToCommaSeparatedString(goalInfo.subentryDetails);
          (document.getElementById('modifyGoalDetails') as HTMLInputElement).value = goalInfo.details;
        }
      }
    }
  }

  private getHtmlInputElementValue(name: string, resetValue: boolean = false) {
    const value = (document.getElementById(name) as HTMLInputElement).value;
    if (resetValue) {
      (document.getElementById(name) as HTMLInputElement).value = '';
    }
    return value || '';
  }

  // todo ability to archive or un-archive goals
  // Save new goal or modified goal
  save(type: string) {
    if (type === 'New Goal') {
      // Create a goal object
      const category = this.getHtmlInputElementValue('newGoalCategory') || this.categories[0].name;
      const name = this.getHtmlInputElementValue('newGoalName');
      const archived = false;
      const goalCount = Number(this.getHtmlInputElementValue('newGoalGoalCount'));
      const unit = this.getHtmlInputElementValue('newGoalUnit');
      const expectedTimesOfCompletion = this.getHtmlInputElementValue('newGoalExpectedTimesOfCompletion').split(',');

      const newGoal = new Task(category, name, archived, goalCount, unit, expectedTimesOfCompletion);
      //newGoal.subentryDetails = this.utilService.commaSeparatedStringToObjectKeys(this.getHtmlInputElementValue('newGoalSubentryDetails'), false);
      newGoal.details = this.getHtmlInputElementValue('newGoalDetails');

      // Create a new goal
      this.dbService.newGoal(newGoal, () => {
        this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'New Goal successful'; }, () => { this.saveMessage = ''; });

        // Clear out the fields only if the write was successful
        this.getHtmlInputElementValue('newGoalCategory', true);
        this.getHtmlInputElementValue('newGoalGoalCount', true);
        this.getHtmlInputElementValue('newGoalUnit', true);
        this.getHtmlInputElementValue('newGoalCountToMinutes', true);
        this.getHtmlInputElementValue('newGoalExpectedTimesOfCompletion', true);
        this.getHtmlInputElementValue('newGoalSubentryDetails', true);
        this.getHtmlInputElementValue('newGoalDetails', true);
      },
        () => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'New Goal failed'; }, () => { this.saveMessage = ''; }); });

    } else if (type === 'Modify Goal') {
      // Create a goal object
      const name = this.getHtmlInputElementValue('modifyGoalName') || this.goals[0].name;
      const goalCount = Number(this.getHtmlInputElementValue('modifyGoalGoalCount'));
      const unit = this.getHtmlInputElementValue('modifyGoalUnit');
      const expectedTimesOfCompletion = this.getHtmlInputElementValue('modifyGoalExpectedTimesOfCompletion').split(',');

      const updateGoal = new Task(null, name, null, goalCount, unit, expectedTimesOfCompletion);
      //updateGoal.subentryDetails = this.utilService.commaSeparatedStringToObjectKeys(this.getHtmlInputElementValue('modifyGoalSubentryDetails'), false);
      updateGoal.details = this.getHtmlInputElementValue('modifyGoalDetails');

      this.dbService.updateGoal(updateGoal, () => {
        this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Modify Goal successful'; }, () => { this.saveMessage = ''; });

          // Clear out the fields only if the update was successful
        this.getHtmlInputElementValue('modifyGoalName', true);
        this.getHtmlInputElementValue('modifyGoalGoalCount', true);
        this.getHtmlInputElementValue('modifyGoalUnit', true);
        this.getHtmlInputElementValue('newGoalCountToMinutes', true);
        this.getHtmlInputElementValue('modifyGoalExpectedTimesOfCompletion', true);
        this.getHtmlInputElementValue('modifyGoalDetails', true);
        this.getHtmlInputElementValue('modifyGoalSubentryDetails', true);
        },
        (error) => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Modify Goal failed'; }, () => {this.saveMessage = ''; }); });
    }
  }

  applyEditMode(editType: string) {
/*
    if (editType === 'hide' || editType === 'unhide') {
      const hide = editType === 'hide';
      for (const subentry of this.dataToDisplay) {
        if (subentry.checked === true) {
          this.dbService.updateEntry(subentry.documentId, subentry.doneDate, null, hide, null);
        }
      }
    } else if (editType === 'unhideAll') {
      for (const subentry of this.dataQueried) {
        if (subentry.hide === true) {
          this.dbService.updateEntry(subentry.documentId, subentry.doneDate, null, false, null);
        }
      }
    }
*/
    this.editMode = false;
  }

  updateBasics() {
    // Get the string representation of json data to json/dict/object
    let updatedBasics = [];
    try {
      updatedBasics = JSON.parse((document.getElementById('updatedBasics') as HTMLInputElement).value)
    } catch (error) {
      this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Failed to parse updated "basics"'; }, () => {this.saveMessage = ''; });
      return;
    }

    // Update the db under /entries/today's-date/basics (all of the 'documents' regardless of whether it's updated or not)
/*
    const collection = DbService.collections.basics;
    for (const updatedBasic of updatedBasics) {
      this.dbService.updateDocInSubcollection(DbService.collections.entries, this.dbService.today, updatedBasic, collection, updatedBasic,
        () => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Update basics successful'; }, () => { this.saveMessage = ''; }); },
        (error) => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Update basics failed'; }, () => {this.saveMessage = ''; }); });
    }
*/
  }

  computeCompletionPercentageByCategories() {
    this.http.get('https://hpj-tracker.herokuapp.com/completion-unit/today', this.dbService.httpOption).subscribe((completionUnits: any[]) => {
      for (const completionUnit of completionUnits) {
        for (const completionPercentage of this.completionPercentageByCategories) {
          if (completionPercentage.category.includes(completionUnit.categoryName)) {
            completionPercentage.percent = completionUnit.completionPercent;
          }
        }
      }
    });

    this.reloadChart();
  }
}
