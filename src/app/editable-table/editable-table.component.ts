import {Component, Input, OnInit} from '@angular/core';
import {DbService} from '../db.service';
import {HttpClient} from '@angular/common/http';
import {UtilService} from '../util.service';
import {TreeModule} from 'primeng/tree';
import {TreeNode} from 'primeng/api';
import {Entry} from '../model/entry.model';

@Component({
  selector: 'editable-table',
  templateUrl: './editable-table.component.html',
  styleUrls: ['./editable-table.component.css']
})
export class EditableTableComponent implements OnInit {

  @Input() loggedIn = false;
  @Input() headers: string[] = ['category', 'name', 'count', 'goalCount', 'unit', 'details'];
  @Input() editableColumns: string[] = [];
  @Input() dataToDisplay: Entry[] = [];
  @Input() categoryColors: object = {};
  @Input() timeToHighlight = '';
  @Input() date = null;
  @Input() mobile: boolean;
  @Input() editMode = false;
  @Input() disable = false;

  checkboxAll = false;

  readonly detailsDelimiter = '-';

  constructor(private dbService: DbService, private utilService: UtilService) { }

  ngOnInit(): void {
    // Convert a text details into PrimeNG tree format
    this.dataToDisplay.forEach(row => {
      row.detailsInTree = this.detailParseHelper(row.details, 1);
    });
  }

  detailParseHelper(text: string, indent: number) { // TODO this should return TreeNode[], not TreeNode
    let splitText = text.split('\\n');
    if (text.split('\n')[0] !== text) {
      splitText = text.split('\n');
    }
    if (splitText === undefined || splitText === null || splitText.length === 0 || splitText[0] === '' || text === '') { // base case
      return null;
    }

    // Get the line numbers of the text where the indent level matches with 'indent' variable
    const lineNumbers = [];
    for (let i = 0; i < splitText.length; i++) {
      const t = splitText[i];
      if (t.length >= indent && t.substring(0, indent) === this.detailsDelimiter.repeat(indent) && t[indent] !== this.detailsDelimiter) {
        lineNumbers.push(i);
      }
    }
    lineNumbers.push(splitText.length); // handles edge case

    // Create a TreeNode one by one
    const treeNodes = [];
    for (let i = 1; i < lineNumbers.length; i++) {
      const treeNode = {label: splitText[lineNumbers[i - 1]].substring(indent)} as TreeNode;

      const children = this.detailParseHelper(splitText.slice(lineNumbers[i - 1] + 1, lineNumbers[i]).join('\n'), indent + 1);
      if (children !== null && children.length > 0) {
        treeNode.children = children;
      }
      treeNodes.push(treeNode);
    }

    return treeNodes;
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
