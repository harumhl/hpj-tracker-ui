import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { ChartModule } from '@syncfusion/ej2-angular-charts';
import { AppComponent } from './app.component';
import {DatePipe} from '@angular/common';
import { CategoryService, LegendService, TooltipService } from '@syncfusion/ej2-angular-charts';
import { DataLabelService, LineSeriesService} from '@syncfusion/ej2-angular-charts';
import {FormsModule} from '@angular/forms';
import { SubentryTableComponent } from './subentry-table/subentry-table.component';
import {HighLightPipe} from './highlightpipe';

@NgModule({
  declarations: [
    AppComponent,
    SubentryTableComponent,
    HighLightPipe
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    ChartModule,
    FormsModule
  ],
  providers: [DatePipe, CategoryService, LegendService, TooltipService, DataLabelService, LineSeriesService],
  bootstrap: [AppComponent]
})
export class AppModule { }
