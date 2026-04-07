import { Component, signal, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api/api.service';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

@Component({
  selector: 'app-ai-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat-widget.html',
  styleUrl: './ai-chat-widget.scss'
})
export class AiChatWidgetComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private api = inject(ApiService);

  isOpen = signal(false);
  isExpanded = signal(false);
  messages = signal<ChatMessage[]>([{
    role: 'model',
    content: '¡Hola! Soy KioAI. Estoy aquí para ayudarte a administrar el kiosco, darte ideas de ventas, o responder cualquier duda sobre el sistema.'
  }]);
  userInput = signal('');
  isTyping = signal(false);

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen.set(!this.isOpen());
  }

  toggleExpand() {
    this.isExpanded.set(!this.isExpanded());
  }

  async sendMessage() {
    const text = this.userInput().trim();
    if (!text) return;

    // Add user message to UI
    this.messages.update(m => [...m, { role: 'user', content: text }]);
    this.userInput.set('');
    this.isTyping.set(true);

    try {
      // Build history (skip the initial greeting)
      const history = this.messages()
        .slice(1, -1) // exclude initial greeting and the message we just added
        .map(m => ({ role: m.role, content: m.content }));

      const res: any = await this.api.post('/ai/chat', {
        message: text,
        history
      }).toPromise();

      this.messages.update(m => [...m, { role: 'model', content: res.response }]);
    } catch (error: any) {
      console.error('AI Backend Error:', error);
      const errorMsg = error?.status === 0
        ? '⚠️ Sin conexión. La IA necesita internet para funcionar.'
        : '❌ Error al comunicarse con la IA. Intenta nuevamente.';
      this.messages.update(m => [...m, { role: 'model', content: errorMsg }]);
    } finally {
      this.isTyping.set(false);
    }
  }

  private scrollToBottom() {
    if (this.scrollContainer && this.isOpen()) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
