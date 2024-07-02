const { jsPDF } = window.jspdf;

// Data for calculations
const data = {
    solarPanels: { co2SavingsPerSqM: 20, energyProductionPerSqM: 150, lifespanYears: 25, maintenanceCostPerSqM: 5 },
    waterStorage: { co2SavingsPerSqM: 10, waterSavingsPerSqM: 50, lifespanYears: 20, maintenanceCostPerSqM: 2 },
    biodiversity: { co2SavingsPerSqM: 15, lifespanYears: 30, maintenanceCostPerSqM: 3 },
    socialArea: { co2SavingsPerSqM: 5, lifespanYears: 50, maintenanceCostPerSqM: 1 }
};

// Colors for different types of areas
const colors = {
    'Solar Panels': '#FF0000',
    'Water Storage': '#0000FF',
    'Biodiversity': '#00FF00',
    'Social Area': '#FFFF00'
};

// Labels and types
const labels = ['Area 1', 'Area 2', 'Area 3', 'Area 4'];
const types = ['Solar Panels', 'Water Storage', 'Biodiversity', 'Social Area'];
const roofTypes = ['2 lag tappap', '1 lag tappap', 'TPO', 'EPDM dug', 'TPC'];

const roofTypeInfo = {
    "2 lag tappap": {
        name: "2 lag tappap",
        pros: "Durable, good for flat roofs",
        cons: "Expensive, heavy",
        cost: "$10 to $15 per square foot",
        lca: "Moderate environmental impact due to materials used."
    },
    "1 lag tappap": {
        name: "1 lag tappap",
        pros: "Cost-effective, lightweight",
        cons: "Less durable, shorter lifespan",
        cost: "$5 to $8 per square foot",
        lca: "Higher environmental impact compared to multiple layers."
    },
    "TPO": {
        name: "TPO",
        pros: "Energy-efficient, durable",
        cons: "Can be costly, complex installation",
        cost: "$6 to $9 per square foot",
        lca: "Low environmental impact due to energy efficiency."
    },
    "EPDM dug": {
        name: "EPDM dug",
        pros: "Flexible, long lifespan",
        cons: "Can be punctured easily, needs regular maintenance",
        cost: "$4 to $8 per square foot",
        lca: "Moderate environmental impact, balanced by durability."
    },
    "TPC": {
        name: "TPC",
        pros: "High durability, good insulation",
        cons: "Expensive, requires specialized installation",
        cost: "$12 to $20 per square foot",
        lca: "Low environmental impact due to long lifespan."
    }
};

// Google Maps related variables
let map, drawingManager, selectedShapes = [], autocomplete;
let actionHistory = [], actionIndex = -1;

// Initialize map
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: { lat: 55.7108, lng: 9.5366 },
        mapTypeId: 'satellite'
    });
    setupAutocomplete();
    setupDrawingManager();
    populateRoofTypeDropdown();
}

// Setup autocomplete
function setupAutocomplete() {
    const input = document.getElementById('search-bar');
    autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);
    autocomplete.addListener('place_changed', handlePlaceChanged);
}

// Handle place changed
function handlePlaceChanged() {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
        showNotification('No details available for input: ' + place.name, 'error');
        return;
    }
    if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
    } else {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
    }
}

// Setup drawing manager
function setupDrawingManager() {
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['polygon']
        },
        polygonOptions: {
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: true,
            editable: true,
            zIndex: 1
        }
    });
    drawingManager.setMap(map);
    google.maps.event.addListener(drawingManager, 'overlaycomplete', handleOverlayComplete);
}

// Handle overlay complete
function handleOverlayComplete(event) {
    if (event.type === 'polygon' && selectedShapes.length < 4) {
        const color = colors['Solar Panels'];
        const label = labels[selectedShapes.length];
        event.overlay.setOptions({ fillColor: color, strokeColor: color });
        const labelInfo = new google.maps.InfoWindow({ content: `<div style="color: black;">${label}</div>`, position: getPolygonCenter(event.overlay) });
        labelInfo.open(map);
        event.overlay.label = labelInfo;
        addPathListeners(event.overlay);
        selectedShapes.push(event.overlay);
        saveAction();
        updateSidebar();
    } else {
        showNotification('You can only draw up to 4 segments.', 'error');
        event.overlay.setMap(null);
    }
}

