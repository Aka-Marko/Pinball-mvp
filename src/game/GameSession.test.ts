import { describe, expect, it } from 'vitest';
import { GameSession } from './GameSession';

describe('GameSession', () => {
  it('starts with three balls and begins a game in the ready phase', () => {
    const session = new GameSession();

    expect(session.phase).toBe('start');
    session.start();
    expect(session.phase).toBe('ready');
    expect(session.remainingBalls).toBe(3);
    expect(session.score).toBe(0);
  });

  it('only launches a ready ball and counts each lost ball exactly once', () => {
    const session = new GameSession();
    session.start();

    expect(session.launch()).toBe(true);
    expect(session.launch()).toBe(false);
    session.loseBall();
    expect(session.phase).toBe('ready');
    expect(session.remainingBalls).toBe(2);

    session.loseBall();
    expect(session.remainingBalls).toBe(2);
    expect(session.launch()).toBe(true);
    session.loseBall();
    expect(session.phase).toBe('ready');
    expect(session.remainingBalls).toBe(1);
    expect(session.launch()).toBe(true);
    session.loseBall();
    expect(session.phase).toBe('gameover');
    expect(session.remainingBalls).toBe(0);
  });

  it('tracks bumper points only during active play', () => {
    const session = new GameSession();
    session.addScore(100);
    expect(session.score).toBe(0);
    session.start();
    expect(session.launch()).toBe(true);
    session.addScore(150);
    session.addScore(Number.NaN);
    session.addScore(-10);
    expect(session.score).toBe(150);
  });

  it('pauses and resumes the same game phase', () => {
    const session = new GameSession();
    session.start();
    session.togglePause();
    expect(session.phase).toBe('paused');
    session.togglePause();
    expect(session.phase).toBe('ready');

    session.launch();
    session.togglePause();
    session.togglePause();
    expect(session.phase).toBe('playing');
  });

  it('re-arms a ball that rolls back into the shooter lane without losing it', () => {
    const session = new GameSession();
    session.start();
    session.returnToShooter();
    expect(session.phase).toBe('ready');

    expect(session.launch()).toBe(true);
    session.returnToShooter();
    expect(session.phase).toBe('ready');
    expect(session.remainingBalls).toBe(3);
    expect(session.launch()).toBe(true);
  });

  it('restarts a completed game with a clean score and three balls', () => {
    const session = new GameSession();
    session.start();
    for (let ball = 0; ball < 3; ball += 1) {
      session.launch();
      session.addScore(100);
      session.loseBall();
    }

    session.start();
    expect(session.phase).toBe('ready');
    expect(session.remainingBalls).toBe(3);
    expect(session.score).toBe(0);
  });
});
