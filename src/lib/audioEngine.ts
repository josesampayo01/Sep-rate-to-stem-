export type StemId = 'vocals' | 'bass' | 'drums' | 'other';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private gains: Record<StemId, GainNode> = {} as any;
  private sources: AudioBufferSourceNode[] = [];
  public duration: number = 0;
  
  public state: 'stopped' | 'playing' | 'paused' = 'stopped';

  async loadFile(file: File) {
    if (this.ctx) await this.ctx.close();
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    await this.ctx.suspend(); 
    
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.duration = this.buffer.duration;
    this.state = 'paused';
    
    this.buildGraph(0);
  }

  private buildGraph(offset: number = 0) {
    if (!this.ctx || !this.buffer) return;
    
    this.sources.forEach(s => {
       try { s.stop(); s.disconnect(); } catch (e) {}
    });
    this.sources = [];

    // Definición de las pistas simuladas con filtros de Web Audio API
    const tracks: { id: StemId, type: BiquadFilterType, freq: number, Q?: number }[] = [
      { id: 'vocals', type: 'bandpass', freq: 1500, Q: 1.5 },
      { id: 'drums', type: 'highpass', freq: 4000 },
      { id: 'bass', type: 'lowpass', freq: 250 },
      { id: 'other', type: 'notch', freq: 1500, Q: 1.5 }
    ];

    tracks.forEach(t => {
      const source = this.ctx!.createBufferSource();
      source.buffer = this.buffer;

      const filter = this.ctx!.createBiquadFilter();
      filter.type = t.type;
      filter.frequency.value = t.freq;
      if (t.Q) filter.Q.value = t.Q;

      if (!this.gains[t.id]) {
        const gain = this.ctx!.createGain();
        gain.gain.value = 0.8;
        this.gains[t.id] = gain;
      }

      source.connect(filter);
      filter.connect(this.gains[t.id]);
      this.gains[t.id].connect(this.ctx!.destination);

      source.start(0, offset);
      this.sources.push(source);
    });
  }

  async play() {
    if (this.ctx && this.state !== 'playing') {
      await this.ctx.resume();
      this.state = 'playing';
    }
  }

  async pause() {
    if (this.ctx && this.state === 'playing') {
      await this.ctx.suspend();
      this.state = 'paused';
    }
  }

  async seek(time: number) {
    if (!this.ctx || !this.buffer) return;
    time = Math.max(0, Math.min(time, this.duration));
    
    const wasPlaying = this.state === 'playing';
    
    if (wasPlaying) {
      await this.ctx.suspend();
    }
    
    this.buildGraph(time);
    
    if (wasPlaying) {
      await this.ctx.resume();
      this.state = 'playing';
    } else {
      this.state = 'paused';
    }
    
    return time;
  }

  async close() {
    if (this.ctx) {
      await this.ctx.close();
      this.ctx = null;
    }
  }

  setVolume(trackId: StemId, volume: number) {
    if (this.ctx && this.gains[trackId]) {
      // Cambio suave para evitar clicks
      this.gains[trackId].gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    }
  }
}
