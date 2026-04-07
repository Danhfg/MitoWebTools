/**
 * Ka/Ks Analysis Page Logic
 * 
 * Handles file upload, processing, and visualization for:
 * 1. Ka/Ks ratio boxplot per gene (Nei-Gojobori pairwise)
 * 2. Ka / Ks / Ka/Ks grouped bar chart (mean values per gene)
 * 3. Start/Stop codon Sankey diagram
 */

// ─── DOM Elements ───────────────────────────────────────────────────────────
const dropzoneFasta = document.getElementById('dropzoneFasta');
const fileInputFasta = document.getElementById('fileInputFasta');
const fastaListEl = document.getElementById('fastaList');
const dropzoneBed = document.getElementById('dropzoneBed');
const fileInputBed = document.getElementById('fileInputBed');
const bedListEl = document.getElementById('bedList');
const geneticCodeSelect = document.getElementById('geneticCode');
const vizModeSelect = document.getElementById('vizMode');
const generateBtn = document.getElementById('generateBtn');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const loadingText = document.getElementById('loadingText');
const resultsSection = document.getElementById('resultsSection');
const resultsTitle = document.getElementById('resultsTitle');
const plotContainer = document.getElementById('plotContainer');
const resetBtn = document.getElementById('resetBtn');
const downloadPngBtn = document.getElementById('downloadPng');
const downloadHtmlBtn = document.getElementById('downloadHtml');
const downloadSep = document.getElementById('downloadSep');

let fastaFiles = [];
let bedFiles = [];
let currentPlotData = null;
let currentPlotLayout = null;

// ─── Populate Genetic Code Dropdown ─────────────────────────────────────────

/**
 * Populate the genetic code selector from RSCUCalculator.GENETIC_CODES.
 */
function populateGeneticCodes() {
    const codes = window.RSCUCalculator.GENETIC_CODES;
    codes.forEach(code => {
        const opt = document.createElement('option');
        opt.value = code.id;
        opt.textContent = `${code.id} - ${code.name}`;
        if (code.id === 2) opt.selected = true; // Vertebrate Mitochondrial
        geneticCodeSelect.appendChild(opt);
    });
}
populateGeneticCodes();

// ─── File Upload Handlers ───────────────────────────────────────────────────

/**
 * Set up drag-and-drop and click handlers for a dropzone.
 * @param {HTMLElement} zone - Dropzone element
 * @param {HTMLInputElement} input - File input element
 * @param {Array} fileArray - Array to store selected files
 * @param {HTMLElement} listEl - UL element for file list display
 * @param {string[]} validExts - Valid file extensions
 */
function setupDropzone(zone, input, fileArray, listEl, validExts) {
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => addFiles(e.target.files, fileArray, listEl, validExts));
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dropzone-active'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dropzone-active'));
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dropzone-active');
        addFiles(e.dataTransfer.files, fileArray, listEl, validExts);
    });
}

/**
 * Add valid files to the file array and update the display list.
 * @param {FileList} files - Files from input event
 * @param {Array} fileArray - Array to store files
 * @param {HTMLElement} listEl - UL element for display
 * @param {string[]} validExts - Valid extensions
 */
function addFiles(files, fileArray, listEl, validExts) {
    for (const file of files) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (validExts.includes(ext) && !fileArray.find(f => f.name === file.name)) {
            fileArray.push(file);
        }
    }
    renderFileList(fileArray, listEl);
    checkReady();
}

/**
 * Render the file list in the sidebar.
 * @param {Array} fileArray - Array of File objects
 * @param {HTMLElement} listEl - UL element
 */
function renderFileList(fileArray, listEl) {
    listEl.innerHTML = '';
    fileArray.forEach((file, idx) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded px-2 py-1';
        li.innerHTML = `
            <span class="truncate text-gray-600 dark:text-gray-300 text-xs" title="${file.name}">${file.name}</span>
            <button class="text-red-400 hover:text-red-600 text-xs remove-btn" data-idx="${idx}"><i class="fa-solid fa-xmark pointer-events-none"></i></button>
        `;
        listEl.appendChild(li);
    });
    listEl.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            fileArray.splice(idx, 1);
            renderFileList(fileArray, listEl);
            checkReady();
        });
    });
}

