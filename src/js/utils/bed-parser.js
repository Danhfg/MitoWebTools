/**
 * BED File Parser for Mitochondrial Gene Annotations
 * 
 * Parses BED6 format files (e.g., from MITOS2 annotator) and extracts
 * protein-coding gene sizes for comparative analysis.
 * 
 * BED6 columns: chrom, start, end, name, score, strand
 */

// ─── Canonical Gene Order (Mitochondrial) ────────────────────────────────────
// Standard vertebrate mitochondrial gene order for protein-coding genes
const CANONICAL_GENE_ORDER = [
    'nad1', 'nad2', 'cox1', 'cox2', 'atp8', 'atp6',
    'cox3', 'nad3', 'nad4l', 'nad4', 'nad5', 'nad6', 'cob'
];

// Gene name normalization map — handles common alternative names
const GENE_NAME_ALIASES = {
    // NADH dehydrogenase
    'nd1': 'nad1',
    'nd2': 'nad2',
    'nd3': 'nad3',
    'nd4': 'nad4',
    'nd4l': 'nad4l',
    'nd5': 'nad5',
    'nd6': 'nad6',
    // Cytochrome c oxidase
    'coi': 'cox1', 'co1': 'cox1',
    'coii': 'cox2', 'co2': 'cox2',
    'coiii': 'cox3', 'co3': 'cox3',
    // ATP synthase
    'atp8': 'atp8', 'atpase8': 'atp8',
    'atp6': 'atp6', 'atpase6': 'atp6',
    // Cytochrome b
    'cytb': 'cob', 'cytochromeb': 'cob', 'cyb': 'cob',
};

// Patterns to EXCLUDE (tRNA, rRNA, D-Loop, OL, OH, source, etc.)
const EXCLUDE_PATTERNS = [
    /^trn/i,           // tRNA genes (MITOS format: trnF, trnV)
    /^trna/i,          // tRNA genes (alt format: tRNA-Ile, tRNA-Gln)
    /^rrn/i,           // rRNA genes
    /^rns$/i,          // small ribosomal RNA
    /^rnl$/i,          // large ribosomal RNA
    /^\d+s\s*r/i,      // 12S rRNA, 16S rRNA
    /^rps/i,           // ribosomal protein
    /^ol$/i,           // origin of light-strand replication
    /^oh$/i,           // origin of heavy-strand replication
    /^dloop$/i,        // D-loop / control region
    /^d-loop$/i,
    /^cr$/i,           // control region
    /^a\+t/i,          // A+T rich region
    /^source/i,        // source annotation
    /^repeat/i,        // repeat regions
    /^misc/i,          // misc features
];

// Gene display colors (rainbow-like palette matching the reference image)
const GENE_COLORS = {
    'nad1': '#E8697D',  // rose
    'nad2': '#F4A259',  // orange
    'cox1': '#D94F4F',  // red
    'cox2': '#F28C51',  // dark orange
    'atp8': '#F7C948',  // yellow
    'atp6': '#E8B838',  // gold
    'cox3': '#8ECB6B',  // green
    'nad3': '#5BB89A',  // teal
    'nad4l': '#4BABCA',  // cyan
    'nad4': '#5B8DCB',  // blue
    'nad5': '#7C6BAF',  // purple
    'nad6': '#A67BBF',  // violet
    'cob': '#C8956B',  // brown/tan
};

// ─── BED Parser ──────────────────────────────────────────────────────────────

/**
 * Parse a BED file text into structured entries.
 * @param {string} text - Raw BED file content
 * @returns {Array<{chrom: string, start: number, end: number, name: string, score: string, strand: string}>}
 */
function parseBedFile(text) {
    const entries = [];
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('track')) continue;

        const cols = trimmed.split('\t');
        if (cols.length < 4) continue;

        entries.push({
            chrom: cols[0],
            start: parseInt(cols[1]),
            end: parseInt(cols[2]),
            name: cols[3],
            score: cols.length > 4 ? cols[4] : '0',
            strand: cols.length > 5 ? cols[5] : '+'
        });
    }

    return entries;
}

/**
 * Normalize a gene name to its canonical form.
 * @param {string} rawName - Raw gene name from BED file (e.g., "nad1", "ND1", "cox1")
 * @returns {string|null} Canonical name or null if not a protein-coding gene
 */
function normalizeGeneName(rawName) {
    // Remove parenthetical content like (gaa)
    let cleaned = rawName.replace(/\([^)]*\)/, '').trim().toLowerCase();

    // Remove " gene" suffix (e.g. "ND2 gene" → "nd2")
    cleaned = cleaned.replace(/\s+gene$/i, '').trim();

    // Remove trailing suffixes: _0, _1, _a, _b, -0, -1, -a, -b, etc.
    cleaned = cleaned.replace(/[-_][0-9a-z]+$/, '');

    // Remove spaces (e.g. "nd4 l" → "nd4l")
    cleaned = cleaned.replace(/\s+/g, '');

    // Check exclusion patterns first
    for (const pattern of EXCLUDE_PATTERNS) {
        if (pattern.test(cleaned)) return null;
    }

    // Check direct match with canonical names
    if (CANONICAL_GENE_ORDER.includes(cleaned)) return cleaned;

    // Check aliases
    if (GENE_NAME_ALIASES[cleaned]) return GENE_NAME_ALIASES[cleaned];

    // Not a recognized protein-coding gene
    return null;
}

/**
 * Extract protein-coding gene sizes from BED entries.
 * @param {Array} bedEntries - Parsed BED entries
 * @returns {Object} Map of canonical gene name -> size in bp
 */
function extractGeneSizes(bedEntries) {
    const sizes = {};

    for (const entry of bedEntries) {
        const canonical = normalizeGeneName(entry.name);
        if (!canonical) continue;

        const size = entry.end - entry.start;

        // If gene appears multiple times (e.g. nad6-0, nad6-1), sum all fragments
        sizes[canonical] = (sizes[canonical] || 0) + size;
    }

    return sizes;
}

/**
 * Extract species name from BED entries or filename.
 * Tries to use the chrom field first (often contains accession),
 * then falls back to the filename.
 * @param {Array} bedEntries - Parsed BED entries
 * @param {string} fileName - Original file name
 * @returns {string} Species/sample name
 */
function getSpeciesName(bedEntries, fileName) {
    // Use chrom field from first entry
    if (bedEntries.length > 0) {
        const chrom = bedEntries[0].chrom;
        // If chrom is a meaningful name (not just numeric), use it
        if (chrom && chrom.length > 1) {
            return chrom;
        }
    }

    // Fallback: strip extension from filename
    return fileName.replace(/\.(bed|txt|tsv|csv)$/i, '');
}

// ─── Export for browser ──────────────────────────────────────────────────────
window.BedParser = {
    parseBedFile,
    normalizeGeneName,
    extractGeneSizes,
    getSpeciesName,
    CANONICAL_GENE_ORDER,
    GENE_COLORS,
    GENE_NAME_ALIASES
};
