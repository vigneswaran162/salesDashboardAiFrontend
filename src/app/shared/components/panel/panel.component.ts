import { Component, Input } from '@angular/core';

/**
 * Card with a title row. Project `[panel-actions]` for controls on the right of the header;
 * set `flush` to drop body padding (tables).
 */
@Component({
  selector: 'app-panel',
  standalone: true,
  host: { class: 'd-block' },
  template: `
    <section class="card h-100 panel" [attr.aria-label]="title">
      <header class="panel-head">
        <div class="min-w-0">
          <h2 class="card-title">{{ title }}</h2>
          @if (subtitle) {
            <p class="panel-sub">{{ subtitle }}</p>
          }
        </div>
        <div class="panel-actions"><ng-content select="[panel-actions]" /></div>
      </header>
      <div class="panel-body" [class.flush]="flush">
        <ng-content />
      </div>
    </section>
  `,
  styles: [`
    .panel { display: flex; flex-direction: column; }
    .panel-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: .75rem; padding: 1.1rem 1.25rem .25rem; }
    .panel-sub { margin: .15rem 0 0; font-size: .8rem; color: var(--sd-muted); }
    .panel-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
    .panel-actions:empty { display: none; }
    .panel-body { padding: 1rem 1.25rem 1.25rem; flex: 1; min-width: 0; }
    .panel-body.flush { padding: .75rem 0 0; }
  `],
})
export class PanelComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle = '';
  @Input() flush = false;
}