/**
 * Enable/disable the Generate button based on file availability.
 */
function checkReady() {
    generateBtn.disabled = fastaFiles.length === 0 || bedFiles.length === 0;
}

setupDropzone(dropzoneFasta, fileInputFasta, fastaFiles, fastaListEl, ['.fasta', '.fa', '.fna', '.fas', '.txt']);
setupDropzone(dropzoneBed, fileInputBed, bedFiles, bedListEl, ['.bed', '.txt']);

// ─── Reset ──────────────────────────────────────────────────────────────────

resetBtn.addEventListener('click', () => {
    fastaFiles = [];
    bedFiles = [];
    renderFileList(fastaFiles, fastaListEl);
    renderFileList(bedFiles, bedListEl);
    resultsSection.classList.add('hidden');
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    plotContainer.innerHTML = '';
    downloadPngBtn.classList.add('hidden');
    downloadHtmlBtn.classList.add('hidden');
    downloadSep.classList.add('hidden');
    currentPlotData = null;
    currentPlotLayout = null;
    checkReady();
});

// ─── Generate ───────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', async () => {
    if (fastaFiles.length === 0 || bedFiles.length === 0) return;

    // Show loading
    emptyState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    loadingState.classList.remove('hidden');
    loadingState.style.display = 'flex';

    // Yield to UI
    await new Promise(r => setTimeout(r, 50));

    try {
        // Get genetic code
        const codeId = parseInt(geneticCodeSelect.value);
        const code = window.RSCUCalculator.GENETIC_CODES.find(c => c.id === codeId);
        const aasTable = code ? code.aas : window.RSCUCalculator.GENETIC_CODES[0].aas;

        // Match FASTA to BED by filename prefix
        const pairs = matchFastaBed(fastaFiles, bedFiles);
        if (pairs.length === 0) {
            alert('Could not match FASTA files to BED files. Please ensure files have matching names (e.g., species1.fasta ↔ species1.bed).');
            loadingState.classList.add('hidden');
            loadingState.style.display = '';
            emptyState.classList.remove('hidden');
            return;
        }

        // Extract gene sequences for each species
        loadingText.textContent = `Extracting gene sequences from ${pairs.length} species...`;
        await new Promise(r => setTimeout(r, 20));

        const speciesGeneData = [];
        for (const pair of pairs) {
            const fastaText = await pair.fasta.text();
            const bedText = await pair.bed.text();
            const result = KaKsCalculator.extractGeneSequences(fastaText, bedText);
            speciesGeneData.push(result);
        }



        const mode = vizModeSelect.value;

        if (mode === 'sankey') {
            loadingText.textContent = 'Building Start/Stop Codon Sankey...';
            await new Promise(r => setTimeout(r, 20));
            generateSankey(speciesGeneData);
        } else {
            // Ka/Ks computation
            loadingText.textContent = 'Computing Ka/Ks ratios (Nei-Gojobori)...';
            await new Promise(r => setTimeout(r, 20));

            const geneResults = computeAllKaKs(speciesGeneData, aasTable);



            const hasData = Object.values(geneResults).some(r => r.kaValues.length > 0 || r.kaksValues.length > 0);
            if (!hasData) {
                loadingState.classList.add('hidden');
                loadingState.style.display = '';
                emptyState.classList.remove('hidden');
                alert('Nenhum dado válido de Ka/Ks foi calculado.\n\nPossíveis causas:\n• Apenas 1 espécie carregada (necessário ≥ 2)\n• Sequências muito divergentes (saturação no Jukes-Cantor)\n• Genes não encontrados nos arquivos BED\n\nVerifique o console (F12) para detalhes.');
                return;
            }

            if (mode === 'boxplot') {
                generateBoxplot(geneResults);
            } else {
                generateBarChart(geneResults);
            }
        }

        // Show results
        loadingState.classList.add('hidden');
        loadingState.style.display = '';
        resultsSection.classList.remove('hidden');
        downloadPngBtn.classList.remove('hidden');
        downloadHtmlBtn.classList.remove('hidden');
        downloadSep.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        alert('Error processing data: ' + err.message);
        loadingState.classList.add('hidden');
        loadingState.style.display = '';
        emptyState.classList.remove('hidden');
    }
});

