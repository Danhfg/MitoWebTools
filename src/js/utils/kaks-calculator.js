/**
 * Ka/Ks Calculator Module (Nei-Gojobori 1986)
 * 
 * Calculates Ka (nonsynonymous substitution rate), Ks (synonymous substitution rate),
 * and Ka/Ks ratio between pairs of protein-coding sequences.
 * 
 * Algorithm steps:
 * 1. Count synonymous (S) and nonsynonymous (N) sites per codon
 * 2. Count synonymous (Sd) and nonsynonymous (Nd) differences between codon pairs
 * 3. Apply Jukes-Cantor correction to estimate dN and dS
 * 4. Ka/Ks = dN / dS
 * 
 * References:
 * - Nei & Gojobori (1986) Mol Biol Evol 3:418-426
 * - Nei & Kumar (2000) Molecular Evolution and Phylogenetics
 */

// ─── Reverse Complement ──────────────────────────────────────────────────────

const COMPLEMENT = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C', 'N': 'N' };

/**
 * Returns the reverse complement of a DNA sequence.
 * @param {string} seq - DNA sequence (uppercase)
 * @returns {string} Reverse complement
 */
function reverseComplement(seq) {
    return seq.split('').reverse().map(b => COMPLEMENT[b] || 'N').join('');
}

// ─── Gene Sequence Extraction ────────────────────────────────────────────────

/**
 * Extract protein-coding gene sequences from a FASTA genome using BED annotations.
 * Handles strand orientation via reverse complement.
 * For genes with multiple BED entries (fragments), concatenates them in order.
 * 
 * @param {string} fastaText - FASTA content (single genome sequence)
 * @param {string} bedText - BED annotation content
 * @returns {{speciesName: string, genes: Object<string, string>}}
 *   Object with species name and map of canonical gene name → DNA sequence
 */
function extractGeneSequences(fastaText, bedText) {
    // Parse the full genome sequence from FASTA
    const sequences = [];
    let currentName = '';
    let currentSeq = [];
    const lines = fastaText.split(/\r?\n/);

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
            currentSeq.push(trimmed.replace(/[\s\d]/g, '').toUpperCase());
        }
    }
    if (currentName && currentSeq.length > 0) {
        sequences.push({ name: currentName, sequence: currentSeq.join('') });
    }

    // Use first sequence as the genome
    if (sequences.length === 0) return { speciesName: '', genes: {} };
    const genome = sequences[0].sequence;
    const speciesName = sequences[0].name;

    // Parse BED entries
    const bedEntries = window.BedParser.parseBedFile(bedText);

    // Group BED entries by canonical gene name
    const geneEntries = {};
    for (const entry of bedEntries) {
        const canonical = window.BedParser.normalizeGeneName(entry.name);
        if (!canonical) continue;
        if (!geneEntries[canonical]) geneEntries[canonical] = [];
        geneEntries[canonical].push(entry);
    }

    // Extract sequences
    const genes = {};
    for (const [geneName, entries] of Object.entries(geneEntries)) {
        // Sort entries by start position
        entries.sort((a, b) => a.start - b.start);

        // Concatenate fragments
        let seq = '';
        for (const entry of entries) {
            const start = Math.max(0, entry.start);
            const end = Math.min(genome.length, entry.end);
            seq += genome.substring(start, end);
        }

        // Reverse complement if on negative strand
        const strand = entries[0].strand;
        if (strand === '-') {
            seq = reverseComplement(seq);
        }

        // Ensure sequence length is multiple of 3 (trim trailing)
        const trimLen = seq.length - (seq.length % 3);
        seq = seq.substring(0, trimLen);

        if (seq.length >= 3) {
            genes[geneName] = seq;
        }
    }

    return { speciesName, genes };
}

// ─── Codon Translation Table ────────────────────────────────────────────────
// Note: BASE1/BASE2/BASE3 constants are shared from rscu-calculator.js

