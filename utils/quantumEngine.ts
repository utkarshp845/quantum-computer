import { Complex, QuantumState, GateType } from '../types';

// --- Complex Number Math ---

export const createComplex = (r: number, i: number): Complex => ({ r, i });

export const add = (a: Complex, b: Complex): Complex => ({
  r: a.r + b.r,
  i: a.i + b.i
});

export const multiply = (a: Complex, b: Complex): Complex => ({
  r: a.r * b.r - a.i * b.i,
  i: a.r * b.i + a.i * b.r
});

export const magnitude = (c: Complex): number => Math.sqrt(c.r * c.r + c.i * c.i);

// Euler's formula: e^(ix) = cos(x) + i*sin(x)
export const expImaginary = (theta: number): Complex => ({
  r: Math.cos(theta),
  i: Math.sin(theta)
});

// --- Quantum Logic ---

export const INITIAL_STATE: QuantumState = {
  alpha: createComplex(1, 0),
  beta: createComplex(0, 0)
};

export const STATE_ONE: QuantumState = {
    alpha: createComplex(0, 0),
    beta: createComplex(1, 0)
};

export const STATE_ZERO: QuantumState = {
    alpha: createComplex(1, 0),
    beta: createComplex(0, 0)
};

type Matrix2x2 = [[Complex, Complex], [Complex, Complex]];

const ZERO = createComplex(0, 0);
const ONE = createComplex(1, 0);
const NEG_ONE = createComplex(-1, 0);
const I = createComplex(0, 1);
const NEG_I = createComplex(0, -1);
const INV_SQRT_2 = createComplex(1 / Math.sqrt(2), 0);

// Gate Matrices
const GATES: Record<GateType, Matrix2x2> = {
  // Hadamard: Superposition
  H: [
    [INV_SQRT_2, INV_SQRT_2],
    [INV_SQRT_2, createComplex(-1 / Math.sqrt(2), 0)]
  ],
  // Pauli-X: Bit Flip (NOT)
  X: [
    [ZERO, ONE],
    [ONE, ZERO]
  ],
  // Pauli-Y: Bit & Phase Flip
  Y: [
    [ZERO, NEG_I],
    [I, ZERO]
  ],
  // Pauli-Z: Phase Flip
  Z: [
    [ONE, ZERO],
    [ZERO, NEG_ONE]
  ],
  // Phase Gate (S): 90 degree Z-rotation
  S: [
    [ONE, ZERO],
    [ZERO, I]
  ],
  // T Gate: 45 degree Z-rotation
  T: [
    [ONE, ZERO],
    [ZERO, expImaginary(Math.PI / 4)]
  ]
};

export const applyGate = (state: QuantumState, gate: GateType): QuantumState => {
  const matrix = GATES[gate];
  
  // Matrix multiplication:
  // [ a b ] [ alpha ] = [ a*alpha + b*beta ]
  // [ c d ] [ beta  ]   [ c*alpha + d*beta ]
  
  const newAlpha = add(
    multiply(matrix[0][0], state.alpha),
    multiply(matrix[0][1], state.beta)
  );
  
  const newBeta = add(
    multiply(matrix[1][0], state.alpha),
    multiply(matrix[1][1], state.beta)
  );

  return { alpha: newAlpha, beta: newBeta };
};

// --- Bloch Sphere Coordinates ---
export const getBlochCoordinates = (state: QuantumState): { x: number, y: number, z: number } => {
  const magBeta = magnitude(state.beta);
  // Ensure we don't exceed 1 due to floating point
  const clampedBeta = Math.min(Math.max(magBeta, 0), 1);
  
  const theta = 2 * Math.asin(clampedBeta);

  const phaseAlpha = Math.atan2(state.alpha.i, state.alpha.r);
  const phaseBeta = Math.atan2(state.beta.i, state.beta.r);
  const phi = phaseBeta - phaseAlpha;

  const x = Math.sin(theta) * Math.cos(phi);
  const y = Math.sin(theta) * Math.sin(phi);
  const z = Math.cos(theta);

  return { x, y, z };
};

export const getProbability = (state: QuantumState): number => {
    const magBeta = magnitude(state.beta);
    return magBeta * magBeta;
}

export const measure = (state: QuantumState): { collapsedState: QuantumState, outcome: 0 | 1 } => {
    const probOne = getProbability(state);
    const roll = Math.random();
    
    if (roll < probOne) {
        return { collapsedState: STATE_ONE, outcome: 1 };
    } else {
        return { collapsedState: STATE_ZERO, outcome: 0 };
    }
}

export const formatComplex = (c: Complex): string => {
  const r = c.r.toFixed(2);
  const i = c.i >= 0 ? `+${c.i.toFixed(2)}i` : `${c.i.toFixed(2)}i`;
  return `${r}${i}`;
};