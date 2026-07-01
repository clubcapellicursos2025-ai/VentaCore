"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Zap, ShieldCheck, ArrowRight, Activity, Database, Award, Crown, Star } from "lucide-react";

const STEPS = [
  { progress: 20, text: "Inicializando motor 3D de Inteligencia Comercial...", icon: Activity },
  { progress: 50, text: "Conectando con Supabase y seguridad RLS Multi-Tenant...", icon: Database },
  { progress: 80, text: "Sincronizando carteras KeyNort, L'Oréal y Wella...", icon: Zap },
  { progress: 100, text: "¡Sistema optimizado y listo para operar en calle!", icon: ShieldCheck },
];

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem("ventacore_splash_flow_v1");
    if (!alreadyShown) {
      setVisible(true);
      sessionStorage.setItem("ventacore_splash_flow_v1", "true");
    }

    const handleReplay = () => {
      setFadeOut(false);
      setStepIndex(0);
      setProgress(0);
      setVisible(true);
    };
    window.addEventListener("replay-splash", handleReplay);
    return () => window.removeEventListener("replay-splash", handleReplay);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(() => setVisible(false), 700);
          }, 450);
          return 100;
        }
        const next = prev + 2;
        if (next >= STEPS[3].progress) setStepIndex(3);
        else if (next >= STEPS[2].progress) setStepIndex(2);
        else if (next >= STEPS[1].progress) setStepIndex(1);
        else setStepIndex(0);
        return next;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [visible]);

  const handleSkip = () => {
    setFadeOut(true);
    setTimeout(() => setVisible(false), 500);
  };

  if (!visible) return null;

  const CurrentIcon = STEPS[stepIndex]?.icon || Sparkles;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-3xl transition-opacity duration-700 select-none overflow-hidden ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Dynamic Background Neon Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/25 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Constelación de Marcas Orbitantes */}
      <div className="absolute inset-0 max-w-4xl mx-auto pointer-events-none flex items-center justify-center">
        <div className="absolute -top-12 md:top-12 left-6 md:left-12 bg-slate-900/80 border border-blue-500/30 px-3.5 py-1.5 rounded-full shadow-lg shadow-blue-500/10 flex items-center gap-2 animate-bounce" style={{ animationDuration: "4s" }}>
          <Star className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">KeyNort FullStock</span>
        </div>
        <div className="absolute -bottom-12 md:bottom-16 left-12 md:left-24 bg-slate-900/80 border border-amber-500/30 px-3.5 py-1.5 rounded-full shadow-lg shadow-amber-500/10 flex items-center gap-2 animate-bounce" style={{ animationDuration: "5s", animationDelay: "0.5s" }}>
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">L&apos;Oréal Matrix</span>
        </div>
        <div className="absolute top-1/3 right-6 md:right-16 bg-slate-900/80 border border-purple-500/30 px-3.5 py-1.5 rounded-full shadow-lg shadow-purple-500/10 flex items-center gap-2 animate-bounce" style={{ animationDuration: "4.5s", animationDelay: "1s" }}>
          <Award className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">Wella Farmavita</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
        {/* Isotipo 3D Luminous Reveal */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-6 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600 rounded-[38px] blur-2xl opacity-80 animate-spin" style={{ animationDuration: "10s" }} />
          <div className="relative w-28 h-28 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-cyan-500/40 rounded-[32px] flex items-center justify-center shadow-[0_0_50px_rgba(34,211,238,0.25)] overflow-hidden">
            {/* Destello / haz de luz cruzando el logo */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            
            <div className="relative flex flex-col items-center">
              <span className="text-5xl font-black bg-gradient-to-b from-white via-cyan-200 to-cyan-500 bg-clip-text text-transparent drop-shadow-md">
                V
              </span>
              <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400 -mt-1">
                CORE
              </span>
            </div>
          </div>
        </div>

        {/* Título Principal con Efecto Brillo */}
        <div className="space-y-2 mb-8">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Venta<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Core</span>
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] uppercase tracking-[0.2em] font-bold text-slate-300 shadow-sm">
            <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Inteligencia Comercial Multi-Marca</span>
          </div>
        </div>

        {/* Caja de Estado en Tiempo Real */}
        <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-2xl mb-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-left mb-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400 shadow-inner">
              <CurrentIcon className="w-4 h-4 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-100 truncate">
                {STEPS[stepIndex]?.text}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                <span className="font-medium">Fase de Inicio {stepIndex + 1} de 4</span>
                <span className="font-mono font-black text-cyan-400">{progress}%</span>
              </div>
            </div>
          </div>

          {/* Barra de Progreso Neón 3D */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 rounded-full transition-all duration-75 shadow-[0_0_15px_rgba(34,211,238,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Botón para saltar */}
        <button
          onClick={handleSkip}
          className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/30 text-xs font-medium text-slate-400 hover:text-white transition-all shadow-sm"
        >
          <span>Saltar intro e ir al sistema</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-cyan-400" />
        </button>
      </div>

      {/* Pie de página discreto */}
      <div className="absolute bottom-6 text-[11px] text-slate-500 font-mono tracking-widest flex items-center gap-2">
        <span>SYS.VER 2.5</span>
        <span>•</span>
        <span className="text-cyan-400 font-semibold">MULTI-BRAND ENGINE ACTIVE</span>
      </div>
    </div>
  );
}