// ─── Match FASTA to BED Files ───────────────────────────────────────────────

/**
 * Match FASTA and BED files by comparing filename prefixes.
 * @param {File[]} fastas - FASTA files
 * @param {File[]} beds - BED files
 * @returns {Array<{fasta: File, bed: File}>} Matched pairs
 */
function matchFastaBed(fastas, beds) {
    const pairs = [];
    const getPrefix = (name) => name.replace(/\.(fasta|fa|fna|fas|bed|txt)$/i, '').toLowerCase();

    for (const fasta of fastas) {
        const fPrefix = getPrefix(fasta.name);
        const matchBed = beds.find(b => getPrefix(b.name) === fPrefix);
        if (matchBed) {
            pairs.push({ fasta, bed: matchBed });
        }
    }

    // If no exact matches, try pairing by order (user uploaded in same order)
    if (pairs.length === 0 && fastas.length === beds.length) {
        for (let i = 0; i < fastas.length; i++) {
            pairs.push({ fasta: fastas[i], bed: beds[i] });
        }
    }

    return pairs;
}

// ─── Compute Ka/Ks for All Genes ────────────────────────────────────────────

/**
 * Compute pairwise Ka/Ks for all 13 PCGs across all species.
 * @param {Array} speciesGeneData - Array of {speciesName, genes} objects
 * @param {string} aasTable - Genetic code
 * @returns {Object<string, {kaValues: number[], ksValues: number[], kaksValues: number[], meanKa: number, meanKs: number, meanKaKs: number}>}
 */
function computeAllKaKs(speciesGeneData, aasTable) {
    const genes = BedParser.CANONICAL_GENE_ORDER;
    const results = {};

    for (const gene of genes) {
        // Collect sequences for this gene across species
        const geneSeqs = [];
        for (const sp of speciesGeneData) {
            if (sp.genes[gene]) {
                geneSeqs.push({ name: sp.speciesName, seq: sp.genes[gene] });
            }
        }

        if (geneSeqs.length < 2) {
            results[gene] = { kaValues: [], ksValues: [], kaksValues: [], meanKa: 0, meanKs: 0, meanKaKs: 0 };
            continue;
        }

        // Pairwise Ka/Ks
        const pairResults = KaKsCalculator.pairwiseKaKs(geneSeqs, aasTable);

        const kaVals = pairResults.map(r => r.Ka).filter(v => !isNaN(v) && isFinite(v));
        const ksVals = pairResults.map(r => r.Ks).filter(v => !isNaN(v) && isFinite(v));
        const kaksVals = pairResults.map(r => r.KaKs).filter(v => !isNaN(v) && isFinite(v));

        const mean = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

        results[gene] = {
            kaValues: kaVals,
            ksValues: ksVals,
            kaksValues: kaksVals,
            meanKa: mean(kaVals),
            meanKs: mean(ksVals),
            meanKaKs: mean(kaksVals)
        };
    }

    return results;
}

// ─── Gene Display Names ──────────────────────────────────────────────────────

const GENE_DISPLAY = {
    'nad1': 'ND1', 'nad2': 'ND2', 'nad3': 'ND3', 'nad4': 'ND4',
    'nad4l': 'ND4L', 'nad5': 'ND5', 'nad6': 'ND6',
    'cox1': 'COX1', 'cox2': 'COX2', 'cox3': 'COX3',
    'atp6': 'ATP6', 'atp8': 'ATP8', 'cob': 'CYTB'
};

// Display order sorted alphabetically by display name
const SORTED_GENES = Object.entries(GENE_DISPLAY)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(e => e[0]);

