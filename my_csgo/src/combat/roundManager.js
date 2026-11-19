// Pure, DOM/WebGL-free CS Round & C4 Bomb Defusal state machine

export const ROUND_PHASES = {
  FREEZETIME: 'FREEZETIME',
  LIVE: 'LIVE',
  BOMB_PLANTED: 'BOMB_PLANTED',
  ROUND_END: 'ROUND_END'
};

export const ROUND_DEFAULTS = {
  freezeTime: 3.5,
  roundTime: 115,
  c4Timer: 40,
  roundEndDelay: 4.0,
  plantDuration: 3.2,
  defuseDuration: 10.0,
  defuseKitDuration: 5.0,
  winEliminationReward: 3250,
  winObjectiveReward: 3500,
  lossBaseReward: 1400,
  lossStepReward: 500,
  lossMaxReward: 3400
};

export class RoundManager {
  constructor(options = {}) {
    this.mode = options.mode === 'deathmatch' ? 'deathmatch' : 'bomb_defusal';
    this.freezeTime = options.freezeTime ?? (this.mode === 'deathmatch' ? 0 : ROUND_DEFAULTS.freezeTime);
    this.roundTime = options.roundTime ?? ROUND_DEFAULTS.roundTime;
    this.c4Timer = options.c4Timer ?? ROUND_DEFAULTS.c4Timer;
    this.roundEndDelay = options.roundEndDelay ?? ROUND_DEFAULTS.roundEndDelay;
    this.plantDuration = options.plantDuration ?? ROUND_DEFAULTS.plantDuration;
    this.defuseDuration = options.defuseDuration ?? ROUND_DEFAULTS.defuseDuration;
    this.defuseKitDuration = options.defuseKitDuration ?? ROUND_DEFAULTS.defuseKitDuration;

    this.roundNumber = 1;
    this.scoreCT = 0;
    this.scoreT = 0;
    this.lossStreakCT = 0;
    this.lossStreakT = 0;

    this.phase = ROUND_PHASES.LIVE;
    this.phaseTimer = this.roundTime;
    this.bombPlanted = false;
    this.bombSite = null;
    this.bombPosition = null;
    this.bombTimer = 0;
    this.beepAccumulator = 0;

    this.lastWinner = null;
    this.lastReason = null;
    this.matchElapsed = 0;

    this.startRound();
  }

  getLossBonus(streak) {
    const clampedStreak = Math.max(0, Math.floor(streak));
    return Math.min(
      ROUND_DEFAULTS.lossMaxReward,
      ROUND_DEFAULTS.lossBaseReward + ROUND_DEFAULTS.lossStepReward * clampedStreak
    );
  }

  getDefuseDuration(hasKit = false) {
    return hasKit ? this.defuseKitDuration : this.defuseDuration;
  }

  getBeepInterval(remaining = this.bombTimer) {
    const ratio = Math.max(0, Math.min(1, remaining / Math.max(1, this.c4Timer)));
    return 0.14 + (1.0 - 0.14) * Math.pow(ratio, 1.35);
  }

  startRound() {
    this.bombPlanted = false;
    this.bombSite = null;
    this.bombPosition = null;
    this.bombTimer = 0;
    this.beepAccumulator = 0;
    this.lastWinner = null;
    this.lastReason = null;

    if (this.mode === 'deathmatch' || this.freezeTime <= 0) {
      this.phase = ROUND_PHASES.LIVE;
      this.phaseTimer = this.roundTime;
    } else {
      this.phase = ROUND_PHASES.FREEZETIME;
      this.phaseTimer = this.freezeTime;
    }

    return {
      type: 'phase_change',
      phase: this.phase,
      roundNumber: this.roundNumber
    };
  }

  plantBomb(site, pos) {
    if (this.mode !== 'bomb_defusal' || this.phase !== ROUND_PHASES.LIVE || this.bombPlanted) {
      return null;
    }

    this.phase = ROUND_PHASES.BOMB_PLANTED;
    this.bombPlanted = true;
    this.bombSite = site || 'A';
    this.bombPosition = pos ? { x: pos.x, y: pos.y ?? 0, z: pos.z } : { x: 0, y: 0, z: 0 };
    this.bombTimer = this.c4Timer;
    this.phaseTimer = this.c4Timer;
    this.beepAccumulator = 0;

    return {
      type: 'phase_change',
      phase: ROUND_PHASES.BOMB_PLANTED,
      site: this.bombSite,
      pos: { ...this.bombPosition }
    };
  }

