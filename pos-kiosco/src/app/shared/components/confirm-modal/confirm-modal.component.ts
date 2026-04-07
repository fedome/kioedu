import { Component, inject, signal, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
    selector: 'app-confirm-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        @if (confirm.state(); as state) {
            <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" (click)="cancel()"></div>
                
                <!-- Modal -->
                <div class="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-200">
                    <div class="p-8">
                        <div class="flex items-center gap-4 mb-4">
                            <div [class]="getIconBg(state.options.type)" class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <svg class="w-6 h-6" [class]="getIconColor(state.options.type)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    @if (state.options.type === 'danger') {
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    } @else {
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    }
                                </svg>
                            </div>
                            <h3 class="text-xl font-black text-slate-800 tracking-tight">{{ state.options.title }}</h3>
                        </div>
                        
                        <p class="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                            {{ state.options.message }}
                        </p>
                        
                        <!-- Prompt Input -->
                        @if (state.options.isPrompt) {
                            <div class="mb-8">
                                <input #promptInput
                                    [type]="state.options.inputType || 'text'"
                                    [(ngModel)]="inputValue"
                                    (keydown.enter)="accept()"
                                    [placeholder]="state.options.inputPlaceholder || ''"
                                    class="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                                    autofocus
                                />
                            </div>
                        }
                        
                        <div class="flex gap-3" [class.mt-8]="!state.options.isPrompt">
                            <button 
                                (click)="cancel()"
                                class="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                                {{ state.options.cancelText || 'Cancelar' }}
                            </button>
                            <button 
                                (click)="accept()"
                                [class]="getButtonClass(state.options.type)"
                                class="flex-[1.5] py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95">
                                {{ state.options.confirmText || 'Confirmar' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        @keyframes zoom-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-in {
            animation-name: zoom-in;
            animation-fill-mode: forwards;
        }
    `]
})
export class ConfirmModalComponent {
    confirm = inject(ConfirmService);
    
    @ViewChild('promptInput') promptInput!: ElementRef<HTMLInputElement>;
    
    inputValue = '';

    constructor() {
        effect(() => {
            const state = this.confirm.state();
            if (state) {
                this.inputValue = state.options.initialValue || '';
                // Set focus a bit later to let the template render
                if (state.options.isPrompt) {
                    setTimeout(() => {
                        this.promptInput?.nativeElement?.focus();
                    }, 50);
                }
            }
        });
    }

    cancel() {
        const state = this.confirm.state();
        if (state) {
            this.confirm.handleResponse(state.options.isPrompt ? null : false);
        }
    }

    accept() {
        const state = this.confirm.state();
        if (state) {
            this.confirm.handleResponse(state.options.isPrompt ? this.inputValue : true);
        }
    }

    getIconBg(type?: string) {
        switch (type) {
            case 'danger': return 'bg-red-50';
            case 'warning': return 'bg-amber-50';
            default: return 'bg-indigo-50';
        }
    }

    getIconColor(type?: string) {
        switch (type) {
            case 'danger': return 'text-red-500';
            case 'warning': return 'text-amber-500';
            default: return 'text-indigo-500';
        }
    }

    getButtonClass(type?: string) {
        switch (type) {
            case 'danger': return 'bg-red-500 shadow-red-200 hover:bg-red-600';
            case 'warning': return 'bg-amber-500 shadow-amber-200 hover:bg-amber-600';
            default: return 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700';
        }
    }
}
