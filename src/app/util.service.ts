import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor() { }

  // Firebase returns a json, but sometimes a list is needed to process further
  static objectToIterable(obj: object) {
    if (obj) {
      const iterable = [];
      Object.keys(obj).forEach((key) => iterable.push(obj[key]));
      return iterable;
    } else {
      return [];
    }
  }

  static handleError(functioinName: string, parameters: object, error: object, otherInfo?: object) {
    if (otherInfo) {
      console.error(`Function '${functioinName}' failed with parameters, error and info`, parameters, error, otherInfo);
    } else {
      console.error(`Function '${functioinName}' failed with parameters and error`, parameters, error);
    }
  }

  static deepCopyArray(array: any[]) {
    return JSON.parse(JSON.stringify(array));
  }
}
