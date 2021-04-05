import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import {BarSeriesService, ChartModule, StripLineService} from '@syncfusion/ej2-angular-charts';
import { AppComponent } from './app.component';
import {DatePipe, JsonPipe} from '@angular/common';
import { CategoryService, LegendService, TooltipService } from '@syncfusion/ej2-angular-charts';
import { DataLabelService, LineSeriesService} from '@syncfusion/ej2-angular-charts';
import {FormsModule} from '@angular/forms';
import { EditableTableComponent } from './editable-table/editable-table.component';
import {HighLightPipe} from './highlightpipe';
import {ToastrModule} from 'ngx-toastr';
import {BrowserAnimationsModule, NoopAnimationsModule} from '@angular/platform-browser/animations';
import { ModifyTaskComponent } from './modify-task/modify-task.component';
import {TreeModule} from 'primeng/tree';

@NgModule({
  declarations: [
    AppComponent,
    EditableTableComponent,
    HighLightPipe,
    ModifyTaskComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ChartModule,
    FormsModule,
    ToastrModule.forRoot(),
    BrowserAnimationsModule,
    NoopAnimationsModule,
    TreeModule
  ],
  providers: [DatePipe, JsonPipe, CategoryService, LegendService, TooltipService, DataLabelService, LineSeriesService, StripLineService, BarSeriesService],
  bootstrap: [AppComponent]
})
export class AppModule { }
