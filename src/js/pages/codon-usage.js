// ─── DOM Elements ───────────────────────────────────────────────────────────
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const filesUl = document.getElementById('filesUl');
const fileCount = document.getElementById('fileCount');
const generateBtn = document.getElementById('generateBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsTitle = document.getElementById('resultsTitle');
const emptyState = document.getElementById('emptyState');
const plotContainer = document.getElementById('plotContainer');
const resetBtn = document.getElementById('resetBtn');
const modeToggle = document.getElementById('modeToggle');
const geneticCodeSection = document.getElementById('geneticCodeSection');
const geneticCodeSelect = document.getElementById('geneticCodeSelect');
const metricSelect = document.getElementById('metricSelect');
const dropzoneText = document.getElementById('dropzoneText');
const dropzoneHint = document.getElementById('dropzoneHint');
const dropzoneIcon = document.getElementById('dropzoneIcon');

let selectedFiles = [];
let currentMode = 'preprocessed'; // 'preprocessed' or 'fasta'

// Amino acid full names mapping
const aaMap = {
    'F': 'Phe', 'L': 'Leu', 'I': 'Ile', 'M': 'Met', 'V': 'Val',
    'S': 'Ser', 'P': 'Pro', 'T': 'Thr', 'A': 'Ala', 'Y': 'Tyr',
    'H': 'His', 'Q': 'Gln', 'N': 'Asn', 'K': 'Lys', 'D': 'Asp',
    'E': 'Glu', 'C': 'Cys', 'W': 'Trp', 'R': 'Arg', 'G': 'Gly'
};

// Colors for the stacked bars based on the codon's index for that amino acid
const palette = ['#5b8dcb', '#d85335', '#8bb95b', '#7c539f', '#52b0c4', '#e8a946'];

// Metric labels and configuration
const METRIC_CONFIG = {
    cu: { label: 'Codon Usage', shortLabel: 'Codon Usage', yMax: null, yTitle: 'Count' },
    cu1000: { label: 'Codon Usage per Thousand', shortLabel: 'Codon Usage/1000', yMax: null, yTitle: '‰' },
    rscu: { label: 'RSCU', shortLabel: 'RSCU', yMax: 5, yTitle: 'RSCU' }
};

// ─── Initialize Genetic Code Selector ────────────────────────────────────────
function initGeneticCodeSelector() {
    if (typeof RSCUCalculator !== 'undefined') {
        const codes = RSCUCalculator.getAvailableGeneticCodes();
        geneticCodeSelect.innerHTML = '';
        codes.forEach(code => {
            const opt = document.createElement('option');
            opt.value = code.id;
            opt.textContent = `${code.id}. ${code.name}`;
            if (code.id === 2) opt.selected = true;
            geneticCodeSelect.appendChild(opt);
        });
    }
}
initGeneticCodeSelector();

// ─── Mode Toggle Logic ──────────────────────────────────────────────────────
const modeBtns = modeToggle.querySelectorAll('.mode-btn');
modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (mode === currentMode) return;
        currentMode = mode;

        // Reset files when switching mode
        selectedFiles = [];
        updateFileList();

        // Update button styles
        modeBtns.forEach(b => {
            if (b.getAttribute('data-mode') === mode) {
                b.classList.add('bg-white', 'dark:bg-gray-600', 'text-gray-900', 'dark:text-white', 'shadow-sm');
                b.classList.remove('text-gray-500', 'dark:text-gray-400');
            } else {
                b.classList.remove('bg-white', 'dark:bg-gray-600', 'text-gray-900', 'dark:text-white', 'shadow-sm');
                b.classList.add('text-gray-500', 'dark:text-gray-400');
            }
        });

        // Show/hide FASTA-specific options
        if (mode === 'fasta') {
            geneticCodeSection.classList.remove('hidden');
            fileInput.accept = '.fasta,.fa,.fna,.fas,.txt';
            dropzoneHint.textContent = 'FASTA, FA, FNA or FAS files';
            dropzoneIcon.className = 'fa-solid fa-dna';
        } else {
            geneticCodeSection.classList.add('hidden');
            fileInput.accept = '.tsv,.csv,.txt';
            dropzoneHint.textContent = 'TSV, CSV or TXT only';
            dropzoneIcon.className = 'fa-regular fa-folder-open';
        }
    });
});

