// ─── DOM Elements ───────────────────────────────────────────────────────────
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const filesUl = document.getElementById('filesUl');
const fileCount = document.getElementById('fileCount');
const generateBtn = document.getElementById('generateBtn');
const resultsSection = document.getElementById('resultsSection');
const emptyState = document.getElementById('emptyState');
const plotContainer = document.getElementById('plotContainer');
const resetBtn = document.getElementById('resetBtn');

const downloadPngBtn = document.getElementById('downloadPng');
const downloadHtmlBtn = document.getElementById('downloadHtml');
const downloadSep = document.getElementById('downloadSep');

let selectedFiles = [];

// Store current plot data for exports
let currentPlotData = null;
let currentPlotLayout = null;

// ─── Event Listeners ────────────────────────────────────────────────────────
dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dropzone-active');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dropzone-active');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dropzone-active');
    handleFiles(e.dataTransfer.files);
});

resetBtn.addEventListener('click', () => {
    selectedFiles = [];
    updateFileList();
    resultsSection.classList.add('hidden');
    emptyState.classList.remove('hidden');
    fileInput.value = '';
    plotContainer.innerHTML = '';
    downloadPngBtn.classList.add('hidden');
    downloadHtmlBtn.classList.add('hidden');
    downloadSep.classList.add('hidden');
    currentPlotData = null;
    currentPlotLayout = null;
});

generateBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    await generateComparison();
});

// ─── File Handling ──────────────────────────────────────────────────────────

const VALID_EXTENSIONS = ['.bed', '.txt'];

/**
 * Filters and adds valid BED/TXT files to the selectedFiles array.
 * Prevents duplicate files based on file name.
 * @param {FileList} files - Files from input or drag-and-drop event
 */
function handleFiles(files) {
    for (const file of files) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (VALID_EXTENSIONS.includes(ext)) {
            if (!selectedFiles.find(f => f.name === file.name)) {
                selectedFiles.push(file);
            }
        }
    }
    updateFileList();
}

/**
 * Updates the file list UI, showing selected files with remove buttons.
 * Toggles visibility of the file list panel and enables/disables the Generate button.
 */
function updateFileList() {
    filesUl.innerHTML = '';

    if (selectedFiles.length > 0) {
        fileList.classList.remove('hidden');
        generateBtn.disabled = false;
        if (fileCount) fileCount.textContent = selectedFiles.length;

        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = "flex justify-between items-center bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm";
            li.innerHTML = `
                <span class="truncate text-gray-700 w-3/4" title="${file.name}"><i class="fa-solid fa-layer-group text-gray-400 mr-2"></i>${file.name}</span>
                <button class="remove-file text-red-500 hover:text-red-700 transition-colors" data-index="${index}"><i class="fa-solid fa-xmark pointer-events-none"></i></button>
            `;
            filesUl.appendChild(li);
        });

        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                selectedFiles.splice(idx, 1);
                updateFileList();
            });
        });
    } else {
        fileList.classList.add('hidden');
        generateBtn.disabled = true;
        if (fileCount) fileCount.textContent = '0';
    }
}

// ─── Generate Comparison ────────────────────────────────────────────────────

/**
 * Reads all selected BED files, parses them using BedParser, extracts
 * protein-coding gene sizes, and triggers chart generation.
 * Each file represents one species.
 */
async function generateComparison() {
    const speciesData = [];

    for (const file of selectedFiles) {
        const text = await file.text();
        const entries = BedParser.parseBedFile(text);
        const sizes = BedParser.extractGeneSizes(entries);
        const name = BedParser.getSpeciesName(entries, file.name);
        speciesData.push({ name, sizes });
    }

    if (speciesData.length === 0) return;

    generatePlotlyChart(speciesData);
}

// ─── Plotly Chart Generation ────────────────────────────────────────────────

