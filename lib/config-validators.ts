// ─── Shared game config validation functions ────────────────────────────────
// Extracted from app/api/assemble-game/route.ts for reuse in edit-game.

export function humanReadableName(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

// ─── Layer 1: Schema Validation ──────────────────────────────────────────────

export function validateSchemaLayer(config: any): any {
  const errors: string[] = [];

  if (!config.meta) config.meta = {};
  if (!config.meta.id) config.meta.id = `game-${Date.now()}`;
  if (!config.meta.title) config.meta.title = 'Untitled Experience';
  if (!config.meta.subject) config.meta.subject = 'Biology';
  if (!config.meta.grade) config.meta.grade = 'high';
  if (!config.meta.duration_minutes) config.meta.duration_minutes = 10;
  if (!Array.isArray(config.meta.ngss_standards)) config.meta.ngss_standards = [];
  if (!Array.isArray(config.meta.learning_objectives)) config.meta.learning_objectives = [];

  if (!config.environment) config.environment = {};
  const VALID_PRESETS = ['forest', 'starry', 'japan', 'default', 'dream'];
  if (!config.environment.preset || !VALID_PRESETS.includes(config.environment.preset)) {
    errors.push(`[SCHEMA] Invalid preset "${config.environment.preset}" → defaulting to "forest"`);
    config.environment.preset = 'forest';
  }
  if (!config.environment.skybox_prompt) config.environment.skybox_prompt = '';
  if (!config.environment.lighting) config.environment.lighting = 'neutral';

  if (!Array.isArray(config.phases) || config.phases.length === 0) {
    errors.push('[SCHEMA] No phases found → creating minimal intro + complete');
    config.phases = [
      { id: 'intro', type: 'intro', title: 'Welcome', instruction: 'Your journey begins here.', points: 0 },
      { id: 'complete', type: 'complete', title: 'Complete', instruction: 'Well done!', points: 0 },
    ];
  }

  if (config.phases[0]?.type !== 'intro') {
    config.phases.unshift({ id: 'intro', type: 'intro', title: 'Welcome', instruction: 'Your adventure begins now.', points: 0 });
    errors.push('[SCHEMA] Added missing intro phase');
  }
  if (config.phases[config.phases.length - 1]?.type !== 'complete') {
    config.phases.push({ id: 'complete', type: 'complete', title: 'Mission Complete!', instruction: 'Great work!', points: 0 });
    errors.push('[SCHEMA] Added missing complete phase');
  }

  for (const phase of config.phases) {
    if (!phase.id) phase.id = `phase-${Math.random().toString(36).slice(2, 8)}`;
    if (!phase.type) { phase.type = 'intro'; errors.push(`[SCHEMA] Phase "${phase.id}" missing type → intro`); }
    if (!phase.title) phase.title = phase.id;
    if (!phase.instruction) phase.instruction = phase.title;
    if (phase.points === undefined || phase.points === null) phase.points = 0;

    switch (phase.type) {
      case 'click':
        if (!phase.target_asset) errors.push(`[SCHEMA] ClickPhase "${phase.id}" missing target_asset`);
        break;
      case 'drag':
        if (!phase.drag_item) errors.push(`[SCHEMA] DragPhase "${phase.id}" missing drag_item`);
        if (!phase.drag_target) errors.push(`[SCHEMA] DragPhase "${phase.id}" missing drag_target`);
        break;
      case 'drag-multi':
        if (!phase.drag_target) errors.push(`[SCHEMA] DragMultiPhase "${phase.id}" missing drag_target`);
        if (!phase.total || phase.total < 1) { phase.total = 3; errors.push(`[SCHEMA] DragMultiPhase "${phase.id}" total → 3`); }
        break;
      case 'drag-chain': {
        // Auto-convert deprecated drag-chain → drag using first step
        const steps = Array.isArray(phase.steps) ? phase.steps : [];
        const firstStep = steps[0];
        if (firstStep?.drag_item && firstStep?.drag_target) {
          phase.type = 'drag';
          phase.drag_item = firstStep.drag_item;
          phase.drag_target = firstStep.drag_target;
          errors.push(`[SCHEMA] Converted drag-chain "${phase.id}" → drag (using first step)`);
        } else {
          // No valid steps — convert to click if possible, otherwise leave as intro
          phase.type = 'intro';
          errors.push(`[SCHEMA] Converted drag-chain "${phase.id}" → intro (no valid steps)`);
        }
        delete phase.steps;
        break;
      }
      case 'quiz':
        if (!phase.question) phase.question = 'Question not generated';
        if (!Array.isArray(phase.options) || phase.options.length < 2) {
          errors.push(`[SCHEMA] QuizPhase "${phase.id}" missing options → defaults`);
          phase.options = [
            { id: 'a', text: 'Option A', is_correct: true },
            { id: 'b', text: 'Option B', is_correct: false },
            { id: 'c', text: 'Option C', is_correct: false },
            { id: 'd', text: 'Option D', is_correct: false },
          ];
        }
        if (!phase.explanation) phase.explanation = '';
        break;
      case 'explore':
        if (!Array.isArray(phase.target_position) || phase.target_position.length !== 3) {
          errors.push(`[SCHEMA] ExplorePhase "${phase.id}" missing target_position → [0, 0.8, -10]`);
          phase.target_position = [0, 0.8, -10];
        }
        if (!phase.trigger_radius || phase.trigger_radius < 0.5) phase.trigger_radius = 2.5;
        break;
    }
  }

  if (!Array.isArray(config.assets)) config.assets = [];
  for (const asset of config.assets) {
    if (!asset.id) asset.id = `asset-${Math.random().toString(36).slice(2, 8)}`;
    if (!asset.name) asset.name = humanReadableName(asset.id);
    if (!asset.role) asset.role = 'interactive';
    if (!Array.isArray(asset.position) || asset.position.length !== 3) asset.position = [0, 0.8, -5];
    if (!Array.isArray(asset.rotation)) asset.rotation = [0, 0, 0];
    if (!asset.scale || asset.scale <= 0) asset.scale = 1;
  }

  if (!config.scoring) config.scoring = {};
  if (!config.knowledge_cards || typeof config.knowledge_cards !== 'object') config.knowledge_cards = {};
  if (!config.hud) config.hud = { show_score: true, show_phase_counter: true, show_instruction: true, show_timer: true, show_knowledge_cards: true, show_tasks: true };

  if (errors.length > 0) {
    console.log('[SCHEMA VALIDATION]', errors.length, 'issues fixed:');
    errors.forEach((e) => console.log('  ', e));
  }
  return config;
}

// ─── Layer 2: Asset Reference Integrity ──────────────────────────────────────

export function fixAssetReferences(config: any): any {
  const fixes: string[] = [];
  const existingIds = new Set(config.assets.map((a: any) => a.id));

  function inferName(id: string, _phaseId: string): string {
    // Always derive the name from the asset id — never use phase.title,
    // which describes the task (e.g. "Deliver proteins") not the object.
    return humanReadableName(id);
  }

  function createPlaceholder(id: string, role: string, phaseId: string, index: number): any {
    const colorMap: Record<string, string> = {
      target: 'hsl(210, 70%, 55%)',
      draggable: 'hsl(35, 90%, 55%)',
      interactive: 'hsl(160, 70%, 45%)',
    };
    let position: [number, number, number];
    if (role === 'target') {
      position = [(Math.random() - 0.5) * 8, 0.8, -5 - Math.random() * 10];
    } else {
      const angle = (index / 5) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 6 + Math.random() * 8;
      position = [Math.cos(angle) * radius, 0.8, -3 + Math.sin(angle) * radius * -1];
    }
    for (const existing of config.assets) {
      if (!existing.position) continue;
      const dx = position[0] - existing.position[0];
      const dz = position[2] - existing.position[2];
      if (Math.sqrt(dx * dx + dz * dz) < 3) { position[0] += 3; position[2] -= 2; }
    }
    const name = inferName(id, phaseId);
    return {
      id, name, model_source: 'placeholder', model_path: null,
      primitive_color: colorMap[role] || colorMap.interactive,
      position, rotation: [0, 0, 0], scale: 1, role, quest_phase_id: phaseId,
      description: `Placeholder for ${name}`,
    };
  }

  function ensureAsset(id: string, role: string, phaseId: string, index: number) {
    if (!id || existingIds.has(id)) return;
    config.assets.push(createPlaceholder(id, role, phaseId, index));
    existingIds.add(id);
    fixes.push(`[REF] Phase "${phaseId}" references "${id}" → created ${role} placeholder`);
  }

  for (const phase of config.phases) {
    switch (phase.type) {
      case 'click':
        ensureAsset(phase.target_asset, 'target', phase.id, 0);
        break;
      case 'drag':
        ensureAsset(phase.drag_item, 'draggable', phase.id, 0);
        ensureAsset(phase.drag_target, 'target', phase.id, 1);
        break;
      case 'drag-multi': {
        ensureAsset(phase.drag_target, 'target', phase.id, 0);
        const existingDraggables = config.assets.filter(
          (a: any) => a.quest_phase_id === phase.id && a.role === 'draggable'
        );
        const total = phase.total || 3;
        const count = existingDraggables.length;
        console.log(`[VALIDATE] drag-multi "${phase.id}": total=${total}, actual draggables=${count}`);
        if (count < total) {
          fixes.push(`[REF] DragMulti "${phase.id}" needs ${total} draggables, has ${count} → cloning ${total - count} from template`);
          const template = existingDraggables[0] || null;
          for (let i = 0; i < total - count; i++) {
            const baseId = template?.id || `${phase.id}-item`;
            let itemId = `${baseId}-${count + i + 2}`;
            // Ensure unique
            while (existingIds.has(itemId)) { itemId += '-x'; }
            // Clone from template if available, otherwise create placeholder
            if (template) {
              const angle = ((count + i + 1) / total) * Math.PI * 2;
              const radius = 4 + Math.random() * 4;
              const pos: [number, number, number] = [
                Math.cos(angle) * radius,
                template.position?.[1] ?? 0.8,
                -3 + Math.sin(angle) * radius * -1,
              ];
              config.assets.push({
                ...template,
                id: itemId,
                position: pos,
              });
            } else {
              config.assets.push(createPlaceholder(itemId, 'draggable', phase.id, i + 2));
            }
            existingIds.add(itemId);
          }
        } else if (count > total) {
          // Remove excess draggables, keep only the first `total`
          const excess = existingDraggables.slice(total);
          for (const item of excess) {
            const idx = config.assets.indexOf(item);
            if (idx > -1) config.assets.splice(idx, 1);
            existingIds.delete(item.id);
          }
          fixes.push(`[REF] DragMulti "${phase.id}" had ${count} draggables but total=${total} → removed ${excess.length} excess`);
          console.log(`[DRAG-MULTI] "${phase.id}": removed ${excess.length} excess draggables (had ${count}, total=${total})`);
        }
        break;
      }
      case 'drag-chain':
        for (let i = 0; i < (phase.steps || []).length; i++) {
          const step = phase.steps[i];
          ensureAsset(step.drag_item, 'draggable', phase.id, i * 2);
          ensureAsset(step.drag_target, 'target', phase.id, i * 2 + 1);
        }
        break;
    }
  }

  // ── Fix asset names: delivery targets and click targets should use their own
  //    id-derived name, never the phase title. GPT often sets asset.name to the
  //    phase title (e.g. "Deliver Proteins to Ribosome") which is wrong.
  for (const phase of config.phases) {
    const targetIds: string[] = [];
    if (phase.type === 'click' && phase.target_asset) targetIds.push(phase.target_asset);
    if (phase.type === 'drag' && phase.drag_target) targetIds.push(phase.drag_target);
    if (phase.type === 'drag-multi' && phase.drag_target) targetIds.push(phase.drag_target);
    if (phase.type === 'drag-chain') {
      for (const step of (phase.steps || [])) {
        if (step.drag_target) targetIds.push(step.drag_target);
      }
    }
    for (const tid of targetIds) {
      const asset = config.assets.find((a: any) => a.id === tid);
      if (!asset) continue;
      // If name matches the phase title (or is empty), replace with id-derived name
      if (!asset.name || asset.name === phase.title || asset.name === phase.id) {
        const proper = humanReadableName(tid);
        fixes.push(`[NAME] "${tid}" name was "${asset.name}" → "${proper}"`);
        asset.name = proper;
      }
    }
  }

  if (fixes.length > 0) {
    console.log('[REF VALIDATION]', fixes.length, 'fixes applied:');
    fixes.forEach((f) => console.log('  ', f));
  }
  return config;
}

// ─── Layer 3: Gameplay Consistency ───────────────────────────────────────────

export function fixGameplayConsistency(config: any): any {
  const fixes: string[] = [];

  // Role consistency
  for (const phase of config.phases) {
    switch (phase.type) {
      case 'click': {
        const asset = config.assets.find((a: any) => a.id === phase.target_asset);
        if (asset && asset.role !== 'target') {
          console.log(`[ROLE-FIX] Phase "${phase.id}" click target "${phase.target_asset}" → role set to "target" (was "${asset.role}")`);
          asset.role = 'target';
          fixes.push(`[ROLE] "${asset.id}" → target (was "${asset.role}")`);
        } else if (asset) {
          console.log(`[ROLE-OK] Phase "${phase.id}" click target "${phase.target_asset}" already role="${asset.role}"`);
        } else {
          console.log(`[ROLE-MISS] Phase "${phase.id}" click target "${phase.target_asset}" — asset not found in config.assets`);
        }
        break;
      }
      case 'drag': {
        const item = config.assets.find((a: any) => a.id === phase.drag_item);
        if (item && item.role !== 'draggable') { item.role = 'draggable'; item.quest_phase_id = phase.id; fixes.push(`[ROLE] "${item.id}" → draggable`); }
        const target = config.assets.find((a: any) => a.id === phase.drag_target);
        if (target && target.role === 'draggable') { target.role = 'target'; fixes.push(`[ROLE] "${target.id}" → target`); }
        break;
      }
      case 'drag-multi': {
        const target = config.assets.find((a: any) => a.id === phase.drag_target);
        if (target && target.role === 'draggable') { target.role = 'target'; fixes.push(`[ROLE] "${target.id}" → target`); }
        for (const asset of config.assets) {
          if (asset.quest_phase_id === phase.id && asset.role !== 'draggable' && asset.id !== phase.drag_target) {
            asset.role = 'draggable'; fixes.push(`[ROLE] "${asset.id}" → draggable`);
          }
        }
        break;
      }
      case 'drag-chain': {
        for (const step of (phase.steps || [])) {
          const item = config.assets.find((a: any) => a.id === step.drag_item);
          if (item && item.role !== 'draggable') { item.role = 'draggable'; item.quest_phase_id = phase.id; fixes.push(`[ROLE] "${item.id}" → draggable`); }
          const target = config.assets.find((a: any) => a.id === step.drag_target);
          if (target && target.role === 'draggable') { target.role = 'target'; fixes.push(`[ROLE] "${target.id}" → target`); }
        }
        break;
      }
    }
  }

  // drag-multi: ensure total === actual draggable count (remove excess if needed)
  for (const phase of config.phases) {
    if (phase.type !== 'drag-multi') continue;
    const draggables = config.assets.filter(
      (a: any) => a.quest_phase_id === phase.id && a.role === 'draggable',
    );
    if (draggables.length > phase.total) {
      const excess = draggables.slice(phase.total);
      for (const item of excess) {
        const idx = config.assets.indexOf(item);
        if (idx > -1) config.assets.splice(idx, 1);
      }
      console.log(`[DRAG-MULTI] "${phase.id}": removed ${excess.length} excess draggables (had ${draggables.length}, total=${phase.total})`);
      fixes.push(`[TOTAL] "${phase.id}" removed ${excess.length} excess (${draggables.length} → ${phase.total})`);
    }
    // Final sync: total must equal actual count
    const finalCount = config.assets.filter(
      (a: any) => a.quest_phase_id === phase.id && a.role === 'draggable',
    ).length;
    if (phase.total !== finalCount) {
      console.log(`[DRAG-MULTI] "${phase.id}": total synced to ${finalCount} (was ${phase.total})`);
      fixes.push(`[TOTAL] "${phase.id}" total ${phase.total} → ${finalCount}`);
      phase.total = finalCount;
    }
  }

  // Scoring recalculation
  let totalPoints = 0;
  for (const phase of config.phases) {
    if (phase.type !== 'intro' && phase.type !== 'complete') {
      totalPoints += (phase.points || 0);
      if (phase.time_bonus?.bonus_points) totalPoints += phase.time_bonus.bonus_points;
    }
  }
  if (config.scoring.max_possible !== totalPoints) {
    fixes.push(`[SCORING] max_possible ${config.scoring.max_possible} → ${totalPoints}`);
    config.scoring.max_possible = totalPoints;
  }
  config.scoring.passing_threshold = Math.floor(totalPoints * 0.6);

  // Position fixes
  for (const asset of config.assets) {
    if (asset.position[1] < 0) { asset.position[1] = 0.8; fixes.push(`[POS] "${asset.id}" y<0 → 0.8`); }
    if (asset.position[1] > 10) { asset.position[1] = 2; fixes.push(`[POS] "${asset.id}" y>10 → 2`); }
  }
  for (let i = 0; i < config.assets.length; i++) {
    for (let j = i + 1; j < config.assets.length; j++) {
      const a = config.assets[i], b = config.assets[j];
      const dx = a.position[0] - b.position[0];
      const dz = a.position[2] - b.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 2) {
        const angle = Math.atan2(dz, dx) + Math.PI;
        b.position[0] += Math.cos(angle) * (2 - dist + 0.5);
        b.position[2] += Math.sin(angle) * (2 - dist + 0.5);
        fixes.push(`[POS] "${b.id}" too close to "${a.id}" → pushed apart`);
      }
    }
  }

  // ExplorePhase target_position
  for (const phase of config.phases) {
    if (phase.type !== 'explore') continue;
    if (!Array.isArray(phase.target_position) || phase.target_position.length !== 3) {
      const relatedAsset = config.assets.find((a: any) =>
        phase.title?.toLowerCase().includes(a.name?.toLowerCase()) ||
        phase.instruction?.toLowerCase().includes(a.name?.toLowerCase())
      );
      if (relatedAsset) {
        phase.target_position = [...relatedAsset.position];
        phase.target_position[1] = 0.8;
      } else {
        phase.target_position = [0, 0.8, -10];
      }
    }
    if (!phase.trigger_radius || phase.trigger_radius < 1) phase.trigger_radius = 2.5;
  }

  // Knowledge cards for interactive phases
  for (const phase of config.phases) {
    if (phase.type === 'intro' || phase.type === 'complete') continue;
    if (!config.knowledge_cards[phase.id]) {
      config.knowledge_cards[phase.id] = {
        title: phase.title,
        body: `You completed: ${phase.instruction}`,
        tag: config.meta?.subject || 'Biology',
      };
      fixes.push(`[CARDS] Created placeholder card for "${phase.id}"`);
    }
  }

  // NPC hints
  if (config.npc) {
    if (!config.npc.hints) config.npc.hints = {};
    for (const phase of config.phases) {
      if (phase.type === 'intro' || phase.type === 'complete') continue;
      if (!config.npc.hints[phase.id]) {
        config.npc.hints[phase.id] = `Try to: ${phase.instruction}`;
      }
    }
    if (!Array.isArray(config.npc.spawn_position) || config.npc.spawn_position.length !== 3) {
      config.npc.spawn_position = [8, 1.5, -8];
      fixes.push('[NPC] Missing spawn_position → [8, 1.5, -8]');
    } else {
      // Ensure NPC is not too close to player spawn (origin)
      const [nx, , nz] = config.npc.spawn_position;
      const distFromOrigin = Math.sqrt(nx * nx + nz * nz);
      if (distFromOrigin < 3) {
        config.npc.spawn_position = [8, 1.5, -8];
        fixes.push(`[NPC] spawn_position too close to origin (dist=${distFromOrigin.toFixed(1)}) → [8, 1.5, -8]`);
      }
    }
  }

  if (fixes.length > 0) {
    console.log('[GAMEPLAY VALIDATION]', fixes.length, 'consistency fixes:');
    fixes.forEach((f) => console.log('  ', f));
  }
  return config;
}
