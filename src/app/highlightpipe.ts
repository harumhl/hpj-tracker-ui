import {Pipe, PipeTransform} from '@angular/core';

@Pipe({ name: 'highlight' })
export class HighLightPipe implements PipeTransform {
  transform(text: string, phrasesToHighlight: string[]): string {
    if (phrasesToHighlight === null || phrasesToHighlight === undefined) {
      return text;
    }
    for (const phraseToHighlight of phrasesToHighlight) {
      text = text.replace(new RegExp(phraseToHighlight, 'i'), `<span class="highlight-in-yellow">${phraseToHighlight}</span>`);
    }
    return text;
  }
}
