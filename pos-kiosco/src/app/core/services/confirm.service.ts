import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'primary' | 'danger' | 'warning';
    
    // Configuración para prompts
    isPrompt?: boolean;
    inputPlaceholder?: string;
    inputType?: 'text' | 'email';
    initialValue?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConfirmService {
    private _state = signal<{ options: ConfirmOptions; resolve: (val: any) => void } | null>(null);
    state = this._state.asReadonly();

    /**
     * Muestra un modal de confirmación y devuelve una promesa con el resultado booleano.
     */
    confirm(options: ConfirmOptions): Promise<boolean> {
        return new Promise((resolve) => {
            if (this._state()) {
                this._state()?.resolve(false);
            }
            this._state.set({ options, resolve });
        });
    }

    /**
     * Muestra un modal de texto predictivo (prompt) y devuelve una promesa con el string ingresado o null.
     */
    prompt(options: ConfirmOptions): Promise<string | null> {
        return new Promise((resolve) => {
            if (this._state()) {
                this._state()?.resolve(null);
            }
            this._state.set({ options: { ...options, isPrompt: true }, resolve });
        });
    }

    handleResponse(result: any) {
        const current = this._state();
        if (current) {
            current.resolve(result);
            this._state.set(null);
        }
    }
}
