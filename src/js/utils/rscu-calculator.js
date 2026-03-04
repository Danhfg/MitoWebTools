/**
 * RSCU Calculator Module
 * Calculates Relative Synonymous Codon Usage (RSCU) from FASTA sequences.
 * 
 * Includes all NCBI translation tables (1-6, 9-16, 21-33).
 * Reference: https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi
 * 
 * RSCU formula: RSCU(codon_j, aa_i) = X_j / (1/n_i × Σ X_k)
 * Where X_j = count of codon j, n_i = number of synonymous codons, Σ X_k = total usage for amino acid i.
 */

// ─── NCBI Translation Tables ────────────────────────────────────────────────
// Format: { id, name, aas, base1, base2, base3 }
// aas string: 64 characters mapping each codon to an amino acid (* = stop)
// base1/2/3: define the codon order (TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG...)

const BASE1 = 'TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG';
const BASE2 = 'TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG';
const BASE3 = 'TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG';

const GENETIC_CODES = [
    { id: 1, name: 'Standard Code', aas: 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 2, name: 'Vertebrate Mitochondrial Code', aas: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSS**VVVVAAAADDEEGGGG' },
    { id: 3, name: 'Yeast Mitochondrial Code', aas: 'FFLLSSSSYY**CCWWTTTTPPPPHHQQRRRRIIMMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 4, name: 'Mold, Protozoan, Coelenterate Mito. & Mycoplasma/Spiroplasma Code', aas: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 5, name: 'Invertebrate Mitochondrial Code', aas: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSSSVVVVAAAADDEEGGGG' },
    { id: 6, name: 'Ciliate, Dasycladacean and Hexamita Nuclear Code', aas: 'FFLLSSSSYYQQCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 9, name: 'Echinoderm and Flatworm Mitochondrial Code', aas: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG' },
    { id: 10, name: 'Euplotid Nuclear Code', aas: 'FFLLSSSSYY**CCCWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 11, name: 'Bacterial, Archaeal and Plant Plastid Code', aas: 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 12, name: 'Alternative Yeast Nuclear Code', aas: 'FFLLSSSSYY**CC*WLLLSPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 13, name: 'Ascidian Mitochondrial Code', aas: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNKKSSGGVVVVAAAADDEEGGGG' },
    { id: 14, name: 'Alternative Flatworm Mitochondrial Code', aas: 'FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNNKSSSSVVVVAAAADDEEGGGG' },
    { id: 15, name: 'Blepharisma Nuclear Code', aas: 'FFLLSSSSYY*QCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 16, name: 'Chlorophycean Mitochondrial Code', aas: 'FFLLSSSSYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 21, name: 'Trematode Mitochondrial Code', aas: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIMMTTTTNNNKSSSSVVVVAAAADDEEGGGG' },
    { id: 22, name: 'Scenedesmus obliquus Mitochondrial Code', aas: 'FFLLSS*SYY*LCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 23, name: 'Thraustochytrium Mitochondrial Code', aas: 'FF*LSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 24, name: 'Rhabdopleuridae Mitochondrial Code', aas: 'FFLLSSSSYY**CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSSKVVVVAAAADDEEGGGG' },
    { id: 25, name: 'Candidate Division SR1 and Gracilibacteria Code', aas: 'FFLLSSSSYY**CCGWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 26, name: 'Pachysolen tannophilus Nuclear Code', aas: 'FFLLSSSSYY**CC*WLLLAPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 27, name: 'Karyorelict Nuclear Code', aas: 'FFLLSSSSYYQQCCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 28, name: 'Condylostoma Nuclear Code', aas: 'FFLLSSSSYYQQCCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 29, name: 'Mesodinium Nuclear Code', aas: 'FFLLSSSSYYYYCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 30, name: 'Peritrich Nuclear Code', aas: 'FFLLSSSSYYEECC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 31, name: 'Blastocrithidia Nuclear Code', aas: 'FFLLSSSSYYEECCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 32, name: 'Balanophoraceae Plastid Code', aas: 'FFLLSSSSYY*WCC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG' },
    { id: 33, name: 'Cephalodiscidae Mitochondrial UAA-Tyr Code', aas: 'FFLLSSSSYYY*CCWWLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSSKVVVVAAAADDEEGGGG' },
];

/**
 * Build a codon-to-amino-acid map for a given genetic code table ID.
 * @param {number} tableId - NCBI translation table ID
 * @returns {Object} { codonToAA: {codon: aa}, name: string }
 */
function getGeneticCode(tableId) {
    const table = GENETIC_CODES.find(t => t.id === tableId);
    if (!table) throw new Error(`Unknown genetic code table: ${tableId}`);

    const codonToAA = {};
    for (let i = 0; i < 64; i++) {
        const codon = BASE1[i] + BASE2[i] + BASE3[i];
        codonToAA[codon] = table.aas[i];
    }
    return { codonToAA, name: table.name };
}

/**
 * Get list of all available genetic code tables.
 * @returns {Array<{id: number, name: string}>}
 */
function getAvailableGeneticCodes() {
    return GENETIC_CODES.map(t => ({ id: t.id, name: t.name }));
}

// ─── FASTA Parser ────────────────────────────────────────────────────────────

/**
 * Parse FASTA formatted text into array of sequences.
 * @param {string} text - Raw FASTA text content
 * @returns {Array<{name: string, sequence: string}>}
 */
function parseFasta(text) {
    const sequences = [];
    let currentName = '';
    let currentSeq = [];

    const lines = text.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('>')) {
            if (currentName && currentSeq.length > 0) {
                sequences.push({ name: currentName, sequence: currentSeq.join('') });
            }
            currentName = trimmed.substring(1).trim();
            currentSeq = [];
        } else {
            // Remove spaces and numbers (some formats include them)
            currentSeq.push(trimmed.replace(/[\s\d]/g, '').toUpperCase());
        }
    }
    // Push last sequence
    if (currentName && currentSeq.length > 0) {
        sequences.push({ name: currentName, sequence: currentSeq.join('') });
    }

    return sequences;
}

// ─── Codon Counter ───────────────────────────────────────────────────────────

/**
 * Count codons in a nucleotide sequence.
 * Splits the sequence into triplets from the start (reading frame 0).
 * Invalid codons (containing N or other ambiguity codes) are skipped.
 * @param {string} sequence - DNA sequence (uppercase)
 * @returns {Object} Map of codon -> count
 */
function countCodons(sequence) {
    const counts = {};
    const validBases = new Set(['A', 'T', 'C', 'G']);

    for (let i = 0; i + 2 < sequence.length; i += 3) {
        const codon = sequence.substring(i, i + 3);
        // Skip incomplete or ambiguous codons
        if (codon.length === 3 && [...codon].every(b => validBases.has(b))) {
            counts[codon] = (counts[codon] || 0) + 1;
        }
    }
    return counts;
}

/**
 * Merge codon counts from multiple sequences.
 * @param {Array<Object>} countsArray - Array of codon count maps
 * @returns {Object} Merged codon counts
 */
function mergeCodons(countsArray) {
    const merged = {};
    for (const counts of countsArray) {
        for (const [codon, count] of Object.entries(counts)) {
            merged[codon] = (merged[codon] || 0) + count;
        }
    }
    return merged;
}

// ─── RSCU Calculator ────────────────────────────────────────────────────────

/**
 * Calculate RSCU values for a set of codon counts.
 * 
 * RSCU(codon_j) = X_j / (1/n_i * Σ X_k)
 * 
 * Where:
 *   X_j = observed count of codon j
 *   n_i = number of synonymous codons for amino acid i
 *   Σ X_k = total count of all synonymous codons for amino acid i
 * 
 * Amino acids with only 1 codon (Met, Trp in standard code) are excluded.
 * Stop codons are always excluded.
 * 
 * @param {Object} codonCounts - Map of codon -> count
 * @param {Object} codonToAA - Map of codon -> amino acid
 * @returns {Object} Map of codon -> RSCU value
 */
function calculateRSCU(codonCounts, codonToAA) {
    // Group codons by amino acid
    const aaGroups = {};
    for (const [codon, aa] of Object.entries(codonToAA)) {
        if (aa === '*') continue; // skip stops
        if (!aaGroups[aa]) aaGroups[aa] = [];
        aaGroups[aa].push(codon);
    }

    const rscu = {};

    for (const [aa, codons] of Object.entries(aaGroups)) {
        const ni = codons.length; // number of synonymous codons
        if (ni <= 1) continue; // skip non-degenerate (e.g., Met, Trp)

        // Total usage for this amino acid
        const totalAA = codons.reduce((sum, c) => sum + (codonCounts[c] || 0), 0);

        if (totalAA === 0) {
            // If amino acid not observed, RSCU = 0 for all its codons
            codons.forEach(c => { rscu[c] = 0; });
        } else {
            const expected = totalAA / ni;
            codons.forEach(c => {
                rscu[c] = (codonCounts[c] || 0) / expected;
            });
        }
    }

    return rscu;
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Amino acid 1-letter to 3-letter mapping
 */
const AA_1TO3 = {
    'F': 'Phe', 'L': 'Leu', 'I': 'Ile', 'M': 'Met', 'V': 'Val',
    'S': 'Ser', 'P': 'Pro', 'T': 'Thr', 'A': 'Ala', 'Y': 'Tyr',
    'H': 'His', 'Q': 'Gln', 'N': 'Asn', 'K': 'Lys', 'D': 'Asp',
    'E': 'Glu', 'C': 'Cys', 'W': 'Trp', 'R': 'Arg', 'G': 'Gly'
};

/**
 * Get the canonical codon order for RSCU output.
 * Returns codons in the standard order used by CaiCal and similar tools,
 * grouped by amino acid.
 * @param {Object} codonToAA - Map of codon -> amino acid
 * @returns {Array<{codon: string, aa: string}>} Ordered list
 */
function getCanonicalCodonOrder(codonToAA) {
    // Group codons by amino acid, excluding stops and single-codon AAs
    const aaGroups = {};
    for (const [codon, aa] of Object.entries(codonToAA)) {
        if (aa === '*') continue;
        if (!aaGroups[aa]) aaGroups[aa] = [];
        aaGroups[aa].push(codon);
    }

    const result = [];
    // Standard order of codons matches the NCBI Base1/Base2/Base3 order
    for (let i = 0; i < 64; i++) {
        const codon = BASE1[i] + BASE2[i] + BASE3[i];
        const aa = codonToAA[codon];
        if (aa === '*') continue;
        if (aaGroups[aa] && aaGroups[aa].length <= 1) continue; // skip single-codon AAs
        result.push({ codon, aa });
    }
    return result;
}

/**
 * Get the canonical codon order including ALL amino acids (even single-codon ones).
 * Used for Codon Usage and CU/1000 where Met and Trp should be included.
 * @param {Object} codonToAA - Map of codon -> amino acid
 * @returns {Array<{codon: string, aa: string}>} Ordered list
 */
function getCanonicalCodonOrderAll(codonToAA) {
    const result = [];
    for (let i = 0; i < 64; i++) {
        const codon = BASE1[i] + BASE2[i] + BASE3[i];
        const aa = codonToAA[codon];
        if (aa === '*') continue; // still skip stop codons
        result.push({ codon, aa });
    }
    return result;
}

/**
 * Convert FASTA text to RSCU data in the same format as CaiCal TSV output.
 * 
 * Output format (array of arrays):
 *   Row 0: ['Codon', codon1, codon2, ...]  (DNA codons)
 *   Row 1: ['AA', aa1, aa2, ...]           (1-letter amino acid codes)
 *   Row 2+: [speciesName, rscu1, rscu2, ...] (per-sequence RSCU values)
 * 
 * @param {string} fastaText - Raw FASTA text
 * @param {number} tableId - NCBI translation table ID
 * @param {boolean} [perSequence=true] - If true, compute RSCU per sequence; if false, pool all sequences
 * @returns {Array<Array>} Data in CaiCal-compatible format
 */
function fastaToRscuData(fastaText, tableId, perSequence = true) {
    const { codonToAA } = getGeneticCode(tableId);
    const sequences = parseFasta(fastaText);

    if (sequences.length === 0) {
        throw new Error('No valid sequences found in the FASTA file.');
    }

    // Get canonical codon order
    const codonOrder = getCanonicalCodonOrder(codonToAA);

    // Build header rows
    const codonsHeader = ['Codon', ...codonOrder.map(c => c.codon)];
    const aaHeader = ['AA', ...codonOrder.map(c => c.aa)];

    const dataRows = [];

    if (perSequence) {
        // Calculate RSCU for each sequence individually
        for (const seq of sequences) {
            const counts = countCodons(seq.sequence);
            const rscu = calculateRSCU(counts, codonToAA);
            const row = [seq.name, ...codonOrder.map(c => rscu[c.codon] !== undefined ? rscu[c.codon] : 0)];
            dataRows.push(row);
        }
    } else {
        // Pool all sequences and calculate joint RSCU
        const allCounts = mergeCodons(sequences.map(s => countCodons(s.sequence)));
        const rscu = calculateRSCU(allCounts, codonToAA);
        const name = sequences.length === 1 ? sequences[0].name : `Pooled (${sequences.length} sequences)`;
        const row = [name, ...codonOrder.map(c => rscu[c.codon] !== undefined ? rscu[c.codon] : 0)];
        dataRows.push(row);
    }

    return [codonsHeader, aaHeader, ...dataRows];
}

// ─── Codon Usage Calculator ─────────────────────────────────────────────────

/**
 * Calculate raw Codon Usage (absolute counts) for each codon.
 * Unlike RSCU, this includes ALL amino acids (even single-codon ones like Met/Trp).
 * Stop codons are still excluded.
 * 
 * @param {Object} codonCounts - Map of codon -> count
 * @param {Object} codonToAA - Map of codon -> amino acid
 * @returns {Object} Map of codon -> raw count (0 if not observed)
 */
function calculateCodonUsage(codonCounts, codonToAA) {
    const cu = {};
    for (const [codon, aa] of Object.entries(codonToAA)) {
        if (aa === '*') continue;
        cu[codon] = codonCounts[codon] || 0;
    }
    return cu;
}

/**
 * Calculate Codon Usage per Thousand codons.
 * CU/1000(j) = (X_j / N_total) × 1000
 * where N_total = total number of codons (excluding stops).
 * 
 * Includes ALL amino acids. Stop codons excluded.
 * 
 * @param {Object} codonCounts - Map of codon -> count
 * @param {Object} codonToAA - Map of codon -> amino acid
 * @returns {Object} Map of codon -> CU/1000 value
 */
function calculateCodonUsagePerThousand(codonCounts, codonToAA) {
    const cu1000 = {};
    // Total number of codons (excluding stops)
    let totalCodons = 0;
    for (const [codon, aa] of Object.entries(codonToAA)) {
        if (aa === '*') continue;
        totalCodons += (codonCounts[codon] || 0);
    }

    for (const [codon, aa] of Object.entries(codonToAA)) {
        if (aa === '*') continue;
        if (totalCodons === 0) {
            cu1000[codon] = 0;
        } else {
            cu1000[codon] = ((codonCounts[codon] || 0) / totalCodons) * 1000;
        }
    }
    return cu1000;
}

/**
 * Convert FASTA text to Codon Usage data (CU, CU/1000, or RSCU).
 * 
 * Output format (array of arrays):
 *   Row 0: ['Codon', codon1, codon2, ...]
 *   Row 1: ['AA', aa1, aa2, ...]
 *   Row 2+: [speciesName, val1, val2, ...]
 * 
 * @param {string} fastaText - Raw FASTA text
 * @param {number} tableId - NCBI translation table ID
 * @param {'cu'|'cu1000'|'rscu'} metric - Which metric to compute
 * @param {boolean} [perSequence=true] - If true, compute per sequence
 * @returns {Array<Array>} Data matrix
 */
function fastaToCodonUsageData(fastaText, tableId, metric = 'cu', perSequence = true) {
    // For RSCU, delegate to existing function
    if (metric === 'rscu') {
        return fastaToRscuData(fastaText, tableId, perSequence);
    }

    const { codonToAA } = getGeneticCode(tableId);
    const sequences = parseFasta(fastaText);

    if (sequences.length === 0) {
        throw new Error('No valid sequences found in the FASTA file.');
    }

    // CU and CU/1000 include all codons (even single-codon AAs)
    const codonOrder = getCanonicalCodonOrderAll(codonToAA);

    const codonsHeader = ['Codon', ...codonOrder.map(c => c.codon)];
    const aaHeader = ['AA', ...codonOrder.map(c => c.aa)];

    const calcFn = metric === 'cu' ? calculateCodonUsage : calculateCodonUsagePerThousand;

    const dataRows = [];

    if (perSequence) {
        for (const seq of sequences) {
            const counts = countCodons(seq.sequence);
            const values = calcFn(counts, codonToAA);
            const row = [seq.name, ...codonOrder.map(c => values[c.codon] !== undefined ? values[c.codon] : 0)];
            dataRows.push(row);
        }
    } else {
        const allCounts = mergeCodons(sequences.map(s => countCodons(s.sequence)));
        const values = calcFn(allCounts, codonToAA);
        const name = sequences.length === 1 ? sequences[0].name : `Pooled (${sequences.length} sequences)`;
        const row = [name, ...codonOrder.map(c => values[c.codon] !== undefined ? values[c.codon] : 0)];
        dataRows.push(row);
    }

    return [codonsHeader, aaHeader, ...dataRows];
}

// ─── Export for use in browser (global scope) ────────────────────────────────
window.RSCUCalculator = {
    getAvailableGeneticCodes,
    getGeneticCode,
    parseFasta,
    countCodons,
    mergeCodons,
    calculateRSCU,
    calculateCodonUsage,
    calculateCodonUsagePerThousand,
    fastaToRscuData,
    fastaToCodonUsageData,
    getCanonicalCodonOrder,
    getCanonicalCodonOrderAll,
    GENETIC_CODES,
    AA_1TO3
};
