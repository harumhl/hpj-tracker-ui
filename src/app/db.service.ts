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
import {Subject} from 'rxjs';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  firebaseDb: firebase.firestore.Firestore = null;
  today: string;
  dayOfToday: string;

  disableDisplaySubject = new Subject<boolean>();
  updateDisplaySubject = new Subject<boolean>();

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
    return this.datePipe.transform(date, 'yyyy-MM-dd');
  }

  // Write a new category to Firebase database
  newCategory(category: string) {
/*
    if (category !== null && category !== undefined && category !== '') { // input validation
      this.writeDoc(DbService.collections.categories, {category});
    }
*/
  }

  // TODO goal occurrence (e.g. daily/weekly/MWF)
  // todo not only for 'achieve' goal, but also 'prevent' goal too (e.g. eating snacks, eating red meat, eating ramen)
  // TODO order of goals for display
  // Write a new goal to Firebase database
  newTask(newGoal: Task, callback: () => any = () => {}, errorCallback: () => any = () => {}) {
/*
    if (this._validateGoal(newGoal, true)) {
      // Foreign key constraint - check whether the category already exists in /categories
      this.readAll(false, DbService.collections.categories, ['category', '==', newGoal.category], (querySnapshot) => {
        // If the category exists, then write the new goal (and create today's entry + its subcollections)
        if (querySnapshot.docs.length > 0) {
          newGoal.documentId = DbService._getDocumentId(DbService.collections.goals, {documentId: newGoal.category + '_' + name});
          this.writeDoc(DbService.collections.goals, newGoal,
            () => { this.newEntry(this.today); callback(); }, () => errorCallback());
        }
      });
    } else {
      errorCallback();
    }
*/
  }

  // Update an existing goal in Firebase database
  updateTask(updateGoal: Task, callback: () => any = () => {}, errorCallback: (error) => any = () => {}) {
    let dataToModify = {name};/*
    if (goalCount) {
      dataToModify = Object.assign(dataToModify, {goalCount});
    }
    if (unit) {
      dataToModify = Object.assign(dataToModify, {unit});
    }
    if (countToMinutes) {
      dataToModify = Object.assign(dataToModify, {countToMinutes});
    }
    if (expectedTimesOfCompletion) {
      // Validate expectedTimesOfCompletion before actually updating
      const regex: RegExp = new RegExp(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);
      if (expectedTimesOfCompletion.length > 0 && expectedTimesOfCompletion.filter(t => t.match(regex)).length === expectedTimesOfCompletion.length) {
        dataToModify = Object.assign(dataToModify, {expectedTimesOfCompletion});
      } else {
        errorCallback(null);
        return;
      }
    }
    if (details) {
      dataToModify = Object.assign(dataToModify, {details});
    }
    if (subentryDetails) {
      dataToModify = Object.assign(dataToModify, {subentryDetails});
    }

    // Update
    this.readAll(false, DbService.collections.goals, ['name', '==', updateGoal.name], (querySnapshot) => {
      const doc = querySnapshot.docs[0].data();
      dataToModify = Object.assign(dataToModify, {category: doc.category, documentId: doc.documentId, archived: doc.archived});

      const collection = DbService.collections.goals;
      this.updateDoc(collection, DbService._getDocumentId(collection, {documentId: doc.documentId}), dataToModify, callback, errorCallback);
    });
    */
  }

  // todo subcategory or mini goals (e.g. not just writing that I studied for Hazel, but sub-goals like 10 minutes for makeup, 10 minutes for skincare, 10 minutes for haircare)
  // Write a new entry in Firebase database
  newEntry(doneDate: string) {
/*
    if (doneDate === null || doneDate === undefined) {
      doneDate = this._getDateKey();
    }

    this.readSingle(false, DbService.collections.entries, DbService._getDocumentId(DbService.collections.entries, {doneDate}), [],
      (documentSnapshot) => {
      if (documentSnapshot.data() === undefined) {
        this.writeDoc(DbService.collections.entries, {doneDate}, () => {
          this.newSubcollectionOfAnEntry(doneDate);
        });
      } else {
        this.newSubcollectionOfAnEntry(doneDate);
      }
    });

    this.readAll(false, DbService.collections.basics, [], (querySnapshot: QuerySnapshot) => {
      const basics = this.utilService.toIterable(querySnapshot);
      for (const basic of basics) {
        this.writeDocInSubcollection(DbService.collections.entries, {doneDate}, DbService.collections.basics, basic);
      }
    });
*/
  }

  // Write documents of a subcollection for an entry
  newSubcollectionOfAnEntry(doneDate: string) {
/*
    this.readAll(false, DbService.collections.goals, ['archived', '==', false], (querySnapshot: QuerySnapshot) => {
      const goals = this.utilService.toIterable(querySnapshot);
      for (const goal of goals) {
        const subentry = {category: goal.category, name: goal.name, documentId: DbService._getDocumentId(DbService.collections.goals, goal),
          count: 0, goalCount: goal.goalCount, countToMinutes: goal.countToMinutes, hide: false, subentryDetails: goal.subentryDetails};
        this.writeDocInSubcollection(DbService.collections.entries, {doneDate}, DbService.collections.goals, subentry);
      }
    });
*/
  }

  getTasks() {
    this.utilService.displayToast('info', 'retriving tasks', 'Retrieving');
    return this.http.get(this.backendUrl + '/tasks', this.httpOption);
  }

  getEntries() {
    this.utilService.displayToast('info', 'retriving entries', 'Retrieving');
    return this.http.get(this.backendUrl + '/entries', this.httpOption);
  }

  postEntriesOfToday() {
    this.utilService.displayToast('info', 'creating new entries for today', 'Creating');
    return this.http.post('https://hpj-tracker.herokuapp.com/entries/today', {}, this.httpOption);
  }

  getEntriesOfToday() {
    this.utilService.displayToast('info', 'retriving entries for today', 'Retrieving');
    return this.http.get(this.backendUrl + '/entries/today', this.httpOption);
  }

  // Update the count or 'hide' of an existing entry in Firebase database
  updateEntry(updatedEntry: Entry) {
    this.utilService.displayToast('info', 'updating entries', 'Updating');
    return this.http.put('https://hpj-tracker.herokuapp.com/entries', updatedEntry, this.httpOption);
  }

  getChart() {
    this.utilService.displayToast('info', 'retriving chart', 'Retrieving');
    return this.http.get('https://hpj-tracker.herokuapp.com/completion-unit/today', this.httpOption);
  }

  refreshData() {
    this.updateDisplaySubject.next(true);
  }
}
