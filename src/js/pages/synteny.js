const dropzoneBED = document.getElementById('dropzoneBED');
const fileInputBED = document.getElementById('fileInputBED');
const fileListBED = document.getElementById('fileListBED');
const filesUlBED = document.getElementById('filesUlBED');
const fileCountBED = document.getElementById('fileCountBED');
const generateBtnBED = document.getElementById('generateBtnBED');
const resultsSectionBED = document.getElementById('resultsSectionBED');
const emptyStateBED = document.getElementById('emptyStateBED');
const syntenyContainer = document.getElementById('syntenyContainer');
const syntenyLegend = document.getElementById('syntenyLegend');
const resetBtnBED = document.getElementById('resetBtnBED');

let selectedBedFiles = [];

// Palette matching the uploaded image exactly
const geneColors = {
    '12S': '#2f4f4f',     // Dark Gray/Slate
    '16S': '#a2cda2',     // Light Green
    'ND1': '#228b22',     // Dark Green
    'ND2': '#9acd32',     // Lime Green
    'OL': '#cd5c5c',      // Burgundy/Brown
    'COX1': '#f4a460',    // Orange
    'COX2': '#f5deb3',    // Light Orange/Tan
    'ATP8': '#da70d6',    // Purple
    'ATP6': '#dda0dd',    // Light Purple
    'COX3': '#ffb6c1',    // Light Pink
    'ND3': '#ff69b4',     // Pink
    'ND4L': '#ff6347',    // Tomato/Red
    'ND4': '#eee8aa',     // Pale Yellow/Cream
    'ND5': '#b0e0e6',     // Light Blue
    'ND6': '#00bfff',     // Cyan/Bright Blue
    'CYTB': '#1e90ff',    // Blue
    'OH': '#ffff54',      // Yellow
    'tRNAs': '#0000cd'    // Dark Blue
};

// Aliases mapped from MITOS output to correct visual name
const geneAliases = {
    '12s': '12S', 'rrns': '12S',
    '16s': '16S', 'rrnl': '16S',
    'nad1': 'ND1', 'nd1': 'ND1',
    'nad2': 'ND2', 'nd2': 'ND2',
    'nad3': 'ND3', 'nd3': 'ND3',
    'nad4': 'ND4', 'nd4': 'ND4',
    'nad4l': 'ND4L', 'nd4l': 'ND4L',
    'nad5': 'ND5', 'nd5': 'ND5',
    'nad6': 'ND6', 'nd6': 'ND6',
    'cox1': 'COX1', 'coi': 'COX1',
    'cox2': 'COX2', 'coii': 'COX2',
    'cox3': 'COX3', 'coiii': 'COX3',
    'atp6': 'ATP6', 'atp6-a': 'ATP6', 'atp6-b': 'ATP6',
    'atp8': 'ATP8',
    'cytb': 'CYTB', 'cob': 'CYTB',
    'ol': 'OL', 'rep_ori': 'OL',
    'd-loop': 'OH', 'cr': 'OH'
};

// Returns standard name and its defined color
function getGeneInfo(rawName) {
    let lowerName = rawName.toLowerCase();

    // Check if it's a tRNA (trn...)
    if (lowerName.startsWith('trn')) {
        return { standardName: rawName, color: geneColors['tRNAs'], group: 'tRNAs' };
    }

    let mapped = geneAliases[lowerName];
    if (mapped) {
        return { standardName: mapped, color: geneColors[mapped] || '#cccccc', group: mapped };
    }

    // Default fallback
    return { standardName: rawName, color: '#dddddd', group: 'Others' };
}

// Event Listeners for Upload
dropzoneBED.addEventListener('click', () => fileInputBED.click());
fileInputBED.addEventListener('change', (e) => handleBedFiles(e.target.files));
dropzoneBED.addEventListener('dragover', (e) => { e.preventDefault(); dropzoneBED.classList.add('dropzone-active'); });
dropzoneBED.addEventListener('dragleave', () => dropzoneBED.classList.remove('dropzone-active'));
dropzoneBED.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneBED.classList.remove('dropzone-active');
    handleBedFiles(e.dataTransfer.files);
});

