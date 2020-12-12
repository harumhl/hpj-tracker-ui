import { Injectable } from '@angular/core';
import firebase from 'firebase';
import {CategoryModel} from './models/category.model';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  firebaseDb: firebase.database.Database = null;

  constructor() { }

  static keysToKey(path: string, data: object) {
    // Determine which keys in 'data' dict we will consider as the 'primary key'
    let keys = [];
    if (path === '/categories') {
      keys = ['category'];
    } else if (path === '/goals') {
      keys = ['name'];
    } else if (path === '/entries') {
      keys = ['doneDate', 'name'];
    }

    // Concatenate values of 'primary key'
    let key = '';
    for (const k of keys) {
      key += '_' + data[k].replace(/ /g,''); // removing all spaces
    }
    return key;
  }

  private static handleError(functioinName: string, parameters: object, error: object, otherInfo?: object) {
    if (otherInfo) {
      console.log(`Function '${functioinName}' failed with parameters, error and info`, parameters, error, otherInfo);
    } else {
      console.log(`Function '${functioinName}' failed with parameters and error`, parameters, error);
    }
  }

  writeNew(path: string, data: object) {
    const key = DbService.keysToKey(path, data);
    this.firebaseDb.ref(path + '/' + key).set(data)
      .then(() => {
        ;
      })
      .catch((error) => {
        DbService.handleError('writeNew', {path, data}, error, {key});
      });
  }

  readAllOnce(path?: string) { // if no path is given, then literally everything is read.
    return this.firebaseDb.ref(path).once('value');
  }

  readSubscribe(path?: string) { // if no path is given, then literally everything is read.
    return this.firebaseDb.ref(path);
  }

  update(path: string, key: string, data: object) {
    this.firebaseDb.ref(path + '/' + key).update(data)
      .then(() => {
        ;
      })
      .catch((error) => {
        DbService.handleError('writeNew', {path, key, data}, error);
      });
  }
}
