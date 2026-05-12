import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Play, Pause, Square, Music, AlignLeft } from 'lucide-react';
import { AudioEngine, StemId } from './lib/audioEngine';

const STEM_COLORS = {
  vocals: 'bg-rose-500',
  drums: 'bg-amber-500',
  bass: 'bg-emerald-500',
  other: 'bg-blue-500'
};

const STEM_LABELS = {
  vocals: 'Voces',
  drums: 'Batería',
  bass: 'Bajo',
  other: 'Otros'
};

export default function App() {
  const [engine] = useState(() => new AudioEngine());
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Mixer State
  const [volumes, setVolumes] = useState<Record<StemId, number>>({
    vocals: 0.8, drums: 0.8, bass: 0.8, other: 0.8
  });
  const [mutes, setMutes] = useState<Record<StemId, boolean>>({
    vocals: false, drums: false, bass: false, other: false
  });
  const [solos, setSolos] = useState<Record<StemId, boolean>>({
    vocals: false, drums: false, bass: false, other: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time tracker loop
  useEffect(() => {
    let req: number;
    let lastTime: number = performance.now();
    
    const tick = (now: number) => {
      if (isPlaying && !isSeeking) {
        const dt = (now - lastTime) / 1000;
        setCurrentTime(t => {
          const newTime = t + dt;
          if (newTime >= duration) {
            setIsPlaying(false);
            engine.pause();
            engine.seek(0);
            return 0;
          }
          return newTime;
        });
      }
      lastTime = now;
      req = requestAnimationFrame(tick);
    };
    req = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(req);
  }, [isPlaying, isSeeking, duration, engine]);

  // Volume Engine Sync
  useEffect(() => {
    if (!isFileLoaded) return;
    const isAnySolo = Object.values(solos).some(v => v);

    (Object.keys(volumes) as StemId[]).forEach(id => {
      let actualVolume = volumes[id];
      if (mutes[id]) actualVolume = 0;
      else if (isAnySolo && !solos[id]) actualVolume = 0;
      
      engine.setVolume(id, actualVolume);
    });
  }, [volumes, mutes, solos, isFileLoaded, engine]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      await engine.loadFile(file);
      setDuration(engine.duration);
      setIsFileLoaded(true);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err) {
      console.error(err);
      alert('Error cargando el archivo de audio. Asegúrate de subir un archivo de audio válido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await engine.pause();
      setIsPlaying(false);
    } else {
      await engine.play();
      setIsPlaying(true);
    }
  };

  const handleStop = async () => {
    await engine.pause();
    setIsPlaying(false);
    await engine.seek(0);
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-950 font-sans selection:bg-rose-500 selection:text-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-stone-800 bg-stone-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500 p-2 rounded-lg">
            <Music className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-medium tracking-tight text-stone-100">Kroma <span className="text-stone-400 font-normal">AI Separator</span></h1>
        </div>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-stone-200 transition-colors">
          MIT License
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 overflow-hidden">
        
        {!isFileLoaded ? (
          <div className="w-full max-w-2xl">
            <div className="mb-8 text-center space-y-3">
              <h2 className="text-3xl font-medium text-stone-100">Separa tu Música en Stems</h2>
              <p className="text-stone-400 text-lg max-w-lg mx-auto leading-relaxed">
                Sube cualquier archivo de audio y aíla las pistas de voz, batería, bajo y otros instrumentos de forma independiente.
              </p>
            </div>
            
            <label className={`
              flex flex-col items-center justify-center w-full h-80 
              border-2 border-dashed border-stone-700 rounded-3xl 
              cursor-pointer transition-all duration-300 ease-out
              ${isLoading ? 'bg-stone-900/50 cursor-wait' : 'hover:border-rose-500/50 hover:bg-stone-900 shadow-2xl shadow-black/50'}
            `}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isLoading ? (
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mb-6"></div>
                ) : (
                  <UploadCloud className="w-14 h-14 text-stone-400 mb-6 group-hover:text-rose-400 transition-colors" />
                )}
                <p className="mb-3 text-xl text-stone-300 font-medium">
                  {isLoading ? 'Analizando frecuencias con IA...' : 'Haz clic o arrastra tu audio aquí'}
                </p>
                <p className="text-stone-500">Soporta MP3, WAV, FLAC, OGG</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
            </label>
          </div>
        ) : (
          <div className="w-full max-w-5xl flex flex-col gap-8 h-full">
            
            {/* DAW Header Controls */}
            <div className="bg-stone-900 rounded-2xl p-6 lg:px-8 border border-stone-800 flex flex-col md:flex-row items-center gap-8 shadow-xl w-full">
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={handlePlayPause}
                  className="w-14 h-14 flex items-center justify-center bg-rose-500 hover:bg-rose-400 text-white rounded-full transition-colors shadow-lg shadow-rose-500/20 focus:outline-none focus:ring-4 focus:ring-rose-500/30"
                >
                  {isPlaying ? <Pause fill="currentColor" className="w-6 h-6" /> : <Play fill="currentColor" className="w-6 h-6 translate-x-0.5" />}
                </button>
                <button 
                  onClick={handleStop}
                  className="w-12 h-12 flex items-center justify-center bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-full transition-colors"
                >
                  <Square fill="currentColor" className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 flex flex-col w-full gap-3 pt-1">
                <div className="flex justify-between text-sm font-mono text-stone-400 font-medium">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="relative group">
                  <input 
                    type="range" 
                    min="0" 
                    max={duration} 
                    step="0.01"
                    value={currentTime}
                    onPointerDown={() => setIsSeeking(true)}
                    onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                    onPointerUp={async () => { 
                      await engine.seek(currentTime); 
                      setIsSeeking(false);
                    }}
                    className="w-full h-2.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none hover:bg-stone-700 transition-colors"
                  />
                  {/* Custom progress overlay */}
                  <div 
                    className="absolute top-0 left-0 h-2.5 bg-rose-500 rounded-l-lg pointer-events-none group-hover:bg-rose-400 transition-colors"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                </div>
              </div>

            </div>

            {/* Mixer Console */}
            <div className="flex-1 min-h-0 bg-[#0f0e0d] rounded-3xl border border-stone-800/80 p-8 overflow-hidden flex flex-col shadow-2xl relative">
              <div className="flex items-center gap-2 mb-10 text-stone-300">
                <AlignLeft className="w-5 h-5 text-stone-500" />
                <h3 className="font-semibold tracking-wide uppercase text-sm">Mezclador Principal</h3>
              </div>

              <div className="flex-1 flex justify-between gap-4 overflow-x-auto pb-4">
                {(Object.keys(volumes) as StemId[]).map((id) => (
                  <div key={id} className="flex flex-col items-center gap-6 w-full max-w-[120px]">
                    
                    {/* Meter / Slider Track */}
                    <div className="relative flex-1 w-16 bg-stone-900 rounded-xl border border-stone-800 flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] py-6 group">
                      
                      {/* Background Track line */}
                      <div className="absolute h-[85%] w-1 bg-stone-950 rounded pointer-events-none"></div>

                      <input 
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.01"
                        value={volumes[id]}
                        onChange={(e) => setVolumes({...volumes, [id]: parseFloat(e.target.value)})}
                        onDoubleClick={() => setVolumes({...volumes, [id]: 0.8})}
                        className="vertical-slider relative z-10 w-full h-full cursor-pointer accent-stone-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ appearance: 'slider-vertical', WebkitAppearance: 'slider-vertical' }}
                      />
                      
                      {/* Custom Fake Knob for aesthetics */}
                      <div 
                        className="absolute w-8 h-12 bg-stone-800 border border-stone-700 rounded-sm shadow-md pointer-events-none flex items-center justify-center"
                        style={{ bottom: `calc(${Math.min(100, (volumes[id] / 1.5) * 85)}% + 5px)` }}
                      >
                        <div className="w-4 h-0.5 bg-stone-300 rounded-full"></div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="flex gap-2 w-full justify-between">
                        <button 
                          onClick={() => setMutes({...mutes, [id]: !mutes[id]})}
                          className={`flex-1 py-1.5 rounded font-bold text-xs transition-all tracking-wider ${
                            mutes[id] 
                              ? 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                              : 'bg-stone-800 text-stone-500 hover:text-stone-300 hover:bg-stone-700'
                          }`}
                        >
                          M
                        </button>
                        <button 
                          onClick={() => setSolos({...solos, [id]: !solos[id]})}
                          className={`flex-1 py-1.5 rounded font-bold text-xs transition-all tracking-wider ${
                            solos[id] 
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]' 
                              : 'bg-stone-800 text-stone-500 hover:text-stone-300 hover:bg-stone-700'
                          }`}
                        >
                          S
                        </button>
                      </div>
                      
                      <div className="text-center w-full bg-stone-900 rounded-lg py-2 border border-stone-800 px-2 truncate">
                        <div className={`h-1.5 w-6 rounded-full mx-auto mb-2 ${STEM_COLORS[id]} opacity-80`}></div>
                        <span className="text-stone-200 font-medium text-xs tracking-wider uppercase">{STEM_LABELS[id]}</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
              
              <div className="absolute bottom-4 left-0 w-full flex justify-center pointer-events-none">
                <p className="px-6 py-2 rounded-full bg-stone-900 border border-stone-800 text-stone-500 text-[10px] tracking-wide uppercase">
                  Frontend Demo (API Simulation)
                </p>
              </div>

            </div>
            
            <div className="flex justify-center">
               <button 
                 onPointerUp={() => {
                   engine.close();
                   setIsFileLoaded(false);
                 }}
                 className="text-stone-500 hover:text-stone-300 transition-colors text-sm underline underline-offset-4"
               >
                 Cargar nueva pista
               </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