// ─── Visualization: Boxplot Ka/Ks ──────────────────────────────────────────

/**
 * Generate a boxplot of Ka/Ks ratio per gene.
 * @param {Object} geneResults - Results from computeAllKaKs
 */
function generateBoxplot(geneResults) {
    plotContainer.innerHTML = '';
    resultsTitle.innerHTML = '<i class="fa-solid fa-chart-line text-primary-500 dark:text-primary-400 mr-2"></i> Ka/Ks Ratio per Gene';

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    const traces = [];
    const colors = BedParser.GENE_COLORS;

    for (const gene of SORTED_GENES) {
        const data = geneResults[gene];
        if (!data || data.kaksValues.length === 0) continue;

        traces.push({
            y: data.kaksValues,
            name: GENE_DISPLAY[gene],
            type: 'box',
            boxpoints: 'outliers',
            marker: { color: colors[gene] || '#999', size: 4 },
            line: { color: colors[gene] || '#999', width: 1.5 },
            fillcolor: colors[gene] ? colors[gene] + '80' : '#99999980',
        });
    }

    const layout = {
        showlegend: false,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { t: 30, b: 60, l: 60, r: 20 },
        height: 500,
        xaxis: {
            title: { text: 'Gene', font: { size: 13, family: 'Inter', color: textColor } },
            tickfont: { size: 11, family: 'Inter', color: textColor },
        },
        yaxis: {
            title: { text: '<i>Ka/Ks ratio</i>', font: { size: 13, family: 'Inter', color: textColor } },
            tickfont: { size: 10, family: 'Inter', color: textColor },
            gridcolor: gridColor,
            zeroline: true,
            zerolinecolor: gridColor,
        },
    };

    const plotDiv = document.createElement('div');
    plotDiv.id = 'kaksPlot';
    plotContainer.appendChild(plotDiv);

    currentPlotData = traces;
    currentPlotLayout = layout;

    Plotly.newPlot('kaksPlot', traces, layout, { responsive: true, displayModeBar: false });
}

// ─── Visualization: Bar Chart Ka + Ks + Ka/Ks ──────────────────────────────

/**
 * Generate a grouped bar chart showing mean Ka, Ks, and Ka/Ks per gene.
 * @param {Object} geneResults - Results from computeAllKaKs
 */
function generateBarChart(geneResults) {
    plotContainer.innerHTML = '';
    resultsTitle.innerHTML = '<i class="fa-solid fa-chart-bar text-primary-500 dark:text-primary-400 mr-2"></i> Ka / Ks / Ka/Ks per Gene';

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    const geneNames = SORTED_GENES.filter(g => geneResults[g] && geneResults[g].kaValues.length > 0)
        .map(g => GENE_DISPLAY[g]);
    const kaVals = SORTED_GENES.filter(g => geneResults[g] && geneResults[g].kaValues.length > 0)
        .map(g => geneResults[g].meanKa);
    const ksVals = SORTED_GENES.filter(g => geneResults[g] && geneResults[g].kaValues.length > 0)
        .map(g => geneResults[g].meanKs);
    const kaksVals = SORTED_GENES.filter(g => geneResults[g] && geneResults[g].kaValues.length > 0)
        .map(g => geneResults[g].meanKaKs);

    const traces = [
        {
            x: geneNames, y: kaVals, name: 'Ka',
            type: 'bar', marker: { color: '#4682B4' }
        },
        {
            x: geneNames, y: ksVals, name: 'Ks',
            type: 'bar', marker: { color: '#B22222' }
        },
        {
            x: geneNames, y: kaksVals, name: 'Ka/Ks',
            type: 'bar', marker: { color: '#8B8B00' }
        },
    ];

    const layout = {
        barmode: 'group',
        showlegend: true,
        legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 12, family: 'Inter', color: textColor } },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        margin: { t: 30, b: 80, l: 60, r: 20 },
        height: 500,
        xaxis: {
            tickfont: { size: 11, family: 'Inter', color: textColor },
        },
        yaxis: {
            tickfont: { size: 10, family: 'Inter', color: textColor },
            gridcolor: gridColor,
            zeroline: false,
        },
    };

    const plotDiv = document.createElement('div');
    plotDiv.id = 'kaksPlot';
    plotContainer.appendChild(plotDiv);

    currentPlotData = traces;
    currentPlotLayout = layout;

    Plotly.newPlot('kaksPlot', traces, layout, { responsive: true, displayModeBar: false });
}

