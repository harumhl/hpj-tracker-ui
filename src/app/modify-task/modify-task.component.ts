import {Component, Input, OnInit} from '@angular/core';
import { Task } from '../model/task.model';
import {Category} from '../model/category.model';
import {DbService} from '../db.service';
import {UtilService} from '../util.service';

@Component({
  selector: 'app-modify-task',
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

  constructor(private dbService: DbService, private utilService: UtilService) { }

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
  }

  updateContent() {
    const taskName = (document.getElementById('taskDropdown') as HTMLInputElement).value;
    this.task = Object.assign({}, this.tasks.filter(t => t.name === taskName)[0]);
    this.task.categoryId = this.task.category.id;
    delete this.task.category;
  }

  saveTask(update: boolean) {
    this.task = JSON.parse((document.getElementById('task') as HTMLInputElement).value);

    if (!update) {
      this.dbService.postTask(this.task).subscribe(e => {
        this.utilService.displayToast('success', 'task created', 'Created');
        this.assignEmptyNewTask();
      }, (error) => {
        this.utilService.displayToast('error', 'Failed to create task', 'Error', error);
      });
    } else if (update) {
      this.dbService.putTask(this.task).subscribe(e => {
        this.utilService.displayToast('success', 'task updated', 'Updated');
        this.assignEmptyNewTask();
      }, (error) => {
        this.utilService.displayToast('error', 'Failed to update task', 'Error', error);
      });
    }
  }

  assignEmptyNewTask() {
    if (this.templateTask !== undefined) {
      // Create a template for a new task
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
          } else {
            this.task[key] = null;
          }
        }
      }
    }
  }
}