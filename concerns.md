# Repository Architectural Concerns & Issues

## 🤖 **AGENT INSTRUCTIONS**

**When user says "do concerns.md":**
1. **ALWAYS work on the TOPMOST issue** in the "ACTIVE ISSUES" section below
2. **Follow ALL action items** for that concern in order
3. **Test thoroughly** after implementing changes
4. **When completed:** Move the resolved concern from "ACTIVE ISSUES" to "RESOLVED ISSUES" section
5. **Update status:** Add completion date and brief notes about what was done

**DO NOT skip issues or work out of order. Always do the topmost concern first.**

---

## 📋 **ACTIVE ISSUES** (Work from top to bottom)

This section contains all unresolved concerns in priority order. **ALWAYS work on the first item in this list.**

### **CONCERN-006: Package.json Entry Point Issues**
**Issue:** Incorrect main field configurations violate Node.js conventions.

**Current Issues:**
- App: `"main": "index.html"` (HTML files shouldn't be main entry points)
- Shared: Points to TypeScript source instead of compiled output

**Action Items:**
1. Fix app package.json main field
2. Add proper TypeScript compilation for shared package
3. Point main fields to compiled JavaScript output
4. Add proper module/exports fields

---

## 🔧 **MEDIUM PRIORITY - Build System & Tooling**

### **CONCERN-007: Inconsistent Build Configuration**
**Issue:** Mixed build tooling and configuration patterns across workspaces.

**Current Issues:**
- Marketing: `vite.config.mjs` (ES Module)  
- App: `vite.config.js` (CommonJS)
- Inconsistent configuration patterns

**Action Items:**
1. Standardize Vite config file extensions
2. Align configuration patterns across workspaces
3. Optimize build configurations for each environment
4. Document build system architecture

---

### **CONCERN-008: Missing TypeScript Configuration**
**Issue:** Using `.ts` files without proper TypeScript compilation setup.

**Action Items:**
1. Add `tsconfig.json` for shared package
2. Set up TypeScript compilation pipeline
3. Configure proper build output directories
4. Update package.json to reference compiled output

---

### **CONCERN-009: Missing Development Tooling**
**Issue:** No code quality, formatting, or testing framework configurations.

**Missing Tools:**
- ESLint configuration
- Prettier configuration  
- Test framework setup (despite existing test files)
- Git hooks for code quality

**Action Items:**
1. Add ESLint with appropriate rules
2. Set up Prettier for consistent formatting
3. Configure test framework (Jest/Vitest)
4. Add pre-commit hooks for quality checks

---

## 📦 **MEDIUM PRIORITY - Dependency Management**

### **CONCERN-010: Duplicate Configuration Files**
**Issue:** 3 identical `.npmrc` files with same content across workspaces.

**Files:**
- `/wageCalculator/.npmrc`
- `/app/.npmrc` 
- `/marketing/.npmrc`

**Action Items:**
1. Remove duplicate .npmrc files
2. Keep only root-level configuration
3. Document npm configuration strategy

---

### **CONCERN-011: Dependency Version Inconsistencies**
**Issue:** Same dependencies with different versions across packages.

**Example:**
- `@supabase/supabase-js`: App (2.55.0) vs Server (^2.53.0)

**Action Items:**
1. Audit all shared dependencies
2. Align versions across workspaces  
3. Use workspace dependency hoisting
4. Document dependency management strategy

---

### **CONCERN-012: Improper Dependency Categorization**
**Issue:** Dependencies incorrectly categorized as dependencies vs devDependencies.

**Examples:**
- Vite in dependencies instead of devDependencies
- Build tools mixed with runtime dependencies

**Action Items:**
1. Audit all package.json dependency categories
2. Move build tools to devDependencies
3. Ensure runtime dependencies are properly categorized
4. Clean up unused dependencies

---

## 🏗️ **LOW PRIORITY - Workspace Organization**

### **CONCERN-013: Workspace Responsibility Boundaries**
**Issue:** Unclear separation of concerns between workspace packages.

**Current Issues:**
- Root package.json has build dependencies
- App package.json has server-related scripts
- Blurred workspace boundaries

**Action Items:**
1. Define clear workspace responsibilities
2. Move build dependencies to appropriate packages
3. Separate server and app concerns
4. Document workspace architecture

---

### **CONCERN-014: Over-engineered Shared Package**
**Issue:** Shared package contains only a 2-line comment file but has full package structure.

**Action Items:**
1. Evaluate if shared package is needed
2. Either populate with actual shared code or remove
3. Simplify if keeping minimal functionality
4. Document shared package purpose

---

### **CONCERN-015: Netlify Configuration Duplication**
**Issue:** Two different Netlify configurations in the same repository.

**Files:**
- Root `netlify.toml` (30 lines, marketing site)
- App `netlify.toml` (5 lines, SPA fallback)

**Action Items:**
1. Clarify deployment strategy
2. Consolidate or clearly separate deployment configs
3. Document which configuration serves what purpose

---

### **CONCERN-016: Inconsistent Naming Conventions**
**Issue:** Mixed naming patterns throughout the codebase.

**Examples:**
- `readme.md` (lowercase) vs standard `README.md`
- Mixed file extensions for similar configs
- Inconsistent directory naming

**Action Items:**
1. Standardize file naming conventions
2. Rename files to follow conventions
3. Document naming standards
4. Add linting rules to enforce conventions

---

### **CONCERN-017: Node.js Version Inconsistencies**
**Issue:** Inconsistent Node.js version requirements across packages.

**Current State:**
- Root: No engine specification
- App & Server: `"node": ">=22"`
- Marketing & Shared: No engine specification

**Action Items:**
1. Define standard Node.js version for entire monorepo
2. Add engine specifications to all packages
3. Add .nvmrc file for version management
4. Document Node.js requirements

---

## 📋 **Implementation Strategy**

### **Phase 1: Security & Critical Issues (CONCERN-001 to CONCERN-003)**
Priority: Immediate  
Estimated effort: 1-2 days

### **Phase 2: Architecture & Maintainability (CONCERN-004 to CONCERN-006)**  
Priority: High
Estimated effort: 3-5 days

### **Phase 3: Build System & Tooling (CONCERN-007 to CONCERN-009)**
Priority: Medium
Estimated effort: 2-3 days

### **Phase 4: Dependency Management (CONCERN-010 to CONCERN-012)**
Priority: Medium  
Estimated effort: 1-2 days

### **Phase 5: Workspace Organization (CONCERN-013 to CONCERN-017)**
Priority: Low
Estimated effort: 2-3 days

---

## ✅ **RESOLVED ISSUES**

This section contains completed concerns. Format when moving from ACTIVE to RESOLVED:

### ~~**CONCERN-001: Environment File Proliferation & Security Risk**~~ ✅
**Completed:** 2025-09-03  
**Notes:** Removed all .env files with production secrets, created comprehensive .env.example templates for each workspace, enhanced .gitignore protection, and documented proper environment setup in ENVIRONMENT_SETUP.md. Implemented centralized environment strategy with workspace-specific configurations.

### ~~**CONCERN-002: Console Statements in Production Code**~~ ✅
**Completed:** 2025-09-03  
**Notes:** Removed all console statements from 21+ production source files using automated script. Implemented proper logging system with component-based categorization for both client and server. Added ESLint configuration to prevent future console statements. Enhanced error reporting system with development debugging support and production monitoring capabilities.

### ~~**CONCERN-003: Production Configuration in Repository**~~ ✅
**Completed:** 2025-09-03  
**Notes:** Removed server/.env.local containing production configuration from repository. Enhanced ENVIRONMENT_SETUP.md with proper secrets management documentation. Confirmed all .env files are properly ignored by git. Established secure environment configuration strategy for development and production deployments.

---

## 📊 **PROGRESS TRACKING**

**Total Concerns:** 17  
**Completed:** 3  
**Remaining:** 14  
**Estimated Remaining Effort:** 6-12 days

**Document Status:** Created on 2025-09-03  
**Last Updated:** 2025-09-03

---

*This document serves as a working checklist. Agent should always work on the topmost ACTIVE issue and move completed items to RESOLVED section.*