// ─── Visualization: Sankey Start/Stop Codons ────────────────────────────────

/**
 * Generate a Sankey diagram showing Initiation Codon → PCG → Termination Codon.
 * @param {Array} speciesGeneData - Array of {speciesName, genes} objects
 */
function generateSankey(speciesGeneData) {
    plotContainer.innerHTML = '';
    resultsTitle.innerHTML = '<i class="fa-solid fa-diagram-project text-primary-500 dark:text-primary-400 mr-2"></i> Start / Stop Codon Usage';

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';

    // Collect all start/stop codons across species
    const allCodons = [];
    for (const sp of speciesGeneData) {
        const codons = KaKsCalculator.extractStartStopCodons(sp.genes);
        allCodons.push(codons);
    }

    // Build unique sets
    const startCodons = new Set();
    const stopCodons = new Set();
    const pcgSet = new Set();

    for (const codons of allCodons) {
        for (const [gene, c] of Object.entries(codons)) {
            startCodons.add(c.start);
            stopCodons.add(c.stop);
            pcgSet.add(GENE_DISPLAY[gene] || gene.toUpperCase());
        }
    }

    // Build node list: start codons → PCGs → stop codons
    const startArr = [...startCodons].sort();
    const pcgArr = [...pcgSet].sort();
    const stopArr = [...stopCodons].sort();

    const nodes = [];
    const nodeLabels = [];
    const nodeColors = [];

    // Start codon nodes (purple)
    startArr.forEach(c => {
        nodes.push(c);
        nodeLabels.push(c);
        nodeColors.push('#CE93D8');
    });

    // PCG nodes (orange/gene colors)
    const pcgColors = {};
    pcgArr.forEach(pcg => {
        nodes.push(pcg);
        nodeLabels.push(pcg);
        // Find canonical name for color
        const canonical = Object.entries(GENE_DISPLAY).find(([k, v]) => v === pcg);
        const color = canonical ? (BedParser.GENE_COLORS[canonical[0]] || '#FFA726') : '#FFA726';
        nodeColors.push(color);
        pcgColors[pcg] = color;
    });

    // Stop codon nodes (cyan)
    stopArr.forEach(c => {
        nodes.push(c);
        nodeLabels.push(c);
        nodeColors.push('#4DD0E1');
    });

    // Node indices
    const nodeIndex = {};
    nodes.forEach((n, i) => nodeIndex[n] = i);

    // Build links
    const linkMap = {};

    for (const codons of allCodons) {
        for (const [gene, c] of Object.entries(codons)) {
            const pcgName = GENE_DISPLAY[gene] || gene.toUpperCase();

            // Start → PCG
            const k1 = `${c.start}→${pcgName}`;
            linkMap[k1] = linkMap[k1] || { source: nodeIndex[c.start], target: nodeIndex[pcgName], value: 0 };
            linkMap[k1].value++;

            // PCG → Stop
            const k2 = `${pcgName}→${c.stop}`;
            linkMap[k2] = linkMap[k2] || { source: nodeIndex[pcgName], target: nodeIndex[c.stop], value: 0 };
            linkMap[k2].value++;
        }
    }

    const links = Object.values(linkMap);

    // Link colors (based on source node color with transparency)
    const linkColors = links.map(l => {
        const srcColor = nodeColors[l.source] || '#ccc';
        return srcColor + '60'; // 40% opacity
    });

    const trace = {
        type: 'sankey',
        orientation: 'v',
        node: {
            pad: 20,
            thickness: 25,
            line: { color: isDark ? '#4B5563' : '#d1d5db', width: 1 },
            label: nodeLabels,
            color: nodeColors,
        },
        link: {
            source: links.map(l => l.source),
            target: links.map(l => l.target),
            value: links.map(l => l.value),
            color: linkColors,
        }
    };

    const layout = {
        paper_bgcolor: 'transparent',
        font: { size: 12, family: 'Inter', color: textColor },
        margin: { t: 30, b: 30, l: 20, r: 20 },
        height: 600,
    };

    // Annotations for row labels
    layout.annotations = [
        { x: 0, y: 1.07, xref: 'paper', yref: 'paper', text: '<b>Initiation<br>codon</b>', showarrow: false, font: { size: 12, color: textColor }, xanchor: 'left' },
        { x: 0.5, y: 0.5, xref: 'paper', yref: 'paper', text: '<b>PCGs</b>', showarrow: false, font: { size: 12, color: textColor }, xanchor: 'center' },
        { x: 1, y: -0.07, xref: 'paper', yref: 'paper', text: '<b>Termination<br>codon</b>', showarrow: false, font: { size: 12, color: textColor }, xanchor: 'right' },
    ];

    const plotDiv = document.createElement('div');
    plotDiv.id = 'kaksPlot';
    plotContainer.appendChild(plotDiv);

    currentPlotData = [trace];
    currentPlotLayout = layout;

    Plotly.newPlot('kaksPlot', [trace], layout, { responsive: true, displayModeBar: false });
}

