import { describe, it, expect } from 'vitest';
import {
  INITIAL_STATE,
  applyGate,
  getProbability,
  measure,
  STATE_ZERO,
  STATE_ONE,
} from '../utils/quantumEngine';

describe('Integration Tests', () => {
  describe('Quantum Workflow', () => {
    it('should create superposition and measure correctly', () => {
      // Start with |0⟩
      let state = INITIAL_STATE;
      expect(getProbability(state)).toBe(0);

      // Apply Hadamard to create superposition
      state = applyGate(state, 'H');
      const prob = getProbability(state);
      expect(prob).toBeCloseTo(0.5, 1);

      // Measure should collapse to either |0⟩ or |1⟩
      const result = measure(state);
      expect([0, 1]).toContain(result.outcome);
      
      if (result.outcome === 0) {
        expect(result.collapsedState.alpha.r).toBe(1);
        expect(result.collapsedState.beta.r).toBe(0);
      } else {
        expect(result.collapsedState.alpha.r).toBe(0);
        expect(result.collapsedState.beta.r).toBe(1);
      }
    });

    it('should perform quantum circuit: X gate flips |0⟩ to |1⟩', () => {
      let state = INITIAL_STATE;
      expect(getProbability(state)).toBe(0);
      
      // X gate: flips |0⟩ to |1⟩
      state = applyGate(state, 'X');
      
      // Should result in |1⟩
      const prob = getProbability(state);
      expect(prob).toBeCloseTo(1, 1);
    });

    it('should handle multiple gate operations', () => {
      let state = INITIAL_STATE;
      
      // Apply multiple gates
      state = applyGate(state, 'H');
      state = applyGate(state, 'Z');
      state = applyGate(state, 'X');
      state = applyGate(state, 'Y');
      
      // State should still be valid (probability between 0 and 1)
      const prob = getProbability(state);
      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    });
  });

  describe('State Transitions', () => {
    it('should transition from |0⟩ to |1⟩ via X gate', () => {
      const state = applyGate(INITIAL_STATE, 'X');
      expect(state.alpha.r).toBeCloseTo(0);
      expect(state.beta.r).toBeCloseTo(1);
    });

    it('should maintain state normalization', () => {
      const state = applyGate(INITIAL_STATE, 'H');
      // After Hadamard, |alpha|² + |beta|² should equal 1
      const alphaMag = Math.sqrt(state.alpha.r ** 2 + state.alpha.i ** 2);
      const betaMag = Math.sqrt(state.beta.r ** 2 + state.beta.i ** 2);
      const total = alphaMag ** 2 + betaMag ** 2;
      expect(total).toBeCloseTo(1, 5);
    });
  });
});

