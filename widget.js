document.addEventListener("DOMContentLoaded", () => {
    // Create a container for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'ad-widget-container';
    document.body.appendChild(widgetContainer);

    // Fetch the widget's HTML content
    fetch('widget.html')
        .then(response => response.text())
        .then(html => {
            widgetContainer.innerHTML = html;

            // Add the CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = 'widget.css';
            document.head.appendChild(link);

            // Show the widget after 10 seconds
            setTimeout(() => {
                const widget = document.getElementById('ad-widget');
                if (widget) {
                    widget.style.display = 'block';
                }
            }, 10000);

            // Add close functionality
            const closeButton = document.getElementById('close-widget');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    const widget = document.getElementById('ad-widget');
                    if (widget) {
                        widget.style.display = 'none';
                    }
                });
            }
        })
        .catch(error => console.error('Error loading widget:', error));
});
