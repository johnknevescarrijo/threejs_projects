export const FIXED_HZ = 64;
export const FIXED_DT = 1 / FIXED_HZ;

const STEP_EPSILON = 1e-9;

/**
 * Creates a deterministic fixed-timestep accumulator loop.
 * Clamps incoming frame delta and caps substeps per frame to prevent spiral-of-death.
 */
export function createFixedStepper({
  stepHz = FIXED_HZ,
  maxFrameDelta = 0.1,
  maxSubsteps = 5
} = {}) {
  const dt = 1 / stepHz;
  let accumulator = 0;

  return {
    dt,
    stepHz,
    reset() {
      accumulator = 0;
    },
    advance(rawDelta, onFixedStep) {
      const safeDelta = Number.isFinite(rawDelta) ? rawDelta : 0;
      const clampedDelta = Math.min(Math.max(0, safeDelta), maxFrameDelta);
      accumulator += clampedDelta;

      let stepsExecuted = 0;
      while (accumulator + STEP_EPSILON >= dt && stepsExecuted < maxSubsteps) {
        accumulator = Math.max(0, accumulator - dt);
        if (typeof onFixedStep === 'function') {
          onFixedStep(dt);
        }
        stepsExecuted++;
      }

      // Drain leftover time if substep cap was hit so simulation doesn't spiral behind
      if (stepsExecuted >= maxSubsteps && accumulator >= dt) {
        accumulator = 0;
      }

      const alpha = Math.min(Math.max(0, accumulator / dt), 1 - STEP_EPSILON);
      return {
        stepsExecuted,
        alpha,
        clampedDelta
      };
    }
  };
}