/**
 * Get the amino acid encoded by a codon using a given genetic code table.
 * @param {string} codon - 3-letter DNA codon (uppercase)
 * @param {string} aasTable - 64-character amino acid string from genetic code
 * @returns {string} Single-letter amino acid code or '*' for stop
 */
function translateCodon(codon, aasTable) {
    if (codon.length !== 3) return '?';
    if (codon.includes('N')) return '?';
    const idx = getCodonIndex(codon);
    if (idx < 0 || idx >= 64) return '?';
    return aasTable[idx];
}

/**
 * Get the index of a codon in the standard codon order.
 * @param {string} codon - 3-letter DNA codon
 * @returns {number} Index 0-63 or -1 if invalid
 */
function getCodonIndex(codon) {
    const bases = 'TCAG';
    const i1 = bases.indexOf(codon[0]);
    const i2 = bases.indexOf(codon[1]);
    const i3 = bases.indexOf(codon[2]);
    if (i1 < 0 || i2 < 0 || i3 < 0) return -1;
    return i1 * 16 + i2 * 4 + i3;
}

// ─── Step 1: Count Synonymous and Nonsynonymous Sites ───────────────────────

/**
 * Count the number of synonymous (S) and nonsynonymous (N) sites for a codon.
 * For each position, considers all possible single-nucleotide changes and
 * classifies them as synonymous or nonsynonymous.
 * 
 * @param {string} codon - 3-letter codon
 * @param {string} aasTable - Genetic code amino acid string
 * @returns {{S: number, N: number}} Fractional counts of synonymous and nonsynonymous sites
 */
function countSitesForCodon(codon, aasTable) {
    if (codon.includes('N') || codon.length !== 3) return { S: 0, N: 3 };

    const originalAA = translateCodon(codon, aasTable);
    const bases = ['T', 'C', 'A', 'G'];
    let S = 0;
    let N = 0;

    for (let pos = 0; pos < 3; pos++) {
        let synCount = 0;
        let nonsynCount = 0;

        for (const base of bases) {
            if (base === codon[pos]) continue; // skip identity

            const mutCodon = codon.substring(0, pos) + base + codon.substring(pos + 1);
            const mutAA = translateCodon(mutCodon, aasTable);

            if (mutAA === originalAA) {
                synCount++;
            } else {
                nonsynCount++;
            }
        }

        // This position contributes synCount/3 synonymous sites
        S += synCount / 3;
        N += nonsynCount / 3;
    }

    return { S, N };
}

/**
 * Count total synonymous (S) and nonsynonymous (N) sites for a full sequence.
 * Averages the sites from seq1 and seq2.
 * 
 * @param {string} seq1 - First coding sequence (multiple of 3)
 * @param {string} seq2 - Second coding sequence (same length as seq1)
 * @param {string} aasTable - Genetic code
 * @returns {{S: number, N: number}} Total averaged sites
 */
function countTotalSites(seq1, seq2, aasTable) {
    const nCodons = Math.min(seq1.length, seq2.length) / 3;
    let S1 = 0, N1 = 0, S2 = 0, N2 = 0;

    for (let i = 0; i < nCodons; i++) {
        const codon1 = seq1.substring(i * 3, i * 3 + 3);
        const codon2 = seq2.substring(i * 3, i * 3 + 3);

        const sites1 = countSitesForCodon(codon1, aasTable);
        const sites2 = countSitesForCodon(codon2, aasTable);

        S1 += sites1.S; N1 += sites1.N;
        S2 += sites2.S; N2 += sites2.N;
    }

    // Average of both sequences
    return { S: (S1 + S2) / 2, N: (N1 + N2) / 2 };
}

// ─── Step 2: Count Synonymous and Nonsynonymous Differences ─────────────────

