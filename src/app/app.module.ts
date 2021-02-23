import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import {BarSeriesService, ChartModule, StripLineService} from '@syncfusion/ej2-angular-charts';
import { AppComponent } from './app.component';
import {DatePipe} from '@angular/common';
import { CategoryService, LegendService, TooltipService } from '@syncfusion/ej2-angular-charts';
import { DataLabelService, LineSeriesService} from '@syncfusion/ej2-angular-charts';
import {FormsModule} from '@angular/forms';
import { SubentryTableComponent } from './subentry-table/subentry-table.component';
import {HighLightPipe} from './highlightpipe';
import {ToastrModule} from 'ngx-toastr';
import {BrowserAnimationsModule, NoopAnimationsModule} from '@angular/platform-browser/animations';

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
    FormsModule,
    ToastrModule.forRoot(),
    BrowserAnimationsModule,
    NoopAnimationsModule
  ],
  providers: [DatePipe, CategoryService, LegendService, TooltipService, DataLabelService, LineSeriesService, StripLineService, BarSeriesService],
  bootstrap: [AppComponent]
})
export class AppModule { }