// Get polygon center
function getPolygonCenter(polygon) {
    const bounds = new google.maps.LatLngBounds();
    polygon.getPath().forEach(latLng => bounds.extend(latLng));
    return bounds.getCenter();
}

// Add path listeners
function addPathListeners(polygon) {
    polygon.getPath().addListener('set_at', updateSidebar);
    polygon.getPath().addListener('insert_at', updateSidebar);
    polygon.getPath().addListener('remove_at', updateSidebar);
}

// Reset polygon
function resetPolygon(index) {
    if (selectedShapes[index]) {
        selectedShapes[index].setMap(null);
        selectedShapes.splice(index, 1);
        saveAction();
        updateSidebar();
    }
}

// Reset all polygons
function resetAllPolygons() {
    selectedShapes.forEach(shape => shape.setMap(null));
    selectedShapes = [];
    saveAction();
    updateSidebar();
}

// Update sidebar
function updateSidebar() {
    const sidebar = document.getElementById('sidebar-content');
    sidebar.innerHTML = '';
    let totalArea = 0;
    selectedShapes.forEach((shape, index) => {
        const area = google.maps.geometry.spherical.computeArea(shape.getPath()).toFixed(2);
        totalArea += parseFloat(area);
        const listItem = document.createElement('li');
        const areaName = shape.areaName || labels[index];
        listItem.innerHTML = `
            <input type="text" value="${areaName}" onchange="renameArea(${index}, this.value)" aria-label="Area Name ${index + 1}" />
            ${area} m²
            <select onchange="updateShapeType(${index}, this.value)" aria-label="Select Type ${index + 1}">
                ${types.map(type => `<option value="${type}">${type}</option>`).join('')}
            </select>
            <button class="button-small" onclick="resetPolygon(${index})" aria-label="Reset Area ${index + 1}">Reset</button>
        `;
        sidebar.appendChild(listItem);
        shape.type = shape.type || types[0];
    });
    document.getElementById('total-area').innerText = `Total Area: ${totalArea.toFixed(2)} m²`;
    updateLCAResults();
}

// Update shape type
function updateShapeType(index, type) {
    selectedShapes[index].type = type;
    selectedShapes[index].setOptions({ fillColor: colors[type], strokeColor: colors[type] });
    updateLCAResults();
}

// Rename area
function renameArea(index, name) {
    selectedShapes[index].areaName = name;
}

// Populate roof type dropdown
function populateRoofTypeDropdown() {
    const roofTypeDropdown = document.getElementById('roof-type');
    roofTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        roofTypeDropdown.appendChild(option);
    });
}

// Save action
function saveAction() {
    const currentAction = JSON.stringify(selectedShapes.map(shape => ({
        path: shape.getPath().getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() })),
        type: shape.type,
        areaName: shape.areaName
    })));
    actionHistory = actionHistory.slice(0, actionIndex + 1);
    actionHistory.push(currentAction);
    actionIndex++;
}

// Undo action
function undo() {
    if (actionIndex > 0) loadAction(actionHistory[--actionIndex]);
}

// Redo action
function redo() {
    if (actionIndex < actionHistory.length - 1) loadAction(actionHistory[++actionIndex]);
}

// Load action
function loadAction(action) {
    resetAllPolygons();
    const shapes = JSON.parse(action);
    shapes.forEach(savedShape => {
        const polygon = new google.maps.Polygon({
            paths: savedShape.path,
            fillColor: colors[savedShape.type],
            strokeColor: colors[savedShape.type],
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: true,
            editable: true,
            zIndex: 1,
            map: map
        });
        polygon.type = savedShape.type;
        polygon.areaName = savedShape.areaName;
        addPathListeners(polygon);
        selectedShapes.push(polygon);
    });
    updateSidebar();
}

// Save design
function saveDesign() {
    const design = JSON.stringify(selectedShapes.map(shape => ({
        path: shape.getPath().getArray().map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() })),
        type: shape.type,
        areaName: shape.areaName
    })));
    localStorage.setItem('roofDesign_' + new Date().getTime(), design);
    showNotification('Design saved!', 'success');
    listSavedDesigns(); // Update the list of saved designs
}