// ─── Download Functions ─────────────────────────────────────────────────────

downloadPngBtn.addEventListener('click', async () => {
    if (!currentPlotData || !currentPlotLayout) return;

    const exportDiv = document.createElement('div');
    exportDiv.style.position = 'absolute';
    exportDiv.style.left = '-9999px';
    document.body.appendChild(exportDiv);

    const exportLayout = JSON.parse(JSON.stringify(currentPlotLayout));
    exportLayout.paper_bgcolor = '#fff';
    exportLayout.plot_bgcolor = '#fff';
    exportLayout.height = (exportLayout.height || 500) * 2;
    exportLayout.margin = { t: 60, b: 100, l: 100, r: 40 };

    // Scale fonts for export
    if (exportLayout.xaxis) exportLayout.xaxis.tickfont = { size: 20, family: 'Inter' };
    if (exportLayout.yaxis) {
        exportLayout.yaxis.tickfont = { size: 18, family: 'Inter' };
        if (exportLayout.yaxis.title) exportLayout.yaxis.title.font = { size: 22, family: 'Inter' };
    }
    if (exportLayout.xaxis && exportLayout.xaxis.title) exportLayout.xaxis.title.font = { size: 22, family: 'Inter' };
    if (exportLayout.legend) exportLayout.legend.font = { size: 18, family: 'Inter' };
    if (exportLayout.font) exportLayout.font.size = 18;

    await Plotly.newPlot(exportDiv, currentPlotData, exportLayout, { staticPlot: true });
    await Plotly.downloadImage(exportDiv, {
        format: 'png', width: 3200, height: exportLayout.height,
        scale: 2, filename: 'kaks_analysis'
    });
    Plotly.purge(exportDiv);
    document.body.removeChild(exportDiv);
});

downloadHtmlBtn.addEventListener('click', () => {
    if (!currentPlotData || !currentPlotLayout) return;

    const exportLayout = JSON.parse(JSON.stringify(currentPlotLayout));
    exportLayout.paper_bgcolor = '#fff';
    exportLayout.plot_bgcolor = '#fff';

    const htmlContent = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><title>Ka/Ks Analysis</title>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"><\/script>
</head><body>
<div id="plot" style="width:100%;height:100vh;"></div>
<script>
Plotly.newPlot('plot', ${JSON.stringify(currentPlotData)}, ${JSON.stringify(exportLayout)}, {responsive:true});
<\/script></body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kaks_analysis.html';
    a.click();
    URL.revokeObjectURL(url);
});
