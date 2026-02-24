// ═══════════════════════════════════════════════════════════════════════════
// Phase definitions for Voyage Inside the Cell
// ═══════════════════════════════════════════════════════════════════════════

export interface Phase {
    id: number;
    title: string;
    instruction: string;
    type: 'intro' | 'click' | 'drag' | 'drag-multi' | 'drag-chain' | 'complete';
    target?: string;
    points?: number;
    dragItem?: string;
    dragTarget?: string;
    total?: number;
    steps?: string[];
}

export const PHASES: Phase[] = [
    { id: 0, title: 'Enter the Cell', instruction: 'Welcome! Click Continue to begin your voyage inside a living cell.', type: 'intro' },
    { id: 1, title: 'Find the Mitochondria', instruction: 'The cell needs energy. Click on the Mitochondria — the cell\'s power generator.', type: 'click', target: 'Mitochondria', points: 100 },
    { id: 2, title: 'Feed the Cell', instruction: 'Drag the Glucose Molecule into the Mitochondria to start cellular respiration.', type: 'drag', dragItem: 'Glucose Molecule', dragTarget: 'Mitochondria', points: 150 },
    { id: 3, title: 'Clean the Cell', instruction: 'Drag all 3 damaged proteins into the Lysosome. (0/3)', type: 'drag-multi', dragTarget: 'Lysosome', total: 3, points: 100 },
    { id: 4, title: 'Build a Protein', instruction: 'Step 1: Drag the polypeptide into the Endoplasmic Reticulum.', type: 'drag-chain', steps: ['Endoplasmic Reticulum', 'Golgi Apparatus'], points: 100 },
    { id: 5, title: 'Mission Complete', instruction: 'You\'ve mastered cellular respiration!', type: 'complete' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Knowledge Card data — shown after each phase interaction
// ═══════════════════════════════════════════════════════════════════════════

export interface KnowledgeCard {
    title: string;
    body: string;
    tag: string;
}

export const KNOWLEDGE_CARDS: Record<number, KnowledgeCard> = {
    1: {
        title: 'Mitochondria',
        body: 'The double-membraned powerhouse. Cristae folds maximize surface area for ATP synthase — more folds = more ATP. This structure explains why mitochondria produce 36 ATP per glucose.',
        tag: 'AP Bio: Inner membrane = electron transport chain site. IB HL: B2.2.4',
    },
    2: {
        title: 'Cellular Respiration',
        body: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36 ATP. Three stages: Glycolysis (cytoplasm, 2 ATP) → Krebs Cycle (matrix, 2 ATP) → Electron Transport Chain (inner membrane, 32 ATP).',
        tag: 'Common misconception: carbon atoms leave as CO₂ you breathe out — mass is conserved.',
    },
    3: {
        title: 'Lysosome',
        body: 'Contains 50+ hydrolytic enzymes at pH 4.5. This acidic environment is essential — if ruptured, the cytoplasm\'s higher pH neutralizes the enzymes, protecting the cell. Waste is broken into reusable monomers.',
        tag: 'IB: Lysosome dysfunction → Tay-Sachs disease. AP Bio: connects to autophagy pathway.',
    },
    4: {
        title: 'Endomembrane System',
        body: 'Protein pathway: Ribosome → Rough ER (folding + glycosylation) → Golgi (sorting + packaging) → Vesicle → Cell Membrane (exocytosis). Order is essential — each station modifies the protein.',
        tag: 'AP Bio FRQ target: Golgi cis face receives from ER, trans face ships to membrane.',
    },
};
