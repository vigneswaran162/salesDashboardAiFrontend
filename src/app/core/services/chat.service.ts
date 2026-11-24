import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  pages?: number[];
}

export interface ChatReply {
  success: boolean;
  reply: string;
  sources?: { page: number; source: string; score: number }[];
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/chat`;

  send(message: string, history: ChatTurn[]): Observable<ChatReply> {
    return this.http.post<ChatReply>(this.baseUrl, { message, history });
  }
}
