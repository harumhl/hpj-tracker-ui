import {Pipe, PipeTransform} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

@Pipe({ name: 'highlight' })
export class HighLightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
  }

  transform(text: string, highlights: any[]): string {
    if (highlights === null || highlights === undefined) {
      return text;
    }
    for (const highlight of highlights) {
      const textToHighlight = highlight.text;
      const highlightColor = highlight.color ? highlight.color : '#FFFF00'; // default is yellow
      text = text.replace(new RegExp(textToHighlight, 'i'), `<span style="background-color: ${highlightColor}">${textToHighlight}</span>`);
    }
    // Angular sanitizes the HTML by removing 'style' added by this 'highlight' pipe. Bypassing it to keep the style
    return this.sanitizer.bypassSecurityTrustHtml(text) as string;
  }
}
