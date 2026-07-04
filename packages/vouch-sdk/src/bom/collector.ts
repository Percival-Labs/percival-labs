/**
 * BomCollector — Accumulates provenance data during an agent session.
 * Lightweight: record methods are synchronous O(1) appends.
 * Feature flag: AI_BOM_ENABLED = "false"
 */
import type {
  ModelProvenance, ToolProvenance, DataProvenance, DataFlowEdge,
  TrustPosture, RiskLevel, AIBomEvent,
  SpdxDocument, SpdxPackage, SpdxRelationship,
  CycloneDxDocument, CycloneDxComponent,
} from './types.js';

export class BomCollector {
  private models: ModelProvenance[] = [];
  private tools: ToolProvenance[] = [];
  private dataAccesses: DataProvenance[] = [];
  private edges: DataFlowEdge[] = [];
  private agentVersion = '0.1.0';

  recordModelUsage(p: ModelProvenance): void { this.models.push(p); }
  recordToolUsage(p: ToolProvenance): void { this.tools.push(p); }
  recordDataAccess(p: DataProvenance): void { this.dataAccesses.push(p); }
  recordDataFlow(e: DataFlowEdge): void { this.edges.push(e); }
  setAgentVersion(v: string): void { this.agentVersion = v; }

  computeTrustPosture(): TrustPosture {
    const scores = this.tools.map((t) => t.publisherVouchScore).filter((s) => s > 0);
    const minToolPublisherScore = scores.length > 0 ? Math.min(...scores) : 0;
    const unverifiedToolCount = this.tools.filter((t) => t.publisherVouchScore === 0).length;
    const restrictedDataCount = this.dataAccesses.filter((d) => d.classificationLevel === 'restricted').length;
    return { minToolPublisherScore, unverifiedToolCount, restrictedDataCount,
      riskLevel: riskLevel(minToolPublisherScore, unverifiedToolCount, restrictedDataCount, this.tools.length) };
  }

  generateSnapshot(agentId: string, sessionId: string): AIBomEvent {
    return {
      schema_version: '0.2.0', event_id: evId(), timestamp: new Date().toISOString(),
      source_system: 'mcp-t', event_type: 'ai.bom.snapshot',
      bom: { agentId, agentVersion: this.agentVersion, sessionId,
        models: [...this.models], tools: [...this.tools],
        dataAccess: [...this.dataAccesses], dataFlowEdges: [...this.edges],
        trustPosture: this.computeTrustPosture() },
    };
  }

  exportSpdx(agentId = 'unknown-agent'): SpdxDocument {
    const now = new Date().toISOString();
    const packages: SpdxPackage[] = [];
    const relationships: SpdxRelationship[] = [];
    const addPkg = (id: string, pkg: SpdxPackage) => {
      packages.push(pkg);
      relationships.push({ spdxElementId: 'SPDXRef-DOCUMENT', relationshipType: 'DESCRIBES', relatedSpdxElement: id });
    };
    for (const m of this.models) {
      const id = `SPDXRef-Model-${spdxId(m.family)}`;
      const pkg: SpdxPackage = { SPDXID: id, name: m.family, versionInfo: m.version,
        downloadLocation: m.provider, supplier: `Organization: ${m.provider}` };
      if (m.weightsChecksum) pkg.checksums = [{ algorithm: 'SHA256', checksumValue: m.weightsChecksum }];
      const ai: string[] = [];
      if (m.quantization) ai.push(`quantization: ${m.quantization}`);
      if (m.finetuningLineage?.length) ai.push(`lineage: ${m.finetuningLineage.join(' -> ')}`);
      if (ai.length) pkg.annotations = [{ annotationDate: now, annotationType: 'REVIEW',
        annotator: 'Tool: percival-labs-ai-bom', comment: `AI-BOM: ${ai.join('; ')}` }];
      addPkg(id, pkg);
    }
    for (const t of this.tools) {
      const id = `SPDXRef-Tool-${spdxId(t.serverName)}-${spdxId(t.toolName)}`;
      addPkg(id, { SPDXID: id, name: `${t.serverName}/${t.toolName}`, versionInfo: t.source.version,
        downloadLocation: t.source.type === 'npm' ? `https://www.npmjs.com/package/${t.source.identifier}` : t.source.identifier,
        supplier: `Organization: ${t.publisherVouchId}`,
        checksums: [{ algorithm: 'SHA256', checksumValue: t.source.checksum }],
        annotations: [{ annotationDate: now, annotationType: 'REVIEW', annotator: 'Tool: percival-labs-ai-bom',
          comment: `AI-BOM: vouch_score=${t.publisherVouchScore}; scan=${t.lastScanResult}; scan_date=${t.lastScanDate}` }] });
    }
    return { spdxVersion: 'SPDX-2.3', dataLicense: 'CC0-1.0', SPDXID: 'SPDXRef-DOCUMENT',
      name: `ai-bom-${agentId}`, documentNamespace: `https://percival-labs.ai/spdx/ai-bom/${agentId}/${Date.now()}`,
      creationInfo: { created: now, creators: ['Tool: percival-labs-ai-bom-0.1.0'] }, packages, relationships };
  }