resetBtnBED.addEventListener('click', () => {
    selectedBedFiles = [];
    updateBedList();
    resultsSectionBED.classList.add('hidden');
    emptyStateBED.classList.remove('hidden');
    fileInputBED.value = '';
    syntenyContainer.innerHTML = '';
});

function handleBedFiles(files) {
    for (const file of files) {
        if (file.name.endsWith('.bed') || file.name.endsWith('.txt')) {
            if (!selectedBedFiles.find(f => f.name === file.name)) {
                selectedBedFiles.push(file);
            }
        }
    }
    updateBedList();
}

function updateBedList() {
    filesUlBED.innerHTML = '';
    if (selectedBedFiles.length > 0) {
        fileListBED.classList.remove('hidden');
        generateBtnBED.disabled = false;
        fileCountBED.textContent = selectedBedFiles.length;

        selectedBedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.className = "flex justify-between items-center bg-gray-50 border border-gray-100 rounded px-3 py-2 text-sm";
            li.innerHTML = `
                <span class="truncate text-gray-700 w-3/4" title="${file.name}"><i class="fa-solid fa-align-left text-gray-400 mr-2"></i>${file.name}</span>
                <button class="remove-bed text-red-500 hover:text-red-700 transition-colors" data-index="${index}"><i class="fa-solid fa-xmark pointer-events-none"></i></button>
            `;
            filesUlBED.appendChild(li);
        });

        document.querySelectorAll('.remove-bed').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                selectedBedFiles.splice(idx, 1);
                updateBedList();
            });
        });
    } else {
        fileListBED.classList.add('hidden');
        generateBtnBED.disabled = true;
        fileCountBED.textContent = '0';
    }
}

// Generate
generateBtnBED.addEventListener('click', async () => {
    if (selectedBedFiles.length === 0) return;

    emptyStateBED.classList.add('hidden');
    resultsSectionBED.classList.remove('hidden');

    const parsedData = [];

    // Parse BED
    for (let i = 0; i < selectedBedFiles.length; i++) {
        const file = selectedBedFiles[i];
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');

        const speciesGenes = [];
        let speciesName = file.name.replace('.bed', '').replace('.txt', '');

        lines.forEach(line => {
            const cols = line.split('\t');
            if (cols.length >= 6) {
                // If sequence name inside the bed is present, let's use it or fallback to filename
                if (!speciesName || speciesName.length === 0) speciesName = cols[0];

                speciesGenes.push({
                    start: parseInt(cols[1]),
                    end: parseInt(cols[2]),
                    rawName: cols[3].trim(),
                    strand: cols[5].trim()
                });
            }
        });

        parsedData.push({ speciesName, genes: speciesGenes });
    }

    drawSynteny(parsedData);
});

