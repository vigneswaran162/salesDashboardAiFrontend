import { Directive, ElementRef, EventEmitter, HostListener, Output, inject } from '@angular/core';

/** Emits when a click lands outside the host element, or Escape is pressed (closes menus). */
@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  @Output() appClickOutside = new EventEmitter<void>();

  @HostListener('document:click', ['$event.target'])
  onClick(target: EventTarget | null): void {
    if (target instanceof Node && !this.el.nativeElement.contains(target)) this.appClickOutside.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.appClickOutside.emit();
  }
}
