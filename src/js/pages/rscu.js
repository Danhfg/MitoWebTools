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
const modeToggle = document.getElementById('modeToggle');
const geneticCodeSection = document.getElementById('geneticCodeSection');
const geneticCodeSelect = document.getElementById('geneticCodeSelect');
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

// ─── Initialize Genetic Code Selector ────────────────────────────────────────
function initGeneticCodeSelector() {
    if (typeof RSCUCalculator !== 'undefined') {
        const codes = RSCUCalculator.getAvailableGeneticCodes();
        geneticCodeSelect.innerHTML = '';
        codes.forEach(code => {
            const opt = document.createElement('option');
            opt.value = code.id;
            opt.textContent = `${code.id}. ${code.name}`;
            // Default to Vertebrate Mitochondrial (2)
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
            // Check if not already added
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

        // Add events to remove buttons
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // e.currentTarget gets the button even if icon is clicked
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

// ─── Generate from Pre-processed (existing pipeline) ────────────────────────

async function generateFromPreprocessed() {
    const parsedData = [];
    for (const file of selectedFiles) {
        const text = await file.text();
        const results = Papa.parse(text, { delimiter: '\t', skipEmptyLines: true });
        parsedData.push({ file, data: results.data });
    }
    generatePlots(parsedData);
}

// ─── Generate from FASTA (new pipeline) ─────────────────────────────────────

async function generateFromFasta() {
    const tableId = parseInt(geneticCodeSelect.value);

    const allParsed = [];

    for (const file of selectedFiles) {
        const text = await file.text();
        try {
            const data = RSCUCalculator.fastaToRscuData(text, tableId);
            allParsed.push({ file, data });
        } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
            alert(`Error processing ${file.name}: ${err.message}`);
            return;
        }
    }

    // The data is already in CaiCal-compatible format, merge if multiple files
    if (allParsed.length === 1) {
        generatePlots(allParsed);
    } else {
        // Multiple files: combine all data rows under the same codon/AA headers
        // Use the first file's headers (should be the same for same genetic code)
        const combined = {
            file: { name: 'Combined FASTA' },
            data: [allParsed[0].data[0], allParsed[0].data[1]]
        };
        for (const parsed of allParsed) {
            // Skip header rows (first 2), add all data rows
            for (let i = 2; i < parsed.data.length; i++) {
                combined.data.push(parsed.data[i]);
            }
        }
        generatePlots([combined]);
    }
}

// ─── Plot Generation (shared by both pipelines) ────────────────────────────

function generatePlots(datasets) {
    plotContainer.innerHTML = '';

    // Switch states
    emptyState.classList.add('hidden');
    resultsSection.classList.remove('hidden');

    // We assume all files have the exact same structure (same Codons and AAs order)
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

    // Get unique AAs and sort them alphabetically
    const uniqueAAs = [...new Set(codonInfo.map(c => c.aa))].sort();

    // Collect all data rows from all datasets (each dataset may have multiple species)
    const allSpeciesRows = [];
    datasets.forEach(dataset => {
        for (let rowIdx = 2; rowIdx < dataset.data.length; rowIdx++) {
            allSpeciesRows.push({
                row: dataset.data[rowIdx],
                fileName: dataset.file.name
            });
        }
    });

    // Generate one plot per species row
    allSpeciesRows.forEach((speciesEntry, index) => {
        const speciesDataRow = speciesEntry.row;
        const speciesName = speciesDataRow[0] || speciesEntry.fileName.replace(/\.(tsv|csv|txt|fasta|fa|fna|fas)$/i, '');
        const values = speciesDataRow.slice(1).map(v => parseFloat(v));

        // Group values by Codon (which maps to Amino Acid and Color Index)
        const traces = [];

        // Find max codons for any custom AA to know how many stack layers we need
        let aaCodonCounts = {};
        codonInfo.forEach(info => {
            aaCodonCounts[info.aa] = (aaCodonCounts[info.aa] || 0) + 1;
        });
        const maxLayers = Math.max(...Object.values(aaCodonCounts));

        for (let layer = 0; layer < maxLayers; layer++) {
            const currentLayerX = [];
            const currentLayerY = [];
            const currentLayerText = [];

            // Loop through our unique AAs (sorted)
            uniqueAAs.forEach(aaName => {
                // Get all indices for this AA
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
        speciesHeading.className = 'text-left font-semibold text-gray-800 italic mb-1 text-sm pl-8';
        speciesHeading.textContent = speciesName;

        const plotDiv = document.createElement('div');
        plotDiv.id = divId;
        plotDiv.style.height = '180px'; // Keep each plot relatively short to match the facet grid

        plotDivParent.appendChild(speciesHeading);
        plotDivParent.appendChild(plotDiv);
        plotContainer.appendChild(plotDivParent);

        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? '#374151' : '#e5e7eb';

        // Custom shapes for horizontal grid lines
        const gridShapes = [1, 2, 3, 4, 5].map(y => ({
            type: 'line',
            x0: 0,
            x1: 1,
            xref: 'paper',
            y0: y,
            y1: y,
            yref: 'y',
            line: {
                color: gridColor,
                width: 1,
                dash: (y % 2 === 0) ? 'solid' : 'dot'
            },
            layer: 'below'
        }));

        // Layout
        const layout = {
            barmode: 'stack',
            showlegend: false,
            margin: { t: 5, b: index === allSpeciesRows.length - 1 ? 30 : 15, l: 30, r: 10 },
            xaxis: {
                showticklabels: index === allSpeciesRows.length - 1, // Only show x labels on last plot
                tickangle: 0,
                tickfont: { size: 10, family: 'Inter', color: textColor }
            },
            yaxis: {
                range: [0, 5],
                tickvals: [1, 2, 3, 4, 5],
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
            // To mimic the image, replace T with U if desired, but we keep original here
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
