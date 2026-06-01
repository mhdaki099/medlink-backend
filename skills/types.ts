/**
 * Skills System - Type Definitions
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  icon?: string;
  author?: string;
  license?: string;
  keywords?: string[];
  permissions?: string[];
  status: 'active' | 'inactive' | 'error';
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  skills?: Skill[];
}

export interface SkillManifest {
  name: string;
  display_name?: string;
  description: string;
  version: string;
  category: string;
  icon?: string;
  author?: string;
  license?: string;
  keywords?: string[];
  permissions?: string[];
  entry_point?: string;
  ui_components?: string[];
  hooks?: string[];
  utilities?: string[];
  default_config?: Record<string, any>;
  dependencies?: string[];
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// Skill Registry Types
// ============================================================================

export interface SkillRegistry {
  register(skill: Skill): void;
  unregister(skillId: string): void;
  get(skillId: string): Skill | undefined;
  getAll(): Skill[];
  getByCategory(category: string): Skill[];
  getByStatus(status: Skill['status']): Skill[];
  search(query: string): Skill[];
}

export interface SkillRegistrationResult {
  success: boolean;
  skill?: Skill;
  error?: string;
}

// ============================================================================
// Skill Execution Types
// ============================================================================

export interface SkillContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface SkillExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
  metadata?: Record<string, any>;
}

export type SkillExecutor<TInput = any, TOutput = any> = (
  input: TInput,
  context: SkillContext
) => Promise<SkillExecutionResult<TOutput>>;

// ============================================================================
// Skill Configuration Types
// ============================================================================

export interface SkillConfig {
  [key: string]: any;
}

export interface SkillConfigSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: any;
  description?: string;
  enum?: any[];
  properties?: Record<string, SkillConfigSchema>;
}

export interface SkillConfigValidationResult {
  valid: boolean;
  errors?: string[];
  config?: SkillConfig;
}

// ============================================================================
// Skill Event Types
// ============================================================================

export interface SkillEvent {
  type: string;
  skillId: string;
  timestamp: string;
  data?: any;
}

export type SkillEventHandler = (event: SkillEvent) => void;

export interface SkillEventEmitter {
  on(event: string, handler: SkillEventHandler): void;
  off(event: string, handler: SkillEventHandler): void;
  emit(event: SkillEvent): void;
}

// ============================================================================
// Skill Hook Types
// ============================================================================

export interface SkillHook<Input = any, Output = any> {
  name: string;
  execute: (input: Input) => Promise<Output>;
  dependencies?: string[];
}

export interface SkillHookRegistry {
  register(hook: SkillHook): void;
  unregister(hookName: string): void;
  execute<Input, Output>(hookName: string, input: Input): Promise<Output>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SkillId = string;
export type SkillName = string;
export type SkillVersion = string;
export type SkillCategoryId = string;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SkillFilter {
  category?: string;
  status?: Skill['status'];
  search?: string;
  page?: number;
  pageSize?: number;
}
