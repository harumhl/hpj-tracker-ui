import { Injectable } from '@angular/core';
import firebase from 'firebase';
import {DatePipe} from '@angular/common';
import {UtilService} from './util.service';
import QuerySnapshot = firebase.firestore.QuerySnapshot;
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;
import {environment} from '../environments/environment';
import {Category} from './model/category.model';
import {Goal} from './model/goal.model';
import {Subentry} from './model/subentry.model';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DbService {

  static collections = environment.firebaseCollections;

  firebaseDb: firebase.firestore.Firestore = null;
  today: string;
  dayOfToday: string;

  refreshChartSubject = new Subject<boolean>();

  constructor(private utilService: UtilService, public datePipe: DatePipe) {
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

  // Gets the document ID (aka the primary key) for data, given a collection name (e.g. categories, goals or entries)
  static _getDocumentId(collection: string, document: object) {
    let key = '';
    if (collection === this.collections.categories) {
      key = (document as Category).category;
    } else if (collection === this.collections.goals) {
      key = (document as Goal).documentId;
    } else if (collection === this.collections.entries) {
      key = (document as Subentry).doneDate;
    } else {
      return '';
    }

    return key.replace(/ /g, ''); // .replace() removes all spaces
  }

  // todo now database accepts date type (rename the fn)
  // Convert a Date() to date string in order to use a date as an intermediate-level database key in entries
  _getDateKey(date?) {
    if (date === null || date === undefined) {
      date = Date();
    }
    return this.datePipe.transform(date, 'yyyy-MM-dd');
  }

  // Read from Firebase database
  readSingle(subscribe: boolean, collection: string, documentId: string, whereCondition?: any[], callback: (documentSnapshot: DocumentSnapshot) => any = () => {}) {
    this._read(subscribe, collection, documentId, whereCondition, null, callback);
  }
  readAll(subscribe: boolean, collection: string, whereCondition?: any[], callback: (querySnapshot: QuerySnapshot) => any = () => {}) {
    this._read(subscribe, collection, 'all', whereCondition, null, callback);
  }
  readSubcollectionsOfSingleDoc(subscribe: boolean, collection: string, documentId: string, whereCondition?: any[], subcollectionId?: string, callback: (querySnapshot: QuerySnapshot) => any = () => {}) {
    this._read(subscribe, collection, documentId, whereCondition, subcollectionId, callback);
  }
  _read(subscribe: boolean, collection: string, documentId: string, whereCondition?: any[], subcollectionId?: string, callback: (docOrQuerySnapshot: any) => any = () => {}) {
    // Set up differently for single or multi document read
    let ref: any = this.firebaseDb.collection(collection);
    const isDocumentRequested = documentId !== '' && documentId !== 'all';
    if (isDocumentRequested) {
      ref = ref.doc(documentId);
    }

    // Read only those documents that meet certain criteria (e.g. ['state', '==', 'CA', 'population', '>=', 100000])
    if (whereCondition) {
      for (let i = 0; i < whereCondition.length; i += 3) {
        ref = ref.where(whereCondition[i], whereCondition[i + 1] as '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in', whereCondition[i + 2]);
      }
    }

    // For subcollections of a single doc
    if (isDocumentRequested && (subcollectionId !== null && subcollectionId !== undefined && subcollectionId !== '')) {
      ref = ref.collection(subcollectionId);
    }

    // Different call to subscribe to the changes in data, or just read once
    if (subscribe) {
      ref.onSnapshot(callback);
    } else {
      ref.get().then(callback);
    }
  }

  // Write to Firebase database
  writeDoc(collection: string, document: object, callback: () => any = () => {}, errorCallback: () => any = () => {}) {
    this._write(collection, document, null, null, callback, errorCallback);
  }
  writeDocInSubcollection(collection: string, document: object, subcollectionId: string, subdocument: object, callback: () => any = () => {}, errorCallback: () => any = () => {}) {
    this._write(collection, document, subcollectionId, subdocument, callback, errorCallback);
  }
  _write(collection: string, document: object, subcollectionId: string, subdocument: object, callback: () => any = () => {}, errorCallback: () => any = () => {}) {
    const documentId = DbService._getDocumentId(collection, document);
    let ref: any = this.firebaseDb.collection(collection).doc(documentId);

    // For a new document in subcollections of a single doc
    if (subcollectionId && subdocument) {
      const subdocumentId = DbService._getDocumentId(subcollectionId, subdocument);
      ref = ref.collection(subcollectionId).doc(subdocumentId);
      document = subdocument;
    }

    // Check if such document already exists
    ref.get().then((documentSnapshot: DocumentSnapshot) => {
      if (!documentSnapshot.exists) {
        // Write a new document
        ref.set(document).then(callback)
          .catch((error) => {
            errorCallback();
            this.utilService.handleError('_write', {collection, document, subcollection: subcollectionId, subdocument}, error, {documentId});
          });
      }
    });
  }

  // Update an existing data in Firebase database
  updateDoc(collection: string, documentId: string, dataToModify: object, callback: () => any = () => {}, errorCallback: (error) => any = () => {}) {
    this._update(collection, documentId, dataToModify, null, null, callback, errorCallback);
  }
  updateDocInSubcollection(collection: string, documentId: string, dataToModify: object, subcollection: string, subdocumentForId: object, callback: () => any = () => {}, errorCallback: (error) => any = () => {}) {
    this._update(collection, documentId, dataToModify, subcollection, subdocumentForId, callback, errorCallback);
  }
  _update(collection: string, documentId: string, dataToModify: object, subcollectionId: string, subdocumentForId: object, callback: () => any = () => {}, errorCallback: (error) => any = () => {}) {
    let ref: any = this.firebaseDb.collection(collection).doc(documentId);

    // For updating a document in subcollections of a single doc
    if (subcollectionId && subdocumentForId) {
      const subdocumentId = DbService._getDocumentId(subcollectionId, subdocumentForId);
      ref = ref.collection(subcollectionId).doc(subdocumentId);
    }

    // Update a document
    ref.update(dataToModify).then(callback)
      .catch((error) => {
        errorCallback(error);
        this.utilService.handleError('_update', {collection, documentId, dataToModify, subcollectionId, subdocumentForId}, error);
      });
  }

  // Read existing subcollections in a given day's entry from Firebase
  readSubcollectionsInAnEntryOfADay(subscribe: boolean, date: string, callback: (querySnapshot: QuerySnapshot) => any = () => {}) {
    if (date === null || date === undefined || date === '' || date === 'today') {
      date = this.today;
    }
    this.readSubcollectionsOfSingleDoc(subscribe, DbService.collections.entries, date, [], DbService.collections.goals, callback);
  }

  // Validating elements of a goal (especially goal >= 0 and expectedTimesOfCompletion)
  _validateGoal(category: string, name: string, archived: boolean, goalCount: number, unit: string, expectedTimesOfCompletion: string[], details: string) {
    const regex: RegExp = new RegExp(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/);
    return (category !== null && category !== undefined && category !== '')
    && (name !== null && name !== undefined && name !== '')
    && (archived !== null && archived !== undefined)
    && (goalCount !== null && goalCount !== undefined && goalCount >= 0)
    && (unit !== null && unit !== undefined && unit !== '')
    && (expectedTimesOfCompletion !== null && expectedTimesOfCompletion !== undefined && expectedTimesOfCompletion.length > 0
        && expectedTimesOfCompletion.filter(t => t.match(regex)).length === expectedTimesOfCompletion.length);
  }

  // Write a new category to Firebase database
  newCategory(category: string) {
    if (category !== null && category !== undefined && category !== '') { // input validation
      this.writeDoc(DbService.collections.categories, {category});
    }
  }

  // todo goal occurrence (e.g. daily/weekly/MWF)
  // todo not only for 'achieve' goal, but also 'prevent' goal too (e.g. eating snacks, eating red meat, eating ramen)
  // TODO order of goals for display
  // Write a new goal to Firebase database
  newGoal(category: string, name: string, archived: boolean, goalCount: number, unit: string, expectedTimesOfCompletion: string[], details: string, callback: () => any = () => {}, errorCallback: () => any = () => {}) {
    if (this._validateGoal(category, name, archived, goalCount, unit, expectedTimesOfCompletion, details)) {
      // Foreign key constraint - check whether the category already exists in /categories
      this.readAll(false, DbService.collections.categories, ['category', '==', category], (querySnapshot) => {
        // If the category exists, then write the new goal (and create today's entry + its subcollections)
        if (querySnapshot.docs.length > 0) {
          const documentId = DbService._getDocumentId(DbService.collections.goals, {documentId: category + '_' + name});
          this.writeDoc(DbService.collections.goals, {category, name, documentId, archived, goalCount, unit, expectedTimesOfCompletion, details},
            () => { this.newEntry(this.today); callback(); }, () => errorCallback());
        }
      });
    } else {
      errorCallback();
    }
  }

  // Update an existing goal in Firebase database
  updateGoal(name: string, goalCount?: number, unit?: string, expectedTimesOfCompletion?: string[], details?: string, callback: () => any = () => {}, errorCallback: (error) => any = () => {}) {
    let dataToModify = {name};
    if (goalCount) {
      dataToModify = Object.assign(dataToModify, {goalCount});
    }
    if (unit) {
      dataToModify = Object.assign(dataToModify, {unit});
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

    // Update
    this.readAll(false, DbService.collections.goals, ['name', '==', name], (querySnapshot) => {
      const doc = querySnapshot.docs[0].data();
      dataToModify = Object.assign(dataToModify, {category: doc.category, documentId: doc.documentId, archived: doc.archived});

      const collection = DbService.collections.goals;
      this.updateDoc(collection, DbService._getDocumentId(collection, {documentId: doc.documentId}), dataToModify, callback, errorCallback);
    });
  }

  // todo detailed entry (e.g. not just writing that I had two servings of fruits, but writing that I had an apple and a kiwi)
  // todo subcategory or mini goals (e.g. not just writing that I studied for Hazel, but sub-goals like 10 minutes for makeup, 10 minutes for skincare, 10 minutes for haircare)
  // Write a new entry in Firebase database
  newEntry(doneDate: string) {
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
  }

  // Write documents of a subcollection for an entry
  newSubcollectionOfAnEntry(doneDate: string) {
    this.readAll(false, DbService.collections.goals, ['archived', '==', false], (querySnapshot: QuerySnapshot) => {
      const goals = this.utilService.toIterable(querySnapshot);
      for (const goal of goals) {
        const subentry = {category: goal.category, name: goal.name, documentId: DbService._getDocumentId(DbService.collections.goals, goal), count: 0, goalCount: goal.goalCount, hide: false};
        this.writeDocInSubcollection(DbService.collections.entries, {doneDate}, DbService.collections.goals, subentry);
      }
    });
  }

  // Update the count or 'hide' of an existing entry in Firebase database
  updateSubentry(documentId: string, count?: number, hide?: boolean, doneDate?: string) {
    if (doneDate === null || doneDate === undefined) {
      doneDate = this._getDateKey();
    }
    let dataToModify = {};
    if (count !== null) {
      dataToModify = Object.assign(dataToModify, {count});
    }
    if (hide !== null) {
      dataToModify = Object.assign(dataToModify, {hide});
    }

    const collection = DbService.collections.entries;
    this.updateDocInSubcollection(collection, DbService._getDocumentId(collection, {doneDate}), dataToModify, DbService.collections.goals, Object.assign(dataToModify, {documentId}),
      () => { this.refreshChart(); });
  }

  refreshChart() {
    this.refreshChartSubject.next(true);
  }
}
