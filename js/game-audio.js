/**
 * Kabileler / Polytopia - Web Audio API ile Prosedürel Ses & Müzik Motoru
 * Hiçbir harici ses dosyasına ihtiyaç duymadan, %100 kodla sentezlenen otantik Polytopia sesleri.
 */

export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.5;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.35;
        this.muted = false;
        this.musicPlaying = false;
        this.musicTimer = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.muted = muted;
        if (!this.masterGain) return;
        this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    // ---------------------------------------------------------------- SES EFEKTLERİ (SFX)

    playClick() {
        this.init(); this.resume();
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.04);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.04);
    }

    playMove() {
        this.init(); this.resume();
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.linearRampToValueAtTime(180, t + 0.06);

        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.08);
    }

    playAttack() {
        this.init(); this.resume();
        if (this.muted) return;
        const t = this.ctx.currentTime;

        // Metalik kılıç çarpması ve gürültü patlaması
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.16);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.18);

        // Darbe patlaması
        this.playNoise(0.12, 0.4);
    }

    playArrow() {
        this.init(); this.resume();
        if (this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    playCatapult() {
        this.init(); this.resume();
        if (this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.35);

        gain.gain.setValueAtTime(0.6, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.35);
        this.playNoise(0.25, 0.5);
    }

    playGiant() {
        this.init(); this.resume();
        if (this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(85, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.5);

        gain.gain.setValueAtTime(0.8, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.5);
        this.playNoise(0.4, 0.7);
    }

    playCapture() {
        this.init(); this.resume();
        if (this.muted) return;
        // Zafer borusu arpeji (Do - Mi - Sol - Do)
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, i) => {
            const t = this.ctx.currentTime + i * 0.09;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.28);
        });
    }

    playLevelUp() {
        this.init(); this.resume();
        if (this.muted) return;
        // Parıltılı arp yükselişi
        const notes = [392.00, 493.88, 587.33, 783.99, 987.77];
        notes.forEach((freq, i) => {
            const t = this.ctx.currentTime + i * 0.07;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.35);
        });
    }

    playTech() {
        this.init(); this.resume();
        if (this.muted) return;
        // Büyülü keşif akoru
        const chord = [329.63, 415.30, 493.88, 659.25];
        chord.forEach(freq => {
            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.65);
        });
    }

    playHarvest() {
        this.init(); this.resume();
        if (this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, t);
        osc.frequency.exponentialRampToValueAtTime(987.77, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.18);
    }

    playCloud() {
        this.init(); this.resume();
        if (this.muted) return;
        // Hafif rüzgar fısıltısı
        this.playNoise(0.2, 0.2);
    }

    playEndTurn() {
        this.init(); this.resume();
        if (this.muted) return;
        // Derin gong tonu
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(196.00, t);
        osc.frequency.exponentialRampToValueAtTime(146.83, t + 0.7);

        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.7);
    }

    playVictory() {
        this.init(); this.resume();
        if (this.muted) return;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, i) => {
            const t = this.ctx.currentTime + i * 0.12;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    }

    playDefeat() {
        this.init(); this.resume();
        if (this.muted) return;
        const notes = [392.00, 369.99, 329.63, 293.66, 261.63];
        notes.forEach((freq, i) => {
            const t = this.ctx.currentTime + i * 0.18;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.45);
        });
    }

    playNoise(duration, intensity) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;

        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(intensity, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(t);
        noise.stop(t + duration);
    }

    // ---------------------------------------------------------------- ARKA PLAN MÜZİĞİ

    startMusic() {
        if (this.musicPlaying) return;
        this.init();
        this.musicPlaying = true;
        this.playMusicLoop();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    playMusicLoop() {
        if (!this.musicPlaying || this.muted) {
            if (this.musicPlaying) {
                this.musicTimer = setTimeout(() => this.playMusicLoop(), 1000);
            }
            return;
        }

        // Pentatonik Polytopia benzeri huzurlu kabile melodisi
        // A minor pentatonik: A3, C4, D4, E4, G4, A4
        const scale = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00];
        const pattern = [
            0, 2, 3, 4, 3, 2,
            1, 3, 4, 5, 4, 3,
            2, 4, 3, 1, 0, 2
        ];

        const stepTime = 0.32;
        const startTime = this.ctx.currentTime + 0.05;

        pattern.forEach((noteIdx, i) => {
            const freq = scale[noteIdx];
            const t = startTime + i * stepTime;

            // Flüt benzeri yumuşak sinüs tonu
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.001, t);
            gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + stepTime * 0.9);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + stepTime);

            // Her 4 vuruşta bir yumuşak kabile bas ritmi
            if (i % 3 === 0) {
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                bassOsc.type = 'triangle';
                bassOsc.frequency.setValueAtTime(110.00, t);

                bassGain.gain.setValueAtTime(0.18, t);
                bassGain.gain.exponentialRampToValueAtTime(0.001, t + stepTime * 1.5);

                bassOsc.connect(bassGain);
                bassGain.connect(this.musicGain);

                bassOsc.start(t);
                bassOsc.stop(t + stepTime * 1.5);
            }
        });

        const loopDuration = pattern.length * stepTime * 1000;
        this.musicTimer = setTimeout(() => this.playMusicLoop(), loopDuration + 1200);
    }
}
