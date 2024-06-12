let map, geocoder, autocomplete, drawingManager, selectedShape;
let roofArea = 0, savedRoofArea = 0, sliderTotal = 0;
let roofType = 'type1', roofSections = [];
let savedShape = null;

document.addEventListener('DOMContentLoaded', initMap);

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: { lat: -34.397, lng: 150.644 },
        mapTypeId: 'satellite'
    });
    geocoder = new google.maps.Geocoder();

    const input = document.getElementById('address-input');
    autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.setFields(['address_components', 'geometry', 'name']);
    autocomplete.addListener('place_changed', handlePlaceChanged);

    updateProgressBar(1);
}

function handlePlaceChanged() {
    const place = autocomplete.getPlace();
    if (!place.geometry) {
        alert(`No details available for input: '${place.name}'`);
        return;
    }

    setMapLocation(place.geometry.location, place.geometry.viewport);

    toggleElementDisplay('input-container', false);
    toggleElementDisplay('map-container', true);
    toggleElementDisplay('open-panel-btn', true);
    openPanel();

    initializeDrawingManager();
    updateProgressBar(2);
    scrollToMap(); // Scroll to the map section
}

function searchAddress() {
    const input = document.getElementById('address-input').value;
    if (!input) {
        alert('Please enter an address.');
        return;
    }
    console.log("Address input received: " + input);
    geocodeAddress(input, handleGeocodeResult);
}

function geocodeAddress(address, callback) {
    console.log("Geocoding address: " + address);
    geocoder.geocode({ 'address': address }, (results, status) => {
        console.log("Geocoding status: " + status);
        callback(results, status);
    });
}

function handleGeocodeResult(results, status) {
    console.log("Handling geocode results, status: " + status);
    if (status === 'OK') {
        setMapLocation(results[0].geometry.location, results[0].geometry.viewport);
        toggleElementDisplay('input-container', false);
        toggleElementDisplay('map-container', true);
        toggleElementDisplay('open-panel-btn', true);
        openPanel();
        initializeDrawingManager();
        updateProgressBar(2);
        scrollToMap(); // Scroll to the map section
    } else {
        alert('Geocode was not successful for the following reason: ' + status);
    }
}

function setMapLocation(location, viewport) {
    if (viewport) {
        map.fitBounds(viewport);
    } else {
        map.setCenter(location);
        map.setZoom(20);
    }

    new google.maps.Marker({
        map: map,
        position: location
    });
}

function scrollToMap() {
    const mapContainer = document.getElementById('map-container');
    mapContainer.scrollIntoView({ behavior: 'smooth' });
}