/**
 * Count synonymous (Sd) and nonsynonymous (Nd) differences between two codons.
 * For codons differing at multiple positions, averages over all possible pathways.
 * 
 * @param {string} codon1 - First codon
 * @param {string} codon2 - Second codon
 * @param {string} aasTable - Genetic code
 * @returns {{Sd: number, Nd: number}} Fractional synonymous and nonsynonymous differences
 */
function countDiffsForCodonPair(codon1, codon2, aasTable) {
    if (codon1.includes('N') || codon2.includes('N')) return { Sd: 0, Nd: 0 };
    if (codon1 === codon2) return { Sd: 0, Nd: 0 };

    // Find positions that differ
    const diffPositions = [];
    for (let i = 0; i < 3; i++) {
        if (codon1[i] !== codon2[i]) diffPositions.push(i);
    }

    const nDiffs = diffPositions.length;

    if (nDiffs === 1) {
        // Simple case: one mutation
        const aa1 = translateCodon(codon1, aasTable);
        const aa2 = translateCodon(codon2, aasTable);
        if (aa1 === aa2) return { Sd: 1, Nd: 0 };
        return { Sd: 0, Nd: 1 };
    }

    // Multiple differences: enumerate all pathways and average
    const permutations = getPermutations(diffPositions);
    let totalSd = 0, totalNd = 0;

    for (const perm of permutations) {
        let currentCodon = codon1;
        let pathSd = 0, pathNd = 0;

        for (const pos of perm) {
            const prevAA = translateCodon(currentCodon, aasTable);
            const nextCodon = currentCodon.substring(0, pos) + codon2[pos] + currentCodon.substring(pos + 1);
            const nextAA = translateCodon(nextCodon, aasTable);

            if (prevAA === nextAA) {
                pathSd++;
            } else {
                pathNd++;
            }
            currentCodon = nextCodon;
        }

        totalSd += pathSd;
        totalNd += pathNd;
    }

    return {
        Sd: totalSd / permutations.length,
        Nd: totalNd / permutations.length
    };
}

/**
 * Generate all permutations of an array (for pathway enumeration).
 * @param {Array} arr - Array of position indices
 * @returns {Array<Array>} All permutations
 */
function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        const perms = getPermutations(rest);
        for (const perm of perms) {
            result.push([arr[i], ...perm]);
        }
    }
    return result;
}

/**
 * Count total synonymous (Sd) and nonsynonymous (Nd) differences between two sequences.
 * 
 * @param {string} seq1 - First coding sequence
 * @param {string} seq2 - Second coding sequence (same length)
 * @param {string} aasTable - Genetic code
 * @returns {{Sd: number, Nd: number}} Total differences
 */
function countTotalDiffs(seq1, seq2, aasTable) {
    const nCodons = Math.min(seq1.length, seq2.length) / 3;
    let Sd = 0, Nd = 0;

    for (let i = 0; i < nCodons; i++) {
        const codon1 = seq1.substring(i * 3, i * 3 + 3);
        const codon2 = seq2.substring(i * 3, i * 3 + 3);

        const diffs = countDiffsForCodonPair(codon1, codon2, aasTable);
        Sd += diffs.Sd;
        Nd += diffs.Nd;
    }

    return { Sd, Nd };
}

// ─── Step 3: Jukes-Cantor Correction ────────────────────────────────────────

/**
 * Apply Jukes-Cantor correction to transform observed proportion
 * of differences into estimated substitution rate.
 * Formula: d = -3/4 × ln(1 - 4p/3)
 * 
 * @param {number} p - Proportion of differences (diffs / sites)
 * @returns {number} Corrected substitution rate, or NaN if p >= 0.75
 */
