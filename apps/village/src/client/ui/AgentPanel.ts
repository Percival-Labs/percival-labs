/**
 * AgentPanel.ts — Expandable DOM panel for agent interaction.
 *
 * Shows agent details: name, role, stats, task, model, zone, trust score.
 * Click outside or press Esc to close.
 */

import { type AgentState } from '../systems/AgentManager';
import { type VouchBridge } from '../systems/VouchBridge';

export class AgentPanel {
  private panel: HTMLDivElement;
  private vouchBridge: VouchBridge | null;
  private onCloseHandler: ((e: KeyboardEvent) => void) | null = null;
  private onClickOutHandler: ((e: MouseEvent) => void) | null = null;

  constructor(vouchBridge: VouchBridge | null = null) {
    this.vouchBridge = vouchBridge;

    this.panel = document.createElement('div');
    Object.assign(this.panel.style, {
      position: 'fixed',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      width: '240px',
      background: 'rgba(22, 22, 30, 0.95)',
      border: '1px solid rgba(94, 234, 212, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      fontFamily: '"Courier New", monospace',
      color: '#c8cad0',
      zIndex: '10001',
      display: 'none',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    });

    document.body.appendChild(this.panel);
  }

  async show(state: AgentState): Promise<void> {
    const agent = state.agent;

    // Build stats bars
    const statsHtml = [
      this.statBar('HP', state.health, '#34d399'),
      this.statBar('EN', state.energy, '#fbbf24'),
      this.statBar('FCS', state.focus, '#a78bfa'),
    ].join('');

    // Trust score (async)
    let trustHtml = '';
    if (this.vouchBridge) {
      const score = await this.vouchBridge.getScore(agent.id);
      if (score !== null) {
        const tier = this.trustTier(score);
        trustHtml = `
          <div style="margin-top:8px;padding:6px 8px;background:rgba(94,234,212,0.1);border-radius:6px;font-size:10px;">
            <span style="color:${tier.color}">${tier.icon} ${tier.label}</span>
            <span style="float:right;color:#94a3b8">${score.toFixed(1)}</span>
          </div>`;
      }
    }

    this.panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${agent.color};flex-shrink:0;"></div>
        <div>
          <div style="font-size:13px;font-weight:bold;color:${agent.color};">${this.escapeHtml(agent.name)}</div>
          <div style="font-size:9px;color:#94a3b8;">${this.escapeHtml(agent.role)}</div>
        </div>
        <div style="margin-left:auto;font-size:9px;padding:2px 6px;border-radius:4px;background:${state.status === 'working' ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)'};color:${state.status === 'working' ? '#fbbf24' : '#34d399'};">
          ${this.escapeHtml(state.status)}
        </div>
      </div>

      ${statsHtml}

      ${state.task ? `
      <div style="margin-top:8px;font-size:9px;">
        <span style="color:#94a3b8;">Task:</span>
        <span style="color:#c8cad0;margin-left:4px;">${this.escapeHtml(state.task)}</span>
      </div>` : ''}

      ${state.model ? `
      <div style="margin-top:4px;font-size:9px;">
        <span style="color:#94a3b8;">Model:</span>
        <span style="color:#a78bfa;margin-left:4px;">${this.escapeHtml(state.model)}</span>
      </div>` : ''}

      <div style="margin-top:4px;font-size:9px;">
        <span style="color:#94a3b8;">Zone:</span>
        <span style="color:#5eead4;margin-left:4px;">${state.zone}</span>
      </div>

      ${trustHtml}
    `;

    this.panel.style.display = 'block';
    this.panel.style.animation = 'none';
    this.panel.offsetHeight; // force reflow
    this.panel.style.animation = 'slideIn 0.15s ease-out';

    // Close handlers
    this.onCloseHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.hide();
    };
    this.onClickOutHandler = (e: MouseEvent) => {
      if (!this.panel.contains(e.target as Node)) this.hide();
    };
    document.addEventListener('keydown', this.onCloseHandler);
    // Delay click listener to avoid immediate close from the same click
    setTimeout(() => {
      document.addEventListener('click', this.onClickOutHandler!);
    }, 100);

    // Inject animation keyframe if not present
    if (!document.getElementById('agent-panel-style')) {
      const style = document.createElement('style');
      style.id = 'agent-panel-style';
      style.textContent = `
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-50%) translateX(20px); }
          to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  hide(): void {
    this.panel.style.display = 'none';
    if (this.onCloseHandler) {
      document.removeEventListener('keydown', this.onCloseHandler);
      this.onCloseHandler = null;
    }
    if (this.onClickOutHandler) {
      document.removeEventListener('click', this.onClickOutHandler);
      this.onClickOutHandler = null;
    }
  }

  get visible(): boolean {
    return this.panel.style.display !== 'none';
  }

  private statBar(label: string, value: number, color: string): string {
    const pct = Math.round(Math.max(0, Math.min(100, value)));
    return `
      <div style="display:flex;align-items:center;gap:6px;margin-top:4px;font-size:9px;">
        <span style="width:24px;color:#94a3b8;">${label}</span>
        <div style="flex:1;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:2px;transition:width 0.3s;"></div>
        </div>
        <span style="width:24px;text-align:right;color:#94a3b8;">${pct}%</span>
      </div>`;
  }

  private trustTier(score: number): { label: string; icon: string; color: string } {
    if (score >= 90) return { label: 'Diamond', icon: '\u{1F48E}', color: '#a78bfa' };
    if (score >= 70) return { label: 'Gold', icon: '\u{1F947}', color: '#fbbf24' };
    if (score >= 50) return { label: 'Silver', icon: '\u{1FA99}', color: '#94a3b8' };
    return { label: 'Bronze', icon: '\u{1F949}', color: '#d4a574' };
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  destroy(): void {
    this.hide();
    this.panel.remove();
  }
}
