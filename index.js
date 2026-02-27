// Function to dynamically load the Pollen library
function loadPollenLibrary() {
    return new Promise((resolve, reject) => {
        // Prevent loading multiple times
        if (document.getElementById('pollen-script')) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.id = 'pollen-script';
        script.src = 'https://www.pollenapps.com/df/tools/aa/js/one.1.0.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Function to initialize the widget
function initializeAllergyWidget() {
    if (window.AA && typeof window.AA.init === 'function') {
        window.AA.init();
    }
}

// Load the library and then initialize
loadPollenLibrary().then(() => {
    // Add a slight delay to ensure the DOM is ready for the library to scan
    setTimeout(initializeAllergyWidget, 500);
}).catch(err => {
    console.error('Failed to load Pollen library', err);
});
