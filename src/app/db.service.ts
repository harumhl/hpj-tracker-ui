import { Injectable } from '@angular/core';
import firebase from 'firebase';
import {DatePipe} from '@angular/common';
import {UtilService} from './util.service';
import QuerySnapshot = firebase.firestore.QuerySnapshot;
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;
import {environment} from '../environments/environment';
import {Category} from './model/category.model';
import {Task} from './model/task.model';
import {Entry} from './model/entry.model';
import {Subject, throwError} from 'rxjs';
import { share } from 'rxjs/operators';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  firebaseDb: firebase.firestore.Firestore = null;
  today: string;
  dayOfToday: string;

  subjects = {
    disableMainInput: new Subject<boolean>(),
    updateDisplay: new Subject<boolean>(),
  };

  backendUrl = environment.backendUrl;
  httpOption = {
    headers: new HttpHeaders({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + btoa('user' + ':' + environment.backendPassword)
    }),
  };

  constructor(private utilService: UtilService, public datePipe: DatePipe, private http: HttpClient) {
    // Set today's date and day
    this.today = this._getDateKey();
    this.dayOfToday = this.findDayOfTheWeek();
  }

  findDayOfTheWeek(date?) {
    if (date === null || date === undefined) {
      date = new Date();
    }
    let dayOfTheWeek = '';
    switch (date.getDay()) {
      case 0: dayOfTheWeek = 'Sun'; break;
      case 1: dayOfTheWeek = 'Mon'; break;
      case 2: dayOfTheWeek = 'Tue'; break;
      case 3: dayOfTheWeek = 'Wed'; break;
      case 4: dayOfTheWeek = 'Thu'; break;
      case 5: dayOfTheWeek = 'Fri'; break;
      case 6: dayOfTheWeek = 'Sat'; break;
    }
    return dayOfTheWeek;
  }

  // todo now database accepts date type (rename the fn)
  // Convert a Date() to date string in order to use a date as an intermediate-level database key in entries
  _getDateKey(date?) {
    if (date === null || date === undefined) {
      date = Date();
    }
    return this.datePipe.transform(date, 'MM-dd');
  }

  // todo subcategory or mini goals (e.g. not just writing that I studied for Hazel, but sub-goals like 10 minutes for makeup, 10 minutes for skincare, 10 minutes for haircare)
  // Write a new entry in Firebase database
  newEntry(doneDate: string) {
/*
    this.readSingle(false, DbService.collections.entries, DbService._getDocumentId(DbService.collections.entries, {doneDate}), [],
    });

    this.readAll(false, DbService.collections.basics, [], (querySnapshot: QuerySnapshot) => {
      const basics = this.utilService.toIterable(querySnapshot);
      for (const basic of basics) {
        this.writeDocInSubcollection(DbService.collections.entries, {doneDate}, DbService.collections.basics, basic);
      }
    });
*/
  }

  validateTask(task: any) {
    const keys = ['name', 'archived', 'goalCount', 'maxCount', 'unit', 'multiplier', 'expectedTimesOfCompletion', 'details', 'categoryId'];
    const timeRegex: RegExp = new RegExp(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);

    const keyCountMatch = keys.filter(k => task.hasOwnProperty(k)).length === keys.length;
    const constraints = {
      name: task.name && task.name.length > 0,
      archived: true,
      goalCount: task.goalCount > 0,
      maxCount: task.maxCount >= task.goalCount,
      unit: task.unit && task.unit.length > 0,
      multiplier: task.multiplier >= 0,
      expectedTimesOfCompletion: task.expectedTimesOfCompletion && task.expectedTimesOfCompletion.length > 0
                                && task.expectedTimesOfCompletion.filter(t => t.match(timeRegex)).length === task.expectedTimesOfCompletion.length,
      details: true,
      categoryId: task.categoryId > 0,
    };

    let result = keyCountMatch;
    for (const k in constraints) {
      result = result && constraints[k];
    }
    return result;
  }

  getTasks() {
    this.utilService.displayToast('info', 'retriving tasks', 'Retrieving');
    return this.http.get(this.backendUrl + '/tasks', this.httpOption).pipe(share(), obs => {
      obs.toPromise().then(t => {
        this.utilService.displayToast('success', 'tasks retrieved', 'Retrieved');
      }).catch(error => {
        this.utilService.displayToast('error', 'Failed to retrieve tasks', 'Error', error);
      });
      return obs;
    });
  }

  // TODO goal occurrence (e.g. daily/weekly/MWF)
  // todo not only for 'achieve' goal, but also 'prevent' goal too (e.g. eating snacks, eating red meat, eating ramen)
  // TODO order of goals for display
  postTask(task: any) {
    if (this.validateTask(task)) {
      this.utilService.displayToast('info', 'creating new task', 'Creating');
      return this.http.post(this.backendUrl + '/tasks', task, this.httpOption).pipe(share(), obs => {
        obs.toPromise().then(t => {
          this.utilService.displayToast('success', 'task created', 'Created');
          this.postEntriesOfADay();
        }).catch(error => {
          this.utilService.displayToast('error', 'Failed to create task', 'Error', error);
        });
        return obs;
      });
    } else {
      const error = {status: 400, message: 'invalid new task'};
      this.utilService.displayToast('error', 'Did not make a POST request', 'Error', error);
      return throwError(error);    }
  }

  putTask(task: any) {
    if (this.validateTask(task)) {
      this.utilService.displayToast('info', 'updating a task', 'Creating');
      return this.http.put(this.backendUrl + '/tasks', task, this.httpOption).pipe(share(), obs => {
        obs.toPromise().then(t => {
          this.utilService.displayToast('success', 'task updated', 'Updated');
        }).catch(error => {
          this.utilService.displayToast('error', 'Failed to update task', 'Error', error);
        });
        return obs;
      });
    } else {
      const error = {status: 400, message: 'invalid updated task'};
      this.utilService.displayToast('error', 'Did not make a PUT request', 'Error', error);
      return throwError(error);
    }
  }

  getEntries() {
    this.utilService.displayToast('info', 'retriving entries', 'Retrieving');
    return this.http.get(this.backendUrl + '/entries', this.httpOption).pipe(share(), obs => {
      obs.toPromise().then(e => {
        this.utilService.displayToast('success', 'entries retrieved', 'Retrieved');
      }).catch(error => {
        this.utilService.displayToast('error', 'Failed to retrieve entries', 'Error', error);
      });
      return obs;
    });
  }

  postEntriesOfADay(date: string = this.today) {
    this.utilService.displayToast('info', 'creating new entries for today', 'Creating');
    return this.http.post(this.backendUrl + '/entries/' + date, {}, this.httpOption).pipe(share(), obs => {
      obs.toPromise().then(e => {
        this.utilService.displayToast('success', 'entries created', 'Created');
      }).catch(error => {
        this.utilService.displayToast('error', 'Failed to create entries', 'Error', error);
      });
      return obs;
    });
  }

  getEntriesOfADay(date: string = this.today) {
    this.utilService.displayToast('info', 'retriving entries for today', 'Retrieving');
    return this.http.get(this.backendUrl + '/entries/' + date, this.httpOption).pipe(share(), obs => {
      obs.toPromise().then((e: Entry[]) => {
        this.utilService.displayToast('success', `entries retrieved for today (${e.length} entries)`, 'Retrieved');
      }).catch(error => {
        this.utilService.displayToast('error', 'Failed to retrieve entries for today', 'Error', error);
      });
      return obs;
    });
  }

  // Update the count or 'hide' of an existing entry in Firebase database
  putEntry(entryToUpdate: Entry) {
    entryToUpdate.details = null; // TODO currently this is set to empty string, but backend expsts an object not a string
    entryToUpdate.taskId = entryToUpdate.task.id;
    entryToUpdate.count = entryToUpdate.count ? entryToUpdate.count : 0; // in case of hiding with -1
    this.utilService.displayToast('info', 'updating entries', 'Updating');
    return this.http.put(this.backendUrl + '/entries', entryToUpdate, this.httpOption).pipe(share(), obs => {
      obs.toPromise().then(e => {
        this.utilService.displayToast('success', 'Updated entry - refreshing data', 'Updated');
      }).catch(error => {
        this.utilService.displayToast('error', 'Failed to update entry', 'Error', error);
      });
      return obs;
    });
  }

  getChart() {
    this.utilService.displayToast('info', 'retriving chart', 'Retrieving');
    return this.http.get(this.backendUrl + '/completion-unit/' + this.today, this.httpOption).pipe(share(), obs => {
      obs.toPromise().then(c => {
        this.utilService.displayToast('success', 'chart retrieved', 'Retrieved');
      }).catch(error => {
        this.utilService.displayToast('error', 'Failed to retrieve chart', 'Error', error);
      });
      return obs;
    });
  }

  refreshData() {
    this.subjects.updateDisplay.next(true);
  }
}
