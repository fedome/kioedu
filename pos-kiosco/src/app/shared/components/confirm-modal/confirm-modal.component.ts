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
                <div class="relative bg-white w-full max-w-sm rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
                    <!-- Subtle top glow based on type -->
                    <div class="absolute top-0 inset-x-0 h-1" [class]="getTopGlow(state.options.type)"></div>
                    
                    <div class="p-8">
                        <div class="flex flex-col items-center text-center mb-5">
                            <div [class]="getIconBg(state.options.type)" class="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 mb-4 shadow-inner ring-4 ring-white">
                                <svg class="w-8 h-8" [class]="getIconColor(state.options.type)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    @if (state.options.type === 'danger') {
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    } @else if (state.options.type === 'warning') {
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    } @else {
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    }
                                </svg>
                            </div>
                            <h3 class="text-2xl font-extrabold text-slate-800 tracking-tight">{{ state.options.title }}</h3>
                        </div>
                        
                        <p class="text-slate-500 text-sm font-medium leading-relaxed mb-6 text-center">
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
                                    class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all shadow-sm placeholder-slate-400 font-medium"
                                    autofocus
                                    autocomplete="off"
                                />
                            </div>
                        }
                        
                        <div class="flex gap-3" [class.mt-8]="!state.options.isPrompt">
                            <button 
                                (click)="cancel()"
                                class="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all border border-transparent">
                                {{ state.options.cancelText || 'Cancelar' }}
                            </button>
                            <button 
                                (click)="accept()"
                                [class]="getButtonClass(state.options.type)"
                                class="flex-[1.2] py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50">
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

    getTopGlow(type?: string) {
        switch (type) {
            case 'danger': return 'bg-gradient-to-r from-red-400 via-red-500 to-red-400';
            case 'warning': return 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400';
            default: return 'bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-400';
        }
    }
}
