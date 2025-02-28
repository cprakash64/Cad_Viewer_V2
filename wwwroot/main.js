import { initViewer, loadModel } from './viewer.js';

initViewer(document.getElementById('preview')).then(viewer => {
    setupModelUpload(viewer);
});

async function setupModelUpload(viewer) {
    const upload = document.getElementById('upload');
    const input = document.getElementById('input');
    const uploadedFileName = document.getElementById('uploaded-file-name');

    upload.onclick = () => input.click();

    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        uploadedFileName.textContent = file.name; // Show uploaded file name

        let data = new FormData();
        data.append('model-file', file);

        if (file.name.endsWith('.zip')) {
            const entrypoint = window.prompt('Please enter the filename of the main design inside the archive.');
            data.append('model-zip-entrypoint', entrypoint);
        }

        upload.setAttribute('disabled', 'true');
        showNotification(`Uploading model <em>${file.name}</em>. Do not reload the page.`);

        try {
            const resp = await fetch('/api/models', { method: 'POST', body: data });
            if (!resp.ok) throw new Error(await resp.text());

            const model = await resp.json();
            await onModelUploaded(viewer, model.urn);
        } catch (err) {
            alert(`Could not upload model ${file.name}. See the console for more details.`);
            console.error(err);
        } finally {
            clearNotification();
            upload.removeAttribute('disabled');
            input.value = '';
        }
    };
}

async function onModelUploaded(viewer, urn) {
    window.location.hash = urn;
    try {
        const resp = await fetch(`/api/models/${urn}/status`);
        if (!resp.ok) throw new Error(await resp.text());

        const status = await resp.json();
        switch (status.status) {
            case 'n/a':
                showNotification(`Model has not been translated.`);
                break;
            case 'inprogress':
                showNotification(`Model is being translated (${status.progress})...`);
                setTimeout(() => onModelUploaded(viewer, urn), 5000);
                break;
            case 'failed':
                showNotification(`Translation failed. <ul>${status.messages.map(msg => `<li>${JSON.stringify(msg)}</li>`).join('')}</ul>`);
                break;
            default:
                clearNotification();
                await loadModel(viewer, urn);
        }
    } catch (err) {
        alert('Could not load model. See the console for more details.');
        console.error(err);
    }
}

function showNotification(message) {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = `<div class="notification">${message}</div>`;
    overlay.style.display = 'flex';
}

function clearNotification() {
    const overlay = document.getElementById('overlay');
    overlay.innerHTML = '';
    overlay.style.display = 'none';
}
