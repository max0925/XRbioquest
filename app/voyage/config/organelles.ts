// Game models from Supabase storage
const SUPABASE = 'https://tqqimwpwjnaldwuibeqf.supabase.co/storage/v1/object/public/assets';

export const ORGANELLES = [
    {
        uid: '397631a85faa487ba1f1cc4fe5e1b7e3',
        name: 'Mitochondria',
        modelPath: `${SUPABASE}/mitochondria_-_cell_organelles.glb`,
        position: { x: -1.5, y: 0, z: -3 },
        description: 'Powerhouse of the cell - produces ATP energy',
        function: 'energy'
    },
    {
        uid: '6bd2957542ae4625aa0dcd180d979f9b',
        name: 'Lysosome',
        modelPath: `${SUPABASE}/lysosome.glb`,
        position: { x: 1.5, y: 0, z: -3 },
        description: 'Digestive system - breaks down waste and cellular debris',
        function: 'digestion'
    },
    {
        uid: 'cd27ea87988348faa351ae2b7237e1d9',
        name: 'Endoplasmic Reticulum',
        modelPath: `${SUPABASE}/endoplasmic_reticulum.glb`,
        position: { x: 0, y: 0, z: -4.5 },
        description: 'Transport network - processes and transports proteins',
        function: 'transport'
    },
    {
        uid: 'f9a893dac37e43a487bc92e7f828db50',
        name: 'Golgi Apparatus',
        modelPath: `${SUPABASE}/golgi_apparatuscomplex.glb`,
        position: { x: -3, y: 0, z: -4 },
        description: 'Packaging center - modifies and packages proteins',
        function: 'packaging'
    },
    {
        uid: '10659ca1502c4ade88abba6284bb50f2',
        name: 'Glucose Molecule',
        modelPath: `${SUPABASE}/glucose_molecule.glb`,
        position: { x: 1.5, y: 1, z: -3 },
        description: 'Energy source - fuel for cellular respiration',
        function: 'fuel'
    },
];