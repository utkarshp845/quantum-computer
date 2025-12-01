export type NodeType = 'person' | 'passion' | 'interest' | 'dream';

export interface Complex {
  r: number;
  i: number;
}

export interface QuantumState {
  alpha: Complex;
  beta: Complex;
}

export interface QuantumNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  phase: number; // For visual pulsing
  state: QuantumState; // The node's internal qubit state
}

export interface EntanglementLink {
  sourceId: string;
  targetId: string;
  strength: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isComputation?: boolean; // Highlight AI insights differently
}

export type GateType = 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T';