function jukesCantor(p) {
    if (p <= 0) return 0;
    const arg = 1 - (4 * p / 3);
    if (arg <= 0) return NaN; // saturation
    return -0.75 * Math.log(arg);
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Calculate Ka, Ks, and Ka/Ks ratio between two coding sequences.
 * Full Nei-Gojobori pipeline.
 * 
 * @param {string} seq1 - First coding DNA sequence
 * @param {string} seq2 - Second coding DNA sequence (should be same length)
 * @param {string} aasTable - 64-character genetic code string
 * @returns {{Ka: number, Ks: number, KaKs: number}} Substitution rates
 */
function calculateKaKs(seq1, seq2, aasTable) {
    // Ensure equal length (trim to shortest, aligned to codons)
    const minLen = Math.min(seq1.length, seq2.length);
    const trimLen = minLen - (minLen % 3);
    const s1 = seq1.substring(0, trimLen);
    const s2 = seq2.substring(0, trimLen);

    if (trimLen < 3) return { Ka: NaN, Ks: NaN, KaKs: NaN };

    // Step 1: Count sites
    const { S, N } = countTotalSites(s1, s2, aasTable);

    // Step 2: Count differences
    const { Sd, Nd } = countTotalDiffs(s1, s2, aasTable);

    // Proportions
    const pS = S > 0 ? Sd / S : 0;
    const pN = N > 0 ? Nd / N : 0;

    // Step 3: Jukes-Cantor correction
    const Ks = jukesCantor(pS);
    const Ka = jukesCantor(pN);

    // Ka/Ks ratio
    const KaKs = (Ks > 0 && !isNaN(Ks) && !isNaN(Ka)) ? Ka / Ks : NaN;

    return { Ka, Ks, KaKs };
}

/**
 * Calculate Ka/Ks for all pairwise combinations of species for a given gene.
 * 
 * @param {Array<{name: string, seq: string}>} geneSequences - Array of {name, seq} for one gene
 * @param {string} aasTable - Genetic code
 * @returns {Array<{sp1: string, sp2: string, Ka: number, Ks: number, KaKs: number}>}
 */
function pairwiseKaKs(geneSequences, aasTable) {
    const results = [];

    for (let i = 0; i < geneSequences.length; i++) {
        for (let j = i + 1; j < geneSequences.length; j++) {
            const result = calculateKaKs(
                geneSequences[i].seq,
                geneSequences[j].seq,
                aasTable
            );
            results.push({
                sp1: geneSequences[i].name,
                sp2: geneSequences[j].name,
                ...result
            });
        }
    }

    return results;
}

/**
 * Extract start and stop codons for each PCG from a gene sequence map.
 * Handles incomplete stop codons (T, TA) by checking shorter sequences.
 * 
 * @param {Object<string, string>} genes - Map of gene name → DNA sequence
 * @returns {Object<string, {start: string, stop: string}>}
 */
function extractStartStopCodons(genes) {
    const codons = {};

    for (const [geneName, seq] of Object.entries(genes)) {
        if (seq.length < 6) continue;

        const startCodon = seq.substring(0, 3);

        // Stop codon: check if last 3nt form a recognized stop,
        // otherwise check for incomplete stops (TA, T)
        const last3 = seq.substring(seq.length - 3);
        const last2 = seq.substring(seq.length - 2);
        const last1 = seq.substring(seq.length - 1);

        let stopCodon;
        const fullStops = ['TAA', 'TAG', 'TGA', 'AGA', 'AGG'];

        if (fullStops.includes(last3)) {
            stopCodon = last3;
        } else if (last2 === 'TA' || last2 === 'TG') {
            stopCodon = last2 + '-';
        } else if (last1 === 'T') {
            stopCodon = 'T--';
        } else {
            stopCodon = last3; // fallback
        }

        codons[geneName] = { start: startCodon, stop: stopCodon };
    }

    return codons;
}

// ─── Export for browser ──────────────────────────────────────────────────────
window.KaKsCalculator = {
    extractGeneSequences,
    reverseComplement,
    translateCodon,
    countSitesForCodon,
    countTotalSites,
    countDiffsForCodonPair,
    countTotalDiffs,
    jukesCantor,
    calculateKaKs,
    pairwiseKaKs,
    extractStartStopCodons
};
