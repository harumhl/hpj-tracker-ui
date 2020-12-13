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
  today;

  constructor(private datePipe: DatePipe) {
    this.today = this._getDateKey();
  }

  // To make a goal name into a database key
  static _removeAllSpaces(str: string) {
    return str.replace(/ /g,'');
  }

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
      if (key === '') { // no starting underscore
        key = this._removeAllSpaces(data[k]);
      } else {
        key += '_' + this._removeAllSpaces(data[k]);
      }
    }
    return key;
  }

  // To use a date as an intermediate-level database key
  _getDateKey(date?) {
    if (date === null || date === undefined) {
      date = Date();
    }
    return this.datePipe.transform(date, 'yyyy-MM-dd');
  }

  _read(subscribe: boolean, path: string, callback) {
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

  _writeNew(path: string, data: object) {
    const key = DbService._keysToKey(path, data);
    this.firebaseDb.ref(path + '/' + key).set(data)
      .then(() => {
        ;
      })
      .catch((error) => {
        UtilService.handleError('writeNew', {path, data}, error, {key});
      });
  }

  _update(path: string, key: string, dataToModify: object) {
    this.firebaseDb.ref(path + '/' + key).update(dataToModify)
      .then(() => {
        ;
      })
      .catch((error) => {
        UtilService.handleError('writeNew', {path, key, dataToModify}, error);
      });
  }

  readEntriesToday(subscribe: boolean, callback) {
    this._read(subscribe, '/entries/_' + this.today, callback);
  }

  newCategory(category: string) {
    if (category !== '') { // input validation
      this._writeNew(DbService.paths.categories, {category});
    }
  }

  newGoal(category: string, name: string, archived: boolean, goalCount: number, unit: string) {
    if (category !== '' && name !== '' && goalCount > 0 && unit !== '') { // input validation
      // Foreign key constraint - check whether the category already exists in /categories
      this._read(false, DbService.paths.categories, (snapshot) => {
        const categories = snapshot.val();
        // If the category exists, then write the new goal
        if (UtilService.objectToIterable(categories).some(c => c.category === category)) {
          this._writeNew(DbService.paths.goals, {category, name, archived, goalCount, unit});
        }
      });
    }
  }

  updateGoal() { // todo changing archived & goalCount & unit should be easy <-> name should be done "recursively"

  }

  newEntry(category: string, name: string, count: number, doneDate?: string, goalCount?: number) {
    if (doneDate === null || doneDate === undefined) {
      doneDate = this._getDateKey();
    }

    if (doneDate !== '' && category !== '' && name !== '' && count >= 0) { // input validation // todo regex doneDate validation
      // Foreign key constraint - check whether the category-name already exist in /goals
      this._read(false, DbService.paths.goals, (snapshot) => {
        const goals = snapshot.val();
        // If the category-name exists, then write the new goal
        if (UtilService.objectToIterable(goals).some(g => g.category === category && g.name === name)) {
          // If goalCount is not given, then get it from the goal in /goals before making the entry
          if (goalCount) {
            this._writeNew(DbService.paths.entries + '_' + this.today, {doneDate, category, name, count, goalCount, updatedTs: Date()});
          } else {
            const key = DbService._keysToKey('/goals', {category, name});
            this._read(false, '/goals/' + key, (snapshot2) => {
              const value = snapshot2.val();
              goalCount = value.goalCount;
              this._writeNew(DbService.paths.entries + '/_' + this.today, {doneDate, category, name, count, goalCount, updatedTs: Date()});
            });

          }
        }
      });
    }
  }

  updateEntry() {

  }
}
