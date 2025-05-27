# Migration Plan: WatermelonDB → LiveStore + Zod Integration

## Overview

This document outlines the migration strategy from WatermelonDB to LiveStore with Zod integration for improved type safety, performance, and modern development patterns.

## Current State

- **Database**: WatermelonDB with SQLite backend
- **Type Safety**: TypeScript interfaces with manual JSON parsing
- **API**: Cloudflare Workers with manual validation
- **Sync**: No real-time sync capabilities
- **Templates**: Backend-driven template system ✅ (completed)

## Target State

- **Database**: LiveStore with SQLite backend
- **Type Safety**: Zod schemas with runtime validation
- **API**: Zod-validated endpoints with automatic parsing
- **Sync**: Real-time sync with Cloudflare Workers
- **Templates**: Zod-validated template system

## Migration Phases

### Phase 1: Zod Schema Foundation ✅ (In Progress)

**Goal**: Establish type-safe schemas for all data structures

**Tasks**:
- [x] Install Zod in db and backend packages
- [x] Create comprehensive Zod schemas (`packages/db/src/schemas/index.ts`)
- [ ] Update backend API to use Zod validation
- [ ] Update template service to use Zod parsing
- [ ] Add Zod to frontend package

**Benefits**:
- Runtime type validation
- Better error messages
- Automatic JSON parsing/serialization
- Type safety across API boundaries

### Phase 2: Backend API Zod Integration

**Goal**: Implement Zod validation in all backend endpoints

**Tasks**:
- [ ] Update template endpoints to use Zod schemas
- [ ] Add request/response validation middleware
- [ ] Implement proper error handling with Zod errors
- [ ] Update CORS handling for new response format

**Files to Update**:
- `packages/backend/src/handlers/*.ts`
- `packages/backend/src/index.ts`

**Example Implementation**:
```typescript
// Before
export async function getRoomTemplates(): Promise<Response> {
  const templates = await db.prepare('SELECT * FROM room_templates').all();
  return new Response(JSON.stringify(templates));
}

// After
export async function getRoomTemplates(): Promise<Response> {
  const templates = await db.prepare('SELECT * FROM room_templates').all();
  const validatedTemplates = z.array(RoomTemplateSchema).parse(templates);
  const response = ApiResponseSchema(z.array(RoomTemplateSchema)).parse({
    success: true,
    data: validatedTemplates,
    timestamp: Date.now()
  });
  return new Response(JSON.stringify(response));
}
```

### Phase 3: Frontend Zod Integration

**Goal**: Update frontend to use Zod schemas and validated API responses

**Tasks**:
- [ ] Add Zod to frontend package
- [ ] Update template service to use Zod parsing
- [ ] Replace manual JSON parsing with Zod validation
- [ ] Update TypeScript types to use Zod inferred types

**Files to Update**:
- `packages/db/src/services/template-service.ts`
- `packages/db/src/services/game-service.ts`

### Phase 4: LiveStore Migration Planning

**Goal**: Plan the migration from WatermelonDB to LiveStore

**Research Tasks**:
- [ ] Analyze LiveStore's SQLite schema requirements
- [ ] Compare WatermelonDB vs LiveStore APIs
- [ ] Plan data migration strategy
- [ ] Evaluate sync provider options (Cloudflare Workers)

**Key Considerations**:
- **Schema Migration**: LiveStore uses different table structures
- **Reactivity**: Different reactive patterns than WatermelonDB
- **Sync**: Built-in sync vs manual implementation
- **Performance**: SQLite WASM vs IndexedDB

### Phase 5: LiveStore Implementation

**Goal**: Replace WatermelonDB with LiveStore

**Tasks**:
- [ ] Install LiveStore packages
- [ ] Create LiveStore schema definitions
- [ ] Implement data migration utilities
- [ ] Update game service to use LiveStore APIs
- [ ] Update React components to use LiveStore reactivity

**LiveStore Packages Needed**:
```json
{
  "@livestore/livestore": "^0.3.0",
  "@livestore/react": "^0.3.0",
  "@livestore/adapter-web": "^0.3.0",
  "@livestore/sync-cf": "^0.3.0",
  "@livestore/devtools-vite": "^0.3.0"
}
```

### Phase 6: Sync Implementation

**Goal**: Implement real-time sync between clients and server

**Tasks**:
- [ ] Set up LiveStore sync provider with Cloudflare Workers
- [ ] Implement conflict resolution strategies
- [ ] Add offline support
- [ ] Test multi-client synchronization

## Benefits of Migration

### Zod Integration Benefits

1. **Type Safety**: Runtime validation ensures data integrity
2. **Developer Experience**: Better error messages and autocomplete
3. **API Reliability**: Automatic request/response validation
4. **Maintenance**: Single source of truth for data structures
5. **Documentation**: Schemas serve as living documentation

### LiveStore Benefits

1. **Performance**: SQLite WASM is faster than IndexedDB
2. **Real-time Sync**: Built-in synchronization capabilities
3. **Modern Architecture**: Event sourcing and reactive patterns
4. **Cloudflare Integration**: Native support for Cloudflare Workers
5. **Developer Tools**: Better debugging and development experience

## Risk Mitigation

### Data Migration Risks

- **Backup Strategy**: Export all game data before migration
- **Rollback Plan**: Keep WatermelonDB implementation until LiveStore is stable
- **Testing**: Comprehensive testing with existing game data

### API Breaking Changes

- **Versioning**: Implement API versioning during transition
- **Backward Compatibility**: Support both old and new API formats temporarily
- **Gradual Migration**: Migrate endpoints one by one

### Performance Risks

- **Benchmarking**: Compare performance before and after migration
- **Monitoring**: Track performance metrics during migration
- **Optimization**: Profile and optimize critical paths

## Implementation Timeline

### Week 1-2: Zod Foundation
- Complete Phase 1 and 2 (Zod schemas and backend integration)
- Test API validation thoroughly

### Week 3-4: Frontend Zod Integration
- Complete Phase 3 (frontend Zod integration)
- Ensure all JSON parsing is replaced with Zod validation

### Week 5-6: LiveStore Research and Planning
- Complete Phase 4 (LiveStore migration planning)
- Create detailed migration strategy

### Week 7-10: LiveStore Implementation
- Complete Phase 5 (LiveStore implementation)
- Migrate data and test thoroughly

### Week 11-12: Sync and Polish
- Complete Phase 6 (sync implementation)
- Performance optimization and bug fixes

## Success Metrics

1. **Type Safety**: Zero runtime type errors
2. **Performance**: Faster database operations than WatermelonDB
3. **Developer Experience**: Reduced development time for new features
4. **Reliability**: Improved error handling and validation
5. **Sync**: Real-time multi-client synchronization working

## Next Steps

1. **Immediate**: Complete backend Zod integration (Phase 2)
2. **Short-term**: Frontend Zod integration (Phase 3)
3. **Medium-term**: LiveStore research and planning (Phase 4)
4. **Long-term**: Full LiveStore migration (Phase 5-6)

---

*This migration plan will be updated as we progress through each phase and learn more about the requirements and challenges.* 
