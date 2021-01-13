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
  @Input() date = null;
  @Input() mobile: boolean;
  @Input() editMode = false;

  constructor(private dbService: DbService) { }

  ngOnInit(): void {
  }

  updateSubentry(row, column: string, event) {
    // iPhone doesn't contains a dot (.) with <input type='tel'>, so allow any other symbols to be used as a dot
    // Replace any of those symbols to dot, but only expect one
    const acceptableSymbols = ['+', ',', ';', '*', '#'];
    let enteredValue = event.target.value || '0';
    for (const specialChar of acceptableSymbols) {
      enteredValue = enteredValue.split(specialChar).join('.');
    }
    if (enteredValue.split('.').length > 2) { // if it contains more than one dot
      return;
    }
    const newCount = parseFloat(enteredValue);

    // TODO introduce "edit" mode where multiple subentries can be selected with (appearing) checkboxes - for hide and more (e.g. delete?) instead of relying on entering -1
    // hide a subentry by entering -1
    if (newCount === -1) {
      this.dbService.updateSubentry(row.documentId, null, !row.hide, this.date);
      return;
    }

    // Put 0 back if the input box loses focus without any entry
    if (row[column] === '') {
      row[column] = 0;
    }

    // Updating a subentry count
    if (row.count !== newCount) {
      const hide = row.hide ? false : null; // if the row was hidden then stop hiding with an update; else keep it as it is
      this.dbService.updateSubentry(row.documentId, newCount, hide, this.date);
    }
  }
}
