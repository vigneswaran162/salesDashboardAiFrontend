import { AfterViewChecked, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatTurn } from '../../../core/services/chat.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css',
})
export class ChatWidgetComponent implements AfterViewChecked {
  private readonly chat = inject(ChatService);

  @ViewChild('scroller') private scroller?: ElementRef<HTMLDivElement>;

  readonly open = signal(false);
  readonly loading = signal(false);
  readonly messages = signal<ChatTurn[]>([
    { role: 'model', text: 'Hi! Ask me anything about your sales dashboard.' },
  ]);
  input = '';

  toggle(): void {
    this.open.update((v) => !v);
  }

  send(): void {
    const text = this.input.trim();
    if (!text || this.loading()) return;

    const history = this.messages().slice(1); // skip greeting
    this.messages.update((m) => [...m, { role: 'user', text }]);
    this.input = '';
    this.loading.set(true);

    this.chat.send(text, history).subscribe({
      next: (res) => {
        this.messages.update((m) => [...m, { role: 'model', text: res.reply }]);
        this.loading.set(false);
      },
      error: (err) => {
        const msg = err?.error?.message || 'Something went wrong. Please try again.';
        this.messages.update((m) => [...m, { role: 'model', text: msg }]);
        this.loading.set(false);
      },
    });
  }

  ngAfterViewChecked(): void {
    const el = this.scroller?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
