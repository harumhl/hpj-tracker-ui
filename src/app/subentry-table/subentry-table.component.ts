import {Component, Input, OnInit} from '@angular/core';
import {DbService} from '../db.service';

@Component({
  selector: 'subentry-table',
  templateUrl: './subentry-table.component.html',
  styleUrls: ['./subentry-table.component.css']
})
export class SubentryTableComponent implements OnInit {

  @Input() loggedIn = false;
  @Input() headers: string[] = ['category', 'name', 'count', 'goalCount', 'unit', 'details'];
  @Input() dataToDisplay: any[] = [];
  @Input() categoryColors: object = {};
  @Input() timeToHighlight = ''; // todo should be optional

  constructor(private dbService: DbService) { }

  ngOnInit(): void {
  }

  updateSubentryCount(row, event) {
    const newCount = parseFloat(event.target.value || 0);
    if (row.count !== newCount) {
      this.dbService.updateSubentryCount(row.name, newCount);
    }
  }
}
