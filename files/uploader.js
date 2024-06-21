document.addEventListener("DOMContentLoaded", function() {
    const uploadForm = document.getElementById('uploadForm');
    const photoInput = document.getElementById('photoInput');
    const uploadArea = document.getElementById('uploadArea');
    const previewArea = document.getElementById('previewArea');
    const uploadButton = document.getElementById('uploadButton');
    const removeAllBtn = document.getElementById('removeAllBtn');

    if (!uploadForm || !photoInput || !uploadArea || !previewArea || !uploadButton || !removeAllBtn) {
        console.error("One or more required elements not found.");
        return;
    }

    photoInput.addEventListener('change', handleFiles);
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        photoInput.files = files;
        handleFiles();
    });

    function handleFiles() {
        previewArea.innerHTML = '';
        const files = photoInput.files;

        if (files.length > 0) {
            uploadButton.style.display = 'block';
            removeAllBtn.style.display = 'block';
        } else {
            uploadButton.style.display = 'none';
            removeAllBtn.style.display = 'none';
        }

        for (const file of files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.classList.add('preview-image');

                const filePreview = document.createElement('div');
                filePreview.classList.add('file-preview');

                // Create input for renaming
                const renameInput = document.createElement('input');
                renameInput.type = 'text';
                renameInput.placeholder = 'Enter new filename (without extension)';
                renameInput.classList.add('rename-input');

                // Create input for comment
                const commentInput = document.createElement('input');
                commentInput.type = 'text';
                commentInput.placeholder = 'Enter a comment';
                commentInput.classList.add('comment-input');

                filePreview.appendChild(img);
                filePreview.appendChild(renameInput);
                filePreview.appendChild(commentInput);

                previewArea.appendChild(filePreview);
            };
            reader.readAsDataURL(file);
        }
    }

    uploadButton.addEventListener('click', async (event) => {
        event.preventDefault();
        const files = photoInput.files;
        const token = prompt('Enter your GitHub token:');
        if (!token) {
            alert('GitHub token is required');
            return;
        }

        for (const file of files) {
            try {
                await uploadFile(file, token);
            } catch (error) {
                console.error('Error uploading file:', error);
                alert(`Failed to upload file: ${file.name}`);
            }
        }

        alert('Photos uploaded successfully!');
    });

    removeAllBtn.addEventListener('click', () => {
        previewArea.innerHTML = '';
        uploadForm.reset(); // Reset the file input
        uploadButton.style.display = 'none';
        removeAllBtn.style.display = 'none';
    });

    async function uploadFile(file, token) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result.split(',')[1];
                const originalFilename = file.name;
                const renameInput = previewArea.querySelector('.rename-input');
                const commentInput = previewArea.querySelector('.comment-input');
    
                const newFilename = renameInput.value.trim() || originalFilename;
                const comment = commentInput.value.trim();
    
                const filenameParts = originalFilename.split('.');
                const extension = filenameParts.pop();
                const sanitizedFilename = `${newFilename}.${extension}`;
    
                try {
                    // Fetch the current content of the file to get its SHA
                    const currentFileResponse = await fetch(`https://api.github.com/repos/manush888/Blog/contents/uploads/${encodeURIComponent(sanitizedFilename)}`, {
                        headers: {
                            'Authorization': `token ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
    
                    if (!currentFileResponse.ok) {
                        const errorData = await currentFileResponse.json();
                        throw new Error(`Failed to fetch current file info: ${errorData.message}`);
                    }
    
                    const currentFileData = await currentFileResponse.json();
                    const currentSHA = currentFileData.sha;
    
                    // Now perform the update using the fetched SHA
                    const response = await fetch(`https://api.github.com/repos/manush888/Blog/contents/uploads/${encodeURIComponent(sanitizedFilename)}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: `Update ${sanitizedFilename}`,
                            content: base64,
                            sha: currentSHA, // Provide the SHA of the current content
                            committer: {
                                name: 'Your Name',
                                email: 'your.email@example.com'
                            },
                            comment: comment  // Include the user-provided comment
                        })
                    });
    
                    if (response.ok) {
                        console.log(`Photo ${sanitizedFilename} uploaded successfully!`);
                        resolve();
                    } else {
                        const errorData = await response.json();
                        console.error(`Failed to upload photo ${sanitizedFilename}. GitHub API responded with: ${errorData.message}`);
                        reject(`Failed to upload photo ${sanitizedFilename}. GitHub API responded with: ${errorData.message}`);
                    }
                } catch (error) {
                    console.error(`Failed to upload photo ${sanitizedFilename} due to a network or fetch error.`, error);
                    reject(`Failed to upload photo ${sanitizedFilename} due to a network or fetch error.`);
                }
            };
            reader.readAsDataURL(file);
        });
    }    
});
