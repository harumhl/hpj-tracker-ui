import {Component, Input, OnInit} from '@angular/core';
import { Task } from '../model/task.model';
import {Category} from '../model/category.model';
import {JsonPipe} from '@angular/common';
import {DbService} from '../db.service';

@Component({
  selector: 'modify-task',
  templateUrl: './modify-task.component.html',
  styleUrls: ['./modify-task.component.css']
})
export class ModifyTaskComponent implements OnInit {

  @Input() loggedIn = false;
  @Input() categoryList: string[] = [];
  @Input() categories: Category[] = [];
  @Input() taskList: string[] = [];
  @Input() tasks: Task[] = [];
  @Input() templateTask: Task;
  task: Task;

  constructor(private dbService: DbService, private jsonPipe: JsonPipe) { }

  ngOnInit(): void {
    const useTemplateTask = setInterval(() => {
      if (this.templateTask !== undefined) {
        this.assignEmptyNewTask();
        clearInterval(useTemplateTask);
      }
    }, 100);
  }

  assignCategory() {
    const categoryName = (document.getElementById('categoryDropdown') as HTMLInputElement).value;
    const categoryMatches = this.categories.filter(c => c.name === categoryName);
    if (categoryMatches.length > 0) {
      this.task.categoryId = categoryMatches[0].id;
    }
    (document.getElementById('task') as HTMLTextAreaElement).innerHTML = this.jsonPipe.transform(this.task);
  }

  updateContent() {
    const taskName = (document.getElementById('taskDropdown') as HTMLInputElement).value;
    this.task = Object.assign({}, this.tasks.filter(t => t.name === taskName)[0]);
    this.task.categoryId = this.task.category.id;
    delete this.task.category;
    (document.getElementById('task') as HTMLTextAreaElement).innerHTML = this.jsonPipe.transform(this.task);
  }

  saveTask(update: boolean) {
    this.task = JSON.parse((document.getElementById('task') as HTMLInputElement).value);

    if (!update) {
      this.dbService.postTask(this.task).subscribe(e => {
        this.assignEmptyNewTask();
      });
    } else if (update) {
      this.dbService.putTask(this.task).subscribe(e => {
        this.assignEmptyNewTask();
      });
    }
  }

  assignEmptyNewTask() {
    if (this.templateTask !== undefined) {
      // Create a template for a new task
      this.task = undefined;
      this.task = Object.assign({}, this.templateTask);
      for (const key in this.task) {
        if (this.task.hasOwnProperty(key)) {
          // Assign default values or remove keys
          if (['id'].indexOf(key) !== -1) {
            delete this.task[key];
          } else if (['name', 'details'].indexOf(key) !== -1) {
            this.task[key] = '';
          } else if (['unit'].indexOf(key) !== -1) {
            this.task[key] = 'count';
          } else if (['archived'].indexOf(key) !== -1) {
            this.task[key] = false;
          } else if (['goalCount', 'maxCount', 'multiplier'].indexOf(key) !== -1) {
            this.task[key] = 0;
          } else if (['expectedTimesOfCompletion'].indexOf(key) !== -1) {
            this.task[key] = ['07:00'];
          } else if (['category'].indexOf(key) !== -1) {
            delete this.task.category;
            this.task.categoryId = null;
          } else if (['detailsInTree'].indexOf(key) !== -1) {
            delete this.task.detailsInTree;
          } else {
            this.task[key] = null;
          }
        }
      }
      (document.getElementById('task') as HTMLTextAreaElement).innerHTML = this.jsonPipe.transform(this.task);

    }
  }
}
