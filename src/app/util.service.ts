import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor() { }

  // Firebase returns a json, but sometimes a list of its values is needed.
  static objectToIterable(obj: object) {
    if (obj) {
      const iterable = [];
      Object.keys(obj).forEach((key) => iterable.push(obj[key]));
      return iterable;
    } else {
      return [];
    }
  }

  // Displays an error on console in a consistent way.
  static handleError(functioinName: string, parameters: object, error: object, otherInfo?: object) {
    if (otherInfo) {
      console.error(`Function '${functioinName}' failed with parameters, error and info`, parameters, error, otherInfo);
    } else {
      console.error(`Function '${functioinName}' failed with parameters and error`, parameters, error);
    }
  }

  // deep-copy an array
  static deepCopyArray(array: any[]) {
    return JSON.parse(JSON.stringify(array));
  }
}
