import {Component, ViewChild} from '@angular/core';
import firebase from 'firebase';
import {DbService} from './db.service';
import {environment} from '../environments/environment';
import {version} from '../../package.json';
import {UtilService} from './util.service';
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
  metadata = {
    version: 'v' + version,
    buildTimestamp: environment.buildTimestamp,
    environment: environment.environment,
    mobile: window.screen.height <= 896, // my iphone height
  };

  signIn = {
    email: 'haru.mhl@gmail.com',
    loggedIn: false,
    firebaseConfig: {
      // Found it at https://console.firebase.google.com/project/hpj-tracker/settings/general, 'Config' under 'Firebase SDK snippet'
      apiKey: environment.firebaseApiKey,
      authDomain: environment.firebaseAuthDomain,
      databaseURL: environment.firebaseDatabaseURL,
      projectId: environment.firebaseProjectId,
      storageBucket: environment.firebaseStorageBucket,
      messagingSenderId: environment.firebaseMessagingSenderId,
      appId: environment.firebaseAppId,
      measurementId: environment.firebaseMeasurementId
    },
  };

  notes: Note[] = [];

  headers: string[] = ['name', 'count', 'goalCount', 'maxCount', 'unit', 'impact', 'multiplier', 'entryDetails', 'details'];
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
  entriesOfToday = {
    queried: [], // Entry[]
    queriedInSchedules: [], // Entry[]
    displayed: [], // Entry[]
  };
  disableMainInput = false;
  timeToHighlight: string;
  completionRate = {
    overall: 0,
    logarithm_squared: 0,
  };
  percentsPerCategory = {
    minGoal: 65,
    maxGoal: 85
  };

  @ViewChild('topChart')
  public chart: ChartComponent;
  completionPercentageByCategories: any[] = [
    { category: 'Mind-Programming/AI-Interpersonal-Hobby-Others', percent: 0 },
    { category: 'Workout', percent: 0 },
    { category: 'Body Care', percent: 0 },
    { category: 'Basic', percent: 0 },
    { category: 'Hazel', percent: 0 },
  ];
  interval = null;
  chartLoaded = false;

  display = { // whether to display each component or not
    allOptions: false,
    inSchedules: true,
    incompleteAndUnhiddenOnly: true,
    fullInfo: true,
    topChart: true, // todo display more dates, display per category
    notes: false,
    testing: false,
    basics: true,
  };

  editMode = false;

  basics: any[] = [];
  categories = {
    list: [], // string[]
    full: [], // Category[]
  };
  tasks = {
    list: [], // string[]
    full: [], // Task[]
    active: [], // Task[]
    archived: [] // Task[]
  };
  yesterday = '';
  headersPast: string[] = ['name', 'count', 'goalCount', 'unit'];
  dataQueriedPast: any[] = []; // similar to Entry, but 7-8 days of entries instead of single 'count'

  // TODO calculate overall percentage and save whenever changes
  // todo bigger input boxes on web - testing
  // todo ngstyle instead for css

  // TODO optimize read in order to prevent meeting quota - e.g. displaying chart (instead of calculating daily % on read, calculate it when modifying entry (aka on write)
  // todo prevent accessing test_* if 80% of the quota is met (read & write separately)
  // todo allow modify archive
  constructor(public dbService: DbService, private utilService: UtilService, private http: HttpClient, private toastr: ToastrService) {
    // TODO figure out a better way to display success-error message on UI (less relying on console.log) => improve callback systems
    // TODO better input validation & showing messages when failed e.g. if validation_success => make sure to cover else case too
    // Setting up Firebase
    firebase.initializeApp(this.signIn.firebaseConfig);
    this.dbService.firebaseDb = firebase.firestore(); // todo not needed?

    // For testing - allowing yesterday's entry to be modified
    const yesterday: any = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.yesterday = this.utilService.formatDate(this.dbService._getDateKey(yesterday), 'MM-DD');

    if (!this.metadata.mobile) { // Display 'category' column only on desktop by default
      this.headers = this.utilService.addElemInArray(this.headers, 'category', true);
    } else { // goalCount column will display these two elements as well
      this.headers = this.utilService.removeElemInArray(this.headers, 'maxCount');
      this.headers = this.utilService.removeElemInArray(this.headers, 'multiplier');
    }

    // If already signed in, then hide login related HTML components and add any missing sub-entries
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        this.postLogin();
      }
    });

    this.dbService.subjects.updateDisplay.subscribe(update => {
      if (update) {
        this.readEntriesOfToday();
        this.computeCompletionPercentageByCategories();
      }
    });
    this.dbService.subjects.disableMainInput.subscribe(disable => {
      this.disableMainInput = disable;
    });
    this.utilService.subjects.displayToast.subscribe(object => {
      const type = object.type;
      const message = object.message;
      const title = object.title;

      if (type === 'success') {
        this.toastr.success(message, title);
      } else if (type === 'error') {
        const error = object.error;
        this.toastr.error(message + `: ${error.status} - ${error.message}`, 'Error', {timeOut: 15 * 1000});
      } else if (type === 'info') {
        this.toastr.info(message, title, {timeOut: 3 * 1000});
      } else if (type === 'warning') {
        this.toastr.warning(message, title);
      }
    });

    this.utilService.setInterval(288, 1000 * 60 * 5, this.calculateTimeToHighlight); // refresh every 5 mins X 288 times = 1 full day

    // Keep the backend alive - Heroku puts the dyno to sleep after 30 minutes of inactivity (I get 550 free dyno hours every month: 550/31 = 17.74 ~ 6am to 11pm)
    setInterval(() => {
      const now = new Date();
      if (6 <= now.getHours() && now.getHours() < 23) { // between 6am and 10:59pm
        console.log(`ping: ${now.getHours()}:${now.getMinutes()}`);
        this.readEntriesOfToday();
      }
    }, 1000 * 60 * 25); // every 25 minutes
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
    let times: string[] = [];
    for (const data of queriedData) {
      for (const t of data.time) {
        times.push(t);
      }
    }
    times = this.utilService.getUniqueInArray(times);
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
        // If an entry with matching time exists, then addAed to dataToDisplay
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

    this.signIn.email = (document.getElementById('emailInput') as HTMLInputElement).value;
    const password = (document.getElementById('passwordInput') as HTMLInputElement).value;
    firebase.auth().signInWithEmailAndPassword(this.signIn.email, password)
      .then((user) => {
        console.log(`Successfully logged in as ${this.signIn.email}`);
      })
      .catch((error) => {
        (document.getElementById('login') as HTMLInputElement).disabled = false;
        console.error(`Failed to login: ${error.code} - ${error.message}`);
      });
  }

  postLogin() {
    this.signIn.loggedIn = true;

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

  readEntriesOfToday(createIfNone: boolean = false) {
    this.disableMainInput = true;

    // Read today's entry (especially its subcollection) from database (for display)
    this.dbService.getEntriesOfADay('today').subscribe(entries => {
      this.entriesOfToday.queried = entries as Entry[];
      if (this.entriesOfToday.queried.length > 0) {
        // Add 'category', 'unit' and 'details' from tasks
        for (const entry of this.entriesOfToday.queried) { // TODO queriedEntry.time = goal.expectedTimesOfCompletion; // string[] for now
          entry.category = entry.task.category.name;
          entry.unit = entry.task.unit;
          entry.time = entry.task.expectedTimesOfCompletion;
          entry.impact = `${Math.round(entry.multiplier / entry.task.category.goalInComparableUnit * 100)}%`;
          entry.details = entry.task.details;
        }

        this.entriesOfToday.queried = this.entriesOfToday.queried.sort((a, b) => {
          // first: by category
          // second: by first occurrence on schedule
          if (a.category > b.category) {
            return 1;
          } else if (a.category < b.category) {
            return -1;
          } else {
            return (a.task.expectedTimesOfCompletion[0] > b.task.expectedTimesOfCompletion[0]) ? 1 :
              (a.task.expectedTimesOfCompletion[0] < b.task.expectedTimesOfCompletion[0]) ? -1 : 0;
          }
        });
        this.entriesOfToday.displayed = this.entriesOfToday.queried.filter(entry => entry.count < entry.goalCount && entry.hide === false);

        this.entriesOfToday.queriedInSchedules = this.convertArrayForScheduleDisplay(this.entriesOfToday.queried);
        this.toggle('inSchedules', this.display.inSchedules);

        this.disableMainInput = false;

      } else if (createIfNone) {
        // If nothing got retrieved, then add entries for today
        this.dbService.postEntriesOfADay('today').subscribe(e => {
          this.readEntriesOfToday();
        });
      }
    });
  }

  readAndWriteAfterLogin() {
    // Add any missing entry & sub-entries
    this.dbService.newEntry(this.dbService.today);

/*
    // Read notes
    this.dbService.readAll(false, DbService.collections.notes, [], (querySnapshot) => {
      this.notes = this.utilService.toIterable(querySnapshot);
      for (const note of this.notes) { // Firestore keeps it as '\n' and '\t', but it's read in as '\\n' and '\\t'
        note.text = note.text.replace(/\\n/g, '\n');
        note.text = note.text.replace(/\\t/g, '\t');
      }
      this.toggle('notes', true);
    });
*/

    this.readEntriesOfToday(true);

    /* De-prioritize tasks that do not contribute to displaying sub-entries in the main table */
/*
    // Subscribe today's 'basic' entry
    this.dbService.readSubcollectionsOfSingleDoc(false, DbService.collections.entries, this.dbService.today, [], DbService.collections.basics, (querySnapshot: QuerySnapshot) => {
      this.basics = this.utilService.toIterable(querySnapshot);
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

    if (id === 'testing' && this.display.testing) {
      if (this.tasks.full.length === 0) {
        // Read tasks
        this.dbService.getTasks().subscribe((tasks: Task[]) => {
          this.tasks.full = tasks;
          for (const task of this.tasks.full) {
            // task.category = task.category.name; // TODO if category object is named 'category', what should I call category's name? just category_name?

            if (this.categories.list.indexOf(task.category.name) === -1) {
              this.categories.list.push(task.category.name);
              this.categories.full.push(task.category);
            }
          }
          this.tasks.list = this.tasks.full.map(goal => goal.name);

          this.tasks.active = this.tasks.full.filter(g => g.archived === false);
          this.tasks.archived = this.tasks.full.filter(g => g.archived);
        });
      }

      if (this.dataQueriedPast.length === 0) {
        this.dbService.getEntries().subscribe((entries: Entry[]) => {
          this.processPastData(entries);
        });
      }
    }

    if (id === 'allOptions') { // Nothing to perform
      return;
    } else if (id === 'fullInfo') { // Change headers for displaying full info
      if (this.display.fullInfo) {
        this.headers = this.utilService.addElemInArray(this.headers, 'category', true);
        this.headers = this.utilService.addElemInArray(this.headers, 'time', true);
        this.headers = this.utilService.addElemInArray(this.headers, 'unit');
        this.headers = this.utilService.addElemInArray(this.headers, 'entryDetails');
        this.headers = this.utilService.addElemInArray(this.headers, 'details');
      } else {
        this.headers = this.utilService.removeElemInArray(this.headers, 'category');
        this.headers = this.utilService.removeElemInArray(this.headers, 'unit');
        this.headers = this.utilService.removeElemInArray(this.headers, 'entryDetails');
        this.headers = this.utilService.removeElemInArray(this.headers, 'details');
      }
    }

    if (id === 'incompleteAndUnhiddenOnly' || id === 'inSchedules') {
      if (this.display.incompleteAndUnhiddenOnly) { // Filter out completed and/or hidden sub-entries (no deep-copy, but just filtering from the queried data))
        if (this.display.inSchedules) {
          this.entriesOfToday.displayed = this.entriesOfToday.queriedInSchedules.filter(entry => entry.count < entry.maxCount && entry.hide === false);
        } else {
          this.entriesOfToday.displayed = this.entriesOfToday.queried.filter(entry => entry.count < entry.maxCount && entry.hide === false);
        }
      } else {
        if (this.display.inSchedules) { // Deep-copy happens when this.dataQueried is pulled from database (so already done by now)
          this.entriesOfToday.displayed = this.entriesOfToday.queriedInSchedules;
        } else {
          this.entriesOfToday.displayed = this.entriesOfToday.queried;
        }
      }

      // Display time to complete with restructured data (deep-copying since 'time' goes string[] -> string)
      if (this.display.inSchedules) {
        this.headers = this.utilService.addElemInArray(this.headers, 'time', true);

        if (this.entriesOfToday.displayed.length > 0) {
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
    for (let i = 1; i < this.entriesOfToday.displayed.length; i++) {
      if (this.entriesOfToday.displayed[i - 1].time <= now && now <= this.entriesOfToday.displayed[i].time) {
        this.timeToHighlight = this.entriesOfToday.displayed[i - 1].time;
      }
    }
    // (edge cases)
    if (now < this.entriesOfToday.displayed[0].time) {
      this.timeToHighlight = this.entriesOfToday.displayed[0].time;
    } else if (this.entriesOfToday.displayed[this.entriesOfToday.displayed.length - 1].time < now) {
      this.timeToHighlight = this.entriesOfToday.displayed[this.entriesOfToday.displayed.length - 1].time;
    }
  };

  applyEditMode(editType: string) {
    if (editType === 'hide' || editType === 'unhide') {
      const hide = editType === 'hide';
      for (const entry of this.entriesOfToday.displayed) {
        if (entry.checked === true) {
          entry.hide = hide;
          this.dbService.putEntry(entry).subscribe(e => {
            this.readEntriesOfToday();
          });
        }
      }
    } else if (editType === 'unhideAll') {
      for (const entry of this.entriesOfToday.queried) {
        if (entry.hide === true) {
          entry.hide = false;
          this.dbService.putEntry(entry).subscribe(e => {
            this.readEntriesOfToday();
          });
        }
      }
    }
    this.editMode = false;
  }

  updateBasics() {
    /*
        // Get the string representation of json data to json/dict/object
        let updatedBasics = [];
        try {
          updatedBasics = JSON.parse((document.getElementById('updatedBasics') as HTMLInputElement).value)
        } catch (error) {
          this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Failed to parse updated "basics"'; }, () => {this.saveMessage = ''; });
          return;
        }

        // Update the db under /entries/today's-date/basics (all of the 'documents' regardless of whether it's updated or not)
        const collection = DbService.collections.basics;
        for (const updatedBasic of updatedBasics) {
          this.dbService.updateDocInSubcollection(DbService.collections.entries, this.dbService.today, updatedBasic, collection, updatedBasic,
            () => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Update basics successful'; }, () => { this.saveMessage = ''; }); },
            (error) => { this.utilService.setInterval(10, 1000, () => { this.saveMessage = 'Update basics failed'; }, () => {this.saveMessage = ''; }); });
        }
    */
  }

  computeCompletionPercentageByCategories() {
    this.dbService.getChart().subscribe((completionUnits: any[]) => {
      // Set all to 0
      for (const completionPercentage of this.completionPercentageByCategories) {
        completionPercentage.percent = 0;
      }
      // If the chart category includes the category name, then add up the percent
      for (const completionUnit of completionUnits) {
        for (const completionPercentage of this.completionPercentageByCategories) {
          if (completionPercentage.category.includes(completionUnit.categoryName)) {
            completionPercentage.percent += Math.round(completionUnit.completionPercent);
            completionPercentage.percent = completionPercentage.percent > 100 ? 100 : completionPercentage.percent; // Keep it max at 100(%)
          }
        }
      }
      // Compute single overall percent
      this.completionRate.overall = 0;
      for (const completionPercentage of this.completionPercentageByCategories) {
        this.completionRate.overall += completionPercentage.percent >= this.percentsPerCategory.minGoal ? completionPercentage.percent : 0;
      }
      this.completionRate.overall /= this.completionPercentageByCategories.length;
      this.completionRate.logarithm_squared = this.completionRate.overall >= this.percentsPerCategory.minGoal ?
        Math.pow(Math.log(this.completionRate.overall) / Math.log(100), 2) * 100 : // Better - [log (base 100) of X]^2
        Math.pow(this.completionRate.overall / 100, 2) * 100; // Worse - (x/100)^2

      this.reloadChart();
    });
  }

  // todo allow other days to be modified? - with drop down selection and 'count' has different date (then subscription should change too)
  // Restructure past data to display 7-8 days data into one table
  processPastData(entries: Entry[]) {
    // Get unique tasks in all entries
    for (const entry of entries) {
      if (this.dataQueriedPast.filter(d => d.name === entry.name).length === 0) {
        const copiedEntry = this.utilService.deepCopy(entry);
        copiedEntry.count = '';
        this.dataQueriedPast.push(copiedEntry);
      }
    }

    // Get all unique dates
    const dates = [];
    for (const entry of this.dataQueriedPast) {
      const date = entry.doneDate[0] + '-' + entry.doneDate[1] + '-' + entry.doneDate[2];
      if (dates.indexOf(date) === -1) {
        dates.push(date);
      }
    }
    dates.sort();

    // Set headers
    for (const date of dates) {
      // Adding a date to headers
      if (this.headersPast.indexOf(date) === -1) { // this condition exists because this function can be called to initialize AND when yesterday's entry is updated
        this.headersPast.push(date);
        // this.headersPast.push(date + ' entryDetails');
      }
    }
    this.headersPast = this.headersPast.sort();

    // Adding the 'counts' in the respective dates in the array
    //   not assuming that the entries from different dates are identical, because goals can change
    for (const copiedEntry of this.dataQueriedPast) {
      for (const entry of entries) {
        for (const date of dates) {
          const entryDate = entry.doneDate[0] + '-' + entry.doneDate[1] + '-' + entry.doneDate[2];
          if (entryDate === date && entry.name === copiedEntry.name) {
            copiedEntry[date] = entry.count;
          }
        }
      }
    }
  }
}
