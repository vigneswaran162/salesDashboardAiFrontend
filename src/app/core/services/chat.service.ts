import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/chat`;

  send(message: string, history: ChatTurn[]): Observable<{ success: boolean; reply: string }> {
    return this.http.post<{ success: boolean; reply: string }>(this.baseUrl, { message, history });
  }
}
