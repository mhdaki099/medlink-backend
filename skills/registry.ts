/**
 * Skills System - Registry
 * 
 * Central registry for managing skills.
 */

import { Skill, SkillCategory, SkillManifest, SkillRegistry, SkillRegistrationResult, SkillFilter, PaginatedResult } from './types';

class SkillRegistryImpl implements SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private categories: Map<string, SkillCategory> = new Map();

  register(skill: Skill): SkillRegistrationResult {
    try {
      // Validate skill
      if (!skill.id || !skill.name) {
        return { success: false, error: 'Skill must have an id and name' };
      }

      // Check if skill already exists
      if (this.skills.has(skill.id)) {
        console.warn(`[SkillRegistry] Skill ${skill.id} already exists, updating...`);
      }

      // Set default values
      const skillWithDefaults: Skill = {
        status: 'active',
        ...skill,
        updated_at: new Date().toISOString(),
        created_at: skill.created_at || new Date().toISOString(),
      };

      // Store skill
      this.skills.set(skill.id, skillWithDefaults);

      console.log(`[SkillRegistry] Registered skill: ${skill.name} (${skill.id})`);

      return { success: true, skill: skillWithDefaults };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SkillRegistry] Failed to register skill:`, error);
      return { success: false, error: errorMessage };
    }
  }

  unregister(skillId: string): boolean {
    const existed = this.skills.has(skillId);
    if (existed) {
      this.skills.delete(skillId);
      console.log(`[SkillRegistry] Unregistered skill: ${skillId}`);
    }
    return existed;
  }

  get(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  getByCategory(category: string): Skill[] {
    return this.getAll().filter(skill => skill.category === category);
  }

  getByStatus(status: Skill['status']): Skill[] {
    return this.getAll().filter(skill => skill.status === status);
  }

  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(skill => 
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }

  filter(filters: SkillFilter): PaginatedResult<Skill> {
    let results = this.getAll();

    // Apply filters
    if (filters.category) {
      results = results.filter(s => s.category === filters.category);
    }

    if (filters.status) {
      results = results.filter(s => s.status === filters.status);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      results = results.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    // Pagination
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 10;
    const total = results.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = results.slice(startIndex, startIndex + pageSize);

    return { items, total, page, pageSize, totalPages };
  }

  // Category management
  registerCategory(category: SkillCategory): void {
    this.categories.set(category.id, category);
  }

  getCategory(categoryId: string): SkillCategory | undefined {
    return this.categories.get(categoryId);
  }

  getAllCategories(): SkillCategory[] {
    return Array.from(this.categories.values());
  }

  // Statistics
  getStats(): { total: number; active: number; inactive: number; byCategory: Record<string, number> } {
    const all = this.getAll();
    const byCategory: Record<string, number> = {};

    all.forEach(skill => {
      byCategory[skill.category] = (byCategory[skill.category] || 0) + 1;
    });

    return {
      total: all.length,
      active: all.filter(s => s.status === 'active').length,
      inactive: all.filter(s => s.status === 'inactive').length,
      byCategory,
    };
  }
}

// Export singleton instance
export const skillRegistry = new SkillRegistryImpl();

// Export class for testing/customization
export { SkillRegistryImpl };
