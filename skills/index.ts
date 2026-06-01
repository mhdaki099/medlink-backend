/**
 * Skills System - Main Entry Point
 * 
 * This module provides a centralized way to register, manage, and execute
 * various skills and capabilities in the application.
 */

import { Skill, SkillCategory, SkillManifest } from './types';

// Export types
export * from './types';

// Export skill registry
export { skillRegistry } from './registry';

// Export hooks
export { useSkill, useSkillsByCategory, useAllSkills } from './hooks';

// Export utilities
export { validateSkillManifest, loadSkillFromManifest } from './utils';

// Version
export const SKILLS_SYSTEM_VERSION = '1.0.0';

// Default categories
export const DEFAULT_CATEGORIES: SkillCategory[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Online store and product management capabilities',
    icon: 'ShoppingCart',
    color: '#10B981'
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Data analysis and reporting capabilities',
    icon: 'BarChart3',
    color: '#3B82F6'
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Third-party service integrations',
    icon: 'Plug',
    color: '#8B5CF6'
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Messaging and notification capabilities',
    icon: 'MessageSquare',
    color: '#F59E0B'
  }
];

// Initialize skills system
export function initializeSkillsSystem(): void {
  console.log(`[Skills System] Initialized v${SKILLS_SYSTEM_VERSION}`);
  
  // Load default categories
  DEFAULT_CATEGORIES.forEach(category => {
    // Register category in the system
  });
}

// Export default
export default {
  version: SKILLS_SYSTEM_VERSION,
  initialize: initializeSkillsSystem,
  categories: DEFAULT_CATEGORIES
};
