import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  onUnlock: () => void;
}

export default function SecretChannelBanner({ onUnlock }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState('');

  const handlePinSubmit = () => {
    if (pin === '0104') {
      onUnlock();
      setIsOpen(false);
      setPin('');
    } else {
      alert('Code PIN incorrect');
      setPin('');
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-r from-[#170505] via-[#1B0D0D] to-[#3C0000] p-6 lg:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="flex items-center gap-5 shrink-0 w-full md:w-auto">
          <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 p-3 flex items-center justify-center shadow-lg shrink-0">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-gradient-to-r from-red-600 to-rose-700 text-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md">ZONE SECURISEE</span>
              <h3 className="text-xl font-black text-white tracking-tight">Chaînes Privées (Adulte)</h3>
            </div>
            <p className="text-white/45 text-xs sm:text-sm font-medium mt-1 truncate">Accès restreint par code PIN.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full md:w-auto bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white font-black text-sm px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-red-600/30 active:scale-95 transition-all text-center cursor-pointer shrink-0"
        >
          Déverrouiller l'accès
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 w-full max-w-sm">
            <h3 className="text-xl font-black text-white mb-4">Entrez le code PIN</h3>
            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-2xl font-mono text-center mb-6"
              placeholder="••••"
            />
            <div className="flex gap-4">
              <button onClick={() => setIsOpen(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white">Annuler</button>
              <button onClick={handlePinSubmit} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold">Valider</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
