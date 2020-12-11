import { Component } from '@angular/core';
import {HttpServiceService} from './services/http-service.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Tour of Heroes';

  data: any;

  constructor(private httpService: HttpServiceService) {
    this.get();
  }

  get() {
    this.httpService.get('categories').subscribe(data => {
      this.data = data;
      console.log(this.data);
    });
  }

}
