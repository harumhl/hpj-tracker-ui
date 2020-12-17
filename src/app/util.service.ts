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
      ;
    } else if (obj instanceof Object) {
      Object.keys(obj).forEach(key => iterable.push(obj[key]));
    }
    return iterable;
  }

  // Displays an error on console in a consistent way.
  static handleError(functioinName: string, parameters: object, error: object, otherInfo?: object) {
    if (otherInfo) {
      console.error(`Function '${functioinName}' failed with parameters, error and info`, parameters, error, otherInfo);
    } else {
      console.error(`Function '${functioinName}' failed with parameters and error`, parameters, error);
    }
  }

  // deep-copy
  static deepCopy(obj: any) {
    return JSON.parse(JSON.stringify(obj));
  }
}