// List saved designs
function listSavedDesigns() {
    const designsList = document.getElementById('designs-list');
    designsList.innerHTML = '';
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('roofDesign_')) {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${new Date(parseInt(key.split('_')[1])).toLocaleString()}</span>
                <button onclick="loadDesign('${key}')">Load</button>
                <button onclick="deleteDesign('${key}')">Delete</button>
                <input type="checkbox" class="design-checkbox" value="${key}">
            `;
            designsList.appendChild(listItem);
        }
    });
}

// Load design
function loadDesign(key) {
    showLoading();
    const design = localStorage.getItem(key);
    if (design) {
        const shapes = JSON.parse(design);
        resetAllPolygons();
        shapes.forEach(savedShape => {
            const polygon = new google.maps.Polygon({
                paths: savedShape.path,
                fillColor: colors[savedShape.type],
                strokeColor: colors[savedShape.type],
                fillOpacity: 0.2,
                strokeWeight: 2,
                clickable: true,
                editable: true,
                zIndex: 1,
                map: map
            });
            polygon.type = savedShape.type;
            polygon.areaName = savedShape.areaName;
            addPathListeners(polygon);
            selectedShapes.push(polygon);
        });
        updateSidebar();
        showNotification('Design loaded successfully!', 'success');
    } else {
        showNotification('Design not found.', 'error');
    }
    hideLoading();
}

// Delete design
function deleteDesign(key) {
    localStorage.removeItem(key);
    listSavedDesigns();
    showNotification('Design deleted.', 'success');
}

// Confirm delete all designs
function confirmDeleteAllDesigns() {
    const modal = document.getElementById('confirmation-modal');
    modal.classList.remove('hidden');
    modal.classList.add('visible');
}

// Delete all designs
function deleteAllDesigns() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('roofDesign_')) {
            localStorage.removeItem(key);
        }
    });
    listSavedDesigns();
    closeModal();
    showNotification('All designs deleted.', 'success');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('confirmation-modal');
    modal.classList.remove('visible');
    modal.classList.add('hidden');
}

// Show notification
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.classList.add(type);
    notification.innerText = message;
    document.getElementById('notifications').appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }, 100);
}

// Calculate metrics for LCA
function calculateMetrics(areas) {
    const { solarPanels, waterStorage, biodiversity, socialArea } = data;

    const totalArea = areas.solarPanels + areas.waterStorage + areas.biodiversity + areas.socialArea;

    const totalCO2Savings = areas.solarPanels * solarPanels.co2SavingsPerSqM +
        areas.waterStorage * waterStorage.co2SavingsPerSqM +
        areas.biodiversity * biodiversity.co2SavingsPerSqM +
        areas.socialArea * socialArea.co2SavingsPerSqM;

    const totalEnergyProduction = areas.solarPanels * solarPanels.energyProductionPerSqM;
    const totalWaterSavings = areas.waterStorage * waterStorage.waterSavingsPerSqM;
    const totalMaintenanceCost = areas.solarPanels * solarPanels.maintenanceCostPerSqM +
        areas.waterStorage * waterStorage.maintenanceCostPerSqM +
        areas.biodiversity * biodiversity.maintenanceCostPerSqM +
        areas.socialArea * socialArea.maintenanceCostPerSqM;

    const yearsToOffset = totalCO2Savings / 30;

    return { totalArea, totalCO2Savings, totalEnergyProduction, totalWaterSavings, totalMaintenanceCost, yearsToOffset };
}

// Update LCA results
function updateLCAResults() {
    const totalArea = selectedShapes.reduce((sum, shape) => sum + google.maps.geometry.spherical.computeArea(shape.getPath()), 0).toFixed(2);

    const totalCO2Savings = selectedShapes.reduce((sum, shape) => {
        const typeKey = shape.type.toLowerCase().replace(' ', '');
        return sum + (data[typeKey]?.co2SavingsPerSqM || 0) * google.maps.geometry.spherical.computeArea(shape.getPath());
    }, 0).toFixed(2);

    const totalWaterSaved = selectedShapes.filter(shape => shape.type === 'Water Storage').reduce((sum, shape) =>
        sum + google.maps.geometry.spherical.computeArea(shape.getPath()) * data.waterStorage.waterSavingsPerSqM, 0).toFixed(2);

    const totalPowerGenerated = selectedShapes.filter(shape => shape.type === 'Solar Panels').reduce((sum, shape) =>
        sum + google.maps.geometry.spherical.computeArea(shape.getPath()) * data.solarPanels.energyProductionPerSqM, 0).toFixed(2);

    const yearsToOffset = (totalCO2Savings / 30).toFixed(2);

    document.getElementById('total-co2-saved').innerText = `Total CO2e Saved: ${totalCO2Savings} kg`;
    document.getElementById('total-water-saved').innerText = `Total Water Saved: ${totalWaterSaved} liters`;
    document.getElementById('total-power-generated').innerText = `Total Power Generated: ${totalPowerGenerated} kWh`;
    document.getElementById('years-to-offset').innerText = `Years to Offset: ${yearsToOffset} years`;
}

// Toggle menu
function toggleMenu() {
    document.querySelector('.hamburger').classList.toggle('active');
    document.querySelector('.menu').classList.toggle('active');
}

// Toggle saved designs section
function toggleSavedDesigns() {
    const savedDesignsSection = document.getElementById('saved-designs-sidebar');
    savedDesignsSection.classList.toggle('hidden');
    savedDesignsSection.classList.toggle('visible');
}

// PDF Generation Functions

// Export to PDF
async function exportToPDF() {
    const doc = new jsPDF();
    const logoUrl = 'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/business-logo-design-template-78655edda18bc1196ab28760f1535baa_screen.jpg?ts=1617645324';

    const mapElement = document.getElementById('map');
    const mapImage = await createImageFromElement(mapElement);

    const areas = {
        solarPanels: 100, // Replace with actual input value
        waterStorage: 50, // Replace with actual input value
        biodiversity: 30, // Replace with actual input value
        socialArea: 20 // Replace with actual input value
    };

    const metrics = calculateMetrics(areas);

    addTitlePage(doc, logoUrl);
    addIntroduction(doc);
    addHighlightedSummary(doc, metrics);
    addCalculationSection(doc, metrics);
    addCompactSummary(doc, { ...metrics, mapImage });
    await addCompactCharts(doc, metrics);
    addConclusion(doc);
    addHeadersAndFooters(doc);

    doc.save('roof-design-lca-report.pdf');
}

// Group Export to PDF
async function groupExportToPDF() {
    const selectedDesigns = Array.from(document.querySelectorAll('.design-checkbox:checked')).map(checkbox => checkbox.value);

    if (selectedDesigns.length === 0) {
        showNotification('No designs selected for export.', 'error');
        return;
    }

    const doc = new jsPDF();
    const logoUrl = 'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/business-logo-design-template-78655edda18bc1196ab28760f1535baa_screen.jpg?ts=1617645324';

    for (const designKey of selectedDesigns) {
        const design = localStorage.getItem(designKey);
        if (design) {
            const shapes = JSON.parse(design);
            const areas = calculateAreasFromShapes(shapes);
            const metrics = calculateMetrics(areas);

            addTitlePage(doc, logoUrl);
            addIntroduction(doc);
            addHighlightedSummary(doc, metrics);
            addCalculationSection(doc, metrics);
            await addCompactCharts(doc, metrics);
            addConclusion(doc);
            addHeadersAndFooters(doc);

            if (designKey !== selectedDesigns[selectedDesigns.length - 1]) {
                doc.addPage();
            }
        }
    }

    doc.save('group-roof-design-lca-report.pdf');
}

// Add title page
function addTitlePage(doc, logoUrl) {
    doc.addImage(logoUrl, 'PNG', 10, 10, 50, 50);
    doc.setFontSize(24);
    doc.text('ESG Roof Calculator', 70, 30);
    doc.setFontSize(16);
    doc.text('Project Details', 20, 60);
    doc.setFontSize(12);
    doc.text('Address: Your Project Address', 20, 70);
    doc.text('Date: ' + new Date().toLocaleDateString(), 20, 80);
    doc.text('Company: Your Company Name', 20, 90);
    doc.addPage();
}

// Add introduction
function addIntroduction(doc) {
    doc.setFontSize(18);
    doc.text('Introduction', 20, 20);
    doc.setFontSize(12);
    const text = `This report presents the Life Cycle Assessment (LCA) of a roof design project. The assessment covers various aspects including CO2 savings, energy production, water savings, and maintenance costs associated with different design elements such as solar panels, water storage, biodiversity areas, and social areas.`;
    const splitText = doc.splitTextToSize(text, 170);
    doc.text(splitText, 20, 30);
    doc.addPage();
}

// Add highlighted summary
function addHighlightedSummary(doc, metrics) {
    doc.setFontSize(18);
    doc.text('Highlighted Summary', 20, 20);
    doc.setFontSize(12);
    doc.text(`Total CO2e Saved: ${metrics.totalCO2Savings.toFixed(2)} kg`, 20, 30);
    doc.text(`Years to Offset: ${metrics.yearsToOffset.toFixed(2)} years`, 20, 40);
    doc.addPage();
}

// Add calculation section
function addCalculationSection(doc, metrics) {
    doc.setFontSize(18);
    doc.text('Calculations', 20, 20);
    doc.setFontSize(12);
    const calculationText = `
    Total Area: ${metrics.totalArea.toFixed(2)} m²
    Total CO2e Saved: ${metrics.totalCO2Savings.toFixed(2)} kg
    Total Power Generated: ${metrics.totalEnergyProduction.toFixed(2)} kWh
    Total Water Saved: ${metrics.totalWaterSavings.toFixed(2)} liters
    Total Maintenance Cost: $${metrics.totalMaintenanceCost.toFixed(2)} per year

    Calculation Details:
    CO2 Savings = (Area of Solar Panels * CO2 Savings per SqM) + (Area of Water Storage * CO2 Savings per SqM) + (Area of Biodiversity * CO2 Savings per SqM) + (Area of Social Area * CO2 Savings per SqM)

    Energy Production = Area of Solar Panels * Energy Production per SqM

    Water Savings = Area of Water Storage * Water Savings per SqM

    Maintenance Cost = (Area of Solar Panels * Maintenance Cost per SqM) + (Area of Water Storage * Maintenance Cost per SqM) + (Area of Biodiversity * Maintenance Cost per SqM) + (Area of Social Area * Maintenance Cost per SqM)
    `;
    const splitText = doc.splitTextToSize(calculationText, 170);
    doc.text(splitText, 20, 30);
    doc.addPage();
}

// Add compact summary
function addCompactSummary(doc, { totalArea, totalCO2Savings, totalEnergyProduction, totalWaterSavings, totalMaintenanceCost, mapImage }) {
    doc.setFontSize(18);
    doc.text('Project Summary', 20, 20);

    doc.setFontSize(12);
    doc.text(`Total Area: ${totalArea.toFixed(2)} m²`, 20, 30);
    doc.text(`Total CO2e Saved: ${totalCO2Savings.toFixed(2)} kg`, 20, 40);
    doc.text(`Total Power Generated: ${totalEnergyProduction.toFixed(2)} kWh`, 20, 50);
    doc.text(`Total Water Saved: ${totalWaterSavings.toFixed(2)} liters`, 20, 60);
    doc.text(`Total Maintenance Cost: $${totalMaintenanceCost.toFixed(2)} per year`, 20, 70);
    doc.addImage(mapImage, 'PNG', 20, 80, 160, 90);
    doc.addPage();
}

// Add compact charts
async function addCompactCharts(doc, metrics) {
    // Create a canvas element for the line chart
    const lineCanvas = document.createElement('canvas');
    lineCanvas.width = 400;
    lineCanvas.height = 200;
    document.body.appendChild(lineCanvas);
    const lineCtx = lineCanvas.getContext('2d');

    // Render the line chart
    new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: ['Years to Offset'],
            datasets: [{
                label: 'Years to Offset',
                data: [metrics.yearsToOffset],
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Create a canvas element for the bar chart
    const barCanvas = document.createElement('canvas');
    barCanvas.width = 400;
    barCanvas.height = 200;
    document.body.appendChild(barCanvas);
    const barCtx = barCanvas.getContext('2d');

    // Render the bar chart
    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Total CO2 Saved', 'Total Water Saved', 'Total Energy Production'],
            datasets: [{
                label: 'Metrics',
                data: [metrics.totalCO2Savings, metrics.totalWaterSavings, metrics.totalEnergyProduction],
                backgroundColor: ['#3498db', '#1abc9c', '#f39c12'],
                borderColor: ['#2980b9', '#16a085', '#e67e22'],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Wait for the charts to finish rendering
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Convert each canvas to image
    const lineImage = lineCanvas.toDataURL('image/png');
    const barImage = barCanvas.toDataURL('image/png');

    // Add a new page for the charts
    doc.addPage();

    // Add the images to the PDF document
    doc.addImage(lineImage, 'PNG', 20, 20, 160, 90);
    doc.addImage(barImage, 'PNG', 20, 120, 160, 90);

    // Clean up the canvas elements
    document.body.removeChild(lineCanvas);
    document.body.removeChild(barCanvas);
}

// Add conclusion
function addConclusion(doc) {
    doc.setFontSize(18);
    doc.text('Conclusion', 20, 20);
    doc.setFontSize(12);
    const text = `The LCA of the roof design project demonstrates significant environmental benefits. By integrating solar panels, water storage, biodiversity areas, and social areas, the project achieves notable reductions in CO2 emissions, substantial energy production, considerable water savings, and manageable maintenance costs. These findings underscore the importance of sustainable design practices in minimizing environmental impact and promoting ecological resilience.`;
    const splitText = doc.splitTextToSize(text, 170);
    doc.text(splitText, 20, 30);
    doc.addPage();
}

// Add headers and footers
function addHeadersAndFooters(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        // Footer
        doc.setFontSize(10);
        doc.setTextColor(34, 139, 34); // Green color
        doc.text('LCA Report', 20, 285);
        doc.text(`Page ${i} of ${pageCount}`, 180, 285);
        // Header
        doc.addImage('https://d1csarkz8obe9u.cloudfront.net/posterpreviews/business-logo-design-template-78655edda18bc1196ab28760f1535baa_screen.jpg?ts=1617645324', 'PNG', 180, 10, 10, 10);
    }
}

// Create image from element
async function createImageFromElement(element) {
    const canvas = await html2canvas(element);
    return canvas.toDataURL('image/png');
}

// Event listener for DOM content loaded
document.addEventListener('DOMContentLoaded', function () {
    listSavedDesigns(); // List designs on page load
    const savePdfButton = document.getElementById('save-pdf-button');
    if (savePdfButton) {
        savePdfButton.addEventListener('click', exportToPDF); // Example button to trigger PDF export
    }
    const groupExportButton = document.getElementById('group-export-button');
    if (groupExportButton) {
        groupExportButton.addEventListener('click', groupExportToPDF); // Button to trigger group export
    }
});

// Toggle menu
function toggleMenu() {
    document.querySelector('.hamburger').classList.toggle('active');
    document.querySelector('.menu').classList.toggle('active');
}

// Show introduction modal
function showIntroductionModal() {
    const introductionModal = document.getElementById('introduction-modal');
    introductionModal.classList.add('visible');
}

// Close introduction modal
function closeIntroductionModal() {
    const introductionModal = document.getElementById('introduction-modal');
    introductionModal.classList.remove('visible');
}

// Show loading indicator
function showLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('hidden');
    } else {
        console.error('Loading indicator element not found');
    }
}

// Hide loading indicator
function hideLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    } else {
        console.error('Loading indicator element not found');
    }
}

// Add loading indicators to other long-running operations as needed
function updateRoofType() {
    const select = document.getElementById('roof-type');
    const selectedType = select.value;
    const info = roofTypeInfo[selectedType];

    // Create or update the info container
    let infoContainer = document.getElementById('roof-type-info');
    if (!infoContainer) {
        infoContainer = document.createElement('div');
        infoContainer.id = 'roof-type-info';
        infoContainer.classList.add('roof-type-info');
        select.parentNode.insertBefore(infoContainer, select.nextSibling);
    }

    infoContainer.innerHTML = `
        <h3>${info.name}</h3>
        <p><strong>Pros:</strong> ${info.pros}</p>
        <p><strong>Cons:</strong> ${info.cons}</p>
        <p><strong>Cost:</strong> ${info.cost}</p>
        <p><strong>LCA Data:</strong> ${info.lca}</p>
        ${info.types ? `<p><strong>Types:</strong> ${info.types.join(', ')}</p>` : ''}
    `;
}