function drawSynteny(datasets) {
    syntenyContainer.innerHTML = '';

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const axisColor = isDark ? '#9ca3af' : '#6b7280';
    const lineColor = isDark ? '#ffffff' : '#000000';

    // Dynamic height based on number of species
    const layoutHeight = datasets.length * 150 + 100;

    const shapes = [];
    const annotations = [];
    let globalMaxEnd = 0;

    const hoverTracesMap = new Map();

    const yTickVals = [];
    const yTickText = [];

    for (let i = 0; i < datasets.length; i++) {
        const dataset = datasets[i];
        const yCenter = datasets.length - i;

        yTickVals.push(yCenter);
        yTickText.push(dataset.speciesName.replace(/_/g, ' '));

        // Add central line shape
        shapes.push({
            type: 'line',
            x0: 0,
            y0: yCenter,
            x1: 20000,
            y1: yCenter,
            line: { color: lineColor, width: 3 }
        });

        const blockHeight = 0.35;

        dataset.genes.forEach(gene => {
            if (gene.end > globalMaxEnd) globalMaxEnd = gene.end;

            const info = getGeneInfo(gene.rawName);
            const isPlus = gene.strand === '+';
            const y0 = isPlus ? yCenter : yCenter - blockHeight;
            const y1 = isPlus ? yCenter + blockHeight : yCenter;

            shapes.push({
                type: 'rect',
                x0: gene.start,
                x1: gene.end,
                y0: y0,
                y1: y1,
                fillcolor: info.color,
                line: { color: '#000000', width: 1 }
            });

            if (!hoverTracesMap.has(info.standardName)) {
                hoverTracesMap.set(info.standardName, {
                    x: [], y: [], text: [], name: info.standardName,
                    mode: 'markers', marker: { color: 'transparent', size: 10 },
                    hoverinfo: 'text', showlegend: false
                });
            }

            const trace = hoverTracesMap.get(info.standardName);
            trace.x.push((gene.start + gene.end) / 2);
            trace.y.push(yCenter);
            trace.text.push(`<b>${info.standardName}</b><br>Species: ${dataset.speciesName}<br>Strand: ${gene.strand}<br>Length: ${gene.end - gene.start} bp<br>Position: ${gene.start} - ${gene.end}`);

            if (gene.end - gene.start > 300) {
                annotations.push({
                    x: (gene.start + gene.end) / 2,
                    y: isPlus ? yCenter + (blockHeight / 2) : yCenter - (blockHeight / 2),
                    text: info.group === 'tRNAs' ? '' : info.standardName,
                    showarrow: false,
                    font: { size: Math.max(8, Math.min(10, (gene.end - gene.start) / 100)), color: 'black', weight: 'bold' } // Dynamic font size based on width
                });
            }
        });
    }

    // Update central lines with actual globalMaxEnd + buffer
    shapes.filter(s => s.type === 'line').forEach(l => l.x1 = globalMaxEnd + 500);

    // Plotly layout
    const layout = {
        height: Math.max(layoutHeight, 300),
        xaxis: {
            range: [0, globalMaxEnd + 500],
            showgrid: false,
            zeroline: false,
            visible: true,
            tickfont: { family: 'Inter', size: 10, color: axisColor },
            title: { text: "Position (bp)", font: { size: 11, color: axisColor } }
        },
        yaxis: {
            tickvals: yTickVals,
            ticktext: yTickText,
            showgrid: false,
            zeroline: false,
            range: [0.3, datasets.length + 0.8],
            tickfont: { family: 'Inter', size: 13, color: textColor, weight: 'bold' }
        },
        margin: { l: 200, r: 40, t: 30, b: 40 },
        shapes: shapes,
        annotations: annotations,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        hovermode: 'closest',
        dragmode: 'pan' // easy to navigate horizontal
    };

    const tracesArray = Array.from(hoverTracesMap.values());

    Plotly.newPlot('syntenyContainer', tracesArray, layout, { responsive: true, displayModeBar: true, scrollZoom: true });

    buildSyntenyLegend();
}

function buildSyntenyLegend() {
    syntenyLegend.innerHTML = '<span class="font-bold text-[10px] w-full mb-1 tracking-widest text-gray-400">GENE LEGEND</span>';

    // Draw all keys from geneColors
    Object.keys(geneColors).forEach(key => {
        const wrap = document.createElement('div');
        wrap.className = "flex items-center gap-1.5";

        const box = document.createElement('div');
        box.style.backgroundColor = geneColors[key];
        box.className = "w-4 h-4 rounded-sm border border-gray-400";

        const label = document.createElement('span');
        label.textContent = key;

        wrap.appendChild(box);
        wrap.appendChild(label);
        syntenyLegend.appendChild(wrap);
    });
}
