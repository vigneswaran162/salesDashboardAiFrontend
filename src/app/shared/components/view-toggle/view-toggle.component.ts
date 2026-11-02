import { Component, input, model } from '@angular/core';

export type DataView = 'chart' | 'table';

/** Icon-only Chart / Table switch for panels that can show the same data both ways. */
@Component({
  selector: 'app-view-toggle',
  standalone: true,
  template: `
    <div class="view-toggle" role="group" [attr.aria-label]="label()">
      <button type="button" [class.active]="view() === 'chart'" (click)="view.set('chart')"
              title="Chart view" aria-label="Chart view" [attr.aria-pressed]="view() === 'chart'">
        <i class="bi bi-bar-chart-line-fill" aria-hidden="true"></i>
      </button>
      <button type="button" [class.active]="view() === 'table'" (click)="view.set('table')"
              title="Table view" aria-label="Table view" [attr.aria-pressed]="view() === 'table'">
        <i class="bi bi-table" aria-hidden="true"></i>
      </button>
    </div>
  `,
  styles: [`
    .view-toggle { display: inline-flex; gap: 2px; padding: 3px; border-radius: var(--sd-radius-sm); background: var(--sd-hover); border: 1px solid var(--sd-border); }
    button { display: grid; place-items: center; width: 32px; height: 28px; border: 0; border-radius: 7px; background: transparent; color: var(--sd-muted); font-size: .95rem; cursor: pointer; transition: background .18s var(--sd-ease), color .18s var(--sd-ease), box-shadow .18s var(--sd-ease); }
    button:hover { color: var(--sd-text); }
    button.active { background: var(--sd-surface); color: var(--sd-primary-text); box-shadow: var(--sd-shadow-sm); }
    button:focus-visible { outline: 2px solid var(--sd-primary); outline-offset: 1px; }
  `],
})
export class ViewToggleComponent {
  readonly view = model<DataView>('chart');
  readonly label = input('Display as');
}
