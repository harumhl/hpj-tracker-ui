import { Injectable } from '@angular/core';
import firebase from 'firebase';
import QuerySnapshot = firebase.firestore.QuerySnapshot;
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor() { }

  // Firebase returns a json, but sometimes a list of its values is needed.
  static toIterable(obj: any) {
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
  static handleError(functionName: string, parameters: object, error: object, otherInfo?: object) {
    if (otherInfo) {
      console.error(`Function '${functionName}' failed with parameters, error and info`, parameters, error, otherInfo);
    } else {
      console.error(`Function '${functionName}' failed with parameters and error`, parameters, error);
    }
  }

  // deep-copy
  static deepCopy(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Check something over intervals
  static setInterval(intervalCount: number, frequencyMs: number, callbackForEveryInterval: () => any = () => {}, callbackForClearInterval: () => any = () => {}) {
    let timesRun = 0;
    const interval = setInterval(() => {
      timesRun += 1;
      callbackForEveryInterval();
      if (timesRun === intervalCount){
        callbackForClearInterval();
        clearInterval(interval);
      }
    }, frequencyMs);
  }

  // Remove duplicate elements in the array
  static getUniqueInArray(array: any[]) {
    return array.filter((value, index, self) => self.indexOf(value) === index);
  }

  // Add an element in the array (front or back)
  static addElemInArray(array: any[], elem: any, front = false) {
    if (front) {
      return [elem].concat(array);
    } else {
      return array.concat([elem]);
    }
  }

  // Remove an element in the array
  static removeElemInArray(array: any[], elem: any) {
    const index = array.indexOf(elem, 0);
    if (index > -1) {
      array.splice(index, 1);
    }
    return array;
  }
}
