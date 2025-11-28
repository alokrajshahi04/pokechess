
import React, { useState, useEffect } from 'react';
import { peerService } from '../utils/peerService';
import { toast } from 'react-hot-toast';
import { Copy } from 'lucide-react';

interface OnlineModalProps {
  onJoin: (isHost: boolean) => void;
  onCancel: () => void;
}

const OnlineModal: React.FC<OnlineModalProps> = ({ onJoin, onCancel }) => {
  const [step, setStep] = useState<'menu' | 'host' | 'join'>('menu');
  const [myId, setMyId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    peerService.getMyId().then(id => setMyId(id));
  }, []);

  useEffect(() => {
    peerService.onConnect(() => {
        setStatus("Connected!");
        toast.success("Opponent Connected!");
        setTimeout(() => onJoin(step === 'host'), 1000);
    });
  }, [onJoin, step]);

  const handleCopy = () => {
      navigator.clipboard.writeText(myId);
      toast.success("ID Copied!");
  };

  const handleConnect = () => {
      if(!targetId) return;
      setStatus("Connecting...");
      peerService.connect(targetId);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4">
      <div className="bg-gray-900 border-2 border-purple-500 rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
        <h2 className="text-xl font-pixel text-purple-400 mb-6 tracking-wide">Online Lobby</h2>

        {step === 'menu' && (
            <div className="grid gap-4">
                <button 
                    onClick={() => setStep('host')}
                    className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg flex flex-col items-center transition-colors"
                >
                    <span className="text-2xl mb-2">📡</span>
                    <span className="font-bold text-white">Host Game</span>
                    <span className="text-xs text-gray-400">Create a room and invite a friend</span>
                </button>
                <button 
                    onClick={() => setStep('join')}
                    className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg flex flex-col items-center transition-colors"
                >
                    <span className="text-2xl mb-2">🔗</span>
                    <span className="font-bold text-white">Join Game</span>
                    <span className="text-xs text-gray-400">Enter a friend's room code</span>
                </button>
            </div>
        )}

        {step === 'host' && (
            <div className="space-y-4">
                <p className="text-sm text-gray-300">Share this Code with your friend:</p>
                <div className="flex items-center gap-2 bg-gray-800 p-3 rounded border border-gray-600">
                    <code className="flex-grow text-yellow-400 font-mono text-lg">{myId || "Generating..."}</code>
                    <button onClick={handleCopy} className="text-gray-400 hover:text-white"><Copy size={20}/></button>
                </div>
                <div className="text-xs text-gray-500 animate-pulse mt-4">
                    {status || "Waiting for opponent..."}
                </div>
            </div>
        )}

        {step === 'join' && (
             <div className="space-y-4">
                <p className="text-sm text-gray-300">Enter Room Code:</p>
                <input 
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="paste code here..."
                    className="w-full bg-gray-800 border border-gray-600 p-3 rounded text-white font-mono text-center focus:border-purple-500 outline-none"
                />
                <button 
                    onClick={handleConnect}
                    disabled={!targetId}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold py-3 rounded shadow transition-transform active:scale-95"
                >
                    Connect
                </button>
                <div className="text-xs text-gray-500 mt-2">
                    {status}
                </div>
             </div>
        )}

        <button onClick={onCancel} className="mt-8 text-sm text-gray-500 hover:text-white underline">Cancel</button>
      </div>
    </div>
  );
};

export default OnlineModal;
