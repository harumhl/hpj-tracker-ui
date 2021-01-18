import { Injectable, OnDestroy } from '@angular/core';
import firebase from 'firebase';
import QuerySnapshot = firebase.firestore.QuerySnapshot;
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;

@Injectable({
  providedIn: 'root'
})
export class UtilService implements OnDestroy {

  intervals: any[] = [];

  constructor() { }

  ngOnDestroy() {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
  }

  // Firebase returns a json, but sometimes a list of its values is needed.
  toIterable(obj: any) {
    const iterable = [];
    if (obj instanceof QuerySnapshot) {
      obj.forEach((doc) => iterable.push(doc.data()));
    } else if (obj instanceof DocumentSnapshot) {

    } else if (obj instanceof Object) {
      Object.keys(obj).forEach(key => iterable.push(obj[key]));
    }
    return iterable;
  }

  // Displays an error on console in a consistent way.
  handleError(functionName: string, parameters: object, error: object, otherInfo?: object) {
    if (otherInfo) {
      console.error(`Function '${functionName}' failed with parameters, error and info`, parameters, error, otherInfo);
    } else {
      console.error(`Function '${functionName}' failed with parameters and error`, parameters, error);
    }
  }

  // deep-copy
  deepCopy(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Check something over intervals
  setInterval(intervalCount: number, frequencyMs: number, callbackForEveryInterval: () => any = () => {}, callbackForClearInterval: () => any = () => {}) {
    let timesRun = 0;
    const interval = setInterval(() => {
      timesRun += 1;
      callbackForEveryInterval();
      if (timesRun === intervalCount){
        callbackForClearInterval();
        clearInterval(interval);
      }
    }, frequencyMs);
    this.intervals.push(interval);
  }

  // Remove duplicate elements in the array
  getUniqueInArray(array: any[]) {
    return array.filter((value, index, self) => self.indexOf(value) === index);
  }

  // Add an element in the array (front or back)
  addElemInArray(array: any[], elem: any, front = false) {
    if (front) {
      return [elem].concat(array);
    } else {
      return array.concat([elem]);
    }
  }

  // Remove an element in the array
  removeElemInArray(array: any[], elem: any) {
    const index = array.indexOf(elem, 0);
    if (index > -1) {
      array.splice(index, 1);
    }
    return array;
  }

  formatDate(date: string, format: string) {
    const regex: RegExp = new RegExp(/^20[0-9][0-9]-[0-1][0-9]-[0-3][0-9]$/); // expecting YYYY-MM-DD
    if (date.match(regex)) {
      if (format === 'MM-DD') {
        return date.substring(date.length - 5, date.length);
      } else if (format === 'DD') {
        return date.substring(date.length - 2, date.length);
      }
      return date;
    }
    return date;
  }

  objectKeysToCommaSeparatedString(obj: object) {
    let str = '';
    for (const objKey in obj) {
      if (str === '') {
        str = objKey;
      } else {
        str += ',' + objKey;
      }
    }
    return str;
  }

  commaSeparatedStringToObjectKeys(str: string, defaultValue: any) {
    const obj = {};
    for (const elem of str.split(',')) {
      obj[elem] = defaultValue;
    }
    return obj;
  }
}