/**
 * Generates a Plotly chart with horizontal bar subplots.
 * Each gene is rendered as a separate subplot (column) with independent x-axis scale.
 * All subplots share the same y-axis (species names).
 * Stores traces and layout in module-level variables for PNG/HTML export.
 * @param {Array<{name: string, sizes: Object}>} speciesData - Array of species objects
 *   with `name` (species identifier) and `sizes` (map of gene name → size in bp)
 */
function generatePlotlyChart(speciesData) {
    plotContainer.innerHTML = '';

    emptyState.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    const genes = BedParser.CANONICAL_GENE_ORDER;
    const colors = BedParser.GENE_COLORS;
    const nGenes = genes.length;
    const nSpecies = speciesData.length;

    // Species names (reversed so first file appears at top)
    const speciesNames = speciesData.map(s => s.name).reverse();

    // Build traces and layout for subplots
    const traces = [];
    const annotations = [];

    // Calculate subplot domains (evenly distributed columns)
    const gapX = 0.015;
    const leftMarginFrac = 0; // species names handled by yaxis
    const totalWidth = 1 - leftMarginFrac;
    const colWidth = (totalWidth - gapX * (nGenes - 1)) / nGenes;

    genes.forEach((gene, geneIdx) => {
        // Values for this gene across all species (reversed order)
        const values = speciesData.map(s => s.sizes[gene] || 0).reverse();

        const xAxisId = geneIdx === 0 ? 'x' : `x${geneIdx + 1}`;
        const yAxisId = geneIdx === 0 ? 'y' : `y${geneIdx + 1}`;

        traces.push({
            x: values,
            y: speciesNames,
            type: 'bar',
            orientation: 'h',
            marker: {
                color: colors[gene] || '#999',
            },
            hovertemplate: `<b>${gene}</b><br>%{y}: %{x} bp<extra></extra>`,
            xaxis: xAxisId,
            yaxis: yAxisId,
            showlegend: false,
        });

        // Gene name annotation at the top of each column
        const x0 = leftMarginFrac + geneIdx * (colWidth + gapX);
        const xMid = x0 + colWidth / 2;

        annotations.push({
            text: `<b>${gene}</b>`,
            x: xMid,
            y: 1.02,
            xref: 'paper',
            yref: 'paper',
            showarrow: false,
            font: {
                size: 11,
                family: 'Inter',
                color: colors[gene] || '#666'
            },
            xanchor: 'center',
            yanchor: 'bottom'
        });
    });

    // Build layout with subplots
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const bgColor = 'transparent';

    const layout = {
        showlegend: false,
        paper_bgcolor: bgColor,
        plot_bgcolor: bgColor,
        margin: { t: 40, b: 30, l: 200, r: 10 },
        height: Math.max(400, nSpecies * 28 + 80),
        annotations: annotations,
    };

    // Create xaxis and yaxis for each gene subplot
    genes.forEach((gene, geneIdx) => {
        const x0 = leftMarginFrac + geneIdx * (colWidth + gapX);
        const x1 = x0 + colWidth;

        const xKey = geneIdx === 0 ? 'xaxis' : `xaxis${geneIdx + 1}`;
        const yKey = geneIdx === 0 ? 'yaxis' : `yaxis${geneIdx + 1}`;

        // Find max value for this gene across all species
        const maxVal = Math.max(...speciesData.map(s => s.sizes[gene] || 0));

        layout[xKey] = {
            domain: [x0, x1],
            range: [0, maxVal * 1.1 || 100],
            showgrid: false,
            zeroline: false,
            showticklabels: true,
            tickfont: { size: 8, family: 'Inter', color: textColor },
            side: 'bottom',
            nticks: 3,
        };

        layout[yKey] = {
            anchor: geneIdx === 0 ? 'x' : `x${geneIdx + 1}`,
            showticklabels: geneIdx === 0,
            tickfont: {
                size: 10,
                family: 'Inter',
                color: textColor,
            },
            ticksuffix: geneIdx === 0 ? '   ' : '', // spacing between name and bars
            showgrid: false,
            zeroline: false,
            automargin: true,
        };

        // Share the y-axis categories across all subplots
        if (geneIdx > 0) {
            layout[yKey].matches = 'y';
        }
    });

    // Create plot div
    const plotDiv = document.createElement('div');
    plotDiv.id = 'geneSizePlot';
    plotContainer.appendChild(plotDiv);

    // Store for exports
    currentPlotData = traces;
    currentPlotLayout = layout;

    Plotly.newPlot('geneSizePlot', traces, layout, {
        responsive: true,
        displayModeBar: false,
    });

    // Show download buttons
    downloadPngBtn.classList.remove('hidden');
    downloadHtmlBtn.classList.remove('hidden');
    downloadSep.classList.remove('hidden');
}

