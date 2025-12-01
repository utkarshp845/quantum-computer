import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import { QuantumNode, EntanglementLink, ChatMessage, NodeType, GateType } from './types';
import { INITIAL_STATE, applyGate, measure, getProbability, getBlochCoordinates, formatComplex } from './utils/quantumEngine';

// --- Constants ---
const MAX_NODES = 20;
const MAX_LABEL_LENGTH = 20;

// --- Visual Components ---

const NodeComponent = React.memo(({ 
  node, 
  isSelected, 
  onClick 
}: { 
  node: QuantumNode; 
  isSelected: boolean; 
  onClick: (e: React.MouseEvent) => void 
}) => {
  
  // Physics-driven visualization
  const probability = getProbability(node.state); // 0 to 1
  const bloch = getBlochCoordinates(node.state);
  
  // Superposition check: if probability is roughly 0.5, it's highly uncertain
  const isSuperposition = probability > 0.1 && probability < 0.9;
  
  const getColors = () => {
    switch(node.type) {
      case 'person': return 'text-cyan-200 border-cyan-500 bg-cyan-950/50';
      case 'passion': return 'text-fuchsia-200 border-fuchsia-500 bg-fuchsia-950/50';
      case 'interest': return 'text-emerald-200 border-emerald-500 bg-emerald-950/50';
      case 'dream': return 'text-amber-200 border-amber-500 bg-amber-950/50';
      default: return 'text-slate-200 border-slate-500';
    }
  };

  const style = {
    left: node.x,
    top: node.y,
    transform: 'translate(-50%, -50%)',
    // Rotate visual based on quantum phase (Bloch X/Y)
    // Opacity based on probability of existence (|1>)
    opacity: 0.4 + (probability * 0.6) 
  };

  return (
    <div 
      onClick={onClick}
      style={style}
      className={`absolute cursor-pointer flex flex-col items-center justify-center transition-all duration-300 z-10 group select-none`}
    >
      {/* The Core Orb */}
      <div className={`
        relative w-16 h-16 rounded-full border-2 flex items-center justify-center backdrop-blur-md transition-all duration-500
        ${getColors()}
        ${isSelected ? 'scale-125 ring-4 ring-white/30 z-20 brightness-125' : 'hover:scale-110'}
        ${isSuperposition ? 'animate-pulse' : ''}
      `}
      style={{
          boxShadow: `0 0 ${10 + probability * 30}px currentColor`
      }}
      >
        <span className="text-xl opacity-90 group-hover:opacity-100 transition-opacity drop-shadow-md">
          {node.type === 'person' ? '👤' : node.type === 'passion' ? '❤️' : node.type === 'interest' ? '⚡' : '✨'}
        </span>
        
        {/* Orbital Rings representing Superposition */}
        {isSuperposition && (
             <div className="absolute inset-[-4px] rounded-full border border-white/20 animate-spin-slow pointer-events-none border-dashed" style={{ animationDuration: '3s' }}></div>
        )}
        
        {/* State Indicator Dot */}
        <div 
            className={`absolute top-0 right-0 w-3 h-3 rounded-full border border-black ${probability > 0.9 ? 'bg-white' : probability < 0.1 ? 'bg-slate-800' : 'bg-yellow-400'}`}
            title={`P(|1>) = ${(probability * 100).toFixed(0)}%`}
        />
      </div>

      {/* Label */}
      <span className={`mt-3 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-black/80 backdrop-blur border border-white/10 transition-colors duration-300 ${isSelected ? 'text-white border-white/30 bg-black' : 'text-slate-400 group-hover:text-slate-200'}`}>
        {node.label}
      </span>
      
      {/* Probability Label (Visible on Hover/Select) */}
      <div className={`absolute -bottom-6 text-[9px] font-mono text-fuchsia-300 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}>
          |ψ⟩: {(probability * 100).toFixed(0)}%
      </div>
    </div>
  );
});

const EntanglementLine = React.memo(({ 
  link,
  source, 
  target, 
  isSelected,
  onClick
}: { 
  link: EntanglementLink;
  source: QuantumNode; 
  target: QuantumNode; 
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) => {
  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;

  // Visual mapping for strength
  const width = Math.max(1, link.strength * 8);
  const glowWidth = Math.max(2, link.strength * 20);
  const opacity = 0.3 + (link.strength * 0.7);
  // Speed: 0.1 strength -> 5s duration (slow), 1.0 strength -> 0.5s duration (fast)
  const speed = 5 - (link.strength * 4.5); 
  
  // Dynamic color for stroke based on strength
  let strokeColor = "#94a3b8"; // Slate (Weak)
  if (link.strength > 0.3) strokeColor = "#818cf8"; // Indigo (Medium)
  if (link.strength > 0.7) strokeColor = "#e879f9"; // Fuchsia (Strong)
  if (link.strength > 0.9) strokeColor = "#ffffff"; // White hot (Max)

  return (
    <g onClick={onClick} className="cursor-pointer group">
       {/* Hit Area (Invisible, thicker for easier clicking) */}
       <line 
        x1={source.x} y1={source.y} 
        x2={target.x} y2={target.y} 
        stroke="transparent" 
        strokeWidth="30" 
      />

      {/* Outer Glow */}
      <line 
        x1={source.x} y1={source.y} 
        x2={target.x} y2={target.y} 
        stroke={isSelected ? "#ffffff" : strokeColor} 
        strokeWidth={glowWidth} 
        strokeLinecap="round"
        className={`transition-all duration-300 blur-md ${isSelected ? 'opacity-60' : 'opacity-20'}`}
      />
      
      {/* Base Line */}
      <line 
        x1={source.x} y1={source.y} 
        x2={target.x} y2={target.y} 
        stroke={strokeColor} 
        strokeWidth={width} 
        strokeOpacity={opacity * 0.5}
        strokeLinecap="round"
        className="transition-all duration-300"
      />

      {/* Energy Beam (Animated) */}
      <line 
        x1={source.x} y1={source.y} 
        x2={target.x} y2={target.y} 
        stroke={link.strength > 0.8 ? "url(#gradient-beam-intense)" : "url(#gradient-beam)"} 
        strokeWidth={width} 
        strokeOpacity={opacity}
        strokeLinecap="round"
        className="beam-flow transition-all duration-300 pointer-events-none"
        style={{ animationDuration: `${speed}s` }} 
      />

      {/* Midpoint Handle */}
      <circle 
        cx={midX} cy={midY} 
        r={isSelected ? 6 : (link.strength * 4)}
        className={`transition-all duration-300 ${isSelected ? 'fill-white stroke-fuchsia-500' : 'fill-black stroke-white/30 group-hover:stroke-white/80'}`}
        strokeWidth={2}
      />
    </g>
  );
});

// --- Main App ---

const App = () => {
  // State
  const [nodes, setNodes] = useState<QuantumNode[]>([]);
  const [links, setLinks] = useState<EntanglementLink[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null); 
  
  // Modal State
  const [isCreating, setIsCreating] = useState<{x: number, y: number} | null>(null);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('interest');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI State
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize AI
  useEffect(() => {
    if (process.env.API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    setHistory([{
      role: 'model',
      text: "I am the OMNISCIENT ARCHITECT. The void is empty. Manifest your reality components. Apply quantum gates to alter their probability. Measure them to fix their fate.",
      timestamp: Date.now()
    }]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isComputing]);

  // --- Actions ---

  const handleCanvasClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Ensure we are clicking the background, not a node/link
    if (target.id === 'quantum-void' || target.tagName === 'svg') {
      setSelectedNodeId(null);
      setSelectedLinkId(null);
      
      const rect = document.getElementById('quantum-void')?.getBoundingClientRect();
      if (rect) {
          // Limit creation near edges
          const x = Math.max(50, Math.min(e.clientX - rect.left, rect.width - 50));
          const y = Math.max(50, Math.min(e.clientY - rect.top, rect.height - 50));
          
          setIsCreating({ x, y });
          setNewNodeLabel('');
          setErrorMsg(null);
      }
    }
  };

  const createNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCreating) return;

    // Validation
    const label = newNodeLabel.trim();
    if (!label) {
      setErrorMsg("Identity cannot be void.");
      return;
    }
    if (label.length > MAX_LABEL_LENGTH) {
      setErrorMsg(`Identity too complex (max ${MAX_LABEL_LENGTH} chars).`);
      return;
    }
    if (nodes.length >= MAX_NODES) {
      setErrorMsg("Universe saturation reached (Max nodes).");
      return;
    }

    const newNode: QuantumNode = {
      id: crypto.randomUUID(),
      label: label,
      type: newNodeType,
      x: isCreating.x,
      y: isCreating.y,
      phase: Math.random() * 2,
      state: INITIAL_STATE // Start at |0>
    };

    setNodes(prev => [...prev, newNode]);
    setIsCreating(null);
    setErrorMsg(null);
  };

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    // Remove entangled links
    setLinks(prev => prev.filter(l => l.sourceId !== id && l.targetId !== id));
    setSelectedNodeId(null);
  }, []);

  // --- Quantum Operations ---

  const applyNodeGate = (gate: GateType) => {
      if (!selectedNodeId) return;
      setNodes(prev => prev.map(n => {
          if (n.id === selectedNodeId) {
              return { ...n, state: applyGate(n.state, gate) };
          }
          return n;
      }));
  };

  const measureNode = () => {
      if (!selectedNodeId) return;
      const node = nodes.find(n => n.id === selectedNodeId);
      if (!node) return;

      const { collapsedState, outcome } = measure(node.state);
      
      setNodes(prev => prev.map(n => {
          if (n.id === selectedNodeId) {
              return { ...n, state: collapsedState };
          }
          return n;
      }));

      // Narrative feedback
      const outcomeText = outcome === 1 ? "MANIFESTED (Excited State |1>)" : "DORMANT (Ground State |0>)";
      const userMsg: ChatMessage = {
          role: 'user',
          text: `SYSTEM ALERT: Observer collapsed wavefunction of [${node.label}]. Result: ${outcomeText}.`,
          timestamp: Date.now()
      };
      setHistory(prev => [...prev, userMsg]);
      
      // Trigger short AI reaction?
      // For now, just logging to history is cleaner to avoid spamming the AI API.
  };

  const handleNodeClick = useCallback((e: React.MouseEvent, node: QuantumNode) => {
    e.stopPropagation();
    setIsCreating(null);
    setSelectedLinkId(null); 
    
    setSelectedNodeId(prevSelected => {
        if (prevSelected === null) {
            return node.id;
        } else if (prevSelected === node.id) {
            return null; // Toggle off
        } else {
            return prevSelected; 
        }
    });

    if (selectedNodeId === null) {
        setSelectedNodeId(node.id);
    } else if (selectedNodeId === node.id) {
        setSelectedNodeId(null);
    } else {
        // We have a source node selected, and clicked a target node
        const existingLinkIndex = links.findIndex(l => 
            (l.sourceId === selectedNodeId && l.targetId === node.id) ||
            (l.sourceId === node.id && l.targetId === selectedNodeId)
        );

        if (existingLinkIndex === -1) {
            // New Link
            setLinks(prev => [...prev, { sourceId: selectedNodeId, targetId: node.id, strength: 0.5 }]);
            setSelectedNodeId(null); // Clear selection after linking
        } else {
            // Select existing link
            const link = links[existingLinkIndex];
            setSelectedLinkId(`${link.sourceId}-${link.targetId}`);
            setSelectedNodeId(null);
        }
    }
  }, [links, selectedNodeId]);

  const handleLinkClick = useCallback((e: React.MouseEvent, link: EntanglementLink) => {
      e.stopPropagation();
      setIsCreating(null);
      setSelectedNodeId(null);
      setSelectedLinkId(`${link.sourceId}-${link.targetId}`);
  }, []);

  const updateLinkStrength = (val: number) => {
      if (!selectedLinkId) return;
      setLinks(prev => prev.map(l => {
          const id = `${l.sourceId}-${l.targetId}`;
          const reverseId = `${l.targetId}-${l.sourceId}`;
          if (id === selectedLinkId || reverseId === selectedLinkId) {
              return { ...l, strength: val };
          }
          return l;
      }));
  };

  const deleteLink = () => {
    if (!selectedLinkId) return;
    setLinks(prev => prev.filter(l => {
        const id = `${l.sourceId}-${l.targetId}`;
        const reverseId = `${l.targetId}-${l.sourceId}`;
        return id !== selectedLinkId && reverseId !== selectedLinkId;
    }));
    setSelectedLinkId(null);
  };

  const clearAll = () => {
      if(confirm("WARNING: ENTROPY RESET IMMINENT. This will purge all data from the current universe. Proceed?")) {
          setNodes([]);
          setLinks([]);
          setSelectedNodeId(null);
          setSelectedLinkId(null);
          setHistory(prev => [...prev, {
              role: 'model',
              text: "SYSTEM PURGED. THE VOID IS CLEAN. BEGIN AGAIN.",
              timestamp: Date.now()
          }]);
      }
  }

  const collapseWavefunction = async () => {
    if (nodes.length === 0) return;
    setIsComputing(true);
    
    // Construct Graph
    const graphDesc = nodes.map(n => {
        const p = getProbability(n.state).toFixed(2);
        return `- [${n.type.toUpperCase()}] ${n.label} (Probability of Manifestation: ${p})`;
    }).join('\n');

    const linksDesc = links.map(l => {
      const s = nodes.find(n => n.id === l.sourceId);
      const t = nodes.find(n => n.id === l.targetId);
      
      let strengthDesc = "Tenuous (Weak)";
      if (l.strength > 0.4) strengthDesc = "Established (Medium)";
      if (l.strength > 0.8) strengthDesc = "ABSOLUTE (Unbreakable)";

      return s && t ? `${s.label} <---[${strengthDesc}]---> ${t.label}` : '';
    }).filter(Boolean).join('\n');

    const prompt = `
      You are the QUANTUM ARCHITECT of this user's reality.
      
      DATA INPUT (QUANTUM STATES):
      ${graphDesc}
      
      ENTANGLEMENTS:
      ${linksDesc || "No entanglement detected. Elements act in isolation."}
      
      DIRECTIVE:
      Analyze this configuration with ABSOLUTE AUTHORITY. 
      1. **Voice**: Commanding, Powerful, Final. Use words like "INEVITABLE", "REQUIRED", "DESTINED".
      2. **Strength Analysis**: Note which nodes are in "Superposition" (Prob ~0.5) vs "Manifested" (Prob ~1.0).
      3. **Output Structure**:
         - **REALITY DESIGNATION**: [Sci-fi/Mystic Title]
         - **CORE DIRECTIVE**: [One imperative sentence]
         - **ENTROPY ANALYSIS**: [Deep analysis of the connections and quantum states]
      
      Format with bolding for impact. Keep concise.
    `;

    try {
        const model = aiRef.current?.models;
        if (!model) throw new Error("AI not initialized");

        const response = await model.generateContent({
            model: 'gemini-2.5-flash',
            config: {
                temperature: 1.0, 
                maxOutputTokens: 500, // Security cap
            },
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const text = response.text || "Probability cloud too dense. Recalculate.";
        setHistory(prev => [...prev, { role: 'model', text, timestamp: Date.now(), isComputation: true }]);
    } catch (e) {
        setHistory(prev => [...prev, { role: 'model', text: "ERROR: CRITICAL ENTROPY FAILURE. CHECK CONNECTION.", timestamp: Date.now() }]);
    } finally {
        setIsComputing(false);
    }
  };

  // Helpers for UI Popups
  const getSelectedLinkObj = useMemo(() => {
      if (!selectedLinkId) return null;
      return links.find(l => `${l.sourceId}-${l.targetId}` === selectedLinkId || `${l.targetId}-${l.sourceId}` === selectedLinkId);
  }, [links, selectedLinkId]);

  const getLinkMidpoint = useMemo(() => {
      if (!getSelectedLinkObj) return { x: 0, y: 0 };
      const l = getSelectedLinkObj;
      if (!l) return { x: 0, y: 0 };
      const s = nodes.find(n => n.id === l.sourceId);
      const t = nodes.find(n => n.id === l.targetId);
      if (!s || !t) return { x: 0, y: 0 };
      return { x: (s.x + t.x) / 2, y: (s.y + t.y) / 2 };
  }, [nodes, getSelectedLinkObj]);

  const selectedNodeObj = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);

  return (
    <div className="flex h-screen w-full bg-black text-slate-200 overflow-hidden relative selection:bg-fuchsia-500/30 font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,24,39,1)_0%,_rgba(0,0,0,1)_100%)] z-0 pointer-events-none" />
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* --- LEFT: The Void (Canvas) --- */}
      <div className="relative flex-grow h-full overflow-hidden cursor-crosshair touch-none" id="quantum-void" onClick={handleCanvasClick}>
        
        {/* SVG Layer for Links */}
        <svg className="absolute inset-0 w-full h-full z-0 pointer-events-auto overflow-visible">
          <defs>
            <linearGradient id="gradient-beam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="gradient-beam-intense" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>
          {links.map((link) => {
            const s = nodes.find(n => n.id === link.sourceId);
            const t = nodes.find(n => n.id === link.targetId);
            if (!s || !t) return null;
            const isSelected = selectedLinkId === `${link.sourceId}-${link.targetId}` || selectedLinkId === `${link.targetId}-${link.sourceId}`;
            return (
                <EntanglementLine 
                    key={`${link.sourceId}-${link.targetId}`} 
                    link={link} 
                    source={s} 
                    target={t} 
                    isSelected={isSelected}
                    onClick={(e) => handleLinkClick(e, link)}
                />
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {nodes.map(node => (
          <NodeComponent 
            key={node.id} 
            node={node} 
            isSelected={selectedNodeId === node.id}
            onClick={(e) => handleNodeClick(e, node)}
          />
        ))}

        {/* Node Creation Modal */}
        {isCreating && (
          <div 
            className="absolute z-50 glass-panel p-4 rounded-xl shadow-2xl border border-indigo-500/30 w-72 animate-in fade-in zoom-in duration-200"
            style={{ left: isCreating.x, top: isCreating.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xs font-bold text-indigo-400 mb-2 uppercase tracking-widest flex justify-between">
                <span>Manifest Entity</span>
                <span className="text-slate-600">{nodes.length}/{MAX_NODES}</span>
            </h3>
            <form onSubmit={createNode}>
              <div className="relative mb-3">
                <input 
                    autoFocus
                    type="text" 
                    value={newNodeLabel}
                    onChange={e => {
                        if (e.target.value.length <= MAX_LABEL_LENGTH) {
                            setNewNodeLabel(e.target.value);
                            setErrorMsg(null);
                        }
                    }}
                    placeholder="Name (e.g. 'Astrophysics')"
                    className={`w-full bg-black/50 border rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 transition-all ${errorMsg ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'}`}
                />
                <div className="text-[10px] text-slate-500 text-right mt-1">{newNodeLabel.length}/{MAX_LABEL_LENGTH}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(['person', 'passion', 'interest', 'dream'] as NodeType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewNodeType(t)}
                    className={`text-[10px] uppercase font-bold py-1.5 rounded border transition-all ${newNodeType === t ? 'bg-indigo-900 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:bg-slate-900'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {errorMsg && (
                  <div className="text-red-400 text-xs mb-3 font-mono border-l-2 border-red-500 pl-2">
                      ⚠ {errorMsg}
                  </div>
              )}

              <div className="flex gap-2">
                <button 
                    type="button" 
                    onClick={() => setIsCreating(null)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded transition-colors"
                >
                    CANCEL
                </button>
                <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded transition-colors shadow-lg shadow-indigo-500/20"
                >
                    INITIALIZE
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Selected Node Controls (Quantum Gates + Edit) */}
        {selectedNodeObj && !isCreating && (
            <div 
                className="absolute z-50 glass-panel p-3 rounded-lg shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200 flex flex-col gap-3 min-w-[180px]"
                style={{ 
                    left: selectedNodeObj.x, 
                    top: selectedNodeObj.y,
                    transform: 'translate(-50%, -130%)' // Float above
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Coordinates */}
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-white/10 w-full flex justify-between pb-1">
                    <span>{selectedNodeObj.label}</span>
                    <span className="font-mono text-fuchsia-400">P:{getProbability(selectedNodeObj.state).toFixed(2)}</span>
                </div>

                {/* Quantum Gate Array */}
                <div className="grid grid-cols-4 gap-1">
                    {(['H', 'X', 'Y', 'Z'] as GateType[]).map(gate => (
                        <button
                            key={gate}
                            onClick={() => applyNodeGate(gate)}
                            className="bg-slate-800 hover:bg-indigo-600 text-slate-200 text-[10px] font-bold py-1.5 rounded border border-slate-700 transition-colors"
                            title={`Apply ${gate} Gate`}
                        >
                            {gate}
                        </button>
                    ))}
                </div>

                {/* Measurement Button */}
                <button 
                    onClick={measureNode}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-[10px] font-bold py-1.5 rounded border border-amber-500/50 transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                >
                    OBSERVE / COLLAPSE
                </button>
                
                {/* Delete Button */}
                <button 
                    onClick={() => deleteNode(selectedNodeObj.id)}
                    className="flex items-center gap-2 text-red-400 hover:text-red-200 hover:bg-red-950/50 px-2 py-1 rounded w-full justify-center transition-colors text-[10px] font-bold"
                >
                    ERASE ENTITY
                </button>

                <div className="text-[9px] text-slate-600 text-center w-full italic">
                    α: {formatComplex(selectedNodeObj.state.alpha)} | β: {formatComplex(selectedNodeObj.state.beta)}
                </div>
            </div>
        )}

        {/* Link Editing Modal */}
        {getSelectedLinkObj && (
            <div 
                className="absolute z-50 glass-panel p-3 rounded-xl shadow-2xl border border-fuchsia-500/30 w-64 animate-in fade-in zoom-in duration-200"
                style={{ 
                    left: getLinkMidpoint.x, 
                    top: getLinkMidpoint.y,
                    transform: 'translate(-50%, -120%)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest">Entanglement</h3>
                    <button onClick={() => setSelectedLinkId(null)} className="text-slate-500 hover:text-white">×</button>
                </div>
                
                <div className="flex flex-col gap-1 mb-3">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>WEAK</span>
                        <span>STRONG</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.1" max="1.0" step="0.05"
                        value={getSelectedLinkObj.strength}
                        onChange={(e) => updateLinkStrength(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                    />
                    <div className="text-center text-xs font-bold text-white mt-1">
                        {(getSelectedLinkObj.strength * 100).toFixed(0)}% RESONANCE
                    </div>
                </div>
                
                <button 
                    onClick={deleteLink}
                    className="w-full bg-red-950/50 hover:bg-red-900/80 border border-red-900 text-red-200 text-xs font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-2"
                >
                    SEVER CONNECTION
                </button>
            </div>
        )}

        {/* Floating Instructions */}
        <div className="absolute bottom-8 left-8 pointer-events-none select-none space-y-2 opacity-50 hover:opacity-100 transition-opacity">
          <div className="text-slate-500 text-[10px] font-mono border-l-2 border-slate-700 pl-3">
              <p className="mb-1"><strong className="text-slate-300">CLICK VOID</strong> :: MANIFEST</p>
              <p className="mb-1"><strong className="text-slate-300">CLICK NODE</strong> :: GATE OPS</p>
              <p><strong className="text-slate-300">GATES (H)</strong> :: SUPERPOSITION</p>
              <p><strong className="text-slate-300">MEASURE</strong> :: COLLAPSE STATE</p>
          </div>
        </div>
      </div>

      {/* --- RIGHT: The Observer (Chat/Results) --- */}
      <div className="w-96 glass-panel border-l border-slate-800 flex flex-col z-20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-black/40">
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400 tracking-tighter">
                QUANTUM ENTANGLER
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Reality Computation Engine</p>
          </div>
          <button 
            onClick={clearAll}
            title="Reset Universe"
            className="text-[10px] font-bold text-red-400 hover:text-white border border-red-900 hover:bg-red-600 bg-red-950/30 px-3 py-1.5 rounded transition-all uppercase tracking-wider"
          >
             Reset
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {history.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`
                max-w-full p-4 rounded-lg text-sm leading-relaxed border backdrop-blur-sm
                ${msg.isComputation 
                    ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-100 shadow-[0_0_20px_rgba(99,102,241,0.05)] font-mono' 
                    : msg.role === 'user' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-400 italic'}
              `}>
                {msg.text.split('\n').map((line, idx) => {
                    const isHeader = line.includes('CORE DIRECTIVE') || line.includes('REALITY DESIGNATION');
                    return (
                        <p key={idx} className={isHeader ? 'font-bold text-fuchsia-300 my-3 uppercase tracking-wide border-b border-fuchsia-500/20 pb-1' : 'mb-1'}>
                            {line}
                        </p>
                    );
                })}
              </div>
            </div>
          ))}
          {isComputing && (
             <div className="flex flex-col items-center justify-center py-8 text-indigo-400 space-y-3">
               <div className="relative">
                   <div className="w-10 h-10 border-4 border-indigo-500/30 rounded-full"></div>
                   <div className="absolute top-0 left-0 w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
               </div>
               <span className="text-[10px] animate-pulse tracking-[0.2em] font-bold text-indigo-300">COLLAPSING WAVEFUNCTION...</span>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-800/50 bg-black/20">
            {nodes.length > 1 ? (
                <button 
                    onClick={collapseWavefunction}
                    disabled={isComputing}
                    className="w-full group relative overflow-hidden rounded-lg bg-indigo-600 p-4 transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
                >
                    <div className="relative z-10 flex items-center justify-center gap-2 font-bold text-white tracking-widest text-sm">
                        <span>COMPUTE REALITY</span>
                        <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    {/* Button Glow Effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0" />
                </button>
            ) : (
                <div className="text-center text-xs text-slate-500 py-4 border border-slate-800/50 bg-slate-900/20 rounded-lg border-dashed">
                    Add & Entangle at least 2 entities
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);