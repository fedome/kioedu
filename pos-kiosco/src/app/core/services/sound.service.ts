import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
    providedIn: 'root'
})
export class SoundService {
    private settings = inject(SettingsService);
    private audioCtx: AudioContext | null = null;

    constructor() {
        // Inicializar AudioContext solo con interacción del usuario si es necesario
        // Pero para apps internas/kioscos, solemos poder iniciarlo lazy.
    }

    private getContext(): AudioContext | null {
        if (!this.audioCtx) {
            try {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API no soportada');
            }
        }
        return this.audioCtx;
    }

    playSuccess() {
        if (!this.settings.settings().playSoundOnSale) return;
        this.beep(880, 0.1, 'sine'); // A5, short beep
    }

    playError() {
        if (!this.settings.settings().playSoundOnSale) return;
        this.beep(150, 0.3, 'sawtooth'); // Low freq, jagged sound
    }

    private beep(freq: number, duration: number, type: OscillatorType) {
        const ctx = this.getContext();
        if (!ctx) return;

        // Si el contexto está suspendido (política de navegadores), intentar reanudarlo
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => { });
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        // Conectar: Osc -> Gain -> Destino
        osc.connect(gain);
        gain.connect(ctx.destination);

        // Envolvente de volumen (para que no haga "click")
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05); // Fade in
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Fade out

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }
}