  defuseBomb() {
    if (this.mode !== 'bomb_defusal' || this.phase !== ROUND_PHASES.BOMB_PLANTED) {
      return null;
    }

    this.bombPlanted = false;
    return this._endRound('CT', 'bomb_defused');
  }

  _endRound(winner, reason) {
    const isObjective = reason === 'bomb_defused' || reason === 'target_bombed';
    const winReward = isObjective ? ROUND_DEFAULTS.winObjectiveReward : ROUND_DEFAULTS.winEliminationReward;

    let rewardCT = 0;
    let rewardT = 0;

    if (winner === 'CT') {
      this.scoreCT++;
      this.lossStreakCT = 0;
      rewardCT = winReward;
      rewardT = this.getLossBonus(this.lossStreakT);
      this.lossStreakT = Math.min(4, this.lossStreakT + 1);
    } else {
      this.scoreT++;
      this.lossStreakT = 0;
      rewardT = winReward;
      rewardCT = this.getLossBonus(this.lossStreakCT);
      this.lossStreakCT = Math.min(4, this.lossStreakCT + 1);
    }

    this.phase = ROUND_PHASES.ROUND_END;
    this.phaseTimer = this.roundEndDelay;
    this.lastWinner = winner;
    this.lastReason = reason;

    return {
      type: 'round_end',
      winner,
      reason,
      roundNumber: this.roundNumber,
      scoreCT: this.scoreCT,
      scoreT: this.scoreT,
      rewardCT,
      rewardT
    };
  }

  update(delta, { aliveCT = 1, aliveT = 1 } = {}) {
    const events = [];
    const dt = Math.max(0, Number(delta) || 0);
    if (dt === 0) return events;

    if (this.mode === 'deathmatch') {
      this.matchElapsed += dt;
      return events;
    }

    if (this.phase === ROUND_PHASES.FREEZETIME) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phase = ROUND_PHASES.LIVE;
        this.phaseTimer = this.roundTime;
        events.push({
          type: 'phase_change',
          phase: ROUND_PHASES.LIVE,
          from: ROUND_PHASES.FREEZETIME,
          roundNumber: this.roundNumber
        });
      }
      return events;
    }

    if (this.phase === ROUND_PHASES.LIVE) {
      if (aliveT <= 0 && aliveCT > 0) {
        events.push(this._endRound('CT', 'elimination'));
        return events;
      }
      if (aliveCT <= 0) {
        events.push(this._endRound('T', 'elimination'));
        return events;
      }

      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.phaseTimer = 0;
        events.push(this._endRound('CT', 'time_expired'));
      }
      return events;
    }

    if (this.phase === ROUND_PHASES.BOMB_PLANTED) {
      this.bombTimer -= dt;
      this.phaseTimer = Math.max(0, this.bombTimer);
      this.beepAccumulator -= dt;

      if (this.bombTimer > 0 && this.beepAccumulator <= 0) {
        const interval = this.getBeepInterval(this.bombTimer);
        this.beepAccumulator = interval;
        events.push({
          type: 'c4_beep',
          remaining: this.bombTimer,
          urgency: Math.max(0, Math.min(1, 1 - this.bombTimer / this.c4Timer)),
          interval
        });
      }

      if (this.bombTimer <= 0) {
        this.bombTimer = 0;
        this.bombPlanted = false;
        events.push({
          type: 'c4_explode',
          site: this.bombSite,
          pos: this.bombPosition ? { ...this.bombPosition } : null
        });
        events.push(this._endRound('T', 'target_bombed'));
        return events;
      }

      // If all CTs die while bomb is planted, Ts win; if all Ts die, CTs still must defuse!
      if (aliveCT <= 0) {
        events.push(this._endRound('T', 'elimination'));
      }
      return events;
    }

    if (this.phase === ROUND_PHASES.ROUND_END) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.roundNumber++;
        const startEvent = this.startRound();
        events.push({
          type: 'new_round',
          roundNumber: this.roundNumber,
          phase: startEvent.phase
        });
      }
      return events;
    }

    return events;
  }
}
