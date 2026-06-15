export interface DataPoint {
  category: string;
  score: number;
  description: string;
  evidence: string;
  timestamp?: number;
  timestampLabel?: string;
}

export interface SyntaxMapping {
  sentenceStructureAnalysis: string;
  rhetoricalDensity: number;
  grammarFlags: string[];
}

export interface PathwayStimulation {
  pathway: string;
  intensity: number;
  description: string;
}

export interface NeuroplasticityPathways {
  cognitiveBypassRatio: number;
  stimulatedPathways: PathwayStimulation[];
}

export interface MathematicalImpact {
  cognitiveLoadIndex: number;
  emotionalResonanceIndex: number;
  biasDensityScore: number;
}

export interface BehavioralAudit {
  syntaxMapping: SyntaxMapping;
  neuroplasticity: NeuroplasticityPathways;
  impact: MathematicalImpact;
}

export interface ScreenshotReport {
  coreContent: string;
  metadataContext: string;
  forensicAnalysis: string;
  bsRiskScore: string;
}

export interface ScanResponse {
  audit: DataPoint[];
  wordCount: number;
  isYouTube: boolean;
  videoId: string | null;
  behavioralAudit?: BehavioralAudit;
  quotaExhausted?: boolean;
  screenshotReport?: ScreenshotReport;
  verifiableManifest?: VerifiableAuditManifest;
}

export interface FactCheckClaim {
  claim: string;
  status: "Verified" | "Disputed" | "Contradicted" | "Unverified";
  explanation: string;
  sources: { title: string; url: string }[];
}

export interface FactCheckResponse {
  claims: FactCheckClaim[];
  backingSources: { title: string; url: string }[];
  quotaExhausted?: boolean;
}

export interface SystemMetadata {
  clientHeaders: Record<string, string | string[] | undefined>;
  modelParameters: Record<string, any>;
  routingTimestamp: number;
}

export interface TelemetryData {
  ttft: number | null;
  tokenGenerationSpeed: number | null;
  routingPathFlags: string | null;
  totalLatencyMs?: number;
}

export interface VerifiableAuditManifest {
  version: string;
  issuer: string;
  payload: {
    rawIngestedData: string;
    metadata: SystemMetadata;
    scanResponse: {
      auditId: string;
      targetResource: string;
      dataPoints: DataPoint[];
      discourseIntegrityRating: number;
    };
    telemetry: TelemetryData;
  };
  cryptographicSignature: string;
}