  exportCycloneDx(agentId = 'unknown-agent'): CycloneDxDocument {
    const components: CycloneDxComponent[] = [];
    for (const m of this.models) {
      const props = [{ name: 'ai-bom:provider', value: m.provider }];
      if (m.quantization) props.push({ name: 'ai-bom:quantization', value: m.quantization });
      if (m.routeId) props.push({ name: 'ai-bom:routeId', value: m.routeId });
      if (m.finetuningLineage?.length) props.push({ name: 'ai-bom:finetuningLineage', value: m.finetuningLineage.join(' -> ') });
      const c: CycloneDxComponent = { type: 'machine-learning-model', name: m.family, version: m.version, properties: props };
      if (m.weightsChecksum) c.hashes = [{ alg: 'SHA-256', content: m.weightsChecksum }];
      components.push(c);
    }
    for (const t of this.tools) {
      components.push({ type: 'library', name: `${t.serverName}/${t.toolName}`, version: t.source.version,
        purl: t.source.type === 'npm' ? `pkg:npm/${t.source.identifier}@${t.source.version}` : undefined,
        hashes: [{ alg: 'SHA-256', content: t.source.checksum }],
        properties: [{ name: 'ai-bom:vouchScore', value: String(t.publisherVouchScore) },
          { name: 'ai-bom:vouchId', value: t.publisherVouchId },
          { name: 'ai-bom:scanResult', value: t.lastScanResult },
          { name: 'ai-bom:scanDate', value: t.lastScanDate }] });
    }
    const p = this.computeTrustPosture();
    return { bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: `urn:uuid:${uuid4()}`, version: 1,
      metadata: { timestamp: new Date().toISOString(), tools: [{ name: 'percival-labs-ai-bom', version: '0.1.0' }],
        component: { type: 'application', name: agentId, version: this.agentVersion } },
      components, properties: [
        { name: 'ai-bom:riskLevel', value: p.riskLevel },
        { name: 'ai-bom:minToolPublisherScore', value: String(p.minToolPublisherScore) },
        { name: 'ai-bom:unverifiedToolCount', value: String(p.unverifiedToolCount) },
        { name: 'ai-bom:restrictedDataCount', value: String(p.restrictedDataCount) }] };
  }

  reset(): void { this.models = []; this.tools = []; this.dataAccesses = []; this.edges = []; }
}

// ── Helpers ──
function riskLevel(min: number, unverified: number, restricted: number, total: number): RiskLevel {
  if (restricted > 0 && unverified > 0) return 'critical';
  if (restricted > 0) return 'high';
  if (total > 0 && unverified / total > 0.5) return 'high';
  if (unverified > 0 || (min > 0 && min < 50)) return 'medium';
  return 'low';
}
const spdxId = (s: string) => s.replace(/[^a-zA-Z0-9.-]/g, '-');
const evId = () => `bom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const uuid4 = () => { const h = () => Math.random().toString(16).slice(2, 6);
  return `${h()}${h()}-${h()}-4${h().slice(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`; };
