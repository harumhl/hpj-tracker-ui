import { Component } from '@angular/core';
import firebase from 'firebase';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Tour of Heroes';

  // Found it at https://console.firebase.google.com/project/hpj-tracker/settings/general, 'Config' under 'Firebase SDK snippet'
  firebaseConfig = {
  };
  firebaseDb: firebase.database.Database;

  data: any;

  constructor() {
    firebase.initializeApp(this.firebaseConfig);
    this.firebaseDb = firebase.database();
  }
}
