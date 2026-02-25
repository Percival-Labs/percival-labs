/**
 * EditorMode.ts — Mode management for the village builder.
 *
 * Three modes: play (agents active), build (place items), paint (zone painting).
 */

export type EditorModeType = 'play' | 'build' | 'paint';

export type ModeChangeListener = (mode: EditorModeType, prev: EditorModeType) => void;

export class EditorMode {
  private current: EditorModeType = 'build';
  private listeners: ModeChangeListener[] = [];

  get mode(): EditorModeType {
    return this.current;
  }

  set(mode: EditorModeType): void {
    if (mode === this.current) return;
    const prev = this.current;
    this.current = mode;
    for (const fn of this.listeners) fn(mode, prev);
  }

  onChange(fn: ModeChangeListener): void {
    this.listeners.push(fn);
  }

  isPlay(): boolean {
    return this.current === 'play';
  }

  isBuild(): boolean {
    return this.current === 'build';
  }

  isPaint(): boolean {
    return this.current === 'paint';
  }
}
