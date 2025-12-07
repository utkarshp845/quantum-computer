import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { QuantumNode, EntanglementLink, ChatMessage, NodeType, GateType } from './types';
import { INITIAL_STATE, applyGate, measure, getProbability, getBlochCoordinates, formatComplex } from './utils/quantumEngine';
import { errorTracker } from './utils/errorTracker';
import { analytics } from './utils/analytics';
import { circuitBreaker } from './utils/circuitBreaker';

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

// Typewriter effect hook
const useTypewriter = (text: string, speed: number = 30, enabled: boolean = true) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);
    let currentIndex = 0;

    const typeInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typeInterval);
      }
    }, speed);

    return () => clearInterval(typeInterval);
  }, [text, speed, enabled]);

  return { displayedText, isTyping };
};

// Message component with typewriter effect
const ComputationMessage = React.memo(({ 
  msg, 
  isLatest, 
  index 
}: { 
  msg: ChatMessage; 
  isLatest: boolean;
  index: number;
}) => {
  const { displayedText, isTyping } = useTypewriter(msg.text, 20, isLatest && msg.isComputation);
  const textToDisplay = isLatest && msg.isComputation ? displayedText : msg.text;

  return (
    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2`}>
      <div className={`
        max-w-full p-5 rounded-xl text-sm leading-relaxed border backdrop-blur-sm
        ${msg.isComputation 
            ? 'bg-gradient-to-br from-indigo-950/60 via-purple-950/50 to-fuchsia-950/60 border-2 border-indigo-400/60 text-indigo-50 shadow-[0_0_40px_rgba(99,102,241,0.4),0_0_80px_rgba(168,85,247,0.3),0_0_120px_rgba(139,92,246,0.2)] font-sans' 
            : msg.role === 'user' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-400 italic'}
      `}>
        {textToDisplay.split('\n').map((line, idx) => {
          const isHeader = line.includes('CORE INSIGHT') || line.includes('CORE DIRECTIVE') || line.includes('REALITY DESIGNATION') || line.includes('QUANTUM DISCOVERIES') || line.includes('ENTROPY ANALYSIS') || line.includes('YOUR QUANTUM JOURNEY') || line.includes('THE REVELATIONS I SEE') || line.includes('YOUR NEXT QUANTUM LEAP');
          const isBold = line.includes('**') || line.match(/^[A-Z\s]+:$/);
          const cleanLine = line.replace(/\*\*/g, '');
          
          if (isHeader) {
            return (
              <div key={idx} className="my-5 first:mt-0 animate-in fade-in slide-in-from-top-2">
                <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-200 via-purple-200 to-pink-200 text-lg uppercase tracking-wider mb-3 drop-shadow-[0_0_12px_rgba(236,72,153,0.6),0_0_24px_rgba(168,85,247,0.4)]">
                  {cleanLine}
                </h3>
                <div className="h-0.5 bg-gradient-to-r from-transparent via-fuchsia-400/60 via-purple-400/60 to-transparent shadow-[0_0_8px_rgba(236,72,153,0.4)]"></div>
              </div>
            );
          }
          
          if (isBold || line.trim().startsWith('-')) {
            return (
              <p key={idx} className="font-semibold text-indigo-100 mb-3 leading-relaxed drop-shadow-[0_0_4px_rgba(99,102,241,0.3)]">
                {cleanLine}
              </p>
            );
          }
          
          return (
            <p key={idx} className="mb-3 leading-relaxed text-indigo-50/95 drop-shadow-[0_0_2px_rgba(99,102,241,0.2)]">
              {cleanLine}
              {/* Show typing cursor on last line of latest computation while typing */}
              {isLatest && msg.isComputation && isTyping && idx === textToDisplay.split('\n').length - 1 && (
                <span className="typing-cursor text-fuchsia-300"></span>
              )}
            </p>
          );
        })}
        {/* Show typing cursor at end if still typing and no newline at end */}
        {isLatest && msg.isComputation && isTyping && !textToDisplay.endsWith('\n') && (
          <span className="typing-cursor text-fuchsia-300"></span>
        )}
      </div>
    </div>
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isRightPanelExpanded, setIsRightPanelExpanded] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState(384); // 96 * 4 = 384px (w-96)

  // AI State
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastApiCallRef = useRef<number>(0);
  const apiCallCountRef = useRef<number>(0);
  const rateLimitWindowRef = useRef<number>(Date.now());
  
  // Rate limiting constants - Production-friendly limits
  // Note: These are client-side limits. OpenRouter API has its own rate limits.
  const MAX_CALLS_PER_MINUTE = 20; // Increased for production users
  const MIN_TIME_BETWEEN_CALLS = 2000; // 2 seconds minimum (increased to avoid API rate limits)
  const RATE_LIMIT_WINDOW = 60000; // 1 minute window

  // Initialize AI - Using OpenRouter (cost-effective, browser-compatible)
  useEffect(() => {
    // Track app initialization
    analytics.track('app_loaded', {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    });
    
    // Global error handler
    window.addEventListener('error', (event) => {
      errorTracker.logError(event.error || new Error(event.message), {
        message: event.message,
      });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      errorTracker.logError(new Error(event.reason?.message || 'Unhandled promise rejection'), {
        message: event.reason?.message || String(event.reason),
      });
    });
    
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      setHistory(prev => [...prev, {
        role: 'model',
        text: "WARNING: OpenRouter API key not configured. AI features will not work. Add OPENROUTER_API_KEY to .env.local",
        timestamp: Date.now()
      }]);
    }
    setHistory([{
      role: 'model',
      text: "I am the Omniscient Architect. The void is empty. Manifest your reality components. Apply quantum gates to alter their probability. Measure them to fix their fate.",
      timestamp: Date.now()
    }]);
    
    // Start health monitoring
    healthChecker.checkHealth().catch(console.error);
    healthChecker.startPeriodicChecks(60000); // Check every minute
    
    // Cleanup on unmount
    return () => {
      healthChecker.stopPeriodicChecks();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isComputing]);

  // Rate limit cooldown timer - automatically counts down and resets rate limit when expired
  useEffect(() => {
    if (rateLimitCooldown > 0) {
      const timer = setInterval(() => {
        setRateLimitCooldown(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            // When cooldown expires, reset the rate limit window and counter
            const now = Date.now();
            rateLimitWindowRef.current = now;
            apiCallCountRef.current = 0;
            return 0;
          }
          return newValue;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [rateLimitCooldown]);

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
    
    // Track analytics
    analytics.trackNodeCreated(newNodeType);
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
      
      // Track analytics
      analytics.trackGateApplied(gate);
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
        // We have a source node selected, and clicked a target node
        const existingLinkIndex = links.findIndex(l => 
                (l.sourceId === prevSelected && l.targetId === node.id) ||
                (l.sourceId === node.id && l.targetId === prevSelected)
        );

            if (existingLinkIndex === -1) {
                // New Link
                setLinks(prev => [...prev, { sourceId: prevSelected, targetId: node.id, strength: 0.5 }]);
                analytics.trackEntanglementCreated();
                return null; // Clear selection after linking
        } else {
            // Select existing link
            const link = links[existingLinkIndex];
            setSelectedLinkId(`${link.sourceId}-${link.targetId}`);
                return null;
        }
    }
    });
  }, [links]);

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

  // Rate limiting check - Production-friendly with first-call exception
  const checkRateLimit = (): { allowed: boolean; message?: string } => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallRef.current;
    
    // Allow first call immediately (no rate limit for first-time users)
    const isFirstCall = lastApiCallRef.current === 0;
    
    // Reset counter if window expired (this handles the case where user waits)
    if (now - rateLimitWindowRef.current > RATE_LIMIT_WINDOW) {
      apiCallCountRef.current = 0;
      rateLimitWindowRef.current = now;
      setRateLimitCooldown(0); // Clear cooldown when window resets
    }
    
    // Check if cooldown is still active (from previous rate limit hit)
    if (rateLimitCooldown > 0 && !isFirstCall) {
      return { 
        allowed: false, 
        message: `Rate limit cooldown active. Please wait ${rateLimitCooldown} second${rateLimitCooldown > 1 ? 's' : ''} before trying again.` 
      };
    }
    
    // Skip minimum time check for first call
    if (!isFirstCall && timeSinceLastCall < MIN_TIME_BETWEEN_CALLS) {
      const remaining = Math.ceil((MIN_TIME_BETWEEN_CALLS - timeSinceLastCall) / 1000);
      return { 
        allowed: false, 
        message: `Please wait ${remaining} second${remaining > 1 ? 's' : ''} before another computation.` 
      };
    }
    
    // Check calls per minute (allow first call even if somehow count is high)
    if (!isFirstCall && apiCallCountRef.current >= MAX_CALLS_PER_MINUTE) {
      const windowElapsed = now - rateLimitWindowRef.current;
      const remaining = Math.ceil((RATE_LIMIT_WINDOW - windowElapsed) / 1000);
      setRateLimitCooldown(remaining);
      return { 
        allowed: false, 
        message: `Rate limit reached (${MAX_CALLS_PER_MINUTE} calls per minute). Please wait ${remaining} second${remaining > 1 ? 's' : ''} before trying again.` 
      };
    }
    
    return { allowed: true };
  };

  const collapseWavefunction = useCallback(async () => {
    if (nodes.length === 0) {
      console.warn('Cannot compute: no nodes');
      return;
    }
    
    // Debug: Check API key availability
    const apiKeyCheck = import.meta.env.VITE_OPENROUTER_API_KEY;
    console.log('🔍 API Key Debug:', {
      exists: !!apiKeyCheck,
      length: apiKeyCheck?.length || 0,
      preview: apiKeyCheck ? `${apiKeyCheck.substring(0, 10)}...` : 'NOT SET',
      fullEnv: import.meta.env
    });
    
    console.log('Compute Reality clicked', { nodeCount: nodes.length });
    
    // Check circuit breaker
    if (!circuitBreaker.canMakeRequest()) {
      const breakerState = circuitBreaker.getState();
      const errorMsg = `Service temporarily unavailable. The API appears to be down. Please try again in a moment.`;
      console.warn('Circuit breaker is open:', breakerState);
      setAiError(errorMsg);
      setTimeout(() => setAiError(null), 5000);
      return;
    }
    
    // Check rate limit
    const rateLimitCheck = checkRateLimit();
    if (!rateLimitCheck.allowed) {
      const errorMsg = rateLimitCheck.message || 'Rate limit exceeded';
      console.warn('Rate limit check failed:', errorMsg);
      setAiError(errorMsg);
      setTimeout(() => setAiError(null), 5000);
      return;
    }
    
    setIsComputing(true);
    setAiError(null);
    
    // Update rate limit tracking
    lastApiCallRef.current = Date.now();
    apiCallCountRef.current += 1;
    
    // Construct Graph with narrative context
    const graphDesc = nodes.map(n => {
        const p = getProbability(n.state);
        const probNum = p.toFixed(2);
        
        // Interpret probability for narrative context
        let probContext = '';
        if (p >= 0.8) {
          probContext = '—this is a core part of who they are, deeply established in their identity';
        } else if (p >= 0.4 && p < 0.8) {
          probContext = '—this is growing in their life, becoming more central to their journey';
        } else if (p >= 0.1 && p < 0.4) {
          probContext = '—this is emerging, a seed of possibility just beginning to manifest';
        } else if (p >= 0.4 && p <= 0.6) {
          probContext = '—this exists in superposition, they are exploring and the path is not yet decided';
        } else {
          probContext = '—this is a faint possibility, barely visible in their quantum field';
        }
        
        const typeLabel = n.type === 'person' ? 'Person in their life' : 
                         n.type === 'passion' ? 'Passion they love deeply' :
                         n.type === 'interest' ? 'Interest they are curious about' :
                         'Dream or aspiration they hold';
        
        return `- **${n.label}** [${typeLabel}] — Probability: ${probNum}${probContext}`;
    }).join('\n');

    const linksDesc = links.map(l => {
      const s = nodes.find(n => n.id === l.sourceId);
      const t = nodes.find(n => n.id === l.targetId);
      
      if (!s || !t) return '';
      
      let strengthDesc = '';
      let storyContext = '';
      
      if (l.strength > 0.8) {
        strengthDesc = "ABSOLUTE (Unbreakable Bond)";
        storyContext = '—these are inextricably woven together, core to their identity and journey';
      } else if (l.strength > 0.4) {
        strengthDesc = "Established (Strong Connection)";
        storyContext = '—these are meaningfully connected, regularly influencing each other in their life';
      } else {
        strengthDesc = "Tenuous (Tentative Thread)";
        storyContext = '—these have a loose connection, occasionally touching but not yet fully intertwined';
      }

      return `**${s.label}** ↔ **${t.label}** [${strengthDesc}]${storyContext}`;
    }).filter(Boolean).join('\n');

    const prompt = `You are analyzing a creative quantum visualization where a user has created nodes representing concepts, relationships, interests, and connections in their life. This is a creative/artistic tool, not a request for factual information about real people.

The user has created these nodes in their quantum field visualization:
${graphDesc}

Connections between nodes:
${linksDesc || "No entanglements—elements exist independently."}

IMPORTANT CONTEXT:
- Node names (including person names) are user-provided labels in a creative visualization
- You are analyzing patterns and relationships in their visualization, not generating information about real people
- Treat all node names as creative labels in a quantum field visualization
- Focus on the relationships, probabilities, and patterns shown in the visualization
- This is an artistic/creative analysis tool, not a factual information request

OUTPUT FORMAT (be specific and concrete):

**REALITY DESIGNATION**
[One clear title using the node labels from their visualization. Example: "The Seeker of Photography and Adventure"]

**CURRENT STATE ANALYSIS**
[2 concise paragraphs analyzing their visualization:
- What their strongest nodes (high probability) reveal about their configuration
- How their entanglements create patterns in their visualization
- Use the node labels they provided and probabilities. Be specific, not vague.]

**KEY INSIGHTS**
[2-3 concrete insights, each 1-2 sentences:
1. Specific insight about a high-probability node and what it means in their visualization
2. What a strong entanglement reveals about the patterns in their configuration
3. What emerging nodes (low probability) suggest about potential growth
Reference the node labels they provided and be concrete.]

**ACTIONABLE NEXT STEP**
[One specific, actionable recommendation based on their configuration. Examples:
- "Focus on strengthening the connection between [Node1] and [Node2]—they naturally support each other"
- "Your emerging interest in [NodeName] (probability X) is worth exploring—it aligns with your core elements"
- "The [NodeName] node needs more attention—it's central but underdeveloped"
Be specific and actionable, not vague.]

REQUIREMENTS:
- Use the node labels the user provided throughout (these are creative labels in their visualization)
- Reference specific probabilities when relevant
- Be concrete and actionable, not mystical or vague
- Focus on patterns and relationships in their visualization, not factual claims
- Complete all sections
- Keep total response under 400 words`;

    const startTime = Date.now();
    try {
      let retryCount = 0;
      const maxRetries = 3; // Increased retries for better reliability
      let lastError: Error | null = null;

      while (retryCount <= maxRetries) {
        try {
          const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
          if (!apiKey) {
            console.error('API key missing');
            throw new Error("OpenRouter API key not configured. Please add VITE_OPENROUTER_API_KEY to .env.local");
          }

          // Use a working free/cheap model - fallback to free llama if model unavailable
          const model = import.meta.env.VITE_AI_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';
          
          console.log('Making API call', { model, hasApiKey: !!apiKey, promptLength: prompt.length });
          
          // Using fetch for browser compatibility (OpenRouter supports CORS)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout (faster response)
          
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`,
                  'HTTP-Referer': window.location.origin,
                  'X-Title': 'Quantum Lens',
              },
              body: JSON.stringify({
                  model: model,
                  messages: [
                      { role: 'user', content: prompt }
                  ],
                  temperature: 0.7, // Lower for more focused, concrete responses
                  max_tokens: 600, // Sufficient for concise, actionable insights
              }),
              signal: controller.signal,
          });
          
          console.log('API response status:', response.status, response.statusText);

          clearTimeout(timeoutId);

          if (!response.ok) {
            let errorData: any = { error: { message: 'Unknown error' } };
            try {
              const text = await response.text();
              errorData = JSON.parse(text);
              console.error('API error response:', errorData);
            } catch (parseError) {
              console.error('Failed to parse error response');
            }
            
            // Handle specific error codes
            if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              const waitTime = retryAfter ? parseInt(retryAfter) : 10; // Reduced default wait time
              
              // If we have retries left, wait and retry automatically
              if (retryCount < maxRetries) {
                console.log(`API rate limited. Waiting ${waitTime}s before retry ${retryCount + 1}/${maxRetries}...`);
                setHistory(prev => [...prev, { 
                  role: 'model', 
                  text: `⏳ API rate limit hit. Automatically retrying in ${waitTime} seconds...`, 
                  timestamp: Date.now() 
                }]);
                await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                retryCount++;
                continue; // Retry the request (goes back to while loop start)
              } else {
                // All retries exhausted - set cooldown and throw
                const finalWaitTime = Math.min(waitTime, 30); // Cap at 30 seconds
                setRateLimitCooldown(finalWaitTime);
                const rateLimitError = new Error(`API rate limit exceeded after ${maxRetries + 1} attempts. Please wait ${finalWaitTime} seconds and try again.`) as Error & { isRateLimit: boolean };
                rateLimitError.isRateLimit = true;
                throw rateLimitError;
              }
            }
            
            if (response.status === 401) {
              throw new Error('Invalid API key. Please check your VITE_OPENROUTER_API_KEY in .env.local');
            }
            
            if (response.status === 402) {
              throw new Error('Insufficient credits. Please add credits to your OpenRouter account.');
            }
            
            // Check for model-specific errors
            const errorMessage = errorData.error?.message || errorData.message || `API Error (${response.status}): ${response.statusText}`;
            if (errorMessage.includes('No endpoints found') || errorMessage.includes('model') || errorMessage.includes('not found')) {
              throw new Error(`Model "${model}" is not available. Please update VITE_AI_MODEL in .env.local to a valid model (e.g., meta-llama/llama-3.2-3b-instruct:free)`);
            }
            
            throw new Error(errorMessage);
          }

          const data = await response.json();
          console.log('API response data:', data);
          
          if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Invalid response format:', data);
            throw new Error('Invalid response format from API');
          }
          
          const text = data.choices[0].message.content || "Probability cloud too dense. Recalculate.";
          console.log('Success! AI response:', text.substring(0, 100) + '...');
          
          // Track successful API call
          const duration = Date.now() - startTime;
          analytics.trackApiCall(true, duration, retryCount);
          analytics.trackComputeReality(true, nodes.length);
          
          // Record success in circuit breaker
          circuitBreaker.recordSuccess();
          
        setHistory(prev => [...prev, { role: 'model', text, timestamp: Date.now(), isComputation: true }]);
          setAiError(null);
          return; // Success, exit retry loop
          
    } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          console.error('API call error (attempt ' + retryCount + '):', e);
          
          // Don't retry on certain errors
          if (e instanceof Error) {
            if (e.name === 'AbortError') {
              console.error('Request timeout');
              throw new Error('Request timeout. Please try again.');
            }
            if (e.message.includes('API key') || e.message.includes('401') || e.message.includes('402')) {
              console.error('Auth/credit error, not retrying');
              throw e; // Don't retry auth/credit errors
            }
            // Don't retry if it's a 429 that we've already exhausted retries for
            if ((e as any).isRateLimit || e.message.includes('API rate limit exceeded after')) {
              throw e; // Already handled, don't retry again
            }
          }
          
          retryCount++;
          
          if (retryCount <= maxRetries) {
            // Exponential backoff: wait 2s, 4s, 8s (longer delays to avoid rate limits)
            const backoffDelay = Math.pow(2, retryCount) * 1000;
            console.log(`Retrying after ${backoffDelay/1000}s delay (attempt ${retryCount + 1}/${maxRetries + 1})...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            continue;
          }
        }
      }
      
      // All retries failed
      const errorMessage = lastError?.message || 'Failed to connect to AI service. Please check your connection and try again.';
      console.error('All retries failed:', errorMessage);
      
      // Track error
      const duration = Date.now() - startTime;
      analytics.trackApiCall(false, duration, retryCount);
      analytics.trackComputeReality(false, nodes.length, errorMessage);
      errorTracker.logError(lastError || new Error(errorMessage), {
        apiCall: {
          endpoint: 'openrouter.ai/api/v1/chat/completions',
          retryCount,
        },
      });
      
      // Record failure in circuit breaker
      circuitBreaker.recordFailure();
      
      setAiError(errorMessage);
      setHistory(prev => [...prev, { 
        role: 'model', 
        text: `ERROR: ${errorMessage}`, 
        timestamp: Date.now() 
      }]);
    } catch (outerError) {
      // Handle errors that break out of retry loop (like auth errors)
      const errorMessage = outerError instanceof Error ? outerError.message : 'Unknown error occurred';
      console.error('Outer AI Error:', outerError);
      
      // Track error
      const duration = Date.now() - startTime;
      analytics.trackApiCall(false, duration, 0);
      analytics.trackComputeReality(false, nodes.length, errorMessage);
      errorTracker.logError(outerError instanceof Error ? outerError : new Error(errorMessage), {
        apiCall: {
          endpoint: 'openrouter.ai/api/v1/chat/completions',
        },
      });
      
      // Record failure in circuit breaker
      circuitBreaker.recordFailure();
      
      setAiError(errorMessage);
      setHistory(prev => [...prev, { 
        role: 'model', 
        text: `ERROR: ${errorMessage}`, 
        timestamp: Date.now() 
      }]);
    } finally {
      console.log('Compute Reality finished');
        setIsComputing(false);
    }
  }, [nodes, links]);

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

  // Helper function to calculate modal position with edge detection
  const calculateModalPosition = useCallback((x: number, y: number, width: number, height: number, preferAbove: boolean = true) => {
    const rect = document.getElementById('quantum-void')?.getBoundingClientRect();
    if (!rect) return { left: x, top: y, transform: 'translate(-50%, -100%)' };
    
    let left = x;
    let top = y;
    let transform = preferAbove ? 'translate(-50%, -130%)' : 'translate(-50%, 130%)';
    
    // Adjust horizontal
    if (left - width / 2 < 20) {
      left = 20 + width / 2;
    } else if (left + width / 2 > rect.width - 20) {
      left = rect.width - 20 - width / 2;
    }
    
    // Adjust vertical
    if (preferAbove) {
      if (top - height < 20) {
        transform = 'translate(-50%, 130%)'; // Show below
      } else if (top + height > rect.height - 20) {
        top = rect.height - height - 20;
        transform = 'translate(-50%, -100%)';
      }
    } else {
      if (top + height > rect.height - 20) {
        top = rect.height - height - 20;
        transform = 'translate(-50%, -100%)';
      } else if (top < 20) {
        top = 20;
      }
    }
    
    return { left, top, transform };
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-black text-slate-200 overflow-hidden relative selection:bg-fuchsia-500/30 font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,24,39,1)_0%,_rgba(0,0,0,1)_100%)] z-0 pointer-events-none" />
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* --- LEFT: The Void (Canvas) --- */}
      <div className="relative flex-grow h-full md:h-auto overflow-hidden cursor-crosshair touch-none" id="quantum-void" onClick={handleCanvasClick}>
        
        {/* Help Panel - Top Left */}
        <div className="absolute top-4 left-4 z-30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHelpOpen(!isHelpOpen);
            }}
            className="glass-panel px-3 py-2 rounded-lg border border-indigo-500/30 hover:border-indigo-400/50 transition-all flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-indigo-200 shadow-lg"
            title="Toggle Help"
          >
            <span>ℹ️</span>
            <span className="hidden sm:inline">Help</span>
            <span className={`transition-transform duration-200 ${isHelpOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {isHelpOpen && (
            <div 
              className="glass-panel mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-indigo-500/30 shadow-2xl p-4 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto text-sm md:text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider">Quantum Guide</h3>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="text-slate-400 hover:text-white text-lg leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4 text-xs text-slate-300">
                {/* Qubits */}
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1 flex items-center gap-2">
                    <span>⚛️</span> Qubits
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Each node is a <strong className="text-cyan-200">qubit</strong> - a quantum bit that can exist in superposition (both |0⟩ and |1⟩ simultaneously). The probability shows how likely it is to be |1⟩ when measured.
                  </p>
                </div>
                
                {/* Gates */}
                <div>
                  <h4 className="font-bold text-fuchsia-300 mb-1 flex items-center gap-2">
                    <span>🔀</span> Quantum Gates
                  </h4>
                  <div className="text-slate-400 space-y-1">
                    <p><strong className="text-fuchsia-200">H (Hadamard):</strong> Creates superposition - equal chance of |0⟩ or |1⟩</p>
                    <p><strong className="text-fuchsia-200">X:</strong> Flips the state (|0⟩ → |1⟩)</p>
                    <p><strong className="text-fuchsia-200">Y:</strong> Flips state and phase</p>
                    <p><strong className="text-fuchsia-200">Z:</strong> Flips only the phase</p>
                  </div>
                </div>
                
                {/* Entanglement */}
                <div>
                  <h4 className="font-bold text-purple-300 mb-1 flex items-center gap-2">
                    <span>🔗</span> Entanglement
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Connect nodes to create <strong className="text-purple-200">entanglement</strong>. Stronger links (higher strength) represent stronger quantum correlations. When you measure one, it affects the other.
                  </p>
                </div>
                
                {/* Measurement */}
                <div>
                  <h4 className="font-bold text-amber-300 mb-1 flex items-center gap-2">
                    <span>👁️</span> Measurement
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Click <strong className="text-amber-200">"OBSERVE / COLLAPSE"</strong> to measure a qubit. This collapses the superposition into a definite state (|0⟩ or |1⟩) based on probability.
                  </p>
                </div>
                
                {/* How to Use */}
                <div className="pt-2 border-t border-slate-700">
                  <h4 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
                    <span>🚀</span> Quick Start
                  </h4>
                  <ol className="text-slate-400 space-y-1.5 list-decimal list-inside">
                    <li>Click canvas to create nodes</li>
                    <li>Click a node to apply gates (H, X, Y, Z)</li>
                    <li>Click node A, then node B to entangle</li>
                    <li>Create 2+ nodes and click "COMPUTE REALITY"</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
        
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
        {isCreating && (() => {
          const rect = document.getElementById('quantum-void')?.getBoundingClientRect();
          const modalWidth = 288; // w-72 = 18rem = 288px
          const modalHeight = 200; // Approximate height
          let left = isCreating.x;
          let top = isCreating.y;
          
          // Adjust if too close to right edge
          if (rect && left + modalWidth > rect.width) {
            left = rect.width - modalWidth - 20;
          }
          // Adjust if too close to left edge
          if (left < 20) {
            left = 20;
          }
          // Adjust if too close to bottom edge
          if (rect && top + modalHeight > rect.height) {
            top = rect.height - modalHeight - 20;
          }
          // Adjust if too close to top edge
          if (top < 20) {
            top = 20;
          }
          
          return (
            <div 
              key="create-modal"
            className="absolute z-50 glass-panel p-4 rounded-xl shadow-2xl border border-indigo-500/30 w-72 max-w-[calc(100vw-2rem)] animate-in fade-in zoom-in duration-200"
              style={{ left: `${left}px`, top: `${top}px` }}
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
                    className={`text-xs md:text-[10px] uppercase font-bold py-3 md:py-1.5 rounded border transition-all touch-manipulation ${newNodeType === t ? 'bg-indigo-900 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:bg-slate-900 active:bg-slate-800'}`}
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
                    className="flex-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 text-sm md:text-xs font-bold py-3 md:py-2 rounded transition-colors touch-manipulation min-h-[44px]"
                >
                    CANCEL
                </button>
                <button 
                    type="submit" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm md:text-xs font-bold py-3 md:py-2 rounded transition-colors shadow-lg shadow-indigo-500/20 touch-manipulation min-h-[44px]"
                >
                    INITIALIZE
                </button>
              </div>
            </form>
          </div>
          );
        })()}

        {/* Selected Node Controls (Quantum Gates + Edit) */}
        {selectedNodeObj && !isCreating && (() => {
          const pos = calculateModalPosition(selectedNodeObj.x, selectedNodeObj.y, 180, 250, true);
          return (
            <div 
                key={`node-controls-${selectedNodeObj.id}`}
                className="absolute z-50 glass-panel p-3 rounded-lg shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200 flex flex-col gap-3 min-w-[180px] max-w-[calc(100vw-2rem)]"
                style={{ 
                    left: `${pos.left}px`, 
                    top: `${pos.top}px`,
                    transform: pos.transform
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
                            className="bg-slate-800 hover:bg-indigo-600 active:bg-indigo-700 text-slate-200 text-sm md:text-[10px] font-bold py-2 md:py-1.5 rounded border border-slate-700 transition-colors touch-manipulation min-h-[44px]"
                            title={`Apply ${gate} Gate`}
                        >
                            {gate}
                        </button>
                    ))}
                </div>

                {/* Measurement Button */}
                <button 
                    onClick={measureNode}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-700 active:to-amber-800 text-white text-sm md:text-[10px] font-bold py-3 md:py-1.5 rounded border border-amber-500/50 transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)] touch-manipulation min-h-[44px]"
                >
                    OBSERVE / COLLAPSE
                </button>
                
                {/* Delete Button */}
                <button 
                    onClick={() => deleteNode(selectedNodeObj.id)}
                    className="flex items-center gap-2 text-red-400 hover:text-red-200 active:text-red-100 hover:bg-red-950/50 active:bg-red-900/70 px-2 py-2 md:py-1 rounded w-full justify-center transition-colors text-sm md:text-[10px] font-bold touch-manipulation min-h-[44px]"
                >
                    ERASE ENTITY
                </button>

                <div className="text-[9px] text-slate-600 text-center w-full italic">
                    α: {formatComplex(selectedNodeObj.state.alpha)} | β: {formatComplex(selectedNodeObj.state.beta)}
                </div>
            </div>
          );
        })()}

        {/* Link Editing Modal */}
        {getSelectedLinkObj && (() => {
          const pos = calculateModalPosition(getLinkMidpoint.x, getLinkMidpoint.y, 256, 200, true);
          return (
            <div 
                key={`link-controls-${selectedLinkId}`}
                className="absolute z-50 glass-panel p-3 rounded-xl shadow-2xl border border-fuchsia-500/30 w-64 animate-in fade-in zoom-in duration-200"
                style={{ 
                    left: `${pos.left}px`, 
                    top: `${pos.top}px`,
                    transform: pos.transform
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
                        className="w-full h-2 md:h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 touch-manipulation"
                    />
                    <div className="text-center text-xs font-bold text-white mt-1">
                        {(getSelectedLinkObj.strength * 100).toFixed(0)}% RESONANCE
                    </div>
                </div>
                
                <button 
                    onClick={deleteLink}
                    className="w-full bg-red-950/50 hover:bg-red-900/80 active:bg-red-800/90 border border-red-900 text-red-200 text-sm md:text-xs font-bold py-3 md:py-1.5 rounded transition-colors flex items-center justify-center gap-2 touch-manipulation min-h-[44px]"
                >
                    SEVER CONNECTION
                </button>
            </div>
          );
        })()}

        {/* Floating Instructions - Hidden on mobile, shown on desktop */}
        <div className="hidden md:block absolute bottom-8 right-8 pointer-events-none select-none space-y-2 opacity-40 hover:opacity-100 transition-opacity">
          <div className="text-slate-500 text-[10px] font-mono border-l-2 border-slate-700 pl-3">
              <p className="mb-1"><strong className="text-slate-300">CLICK VOID</strong> :: MANIFEST</p>
              <p className="mb-1"><strong className="text-slate-300">CLICK NODE</strong> :: GATE OPS</p>
              <p><strong className="text-slate-300">GATES (H)</strong> :: SUPERPOSITION</p>
              <p><strong className="text-slate-300">MEASURE</strong> :: COLLAPSE STATE</p>
          </div>
        </div>
        
        {/* Mobile Instructions - Bottom center */}
        <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none select-none opacity-60">
          <div className="text-slate-400 text-xs font-mono text-center">
              <p><strong className="text-slate-200">TAP</strong> to create • <strong className="text-slate-200">TAP</strong> node to edit</p>
          </div>
        </div>
      </div>

      {/* --- RIGHT: The Observer (Chat/Results) --- */}
      <div 
        className={`glass-panel border-l border-slate-800 flex flex-col z-20 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out ${
          isRightPanelExpanded ? 'w-full md:w-96' : 'w-12'
        }`}
      >
        {/* Collapse/Expand Toggle Button */}
        <button
          onClick={() => setIsRightPanelExpanded(!isRightPanelExpanded)}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 bg-slate-900 border border-slate-700 hover:border-indigo-500 active:border-indigo-600 rounded-full p-2 md:p-2 shadow-lg transition-all hover:scale-110 active:scale-95 hover:shadow-indigo-500/50 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
          title={isRightPanelExpanded ? 'Collapse Panel' : 'Expand Panel'}
        >
          <svg 
            className={`w-4 h-4 text-indigo-400 transition-transform duration-300 ${isRightPanelExpanded ? '' : 'rotate-180'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {isRightPanelExpanded ? (
          <>
        <div className="p-4 border-b border-slate-800/50 flex justify-between items-center bg-black/40">
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400 tracking-tighter">
                QUANTUM LENS
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
          {history.map((msg, i) => {
            const isLatest = i === history.length - 1;
            return <ComputationMessage key={i} msg={msg} isLatest={isLatest} index={i} />;
          })}
          {isComputing && (
             <div className="flex flex-col items-center justify-center py-12 text-indigo-300 space-y-6 relative">
               {/* Quantum field visualization */}
               <div className="relative w-32 h-32">
                 {/* Outer quantum rings */}
                 <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full quantum-field-loading"></div>
                 <div className="absolute inset-4 border-2 border-purple-500/30 rounded-full quantum-field-loading" style={{ animationDelay: '0.3s' }}></div>
                 <div className="absolute inset-8 border-2 border-fuchsia-500/30 rounded-full quantum-field-loading" style={{ animationDelay: '0.6s' }}></div>
                 
                 {/* Central pulsing core */}
                 <div className="absolute inset-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 rounded-full opacity-60 quantum-field-loading blur-sm"></div>
                 <div className="absolute inset-14 bg-gradient-to-br from-indigo-400 via-purple-400 to-fuchsia-400 rounded-full opacity-80 animate-pulse"></div>
                 
                 {/* Floating particles */}
                 <div className="absolute top-2 left-1/2 w-1 h-1 bg-indigo-400 rounded-full particle" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
                 <div className="absolute right-2 top-1/2 w-1 h-1 bg-purple-400 rounded-full particle" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
                 <div className="absolute bottom-2 left-1/2 w-1 h-1 bg-fuchsia-400 rounded-full particle" style={{ animationDelay: '1s', animationDuration: '2s' }}></div>
                 <div className="absolute left-2 top-1/2 w-1 h-1 bg-indigo-300 rounded-full particle" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }}></div>
               </div>
               
               {/* Mystical loading messages */}
               <div className="flex flex-col items-center space-y-2">
                 <span className="text-xs loading-message tracking-[0.15em] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-fuchsia-300 uppercase">
                   Reading Quantum Signatures...
                 </span>
                 <span className="text-[10px] loading-message tracking-[0.1em] font-medium text-indigo-400/70 uppercase" style={{ animationDelay: '0.5s' }}>
                   Collapsing Wavefunctions...
                 </span>
                 <span className="text-[10px] loading-message tracking-[0.1em] font-medium text-purple-400/70 uppercase" style={{ animationDelay: '1s' }}>
                   Revealing Reality...
                 </span>
               </div>
               
               {/* Pulsing glow around the area */}
               <div className="absolute -inset-8 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-full blur-2xl quantum-field-loading -z-10"></div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t border-slate-800/50 bg-black/20 space-y-3">
            {/* Error Display */}
            {aiError && (
                <div className="bg-red-950/50 border border-red-900 rounded-lg p-3 text-xs text-red-200">
                    <div className="flex items-start gap-2">
                        <span className="text-red-400">⚠</span>
                        <div className="flex-1">
                            <p className="font-bold mb-1">Error:</p>
                            <p>{aiError}</p>
                        </div>
                        <button 
                            onClick={() => setAiError(null)}
                            className="text-red-400 hover:text-red-200"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
            
            {/* Rate Limit Cooldown Display */}
            {rateLimitCooldown > 0 && (
                <div className="bg-amber-950/50 border border-amber-900 rounded-lg p-3 text-xs text-amber-200">
                    <div className="flex items-center gap-2">
                        <span className="text-amber-400">⏱</span>
                        <div>
                            <p className="font-bold">Rate Limit Cooldown</p>
                            <p>Please wait {rateLimitCooldown} second{rateLimitCooldown > 1 ? 's' : ''} before next computation</p>
                        </div>
                    </div>
                </div>
            )}
            
            {nodes.length > 1 ? (
                <button 
                    onClick={collapseWavefunction}
                    disabled={isComputing || rateLimitCooldown > 0}
                    className={`w-full group relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 md:p-6 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[60px] ${!isComputing && rateLimitCooldown === 0 ? 'button-pulse' : ''} hover:shadow-[0_0_60px_rgba(139,92,246,0.6),0_0_100px_rgba(168,85,247,0.4)]`}
                >
                    {/* Particle effects */}
                    {!isComputing && rateLimitCooldown === 0 && (
                        <>
                            <div className="particle" style={{ left: '10%', animationDelay: '0s', animationDuration: '2s' }}></div>
                            <div className="particle" style={{ left: '30%', animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
                            <div className="particle" style={{ left: '50%', animationDelay: '1s', animationDuration: '3s' }}></div>
                            <div className="particle" style={{ left: '70%', animationDelay: '1.5s', animationDuration: '2.2s' }}></div>
                            <div className="particle" style={{ left: '90%', animationDelay: '0.8s', animationDuration: '2.8s' }}></div>
                        </>
                    )}
                    
                    {/* Quantum wave background effect */}
                    <div className="absolute inset-0 quantum-wave opacity-20">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    </div>
                    
                    {/* Main button content */}
                    <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                        <div className="flex items-center justify-center gap-3 font-bold text-white tracking-[0.2em] text-base uppercase">
                            <span className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">COMPUTE REALITY</span>
                            {isComputing ? (
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-5 h-5 transition-transform group-hover:rotate-180 duration-700 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                            )}
                    </div>
                        {!isComputing && rateLimitCooldown === 0 && (
                            <p className="text-[10px] text-white/70 uppercase tracking-widest font-medium">Portal to Your Quantum Truth</p>
                        )}
                    </div>
                    
                    {/* Enhanced shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                    
                    {/* Outer glow ring */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 rounded-xl opacity-30 blur-xl group-hover:opacity-50 transition-opacity -z-10"></div>
                </button>
            ) : (
                <div className="text-center text-xs text-slate-500 py-4 border border-slate-800/50 bg-slate-900/20 rounded-lg border-dashed">
                    Add & Entangle at least 2 entities
                </div>
            )}
        </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-2 space-y-4">
            <div className="writing-vertical text-[10px] text-slate-500 uppercase tracking-widest font-bold hidden md:block">
              QUANTUM LENS
            </div>
            <button
              onClick={collapseWavefunction}
              disabled={isComputing || rateLimitCooldown > 0 || nodes.length <= 1}
              className="p-3 md:p-2 bg-gradient-to-br from-indigo-600 to-fuchsia-600 rounded-lg hover:scale-110 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-w-[56px] min-h-[56px] flex items-center justify-center"
              title="Compute Reality"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Ensure DOM is ready before rendering
// Initialize React app - module scripts execute after DOM is ready
const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    const root = createRoot(rootElement);
root.render(<App />);
  } catch (error) {
    console.error('Error rendering app:', error);
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: #ef4444; font-family: 'Space Grotesk', sans-serif; text-align: center; padding: 2rem;">
        <div>
          <h2 style="margin-bottom: 1rem;">Error Loading Application</h2>
          <p style="color: #94a3b8;">${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p style="color: #64748b; margin-top: 1rem; font-size: 0.875rem;">Check the browser console (F12) for details.</p>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">Reload Page</button>
        </div>
      </div>
    `;
  }
} else {
  console.error('Root element not found!');
}