// ─── Download Functions ─────────────────────────────────────────────────────

downloadPngBtn.addEventListener('click', async () => {
    if (!currentPlotData || !currentPlotLayout) return;

    // Create a temporary offscreen div for high-quality export
    const exportDiv = document.createElement('div');
    exportDiv.id = 'geneSizeExport';
    exportDiv.style.position = 'absolute';
    exportDiv.style.left = '-9999px';
    exportDiv.style.top = '-9999px';
    document.body.appendChild(exportDiv);

    // Deep clone layout and increase all font sizes for publication
    const exportLayout = JSON.parse(JSON.stringify(currentPlotLayout));
    exportLayout.margin = { t: 60, b: 50, l: 300, r: 20 };
    exportLayout.height = (exportLayout.height || 500) * 2;
    exportLayout.paper_bgcolor = '#fff';
    exportLayout.plot_bgcolor = '#fff';

    // Scale annotations (gene names) font
    if (exportLayout.annotations) {
        exportLayout.annotations.forEach(ann => {
            ann.font = ann.font || {};
            ann.font.size = 22;
            ann.font.color = ann.font.color || '#333';
        });
    }

    // Scale all axis fonts
    for (const key in exportLayout) {
        if (key.startsWith('xaxis')) {
            exportLayout[key].tickfont = { size: 16, family: 'Inter', color: '#333' };
        }
        if (key.startsWith('yaxis')) {
            exportLayout[key].tickfont = { size: 20, family: 'Inter', color: '#333' };
        }
    }

    await Plotly.newPlot(exportDiv, currentPlotData, exportLayout, { staticPlot: true });

    await Plotly.downloadImage(exportDiv, {
        format: 'png',
        width: 3200,
        height: exportLayout.height,
        scale: 2,
        filename: 'gene_size_comparison'
    });

    // Cleanup
    Plotly.purge(exportDiv);
    document.body.removeChild(exportDiv);
});

downloadHtmlBtn.addEventListener('click', () => {
    if (!currentPlotData || !currentPlotLayout) return;

    const htmlContent = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Gene Size Comparison</title>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"><\/script>
</head><body>
<div id="plot" style="width:100%;height:100vh;"></div>
<script>
var data = ${JSON.stringify(currentPlotData)};
var layout = ${JSON.stringify(currentPlotLayout)};
layout.paper_bgcolor = '#fff';
layout.plot_bgcolor = '#fff';
layout.margin = {t: 60, b: 50, l: 350, r: 20};
// Scale gene name annotations
if (layout.annotations) {
    layout.annotations.forEach(function(ann) {
        ann.font = ann.font || {};
        ann.font.size = 20;
    });
}
// Scale axis fonts
for (var key in layout) {
    if (key.indexOf('xaxis') === 0) {
        layout[key].tickfont = {size: 14, family: 'Inter'};
    }
    if (key.indexOf('yaxis') === 0) {
        layout[key].tickfont = {size: 30, family: 'Inter'};
    }
}
Plotly.newPlot('plot', data, layout, {responsive: true});
<\/script>
</body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gene_size_comparison.html';
    a.click();
    URL.revokeObjectURL(url);
});