// ─── Event Listeners for File Selection ─────────────────────────────────────
dropzone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

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
});

generateBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    if (currentMode === 'fasta') {
        await generateFromFasta();
    } else {
        await generateFromPreprocessed();
    }
});

// ─── File Handling ──────────────────────────────────────────────────────────

const PREPROCESSED_EXTENSIONS = ['.tsv', '.csv', '.txt'];
const FASTA_EXTENSIONS = ['.fasta', '.fa', '.fna', '.fas', '.txt'];

function handleFiles(files) {
    const validExtensions = currentMode === 'fasta' ? FASTA_EXTENSIONS : PREPROCESSED_EXTENSIONS;

    for (const file of files) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (validExtensions.includes(ext)) {
            if (!selectedFiles.find(f => f.name === file.name)) {
                selectedFiles.push(file);
            }
        }
    }
    updateFileList();
}

function updateFileList() {
    filesUl.innerHTML = '';

    if (selectedFiles.length > 0) {
        fileList.classList.remove('hidden');
        generateBtn.disabled = false;
        if (fileCount) fileCount.textContent = selectedFiles.length;

        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = "flex justify-between items-center bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm";

            const iconClass = currentMode === 'fasta' ? 'fa-solid fa-dna' : 'fa-solid fa-file-csv';
            li.innerHTML = `
                <span class="truncate text-gray-700 w-3/4" title="${file.name}"><i class="${iconClass} text-gray-400 mr-2"></i>${file.name}</span>
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

// ─── Generate from Pre-processed ────────────────────────────────────────────

async function generateFromPreprocessed() {
    const parsedData = [];
    for (const file of selectedFiles) {
        const text = await file.text();
        const results = Papa.parse(text, { delimiter: '\t', skipEmptyLines: true });
        parsedData.push({ file, data: results.data });
    }
    generatePlots(parsedData);
}

// ─── Generate from FASTA ────────────────────────────────────────────────────

async function generateFromFasta() {
    const tableId = parseInt(geneticCodeSelect.value);
    const metric = metricSelect.value;

    const allParsed = [];

    for (const file of selectedFiles) {
        const text = await file.text();
        try {
            const data = RSCUCalculator.fastaToCodonUsageData(text, tableId, metric);
            allParsed.push({ file, data });
        } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
            alert(`Error processing ${file.name}: ${err.message}`);
            return;
        }
    }

    if (allParsed.length === 1) {
        generatePlots(allParsed);
    } else {
        const combined = {
            file: { name: 'Combined FASTA' },
            data: [allParsed[0].data[0], allParsed[0].data[1]]
        };
        for (const parsed of allParsed) {
            for (let i = 2; i < parsed.data.length; i++) {
                combined.data.push(parsed.data[i]);
            }
        }
        generatePlots([combined]);
    }
}

// ─── Plot Generation ────────────────────────────────────────────────────────

function generatePlots(datasets) {
    plotContainer.innerHTML = '';

    const metric = metricSelect.value;
    const config = METRIC_CONFIG[metric];

    // Update results title
    resultsTitle.innerHTML = `<i class="fa-solid fa-chart-column text-primary-500 dark:text-primary-400 mr-2"></i> ${config.label} Results`;

    // Switch states
    emptyState.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    if (datasets.length === 0) return;

    const baseData = datasets[0].data;
    const codonsRow = baseData[0].slice(1);
    const aaRow = baseData[1].slice(1);

    function getCustomAA(aa, codon) {
        let rawAA = aaMap[aa] || aa;
        let rnaCodon = codon.replace(/T/g, 'U');
        if (rawAA === 'Ser' || rawAA === 'S') {
            if (rnaCodon.startsWith('AG')) return 'Ser1';
            if (rnaCodon.startsWith('UC')) return 'Ser2';
            return 'Ser';
        }
        if (rawAA === 'Leu' || rawAA === 'L') {
            if (rnaCodon.startsWith('CU')) return 'Leu1';
            if (rnaCodon.startsWith('UU')) return 'Leu2';
            return 'Leu';
        }
        return rawAA;
    }

    const codonInfo = codonsRow.map((codon, i) => {
        return {
            index: i,
            codon: codon,
            aa: getCustomAA(aaRow[i], codon)
        };
    });

    const uniqueAAs = [...new Set(codonInfo.map(c => c.aa))].sort();

    // Collect all data rows from all datasets
    const allSpeciesRows = [];
    datasets.forEach(dataset => {
        for (let rowIdx = 2; rowIdx < dataset.data.length; rowIdx++) {
            allSpeciesRows.push({
                row: dataset.data[rowIdx],
                fileName: dataset.file.name
            });
        }
    });

    // Determine global y-max for CU and CU/1000 (data-driven)
    // Must sum stacked values per amino acid column, not just find max individual bar
    let globalYMax = config.yMax;
    if (globalYMax === null) {
        let maxStackedVal = 0;
        allSpeciesRows.forEach(entry => {
            const vals = entry.row.slice(1).map(v => parseFloat(v) || 0);
            // Sum values per amino acid (each AA column = sum of its codon values)
            uniqueAAs.forEach(aaName => {
                const indices = codonInfo.filter(c => c.aa === aaName).map(c => c.index);
                const stackSum = indices.reduce((sum, idx) => sum + vals[idx], 0);
                if (stackSum > maxStackedVal) maxStackedVal = stackSum;
            });
        });
        // Round up to a nice number with ~10% headroom
        globalYMax = Math.ceil(maxStackedVal * 1.1);
        if (globalYMax < 1) globalYMax = 1;
    }

    // Generate one plot per species row
    allSpeciesRows.forEach((speciesEntry, index) => {
        const speciesDataRow = speciesEntry.row;
        const speciesName = speciesDataRow[0] || speciesEntry.fileName.replace(/\.(tsv|csv|txt|fasta|fa|fna|fas)$/i, '');
        const values = speciesDataRow.slice(1).map(v => parseFloat(v));

        const traces = [];

        let aaCodonCounts = {};
        codonInfo.forEach(info => {
            aaCodonCounts[info.aa] = (aaCodonCounts[info.aa] || 0) + 1;
        });
        const maxLayers = Math.max(...Object.values(aaCodonCounts));

        for (let layer = 0; layer < maxLayers; layer++) {
            const currentLayerX = [];
            const currentLayerY = [];
            const currentLayerText = [];

            uniqueAAs.forEach(aaName => {
                const indices = codonInfo.filter(c => c.aa === aaName).map(c => c.index);

                if (layer < indices.length) {
                    const dataIndex = indices[layer];
                    currentLayerX.push(aaName);
                    currentLayerY.push(values[dataIndex]);
                    currentLayerText.push(codonsRow[dataIndex]);
                } else {
                    currentLayerX.push(aaName);
                    currentLayerY.push(0);
                    currentLayerText.push('');
                }
            });

            traces.push({
                x: currentLayerX,
                y: currentLayerY,
                name: `Trace ${layer}`,
                type: 'bar',
                marker: { color: palette[layer % palette.length] },
                hoverinfo: 'text+y',
                text: currentLayerText.map((t, i) => currentLayerY[i] > 0 ? `${t}: ${currentLayerY[i].toFixed(2)}` : '')
            });
        }

        // Create div for this plot
        const divId = `plot-${index}`;
        const plotDivParent = document.createElement('div');
        plotDivParent.style.marginBottom = '20px';

        const speciesHeading = document.createElement('h3');
        speciesHeading.className = 'text-left font-semibold text-gray-800 dark:text-gray-200 italic mb-1 text-sm pl-8';
        speciesHeading.textContent = speciesName;

        const plotDiv = document.createElement('div');
        plotDiv.id = divId;
        plotDiv.style.height = '180px';

        plotDivParent.appendChild(speciesHeading);
        plotDivParent.appendChild(plotDiv);
        plotContainer.appendChild(plotDivParent);

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        // Build y-axis tick values and grid lines
        let yTickVals;
        let gridShapes;

        if (metric === 'rscu') {
            yTickVals = [1, 2, 3, 4, 5];
            gridShapes = yTickVals.map(y => ({
                type: 'line',
                x0: 0, x1: 1, xref: 'paper',
                y0: y, y1: y, yref: 'y',
                line: { color: gridColor, width: 1, dash: (y % 2 === 0) ? 'solid' : 'dot' },
                layer: 'below'
            }));
        } else {
            // Dynamic grid for CU / CU/1000
            const step = Math.max(1, Math.round(globalYMax / 5));
            yTickVals = [];
            for (let v = step; v <= globalYMax; v += step) {
                yTickVals.push(v);
            }
            gridShapes = yTickVals.map((y, i) => ({
                type: 'line',
                x0: 0, x1: 1, xref: 'paper',
                y0: y, y1: y, yref: 'y',
                line: { color: gridColor, width: 1, dash: (i % 2 === 0) ? 'dot' : 'solid' },
                layer: 'below'
            }));
        }

        const layout = {
            barmode: 'stack',
            showlegend: false,
            margin: { t: 5, b: index === allSpeciesRows.length - 1 ? 30 : 15, l: 40, r: 10 },
            xaxis: {
                showticklabels: index === allSpeciesRows.length - 1,
                tickangle: 0,
                tickfont: { size: 10, family: 'Inter', color: textColor }
            },
            yaxis: {
                range: [0, globalYMax],
                tickvals: yTickVals,
                showgrid: false,
                zeroline: true,
                zerolinecolor: gridColor,
                tickfont: { size: 10, family: 'Inter', color: textColor }
            },
            shapes: gridShapes,
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent'
        };

        Plotly.newPlot(divId, traces, layout, { staticPlot: false, displayModeBar: false, responsive: true });
    });

    // Add custom legend at the bottom
    buildCustomLegend(codonInfo, uniqueAAs);
}

function buildCustomLegend(codonInfo, uniqueAAs) {
    const legendContainer = document.createElement('div');
    legendContainer.style.display = 'flex';
    legendContainer.style.justifyContent = 'space-between';
    legendContainer.style.alignItems = 'flex-start';
    legendContainer.style.paddingLeft = '30px';
    legendContainer.style.paddingRight = '10px';
    legendContainer.style.marginTop = '10px';

    uniqueAAs.forEach(aaName => {
        const indices = codonInfo.filter(c => c.aa === aaName).map(c => c.index);

        const colDiv = document.createElement('div');
        colDiv.style.display = 'flex';
        colDiv.style.flexDirection = 'column';
        colDiv.style.alignItems = 'center';
        colDiv.style.gap = '2px';
        colDiv.style.flex = '1';

        const titleDiv = document.createElement('div');
        titleDiv.textContent = aaName;
        titleDiv.className = 'text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300';
        colDiv.appendChild(titleDiv);

        indices.forEach((dataIndex, layer) => {
            const codon = codonInfo.find(c => c.index === dataIndex).codon;
            const rnaCodon = codon.replace(/T/g, 'U');

            const box = document.createElement('div');
            box.style.backgroundColor = palette[layer % palette.length];
            box.style.color = 'white';
            box.style.fontSize = '10px';
            box.style.fontWeight = 'bold';
            box.style.padding = '2px 4px';
            box.style.borderRadius = '2px';
            box.innerText = rnaCodon;

            colDiv.appendChild(box);
        });

        legendContainer.appendChild(colDiv);
    });

    plotContainer.appendChild(legendContainer);
}
