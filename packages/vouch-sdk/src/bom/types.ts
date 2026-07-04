/**
 * AI-BOM (AI Bill of Materials) — MCP-T Protocol Extension
 *
 * Live provenance tracking for models, tools, and data sources
 * during agent sessions. Extends MCP-T behavioral traces with
 * supply chain verification.
 *
 * Feature flag: AI_BOM_ENABLED = "false"
 *
 * @see /docs/design/ai-bom-design.md
 */

// ── Model Provenance ──

export interface ModelProvenance {
  /** Model family (e.g. "claude-3.5-sonnet", "llama-3.1-70b") */
  family: string;
  /** Specific version or checkpoint */
  version: string;
  /** Quantization level if applicable (e.g. "Q4_K_M", "fp16") */
  quantization?: string;
  /** Who served the inference — Gateway routing decision */
  provider: string;
  /** Gateway route that selected this provider */
  routeId?: string;
  /** Fine-tuning lineage: base model -> adapter chain */
  finetuningLineage?: string[];
  /** SHA-256 of model weights if locally hosted */
  weightsChecksum?: string;
}

// ── Tool Provenance ──

export interface ToolSource {
  type: 'npm' | 'local' | 'remote';
  /** Package name or path */
  identifier: string;
  /** Resolved version */
  version: string;
  /** SHA-256 of the server binary/package */
  checksum: string;
}

export interface ToolProvenance {
  /** MCP server name */
  serverName: string;
  /** Tool name within the server */
  toolName: string;
  /** Source: npm package, local binary, or remote URL */
  source: ToolSource;
  /** Last security scan timestamp (ISO 8601) */
  lastScanDate: string;
  /** Security scan result (from vouch scan) */
  lastScanResult: 'clean' | 'warnings' | 'critical';
  /** Vouch trust score for the tool publisher */
  publisherVouchScore: number;
  /** Vouch entity ID for the publisher */
  publisherVouchId: string;
}

// ── Data Provenance ──

export interface DataProvenance {
  /** Unique identifier for this data access */
  accessId: string;
  /** Source system (database, API, file, RAG, etc.) */
  sourceType: string;
  /** Human-readable source name */
  sourceName: string;
  /** MCP-T permission classification level */
  classificationLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  /** Was this data used as input to a model inference? */
  usedAsModelInput: boolean;
  /** Which output(s) did this data influence? */
  influencedOutputIds: string[];
  /** Timestamp of access (ISO 8601) */
  accessedAt: string;
}

// ── Data Flow ──

export interface DataFlowEdge {
  inputAccessId: string;
  outputId: string;
  transformType: 'direct' | 'inference' | 'aggregation';
}

// ── Trust Posture ──

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface TrustPosture {
  /** Minimum Vouch score across all tool publishers */
  minToolPublisherScore: number;
  /** Number of tools with no Vouch score (unverified) */
  unverifiedToolCount: number;
  /** Number of data sources at restricted classification */
  restrictedDataCount: number;
  /** Composite risk level */
  riskLevel: RiskLevel;
}

// ── BOM Snapshot ──

export interface BomSnapshot {
  /** Agent identity */
  agentId: string;
  agentVersion: string;
  /** Session this BOM covers */
  sessionId: string;
  /** Models used in this session */
  models: ModelProvenance[];
  /** Tools loaded in this session */
  tools: ToolProvenance[];
  /** Data accessed in this session */
  dataAccess: DataProvenance[];
  /** Data flow graph: which inputs influenced which outputs */
  dataFlowEdges: DataFlowEdge[];
  /** Overall trust posture derived from Vouch scores */
  trustPosture: TrustPosture;
}

// ── AI-BOM Event (extends MCP-T trace envelope) ──

export interface AIBomEvent {
  /** Standard MCP-T trace envelope */
  schema_version: '0.2.0';
  event_id: string;
  timestamp: string;
  source_system: 'mcp-t';
  event_type: 'ai.bom.snapshot';
  /** The BOM itself */
  bom: BomSnapshot;
}

// ── SPDX / CycloneDX export shapes (minimal valid documents) ──

export interface SpdxPackage {
  SPDXID: string;
  name: string;
  versionInfo: string;
  downloadLocation: string;
  supplier?: string;
  checksums?: Array<{ algorithm: string; checksumValue: string }>;
  annotations?: Array<{ annotationDate: string; annotationType: 'REVIEW'; annotator: string; comment: string }>;
}

export interface SpdxRelationship {
  spdxElementId: string;
  relationshipType: string;
  relatedSpdxElement: string;
}

export interface SpdxDocument {
  spdxVersion: 'SPDX-2.3';
  dataLicense: 'CC0-1.0';
  SPDXID: 'SPDXRef-DOCUMENT';
  name: string;
  documentNamespace: string;
  creationInfo: { created: string; creators: string[] };
  packages: SpdxPackage[];
  relationships: SpdxRelationship[];
}

export interface CycloneDxComponent {
  type: 'library' | 'framework' | 'application' | 'machine-learning-model';
  name: string;
  version: string;
  purl?: string;
  hashes?: Array<{ alg: string; content: string }>;
  properties?: Array<{ name: string; value: string }>;
}

export interface CycloneDxDocument {
  bomFormat: 'CycloneDX';
  specVersion: '1.5';
  serialNumber: string;
  version: 1;
  metadata: { timestamp: string; tools: Array<{ name: string; version: string }>; component: { type: string; name: string; version: string } };
  components: CycloneDxComponent[];
  properties?: Array<{ name: string; value: string }>;
}
