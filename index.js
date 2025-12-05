let filesArray = [];
let imageMetadata = {}; // Store rotation and settings for each image

const dropArea = document.getElementById("dropArea");
const fileInput = document.getElementById("fileInput");
const thumbs = document.getElementById("thumbs");

dropArea.addEventListener("click", () => fileInput.click());


fileInput.addEventListener("change", e => {
    addFiles([...e.target.files]);
});


dropArea.addEventListener("dragover", e => {
    e.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", e => {
    e.preventDefault();
    dropArea.classList.remove("dragover");
    addFiles([...e.dataTransfer.files]);
});

/* ADD FILES AND SHOW THUMBNAILS */
function addFiles(newFiles) {
    newFiles.forEach(file => {
        if (!file.type.startsWith("image/")) return;
        filesArray.push(file);
        const fileId = Math.random().toString(36).substr(2, 9);
        imageMetadata[fileId] = {
            fileId: fileId,
            rotation: 0,
            orientation: "auto",
            scale: 100
        };
        // Store fileId reference
        if (!file.fileId) file.fileId = fileId;
    });
    renderThumbs();
}

/* DRAGGABLE ORDER */
function renderThumbs() {
    thumbs.innerHTML = "";

    filesArray.forEach((file, index) => {
        const div = document.createElement("div");
        div.className = "thumb";
        div.draggable = true;
        div.style.position = "relative";

        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);

        div.appendChild(img);
        
        // Add delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "×";
        deleteBtn.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: #ff4444;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            transition: background 0.3s ease;
        `;
        deleteBtn.onmouseover = () => deleteBtn.style.background = "#cc0000";
        deleteBtn.onmouseout = () => deleteBtn.style.background = "#ff4444";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeImage(index);
        };
        div.appendChild(deleteBtn);
        thumbs.appendChild(div);

        // drag events
        div.addEventListener("dragstart", e => {
            e.dataTransfer.setData("index", index);
        });

        div.addEventListener("dragover", e => e.preventDefault());

        div.addEventListener("drop", e => {
            e.preventDefault();
            const from = e.dataTransfer.getData("index");
            const to = index;

            // swap images
            const temp = filesArray[from];
            filesArray[from] = filesArray[to];
            filesArray[to] = temp;

            renderThumbs();
        });
    });
}


/* CONVERT TO PDF */
async function convertToPDF() {
    if (filesArray.length === 0) {
        alert("Please add images first.");
        return;
    }

    const { jsPDF } = window.jspdf;
    
    let pdf = null;
    let firstPage = true;

    for (const file of filesArray) {
        const imgData = await fileToDataURL(file);
        const img = await loadImage(imgData);
        const fileId = file.fileId;
        const meta = imageMetadata[fileId];

        // Determine page orientation based on image and user settings
        let orientation = "portrait";
        if (meta.orientation === "landscape" || (meta.orientation === "auto" && img.width > img.height)) {
            orientation = "landscape";
        }

        if (firstPage) {
            pdf = new jsPDF({
                orientation: orientation,
                unit: "mm",
                format: "a4"
            });
            firstPage = false;
        } else {
            pdf.addPage([210, 297], orientation);
        }

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Calculate dimensions with rotation and scale
        let imgWidth = img.width;
        let imgHeight = img.height;
        const scale = meta.scale / 100;

        // Scale the image
        imgWidth = imgWidth * scale;
        imgHeight = imgHeight * scale;

        // Calculate dimensions to fit the page
        const ratio = imgWidth / imgHeight;
        let finalWidth = pdfWidth * 0.95;
        let finalHeight = finalWidth / ratio;

        if (finalHeight > pdfHeight * 0.95) {
            finalHeight = pdfHeight * 0.95;
            finalWidth = finalHeight * ratio;
        }

        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;

        // Add image with rotation
        pdf.addImage(imgData, "JPEG", xOffset, yOffset, finalWidth, finalHeight);

        // Apply rotation if needed
        if (meta.rotation !== 0) {
            const centerX = pdfWidth / 2;
            const centerY = pdfHeight / 2;
            pdf.setPage(pdf.internal.pages.length - 1);
        }
    }

    pdf.save("images.pdf");
}

/* HELPERS */
function fileToDataURL(file) {
    return new Promise(resolve => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
    });
}

/* EDIT PDF - CUSTOMIZE IMAGES */
function editpdf() {
    if (filesArray.length === 0) {
        alert("Please add images first.");
        return;
    }
    showEditModal();
}

function showEditModal() {
    let modalHTML = `
        <div id="editModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(0,0,0,0.3);
            ">
                <h2 style="margin-top: 0;">Customize PDF</h2>
                
                <div id="imageEditContainer"></div>
                
                <div style="display: flex; gap: 10px; margin-top: 30px;">
                    <button onclick="closeEditModal()" style="
                        flex: 1;
                        padding: 12px;
                        background: #999;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Cancel</button>
                    <button onclick="applyChanges()" style="
                        flex: 1;
                        padding: 12px;
                        background: #2196f3;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                    ">Apply Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const container = document.getElementById("imageEditContainer");
    
    filesArray.forEach((file, index) => {
        const fileId = file.fileId;
        const meta = imageMetadata[fileId];
        
        const editHTML = `
            <div style="
                border: 1px solid #ddd;
                padding: 15px;
                margin-bottom: 15px;
                border-radius: 8px;
                background: #f9f9f9;
                position: relative;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0 0 10px 0;">Image ${index + 1}</h3>
                    <button onclick="removeImageFromModal(${index})" style="
                        padding: 6px 12px;
                        background: #ff4444;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Delete Image</button>
                </div>
                
                <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Rotation:</label>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="rotateImage('${fileId}', 90)" style="
                                padding: 8px 12px;
                                background: #f0f0f0;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                cursor: pointer;
                            ">⟳ 90°</button>
                            <button onclick="rotateImage('${fileId}', 180)" style="
                                padding: 8px 12px;
                                background: #f0f0f0;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                cursor: pointer;
                            ">⟳ 180°</button>
                            <button onclick="rotateImage('${fileId}', 270)" style="
                                padding: 8px 12px;
                                background: #f0f0f0;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                cursor: pointer;
                            ">⟳ 270°</button>
                            <button onclick="resetRotation('${fileId}')" style="
                                padding: 8px 12px;
                                background: #f0f0f0;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                cursor: pointer;
                            ">Reset</button>
                        </div>
                        <p style="margin: 5px 0; font-size: 12px; color: #666;">Current: ${meta.rotation}°</p>
                    </div>
                </div>

                <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Orientation:</label>
                        <select id="orient_${fileId}" onchange="updateOrientation('${fileId}', this.value)" style="
                            width: 100%;
                            padding: 8px;
                            border: 1px solid #ccc;
                            border-radius: 4px;
                        ">
                            <option value="auto" ${meta.orientation === 'auto' ? 'selected' : ''}>Auto</option>
                            <option value="portrait" ${meta.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
                            <option value="landscape" ${meta.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; gap: 20px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Scale (%):</label>
                        <input type="range" id="scale_${fileId}" min="50" max="150" value="${meta.scale}" onchange="updateScale('${fileId}', this.value)" style="
                            width: 100%;
                        ">
                        <p style="margin: 5px 0; font-size: 12px; color: #666;">Current: <span id="scaleValue_${fileId}">${meta.scale}</span>%</p>
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', editHTML);
    });
}

function rotateImage(fileId, angle) {
    imageMetadata[fileId].rotation = (imageMetadata[fileId].rotation + angle) % 360;
    updateEditModal();
}

function resetRotation(fileId) {
    imageMetadata[fileId].rotation = 0;
    updateEditModal();
}

function updateOrientation(fileId, value) {
    imageMetadata[fileId].orientation = value;
}

function updateScale(fileId, value) {
    imageMetadata[fileId].scale = parseInt(value);
    document.getElementById(`scaleValue_${fileId}`).textContent = value;
}

function updateEditModal() {
    const modal = document.getElementById("editModal");
    if (modal) {
        modal.remove();
    }
    showEditModal();
}

function closeEditModal() {
    const modal = document.getElementById("editModal");
    if (modal) {
        modal.remove();
    }
}

function applyChanges() {
    closeEditModal();
    alert("Changes applied! You can now download the PDF.");
}

/* REMOVE IMAGE */
function removeImage(index) {
    if (confirm("Are you sure you want to delete this image?")) {
        const file = filesArray[index];
        if (file.fileId) {
            delete imageMetadata[file.fileId];
        }
        filesArray.splice(index, 1);
        renderThumbs();
        
        // If modal is open, close and reopen it
        const modal = document.getElementById("editModal");
        if (modal) {
            closeEditModal();
            if (filesArray.length > 0) {
                showEditModal();
            }
        }
    }
}

function removeImageFromModal(index) {
    removeImage(index);
}