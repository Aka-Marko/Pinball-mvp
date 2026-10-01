export type GamePhase = 'start' | 'ready' | 'playing' | 'paused' | 'gameover';

export class GameSession {
  private currentPhase: GamePhase = 'start';
  private resumePhase: 'ready' | 'playing' = 'playing';
  private ballsLeft = 3;
  private currentScore = 0;

  get phase(): GamePhase {
    return this.currentPhase;
  }

  get remainingBalls(): number {
    return this.ballsLeft;
  }

  get score(): number {
    return this.currentScore;
  }

  start(): void {
    if (this.currentPhase !== 'start' && this.currentPhase !== 'gameover') return;
    this.ballsLeft = 3;
    this.currentScore = 0;
    this.currentPhase = 'ready';
  }

  launch(): boolean {
    if (this.currentPhase !== 'ready') return false;
    this.currentPhase = 'playing';
    return true;
  }

  loseBall(): void {
    if (this.currentPhase !== 'playing') return;
    this.ballsLeft -= 1;
    this.currentPhase = this.ballsLeft === 0 ? 'gameover' : 'ready';
  }

  /** A weak plunge that rolls back down the shooter lane is re-armed without costing a ball. */
  returnToShooter(): void {
    if (this.currentPhase !== 'playing') return;
    this.currentPhase = 'ready';
  }

  addScore(points: number): void {
    if (this.currentPhase !== 'playing' || !Number.isFinite(points) || points <= 0) return;
    this.currentScore += points;
  }

  togglePause(): void {
    if (this.currentPhase === 'playing' || this.currentPhase === 'ready') {
      this.resumePhase = this.currentPhase;
      this.currentPhase = 'paused';
    } else if (this.currentPhase === 'paused') {
      this.currentPhase = this.resumePhase;
    }
  }
}
