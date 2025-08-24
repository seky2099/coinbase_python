(function() {
    // IMPORTANT: This URL must be changed to the production URL of your ad server.
    const API_BASE_URL = 'http://localhost:3000';

    document.addEventListener('DOMContentLoaded', function() {
        const adContainer = document.getElementById('ad-widget-container');
        if (!adContainer) {
            console.error('Ad widget container not found.');
            return;
        }

        fetch(`${API_BASE_URL}/api/ad`)
            .then(response => response.json())
            .then(ad => {
                if (ad.error) {
                    console.error('Failed to load ad:', ad.error);
                    return;
                }

                // Track Impression
                fetch(`${API_BASE_URL}/api/track/impression/${ad.id}`, { method: 'POST' })
                    .catch(err => console.error('Failed to track impression:', err));

                const iframe = document.createElement('iframe');
                iframe.style.width = '300px'; // Example size
                iframe.style.height = '250px'; // Example size
                iframe.style.border = 'none';
                iframe.style.overflow = 'hidden';

                adContainer.appendChild(iframe);

                const adContent = `
                    <a href="${API_BASE_URL}/api/track/click/${ad.id}" target="_blank">
                        <img src="${API_BASE_URL}/uploads/${ad.image_filename}" alt="${ad.name}" style="width:100%; height:100%;">
                    </a>
                `;

                iframe.contentWindow.document.open();
                iframe.contentWindow.document.write(adContent);
                iframe.contentWindow.document.close();
            })
            .catch(error => {
                console.error('Error fetching ad:', error);
            });
    });
})();
