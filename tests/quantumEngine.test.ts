import { describe, it, expect, vi } from 'vitest';
import {
  createComplex,
  add,
  multiply,
  magnitude,
  expImaginary,
  INITIAL_STATE,
  STATE_ZERO,
  STATE_ONE,
  applyGate,
  getProbability,
  getBlochCoordinates,
  measure,
  formatComplex,
} from '../utils/quantumEngine';
import { GateType } from '../types';

describe('Complex Number Operations', () => {
  it('should create a complex number', () => {
    const c = createComplex(3, 4);
    expect(c.r).toBe(3);
    expect(c.i).toBe(4);
  });

  it('should add complex numbers', () => {
    const a = createComplex(1, 2);
    const b = createComplex(3, 4);
    const result = add(a, b);
    expect(result.r).toBe(4);
    expect(result.i).toBe(6);
  });

  it('should multiply complex numbers', () => {
    const a = createComplex(1, 2);
    const b = createComplex(3, 4);
    // (1+2i)(3+4i) = 3 + 4i + 6i + 8i² = 3 + 10i - 8 = -5 + 10i
    const result = multiply(a, b);
    expect(result.r).toBeCloseTo(-5);
    expect(result.i).toBeCloseTo(10);
  });

  it('should calculate magnitude', () => {
    const c = createComplex(3, 4);
    // |3+4i| = √(3² + 4²) = 5
    expect(magnitude(c)).toBe(5);
  });

  it('should calculate exponential of imaginary number', () => {
    const result = expImaginary(Math.PI / 2);
    // e^(iπ/2) = i
    expect(result.r).toBeCloseTo(0);
    expect(result.i).toBeCloseTo(1);
  });
});

describe('Quantum States', () => {
  it('should have correct initial state', () => {
    expect(INITIAL_STATE.alpha.r).toBe(1);
    expect(INITIAL_STATE.alpha.i).toBe(0);
    expect(INITIAL_STATE.beta.r).toBe(0);
    expect(INITIAL_STATE.beta.i).toBe(0);
  });

  it('should have correct zero state', () => {
    expect(STATE_ZERO.alpha.r).toBe(1);
    expect(STATE_ZERO.beta.r).toBe(0);
  });

  it('should have correct one state', () => {
    expect(STATE_ONE.alpha.r).toBe(0);
    expect(STATE_ONE.beta.r).toBe(1);
  });
});

describe('Quantum Gates', () => {
  it('should apply X gate (bit flip)', () => {
    const state = applyGate(INITIAL_STATE, 'X');
    // X gate flips |0⟩ to |1⟩
    expect(state.alpha.r).toBeCloseTo(0);
    expect(state.beta.r).toBeCloseTo(1);
  });

  it('should apply H gate (Hadamard - superposition)', () => {
    const state = applyGate(INITIAL_STATE, 'H');
    // H gate creates superposition: (|0⟩ + |1⟩)/√2
    const prob = getProbability(state);
    expect(prob).toBeCloseTo(0.5, 1);
  });

  it('should apply Z gate (phase flip)', () => {
    // First apply H to get superposition
    const superposed = applyGate(INITIAL_STATE, 'H');
    // Then apply Z (should flip phase of |1⟩)
    const state = applyGate(superposed, 'Z');
    // Probability should still be 0.5, but phase changed
    const prob = getProbability(state);
    expect(prob).toBeCloseTo(0.5, 1);
  });

  it('should apply Y gate', () => {
    const state = applyGate(INITIAL_STATE, 'Y');
    // Y gate: bit flip + phase flip
    expect(state.alpha.r).toBeCloseTo(0);
    expect(state.beta.i).toBeCloseTo(1);
  });

  it('should apply multiple gates sequentially', () => {
    let state = INITIAL_STATE;
    state = applyGate(state, 'H'); // Superposition
    state = applyGate(state, 'X'); // Flip
    const prob = getProbability(state);
    expect(prob).toBeCloseTo(0.5, 1);
  });
});

describe('Probability Calculation', () => {
  it('should calculate probability of |0⟩ state', () => {
    const prob = getProbability(INITIAL_STATE);
    expect(prob).toBe(0);
  });

  it('should calculate probability of |1⟩ state', () => {
    const prob = getProbability(STATE_ONE);
    expect(prob).toBe(1);
  });

  it('should calculate probability of superposition', () => {
    const state = applyGate(INITIAL_STATE, 'H');
    const prob = getProbability(state);
    expect(prob).toBeCloseTo(0.5, 1);
  });
});

describe('Bloch Sphere Coordinates', () => {
  it('should calculate Bloch coordinates for |0⟩', () => {
    const coords = getBlochCoordinates(INITIAL_STATE);
    expect(coords.z).toBeCloseTo(1); // North pole
    expect(coords.x).toBeCloseTo(0);
    expect(coords.y).toBeCloseTo(0);
  });

  it('should calculate Bloch coordinates for |1⟩', () => {
    const coords = getBlochCoordinates(STATE_ONE);
    expect(coords.z).toBeCloseTo(-1); // South pole
    expect(coords.x).toBeCloseTo(0);
    expect(coords.y).toBeCloseTo(0);
  });

  it('should calculate Bloch coordinates for superposition', () => {
    const state = applyGate(INITIAL_STATE, 'H');
    const coords = getBlochCoordinates(state);
    expect(coords.z).toBeCloseTo(0); // Equator
    // x and y should be on unit circle
    const radius = Math.sqrt(coords.x * coords.x + coords.y * coords.y);
    expect(radius).toBeCloseTo(1);
  });
});

describe('Measurement', () => {
  it('should always measure |0⟩ from |0⟩ state', () => {
    const result = measure(INITIAL_STATE);
    expect(result.outcome).toBe(0);
    expect(result.collapsedState.alpha.r).toBe(1);
    expect(result.collapsedState.beta.r).toBe(0);
  });

  it('should always measure |1⟩ from |1⟩ state', () => {
    const result = measure(STATE_ONE);
    expect(result.outcome).toBe(1);
    expect(result.collapsedState.alpha.r).toBe(0);
    expect(result.collapsedState.beta.r).toBe(1);
  });

  it('should collapse superposition to either |0⟩ or |1⟩', () => {
    const state = applyGate(INITIAL_STATE, 'H');
    const result = measure(state);
    expect([0, 1]).toContain(result.outcome);
    if (result.outcome === 0) {
      expect(result.collapsedState.alpha.r).toBe(1);
    } else {
      expect(result.collapsedState.beta.r).toBe(1);
    }
  });

  it('should respect probability distribution in superposition', () => {
    const state = applyGate(INITIAL_STATE, 'H');
    const outcomes = { 0: 0, 1: 0 };
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const result = measure(state);
      outcomes[result.outcome]++;
    }

    // Should be roughly 50/50 (within 10% tolerance)
    const ratio = outcomes[1] / iterations;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });
});

describe('Format Complex', () => {
  it('should format positive complex number', () => {
    const c = createComplex(1.23, 4.56);
    const formatted = formatComplex(c);
    expect(formatted).toContain('1.23');
    expect(formatted).toContain('+4.56i');
  });

  it('should format negative imaginary part', () => {
    const c = createComplex(1.23, -4.56);
    const formatted = formatComplex(c);
    expect(formatted).toContain('1.23');
    expect(formatted).toContain('-4.56i');
  });
});