function toggleElementDisplay(elementId, show) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID ${elementId} not found`);
        return;
    }
    element.style.display = show ? 'block' : 'none';
}

function initializeDrawingManager() {
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
            fillColor: '#1E90FF',
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

function handleOverlayComplete(event) {
    if (event.type === 'polygon') {
        drawingManager.setDrawingMode(null);
        if (selectedShape) {
            selectedShape.setMap(null);
        }
        selectedShape = event.overlay;
        saveShape(selectedShape);
        calculateArea(selectedShape);
        drawRoofSections();
    }
}

function openPanel() {
    document.getElementById('side-panel').style.width = '300px';
    document.getElementById('side-panel').setAttribute('aria-hidden', 'false');
}

function closePanel() {
    document.getElementById('side-panel').style.width = '0';
    document.getElementById('side-panel').setAttribute('aria-hidden', 'true');
}

function openSlidersPanel() {
    document.getElementById('sliders-panel').style.width = '300px';
    document.getElementById('sliders-panel').setAttribute('aria-hidden', 'false');
    drawRoofSections();
}

function closeSlidersPanel() {
    document.getElementById('sliders-panel').style.width = '0';
    document.getElementById('sliders-panel').setAttribute('aria-hidden', 'true');
}

function openLcaPanel() {
    closeSlidersPanel();
    document.getElementById('lca-panel').style.height = '50%';
    document.getElementById('map-container').style.height = '50%';
    document.getElementById('lca-panel').setAttribute('aria-hidden', 'false');
}

function closeLcaPanel() {
    document.getElementById('lca-panel').style.height = '0';
    document.getElementById('map-container').style.height = '100%';
    document.getElementById('lca-panel').setAttribute('aria-hidden', 'true');
}

function enableDrawingMode() {
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
}

function resetPolygon() {
    if (selectedShape) {
        selectedShape.setMap(null);
        selectedShape = null;
        roofArea = 0;
        document.getElementById('roof-area').innerText = roofArea;
        clearRoofSections();
    }
}

function calculateArea(polygon) {
    const area = google.maps.geometry.spherical.computeArea(polygon.getPath());
    roofArea = area.toFixed(2);
    document.getElementById('roof-area').innerText = roofArea;
}

function setManualArea() {
    const manualArea = parseFloat(document.getElementById('manual-roof-area').value);
    if (!isNaN(manualArea)) {
        roofArea = manualArea.toFixed(2);
        document.getElementById('roof-area').innerText = roofArea;
    }
}

function confirmRoofArea() {
    if (roofArea > 0) {
        savedRoofArea = roofArea;
        roofType = document.getElementById('roof-type').value;
        closePanel();
        openSlidersPanel();
        updateProgressBar(3);
    } else {
        alert("Please define the roof area before proceeding.");
    }
}

function updateSliders() {
    const sliders = ['energy', 'water', 'urban-farming', 'social'];
    sliderTotal = sliders.reduce((total, name) => total + parseInt(document.getElementById(`${name}-slider`).value), 0);

    if (sliderTotal > 100) {
        alert("Total percentage cannot exceed 100%");
        revertSliderValues(sliders);
    } else {
        updateSliderDisplays(sliders);
        drawRoofSections(); // Dynamically update roof sections as sliders change
    }
}

function updateInputs() {
    const inputs = ['energy', 'water', 'urban-farming', 'social'];
    sliderTotal = inputs.reduce((total, name) => total + parseInt(document.getElementById(`${name}-input`).value), 0);

    if (sliderTotal > 100) {
        alert("Total percentage cannot exceed 100%");
        revertInputValues(inputs);
    } else {
        updateInputDisplays(inputs);
    }
}

function revertSliderValues(sliders) {
    sliders.forEach(name => {
        const slider = document.getElementById(`${name}-slider`);
        slider.value = slider.oldValue || 0;
    });
}

function revertInputValues(inputs) {
    inputs.forEach(name => {
        const input = document.getElementById(`${name}-input`);
        input.value = input.oldValue || 0;
    });
}

function updateSliderDisplays(sliders) {
    sliders.forEach(name => {
        const slider = document.getElementById(`${name}-slider`);
        const input = document.getElementById(`${name}-input`);
        const percentage = document.getElementById(`${name}-percentage`);
        const value = slider.value;

        percentage.innerText = value;
        input.value = value;
        slider.oldValue = value;
    });
    updateSections();
}

function updateInputDisplays(inputs) {
    inputs.forEach(name => {
        const input = document.getElementById(`${name}-input`);
        const slider = document.getElementById(`${name}-slider`);
        const percentage = document.getElementById(`${name}-percentage`);
        const value = input.value;

        percentage.innerText = value;
        slider.value = value;
        input.oldValue = value;
    });
    updateSections();
}

function drawRoofSections() {
    clearRoofSections();

    const percentages = ['energy', 'water', 'urban-farming', 'social'].map(name =>
        parseInt(document.getElementById(`${name}-percentage`).innerText)
    );

    if (percentages.reduce((a, b) => a + b, 0) !== 100) return;

    const totalArea = google.maps.geometry.spherical.computeArea(selectedShape.getPath());
    let accumulatedArea = 0;

    percentages.forEach((percentage, index) => {
        const sectionArea = (totalArea * percentage) / 100;
        drawRectangularSection(sectionArea, getColor(index), accumulatedArea, index);
        accumulatedArea += sectionArea;
    });
}

function getColor(index) {
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00'];
    return colors[index];
}

function drawRectangularSection(sectionArea, color, offsetArea, index) {
    const bounds = new google.maps.LatLngBounds();
    selectedShape.getPath().forEach(latLng => bounds.extend(latLng));

    const width = google.maps.geometry.spherical.computeDistanceBetween(bounds.getSouthWest(), bounds.getNorthWest());
    const sectionHeight = sectionArea / width;

    const sw = bounds.getSouthWest();
    const nw = bounds.getNorthWest();

    const ne = google.maps.geometry.spherical.computeOffset(nw, sectionHeight, 0);
    const se = google.maps.geometry.spherical.computeOffset(sw, sectionHeight, 0);

    const sectionPolygon = new google.maps.Polygon({
        paths: [
            { lat: sw.lat(), lng: sw.lng() },
            { lat: nw.lat(), lng: nw.lng() },
            { lat: ne.lat(), lng: ne.lng() },
            { lat: se.lat(), lng: se.lng() }
        ],
        strokeColor: color,
        strokeOpacity: 1.0,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.7,
        zIndex: 2 + index,
        map: map
    });

    const label = new google.maps.InfoWindow({
        content: `<div style="color: black;">${getLabel(index)}</div>`,
        position: { lat: (nw.lat() + sw.lat()) / 2, lng: (nw.lng() + ne.lng()) / 2 }
    });
    label.open(map);

    roofSections.push(sectionPolygon);
}

function getLabel(index) {
    const labels = ['Energy', 'Water', 'Urban Farming', 'Social'];
    return labels[index];
}

function clearRoofSections() {
    roofSections.forEach(section => section.setMap(null));
    roofSections = [];
}

function updateSections() {
    drawRoofSections();
}

function confirmPercentages() {
    if (sliderTotal === 100) {
        const lcaResults = calculateLCA();
        displayLcaResults(lcaResults);
        displayEsgMessages();
        closeSlidersPanel(); // Close the sliders panel
        openLcaPanel(); // Open the LCA panel
    } else {
        alert("Please ensure the total percentage equals 100%.");
    }
}

function calculateLCA() {
    const roofTypeValues = {
        type1: 10,
        type2: 20,
        type3: 30,
        type4: 40
    };

    const co2Factor = roofTypeValues[roofType];
    const totalCO2 = savedRoofArea * co2Factor;
    const energyPercentage = parseInt(document.getElementById('energy-percentage').innerText);
    const waterPercentage = parseInt(document.getElementById('water-percentage').innerText);
    const urbanFarmingPercentage = parseInt(document.getElementById('urban-farming-percentage').innerText);
    const socialPercentage = parseInt(document.getElementById('social-percentage').innerText);

    const energyCO2Saved = (savedRoofArea * energyPercentage / 100) * 10;
    const waterCO2Saved = (savedRoofArea * waterPercentage / 100) * 5;
    const urbanFarmingCO2Saved = (savedRoofArea * urbanFarmingPercentage / 100) * 3;
    const socialCO2Saved = (savedRoofArea * socialPercentage / 100) * 2;

    const totalCO2Saved = energyCO2Saved + waterCO2Saved + urbanFarmingCO2Saved + socialCO2Saved;
    const yearsToNeutral = totalCO2 / totalCO2Saved;

    const waterSaved = waterPercentage * savedRoofArea * 50; // Example: 50 liters per m²
    const energyCreated = energyPercentage * savedRoofArea * 10; // Example: 10 kWh per m²
    const socialImpact = socialPercentage * savedRoofArea * 1; // Example: Social impact score per m²

    return { totalCO2, totalCO2Saved, yearsToNeutral, energyCO2Saved, waterCO2Saved, urbanFarmingCO2Saved, socialCO2Saved, waterSaved, energyCreated, socialImpact };
}

function displayLcaResults(results) {
    document.getElementById('total-co2e-emitted').innerText = `${results.totalCO2.toFixed(1)} kg`;
    document.getElementById('total-co2e-saved').innerText = `${results.totalCO2Saved.toFixed(1)} kg`;
    document.getElementById('years-to-neutral').innerText = `${results.yearsToNeutral.toFixed(2)}`;
    document.getElementById('water-saved').innerText = `${results.waterSaved.toFixed(1)} liters`;
    document.getElementById('energy-created').innerText = `${results.energyCreated.toFixed(1)} kWh`;
    document.getElementById('social-impact').innerText = `${results.socialImpact.toFixed(1)} score`;

    displayLcaChart(results);
}

function displayLcaChart(results) {
    const ctx = document.getElementById('lca-chart').getContext('2d');
    const roofTypes = ['Type 1', 'Type 2', 'Type 3', 'Type 4'];
    const yearsToNeutral = roofTypes.map((type, index) => {
        const co2Factor = [10, 20, 30, 40][index];
        const totalCO2 = savedRoofArea * co2Factor;
        const totalCO2Saved = results.totalCO2Saved;
        return totalCO2 / totalCO2Saved;
    });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: roofTypes,
            datasets: [{
                label: 'Years to CO2e Neutral',
                data: yearsToNeutral,
                backgroundColor: roofTypes.map((_, index) => index === roofTypes.indexOf(roofType) ? 'rgba(54, 162, 235, 0.6)' : 'rgba(75, 192, 192, 0.6)'),
                borderColor: 'rgba(54, 162, 235, 1)',
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

    // XY Graph
    const xyCtx = document.getElementById('xy-graph').getContext('2d');
    new Chart(xyCtx, {
        type: 'scatter',
        data: {
            datasets: roofTypes.map((type, index) => ({
                label: type,
                data: [{ x: results.totalCO2, y: yearsToNeutral[index] }],
                backgroundColor: index === roofTypes.indexOf(roofType) ? 'rgba(54, 162, 235, 0.6)' : 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }))
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom'
                }
            }
        }
    });
}

function displayEsgMessages() {
    const esgMessages = document.getElementById('esg-messages');
    const energyPercentage = parseInt(document.getElementById('energy-percentage').innerText);
    const waterPercentage = parseInt(document.getElementById('water-percentage').innerText);
    const urbanFarmingPercentage = parseInt(document.getElementById('urban-farming-percentage').innerText);
    const socialPercentage = parseInt(document.getElementById('social-percentage').innerText);

    esgMessages.innerHTML = `
        <p>Energy: With ${energyPercentage}% allocation, this section of the roof helps save approximately ${energyPercentage * 10} kg of CO2e annually.</p>
        <p>Water: With ${waterPercentage}% allocation, this section of the roof collects about ${waterPercentage * 50} liters of rainwater annually, reducing the strain on municipal water supplies.</p>
        <p>Urban Farming: With ${urbanFarmingPercentage}% allocation, this section provides space for urban farming, which can absorb ${urbanFarmingPercentage * 2} kg of CO2e and produce fresh produce locally.</p>
        <p>Social: With ${socialPercentage}% allocation, this section enhances social interaction and well-being, contributing to community cohesion and well-being.</p>
    `;
}

function saveShape(shape) {
    const path = shape.getPath().getArray().map(latLng => ({
        lat: latLng.lat(),
        lng: latLng.lng()
    }));
    localStorage.setItem('savedShape', JSON.stringify(path));
}

function loadSavedShape() {
    const path = JSON.parse(localStorage.getItem('savedShape'));
    if (path) {
        const polygon = new google.maps.Polygon({
            paths: path,
            fillColor: '#1E90FF',
            fillOpacity: 0.2,
            strokeWeight: 2,
            clickable: true,
            editable: true,
            zIndex: 1,
            map: map
        });
        selectedShape = polygon;
        calculateArea(selectedShape);
        drawRoofSections();
    }
}

function updateProgressBar(step) {
    const progressBar = document.getElementById('progress-bar');
    const progressWidths = ['33%', '66%', '100%'];
    progressBar.style.width = progressWidths[step - 1] || '0%';
}

function backToAddress() {
    toggleElementDisplay('input-container', true);
    toggleElementDisplay('map-container', false);
    toggleElementDisplay('open-panel-btn', false);
    closePanel();
    updateProgressBar(1);
}

function backToArea() {
    openPanel();
    closeSlidersPanel();
    updateProgressBar(2);
}
