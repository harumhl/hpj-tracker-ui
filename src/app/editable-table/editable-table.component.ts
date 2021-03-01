import {Component, Input, OnInit} from '@angular/core';
import {DbService} from '../db.service';
import {HttpClient} from '@angular/common/http';
import {UtilService} from '../util.service';

@Component({
  selector: 'editable-table',
  templateUrl: './editable-table.component.html',
  styleUrls: ['./editable-table.component.css']
})
export class EditableTableComponent implements OnInit {

  @Input() loggedIn = false;
  @Input() headers: string[] = ['category', 'name', 'count', 'goalCount', 'unit', 'details'];
  @Input() editableColumns: string[] = [];
  @Input() dataToDisplay: any[] = [];
  @Input() categoryColors: object = {};
  @Input() timeToHighlight = '';
  @Input() date = null;
  @Input() mobile: boolean;
  @Input() editMode = false;
  @Input() disable = false;

  checkboxAll = false;

  constructor(private dbService: DbService, private utilService: UtilService) { }

  ngOnInit(): void {
  }

  updateEntry(row, column: string, event) {
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

    // hide an entry by entering -1
    if (newCount === -1) {
      const copyOfRow = this.utilService.copyAsJson(row);
      copyOfRow.hide = !row.hide;
      this.dbService.putEntry(copyOfRow).subscribe(entry => {
        this.dbService.refreshData();
      });
      return;
    }

    // Put 0 back if the input box loses focus without any entry
    // TODO what if this is not 'count'? Maybe keep it empty and just perform GET request?
    if (row[column] === '') {
      row[column] = 0;
    }

    // Updating an entry count
    if (row.count !== newCount) {
      //const hide = row.hide ? false : null; // if the row was hidden then stop hiding with an update; else keep it as it is
      //this.dbService.updateEntry(row.documentId, this.date, newCount, hide, null);

      const copyOfRow = this.utilService.copyAsJson(row);
      copyOfRow.count = newCount;
      this.dbService.subjects.disableMainInput.next(true);
      this.dbService.putEntry(copyOfRow).subscribe(entry => {
        this.dbService.refreshData();
      });
    }
  }

  updateEntryDetails(row, detail) {
    // Since the button is clicked, save the opposite value of the current value in the database
    row.entryDetails[detail.key] = !detail.value;
    //this.dbService.updateEntry(row.documentId, this.date, null, null, row.entryDetails);
  }

  selectAll() {
    this.checkboxAll = !this.checkboxAll;
    this.dataToDisplay.forEach(row => row.checked = this.checkboxAll);
  }
}
