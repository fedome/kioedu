import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarEvent } from '../calendar.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
    selector: 'app-calendar-event-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col transform scale-100">
        
        <!-- Header -->
        <div class="px-6 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100">
          <div>
              <h3 class="font-bold text-lg text-slate-800">{{ isNew ? 'Nueva Nota' : 'Detalle del Evento' }}</h3>
              <p class="text-xs text-slate-500 font-medium">{{ date | date:'fullDate' }}</p>
          </div>
          <button (click)="close.emit()" class="text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-4">
            <!-- Event Type Badge (Supplier Events) -->
            <div *ngIf="!isNew && (event?.type === 'VISIT' || event?.type === 'ORDER')" 
                 class="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                <div class="bg-white p-2 rounded-lg shadow-sm">
                    <svg *ngIf="event?.type === 'ORDER'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <svg *ngIf="event?.type === 'VISIT'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <div>
                    <div class="text-xs font-bold uppercase tracking-wider opacity-70">Logística de Proveedor</div>
                    <div class="text-sm font-bold">{{ event?.type === 'ORDER' ? 'Día de Realizar Pedido' : 'Día de Entrega de Mercadería' }}</div>
                </div>
            </div>

            <!-- Title / Content -->
            <div *ngIf="isNew || event?.type === 'CUSTOM'">
                <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nota / Recordatorio</label>
                <textarea [(ngModel)]="content" [readonly]="!isNew && !isEditing" rows="3" 
                          class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all resize-none font-medium text-slate-700"
                          placeholder="Escribe aquí..."></textarea>
            </div>
            
            <div *ngIf="!isNew && (event?.type === 'VISIT' || event?.type === 'ORDER')" class="text-xl font-bold text-slate-800 px-1">
                {{ event?.title }}
            </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            @if (isNew) {
                <button (click)="close.emit()" class="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                <button (click)="save()" 
                        [disabled]="!content.trim()"
                        class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                    Guardar
                </button>
            } @else {
                <!-- Actions for existing events -->
                @if (event?.type === 'CUSTOM') {
                    <button (click)="delete()" class="px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors mr-auto">Eliminar</button>
                    <!-- <button (click)="isEditing = true" *ngIf="!isEditing" class="px-4 py-2 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl transition-colors">Editar</button> -->
                    <button (click)="save()" *ngIf="isEditing" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700">Guardar Cambios</button>
                    <button (click)="close.emit()" class="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cerrar</button>
                } @else {
                     <button (click)="close.emit()" class="px-4 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors w-full">Entendido</button>
                }
            }
        </div>
      </div>
    </div>
  `
})
export class CalendarEventModalComponent {
    @Input() date!: Date;
    @Input() event?: CalendarEvent; // If null, it's new

    @Output() close = new EventEmitter<void>();
    @Output() saveEvent = new EventEmitter<string>(); // emits content
    @Output() deleteEvent = new EventEmitter<void>();

    private confirmService = inject(ConfirmService);

    content = '';
    isNew = true;
    isEditing = false; // Could implement edit logic later

    ngOnChanges() {
        if (this.event) {
            this.isNew = false;
            this.content = this.event.title;
        } else {
            this.isNew = true;
            this.content = '';
        }
    }

    save() {
        if (this.content.trim()) {
            this.saveEvent.emit(this.content);
        }
    }

    async delete() {
        const ok = await this.confirmService.confirm({
            title: 'Eliminar Nota',
            message: '¿Estás seguro de eliminar esta nota?',
            confirmText: 'Sí, eliminar',
            type: 'danger'
        });
        if (ok) {
            this.deleteEvent.emit();
        }
    }
}
