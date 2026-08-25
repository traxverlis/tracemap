export interface User {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  auth_provider: string;
}

export interface IdentityAttributes {
  name_variants?: string[];
  known_aliases?: string[];
  cities?: string[];
  notes?: string;
}

export interface Identity {
  id: string;
  label: string;
  description: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  country: string | null;
  attributes: IdentityAttributes;
  authorization_ack: boolean;
  authorization_ack_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Identifier {
  id: string;
  identity_id: string;
  type: 'email' | 'phone' | 'username' | 'name' | 'address' | 'domain';
  value: string;
  normalized_value: string;
  subtype: string | null;
  label: string | null;
  is_active: boolean;
  confidence: number;
  valid_from: string | null;
  valid_to: string | null;
  first_seen: string | null;
  last_seen: string | null;
  source_id: string | null;
  notes: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  identity_id: string;
  name: string;
  position: string | null;
  website: string | null;
  professional_profile_url: string | null;
  professional_domain: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_former: boolean;
  notes: string | null;
}

export interface Domain {
  id: string;
  identity_id: string;
  domain: string;
  known_owner: string | null;
  registrar: string | null;
  status: string | null;
  valid_from: string | null;
  valid_to: string | null;
  notes: string | null;
}

export interface Profile {
  id: string;
  identity_id: string;
  platform: string;
  username: string | null;
  url: string | null;
  is_active: boolean;
  is_public: boolean;
  notes: string | null;
}

export interface Photo {
  id: string;
  identity_id: string;
  filename: string;
  storage_path: string;
  sha256: string;
  perceptual_hash: string | null;
  content_type: string | null;
  size_bytes: number | null;
  platform: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  identity_id: string;
  platform: string;
  username: string | null;
  email: string | null;
  url: string | null;
  status: 'NEW' | 'SUGGESTED' | 'CONFIRMED' | 'REJECTED' | 'LATER';
  confidence: number;
  source: string | null;
  first_seen: string | null;
  last_seen: string | null;
  attributes: Record<string, unknown>;
}

export interface Finding {
  id: string;
  identity_id: string;
  source: string;
  category: 'account' | 'data_broker' | 'breach' | 'mention' | 'document' | 'domain' | 'other';
  title: string;
  value: string | null;
  url: string | null;
  confidence: number;
  status: string;
  broker_id: string | null;
  account_id: string | null;
  scan_id: string | null;
  discovered_at: string | null;
  last_verified_at: string | null;
  attributes: Record<string, unknown>;
}

export interface Evidence {
  id: string;
  finding_id: string;
  source_url: string | null;
  captured_at: string | null;
  content_hash: string | null;
  screenshot_path: string | null;
  html_path: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface ExplanationComponent {
  rule: string;
  label: string;
  weight: number;
  detail?: string;
}

export interface ExplanationJson {
  score?: number;
  band?: string;
  method?: string;
  components?: ExplanationComponent[];
}

export interface Relationship {
  id: string;
  identity_id: string | null;
  source_entity_type: string;
  source_entity_id: string;
  target_entity_type: string;
  target_entity_id: string;
  relationship_type:
    | 'OWNS'
    | 'USED'
    | 'LINKED_TO'
    | 'FOUND_ON'
    | 'MENTIONED_ON'
    | 'ASSOCIATED_WITH'
    | 'POSSIBLY_SAME_PERSON'
    | 'CONFIRMED_SAME_PERSON'
    | 'NOT_SAME_PERSON';
  confidence: number;
  source: string | null;
  status: 'UNKNOWN' | 'SUGGESTED' | 'CONFIRMED' | 'REJECTED';
  reason: string | null;
  explanation_json: ExplanationJson;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewItem {
  relationship: Relationship;
  question: string;
  source_label: string;
  target_label: string;
  platform: string | null;
  username: string | null;
  url: string | null;
  context: Record<string, unknown>;
}

export interface DataBroker {
  id: string;
  name: string;
  domain: string | null;
  country: string | null;
  category: string | null;
  search_url: string | null;
  optout_url: string | null;
  optout_method: string | null;
  requires_email: boolean;
  requires_phone: boolean;
  requires_identity_document: boolean;
  automation_possible: boolean;
  notes: string | null;
  last_checked: string | null;
}

export interface DeletionRequest {
  id: string;
  identity_id: string | null;
  finding_id: string | null;
  broker_id: string | null;
  status: 'TODO' | 'REQUESTED' | 'IN_PROGRESS' | 'CONFIRMED' | 'REFUSED' | 'REAPPEARED';
  method: string | null;
  requested_at: string | null;
  confirmation: string | null;
  confirmation_url: string | null;
  verified_at: string | null;
  next_check: string | null;
  notes: string | null;
}

export interface Scan {
  id: string;
  identity_id: string | null;
  scan_type: string;
  target: string;
  tool: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  started_at: string | null;
  finished_at: string | null;
  scheduled_for: string | null;
  error: string | null;
  parameters_json: Record<string, unknown>;
  created_at: string;
  result_count: number;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  result_type: string;
  value: string | null;
  url: string | null;
  confidence: number;
  raw_result_json: Record<string, unknown>;
  created_at: string | null;
}

export interface CompletenessCategory {
  category: string;
  label: string;
  known: number;
  expected: number;
  ratio: number;
  weight: number;
  missing: number;
}

export interface Completeness {
  score: number;
  explanation: string;
  categories: CompletenessCategory[];
}

export interface DashboardSummary {
  identifiers: number;
  emails: number;
  phones: number;
  usernames: number;
  addresses: number;
  profiles: number;
  accounts_found: number;
  relationships_confirmed: number;
  relationships_to_review: number;
  data_brokers: number;
  deletions_todo: number;
  deletions_requested: number;
  deletions_confirmed: number;
  data_reappeared: number;
  breaches: number;
  last_scan: Scan | null;
  next_scans: Scan[];
  completeness: Completeness;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  sublabel: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  status: string;
  confidence: number;
  reason: string | null;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  metadata: Record<string, unknown>;
}

export interface AISuggestion {
  id: string;
  type: string;
  source_entity: string | null;
  target_entity: string | null;
  provider: string | null;
  model: string | null;
  suggestion: string;
  rationale: string | null;
  confidence: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'LATER';
  created_at: string | null;
  validated_at: string | null;
  payload_json: Record<string, unknown>;
}

export interface AIStatus {
  enabled: boolean;
  provider: string;
  model: string | null;
  minimization: {
    allow_addresses: boolean;
    allow_phone_numbers: boolean;
    allow_full_emails: boolean;
  };
  capabilities: string[];
}

export interface ToolInfo {
  tool: string;
  scan_types: string[];
  enabled: boolean;
  description: string;
  requires: string[];
}

export interface SettingsResponse {
  environment: string;
  ai: AIStatus;
  tools: ToolInfo[];
  correlation: {
    max_auto_score: number;
    suggest_threshold: number;
  };
  storage: {
    evidence_dir: string;
    reports_dir: string;
  };
}

export interface BootstrapStatus {
  needs_bootstrap: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface HealthResponse {
  status: string;
  version: string;
}

export interface ApiError {
  detail: string;
}

export interface CorrelationRulesResponse {
  method: string;
  max_auto_score: number;
  rules: { key: string; label: string; weight: number; description: string }[];
}

export interface PromoteResponse {
  accounts_created: number;
  findings_created: number;
}

export interface CorrelationRunResponse {
  created: number;
  updated: number;
  relationships: Relationship[];
}

export interface ImportCatalogResponse {
  imported: number;
  skipped: number;
}
