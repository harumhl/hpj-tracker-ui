import { Injectable } from '@angular/core';
import firebase from 'firebase';
import {DatePipe} from '@angular/common';
import {UtilService} from './util.service';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  static paths = {categories: '/categories', goals: '/goals', entries: '/entries'};

  firebaseDb: firebase.database.Database = null;
  today: string;
  dayOfToday: string;

  constructor(private datePipe: DatePipe) {
    // Set today's date and day
    this.today = this._getDateKey();
    switch (new Date().getDay()) {
      case 0: this.dayOfToday = 'Sun'; break;
      case 1: this.dayOfToday = 'Mon'; break;
      case 2: this.dayOfToday = 'Tue'; break;
      case 3: this.dayOfToday = 'Wed'; break;
      case 4: this.dayOfToday = 'Thu'; break;
      case 5: this.dayOfToday = 'Fri'; break;
      case 6: this.dayOfToday = 'Sat'; break;
    }
  }

  // To make a goal name into a database key
  static _removeAllSpaces(str: string) {
    return str.replace(/ /g,'');
  }

  // Gets a "primary key" for data given a type/path (e.g. category, goal or entry)
  static _keysToKey(path: string, data: object) {
    // Determine which keys in 'data' dict we will consider as the 'primary key'
    let keys = [];
    if (path === this.paths.categories) {
      keys = ['category'];
    } else if (path === this.paths.goals) {
      keys = ['name'];
    } else if (path === this.paths.entries) {
      keys = ['doneDate'];
    } else if (path.includes(this.paths.entries)) { // e.g. /entries/2020-12-01
      keys = ['name'];
    }

    // Concatenate values of 'primary key'
    let key = '';
    for (const k of keys) {
      key = this._removeAllSpaces(data[k]);
    }
    return key;
  }

  // Convert a Date() to date string in order to use a date as an intermediate-level database key in /entries
  _getDateKey(date?) {
    if (date === null || date === undefined) {
      date = Date();
    }
    return this.datePipe.transform(date, 'yyyy-MM-dd');
  }

  // Read from Firebase database
  _read(subscribe: boolean, path: string, callback: (snapshot: any) => any = () => {}) {
    // path can be undefined to access root, but cannot be null or empty string
    if (path === null || path === '') {
      path = undefined;
    }

    if (subscribe) { // whether to subscribe to the changes in data, or just read once
      this.firebaseDb.ref(path).on('value', callback);
    } else {
      this.firebaseDb.ref(path).once('value').then(callback);
    }
  }

  // Write to Firebase database
  _writeNew(path: string, data: object, callback: () => any = () => {}) {
    const key = DbService._keysToKey(path, data);
    this.firebaseDb.ref(path + '/' + key).set(data)
      .then(callback)
      .catch((error) => {
        UtilService.handleError('writeNew', {path, data}, error, {key});
      });
  }

  // Update an existing data in Firebase database
  _update(path: string, key: string, dataToModify: object, callback: () => any = () => {}) {
    this.firebaseDb.ref(path + '/' + key).update(dataToModify)
      .then(callback)
      .catch((error) => {
        UtilService.handleError('writeNew', {path, key, dataToModify}, error);
      });
  }

  // Read existing entries in a given day from Firebase
  readEntriesOfADay(subscribe: boolean, date: string, callback: (snapshot: any) => any = () => {}) {
    if (date === null || date === undefined || date === '' || date === 'today') {
      date = this.today;
    }
    this._read(subscribe, '/entries/' + date, callback);
  }

  // Write a new category to Firebase database
  newCategory(category: string) {
    if (category !== '') { // input validation
      this._writeNew(DbService.paths.categories, {category});
    }
  }

  // todo goal occurrence (e.g. daily/weekly/MWF)
  // todo not only for 'achieve' goal, but also 'prevent' goal too (e.g. eating snacks, eating red meat, eating ramen)
  // TODO order of goals for display
  // TODO expected time of completion (can be more than once - brush teeth three times a day)
  // Write a new goal to Firebase database
  newGoal(category: string, name: string, archived: boolean, goalCount: number, unit: string, details: string) {
    if (category !== '' && name !== '' && goalCount > 0 && unit !== '') { // input validation
      // Foreign key constraint - check whether the category already exists in /categories
      this._read(false, DbService.paths.categories, (snapshot) => {
        const categories = snapshot.val();
        // If the category exists, then write the new goal (and create today's entry)
        if (UtilService.objectToIterable(categories).some(c => c.category === category)) {
          this._writeNew(DbService.paths.goals, {category, name, archived, goalCount, unit, details},
            () => this.newEntry(category, name, 0, null, goalCount));
        }
      });
    }
  }

  // Update an existing goal in Firebase database
  updateGoal(name: string, goalCount?: number, unit?: string, details?: string) {
    let dataToModify = {};
    if (goalCount) {
      dataToModify = Object.assign(dataToModify, {goalCount});
    }
    if (unit) {
      dataToModify = Object.assign(dataToModify, {unit});
    }
    if (details) {
      dataToModify = Object.assign(dataToModify, {details});
    }
    const path = DbService.paths.goals;
    this._update(path, DbService._keysToKey(path, {name}), dataToModify);
  }

  // todo detailed entry (e.g. not just writing that I had two servings of fruits, but writing that I had an apple and a kiwi)
  // todo subcategory or mini goals (e.g. not just writing that I studied for Hazel, but sub-goals like 10 minutes for makeup, 10 minutes for skincare, 10 minutes for haircare)
  // Write a new entry in Firebase database
  newEntry(category: string, name: string, count: number, doneDate?: string, goalCount?: number) {
    if (doneDate === null || doneDate === undefined) {
      doneDate = this._getDateKey();
    }

    if (doneDate !== '' && category !== '' && name !== '' && count >= 0) { // input validation // todo regex doneDate validation
      // Foreign key constraint - check whether the category-name already exist in /goals
      this._read(false, DbService.paths.goals, (snapshot) => {
        const goals = snapshot.val();
        // If the category-name exists and not archived, then write the new goal
        if (UtilService.objectToIterable(goals).some(g => g.category === category && g.name === name && g.archived === false)) {
          // If goalCount is not given, then get it from the goal in /goals before making the entry
          if (goalCount) {
            this._writeNew(DbService.paths.entries + '/' + this.today, {doneDate, category, name, count, goalCount, updatedTs: this._getDateKey(Date())});
          } else {
            const key = DbService._keysToKey('/goals', {category, name});
            this._read(false, '/goals/' + key, (snapshot2) => {
              const value = snapshot2.val();
              goalCount = value.goalCount;
              this._writeNew(DbService.paths.entries + '/' + this.today, {doneDate, category, name, count, goalCount, updatedTs: this._getDateKey(Date())});
            });

          }
        }
      });
    }
  }

  // Update the count of an existing entry in Firebase database
  updateEntryCount(category: string, name: string, count: number, doneDate?: string) {
    if (doneDate === null || doneDate === undefined) {
      doneDate = this._getDateKey();
    }

    const path = DbService.paths.entries + '/' + doneDate;
    this._update(path, DbService._keysToKey(path, {category, name}), {count});
  }
}
