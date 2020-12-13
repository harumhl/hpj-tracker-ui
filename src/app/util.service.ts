import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  constructor() { }

  // Firebase returns a json, but sometimes a list is needed to process further
  static objectToIterable(obj: object) {
    const iterable = [];
    Object.keys(obj).forEach((key) => iterable.push(obj[key]));
    return iterable;
  }

  static handleError(functioinName: string, parameters: object, error: object, otherInfo?: object) {
    if (otherInfo) {
      console.error(`Function '${functioinName}' failed with parameters, error and info`, parameters, error, otherInfo);
    } else {
      console.error(`Function '${functioinName}' failed with parameters and error`, parameters, error);
    }
  }

}
