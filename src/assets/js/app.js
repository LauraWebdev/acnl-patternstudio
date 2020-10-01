const { dialog, shell } = require('electron').remote;
const fs = require('fs');
const Jimp = require('jimp');
const QRReader = require("jsqr");
const QRWriter = require('qrcode');
const ACNLP = require('./assets/js/acnlp.js');

let currentPattern;
let patternCanvas = document.querySelector(".pattern-canvas");
let patternColors = document.querySelectorAll(".color-palette .colors .color");

let DOMpatternTitle = document.querySelector(".pattern-title");
let DOMpatternCreator = document.querySelector(".pattern-creator");
let DOMpatternTown = document.querySelector(".pattern-town");

// Load Empty On Startup
fs.readFile("src/assets/empty.acnl", (err, data)=> {
    if(err) {
        alert("An error occured reading the file: " + err.message);
        return;
    }

    LoadPattern(data);

    setTimeout(function() {
        hideStartup();
    }, 0);
});

function LoadPattern(_data) {
    currentPattern = new ACNLP(_data);

    DOMpatternTitle.value = currentPattern.getTitle();
    DOMpatternCreator.value = currentPattern.getCreator();
    DOMpatternTown.value = currentPattern.getTown();

    currentPattern.draw(patternCanvas.getContext('2d'), 0);
    for(let i = 0; i < 15; i++) {
        let color = currentPattern.getColor(i);
        patternColors[i].style.backgroundColor = color;
    }
}

// Startup
let DOMsectionStartup = document.querySelector(".section-startup");
let DOMsectionCreator = document.querySelector(".section-creator");
let DOMsectionExporter = document.querySelector(".section-exporter");
let DOMsectionConverter = document.querySelector(".section-converter");

function hideStartup() {
    DOMsectionStartup.classList.remove("active");
    DOMsectionCreator.classList.add("active");
}

// Main Menu
let DOMsectionMenu = document.querySelector(".section-menu");
function openMenu() {
    DOMsectionMenu.classList.add("active");
}
function closeMenu() {
    DOMsectionMenu.classList.remove("active");
}

// Loaders
function MenuNewPattern() {
    closeMenu();

    fs.readFile("src/assets/empty.acnl", (err, data)=> {
        if(err) {
            alert("An error occured reading the file: " + err.message);
            return;
        }

        LoadPattern(data);
    });
}

function MenuOpenBinary() {
    closeMenu();

    dialog.showOpenDialog({ title: "Open .acnl file", properties: ['openFile'], filters: [{"name": "ACNL file", "extensions": ["acnl", "bin"]}] }).then(result => {
        if(!result.canceled) {
            let filePath = result.filePaths[0];

            fs.readFile(filePath, (err, data)=> {
                if(err) {
                    alert("An error occured reading the file: " + err.message);
                    return;
                }

                LoadPattern(data);
            });
        }
    });
}

function MenuLoadQRImage() {
    closeMenu();

    dialog.showOpenDialog({ title: "Open QR Code image", properties: ['openFile'], filters: [{"name": "Image", "extensions": ["png", "jpeg", "jpg"]}] }).then(result => {
        if(!result.canceled) {
            let filePath = result.filePaths[0];

            Jimp.read(filePath, function(err, image) {
                if(err) {
                    console.error(err);
                    return;
                }

                let code = QRReader(image.bitmap.data, image.bitmap.width, image.bitmap.height);
                if(code) {
                    LoadPattern(code.binaryData);
                } else {
                    console.error("Cannot find QR Code in Image");
                }
            });
        }
    });
}

let DOMconverterPreviewOriginal = document.querySelector(".converter-preview-original");
let DOMconverterPreviewMedian = document.querySelector(".converter-preview-median");
let DOMconverterPreviewRGB = document.querySelector(".converter-preview-rgb");
let DOMconverterPreviewYUV = document.querySelector(".converter-preview-yuv");
let DOMconverterPreviewGreyscale = document.querySelector(".converter-preview-greyscale");
let DOMconverterPreviewSepia = document.querySelector(".converter-preview-sepia");
function MenuConvertImage() {
    closeMenu();

    dialog.showOpenDialog({ title: "Open image", properties: ['openFile'], filters: [{"name": "Image", "extensions": ["png", "jpeg", "jpg"]}] }).then(result => {
        if(!result.canceled) {
            let filePath = result.filePaths[0];

            Jimp.read(filePath).then(function(image) {
                DOMsectionCreator.classList.remove("active");
                DOMsectionConverter.classList.add("active");

                console.log(convertToRGB(image));
            });
        }
    });
}

// Savers
function MenuExport() {
    dialog.showSaveDialog({ title: "Save QR Code Image", filters: [{"name": "PNG Image", "extensions": ["png"]}]}).then(result => {
        if(!result.canceled) {
            let filePath = result.filePath;
            closeMenu();
            DOMsectionCreator.classList.remove("active");
            DOMsectionExporter.classList.add("active");

            ExportPattern(filePath);
        }
    });
}

function MenuSaveBinary() {
    dialog.showSaveDialog({ title: "Save .acnl file", filters: [{"name": "ACNL file", "extensions": ["acnl", "bin"]}]}).then(result => {
        if(!result.canceled) {
            let filePath = result.filePath;

            fs.writeFile(filePath, currentPattern.getData(), (err, data)=> {
                if(err) {
                    alert("An error occured reading the file: " + err.message);
                    return;
                }
            });
        }
    });
}

// Tools
let DOMviewer = document.querySelector(".viewer");
let DOMviewerPattern = document.querySelector(".viewer .pattern");
let currentZoomLevel = 8;

// Zoom
DOMviewer.addEventListener('wheel', function(event) {
    if (event.deltaY < 0) {
        currentZoomLevel++;
    }
    else if (event.deltaY > 0) {
        if(currentZoomLevel - 1 > 0) {
            currentZoomLevel--;
        }
    }

    rescalePattern();
});

function rescalePattern() {
    DOMviewerPattern.style.width = 32 * currentZoomLevel + "px";
    DOMviewerPattern.style.height = 32 * currentZoomLevel + "px";

    if(DOMviewerPattern.classList.contains("centered")) {
        DOMviewerPattern.style.marginLeft = "-" + (32 * currentZoomLevel) / 2 + "px";
        DOMviewerPattern.style.marginTop = "-" + (32 * currentZoomLevel) / 2 + "px";
    }
}

// Tool 1
let isDrawing = false;
DOMviewerPattern.addEventListener('click', function(event) {
    if(currentTool == 1) {
        let posX = Math.floor(event.offsetX / currentZoomLevel);
        let posY = Math.floor(event.offsetY / currentZoomLevel);

        currentPattern.colorPixel(patternCanvas.getContext('2d'), posX, posY, currentColor);
    }
    if(currentTool == 2) {
        let posX = Math.floor(event.offsetX / currentZoomLevel);
        let posY = Math.floor(event.offsetY / currentZoomLevel);

        currentPattern.colorPixel(patternCanvas.getContext('2d'), posX, posY, 15);
    }
    if(currentTool == 4) {
        for(let x = 0; x < 32; x++) {
            for(let y = 0; y < 32; y++) {
                currentPattern.colorPixel(patternCanvas.getContext('2d'), x, y, currentColor);
            }
        }
    }
});
DOMviewerPattern.addEventListener('mousedown', function(event) {
    if(currentTool == 1 || currentTool == 2) {
        isDrawing = true;
    }
});
DOMviewerPattern.addEventListener('mouseup', function(event) {
    if(currentTool == 1 || currentTool == 2) {
        isDrawing = false;
    }
});
DOMviewerPattern.addEventListener('mousemove', function(event) {
    if(currentTool == 1 && isDrawing) {
        let posX = Math.floor(event.offsetX / currentZoomLevel);
        let posY = Math.floor(event.offsetY / currentZoomLevel);

        currentPattern.colorPixel(patternCanvas.getContext('2d'), posX, posY, currentColor);
    }
    if(currentTool == 2 && isDrawing) {
        let posX = Math.floor(event.offsetX / currentZoomLevel);
        let posY = Math.floor(event.offsetY / currentZoomLevel);

        currentPattern.colorPixel(patternCanvas.getContext('2d'), posX, posY, 15);
    }
});

let viewerMoving = false;
let viewerX = 0;
let viewerY = 0;
let viewerAnimationFrame;
document.addEventListener('keydown', function(event) {
    if(currentTool == 0) {
        if(event.code == "Space") {
            viewerMoving = true;

            DOMviewerPattern.classList.remove("centered");

            DOMviewerPattern.style.marginLeft = "0px";
            DOMviewerPattern.style.marginTop = "0px";
    
            viewerAnimationFrame = requestAnimationFrame(MoveViewer);
        }
    }
});
document.addEventListener('keyup', function(event) {
    if(currentTool == 0) {
        if(event.code == "Space") {
            viewerMoving = false;
            cancelAnimationFrame(viewerAnimationFrame);
        }
        if(event.code == "Numpad0") {
            ResetViewerMovement();
        }
    }
});
document.addEventListener('mousemove', function(event) {
    viewerX = event.clientX - ((32 * currentZoomLevel) / 2);
    viewerY = event.clientY - 104 - ((32 * currentZoomLevel) / 2);
});

function MoveViewer() {
    if(viewerMoving) {
        DOMviewerPattern.style.top = viewerY + "px";
        DOMviewerPattern.style.left = viewerX + "px";
        
        viewerAnimationFrame = requestAnimationFrame(MoveViewer);
    }
}
function ResetViewerMovement() {
    DOMviewerPattern.classList.add("centered");

    currentZoomLevel = 8;
    rescalePattern();
}

// Exporter
let DOMpatternExportTemplate = document.querySelector(".patternExportTemplate");
let DOMpatternExport = document.createElement("canvas");
let DOMpatternExportQRHolder = document.createElement("canvas");
let DOMpatternExportPreview = document.querySelector(".exporterPreview");
let exportLocation = "";

function ExportPattern(_location) {
    exportLocation = _location;
    let DOMpatternCtx = DOMpatternExport.getContext('2d');

    DOMpatternCtx.canvas.width = 900;
    DOMpatternCtx.canvas.height = 720;

    DOMpatternCtx.drawImage(DOMpatternExportTemplate, 0, 0);

    // Title
    DOMpatternCtx.font = "24px Verdana";
    DOMpatternCtx.fillStyle = "#56493e";
    DOMpatternCtx.textAlign = "center";
    DOMpatternCtx.fillText(currentPattern.getTitle(), DOMpatternExport.width/2, 86);

    // Name
    DOMpatternCtx.font = "32px Verdana";
    DOMpatternCtx.fillStyle = "#56493e";
    DOMpatternCtx.textAlign = "left";
    DOMpatternCtx.fillText(currentPattern.getCreator(), 580, 525);

    // Town
    DOMpatternCtx.font = "22px Verdana";
    DOMpatternCtx.fillStyle = "#56493e";
    DOMpatternCtx.fillText(currentPattern.getTown(), 580, 560);

    // Pattern Preview
    DOMpatternCtx.imageSmoothingEnabled = false;
    DOMpatternCtx.drawImage(patternCanvas, 580, 155, 230, 230);

    // QR COde
    var opts = {
        version: 19,
        errorCorrectionLevel: 'M',
        scale: 4
    };
    QRWriter.toCanvas(DOMpatternExportQRHolder, [{ data: currentPattern.getData(), mode: 'byte'}], opts);

    DOMpatternCtx.drawImage(DOMpatternExportQRHolder, 90, 145, 425, 425);

    // Export as Image
    let base64Data = DOMpatternExport.toDataURL().replace(/^data:image\/png;base64,/, "");
    DOMpatternExportPreview.src = DOMpatternExport.toDataURL();
    fs.writeFileSync(_location, base64Data, 'base64');
}

function MenuCloseExporter() {
    DOMsectionCreator.classList.add("active");
    DOMsectionExporter.classList.remove("active");
}

function MenuOpenExportedFIle() {
    shell.openItem(exportLocation);
}

function UpdateTitle() {
    let newTitle = DOMpatternTitle.value.slice(0, 9);
    console.log("Changing Title: " + newTitle);
    currentPattern.setTitle(newTitle);
}
function UpdateCreator() {
    let newCreator = DOMpatternCreator.value.slice(0, 9);
    console.log("Changing Creator: " + newCreator);
    currentPattern.setCreator(newCreator);
}
function UpdateTown() {
    let newTown = DOMpatternTown.value.slice(0, 9);
    console.log("Changing Town: " + newTown);
    currentPattern.setTown(newTown);
}

// Converters
function imageToArrayData(_imgData) {
    _imgData.resize(32, 32);

    let width = _imgData.bitmap.width;
    let height = _imgData.bitmap.height;
    let imageData = [];

    for(let x = 0; x < width; x++) {
        imageData[x] = [];

        for(let y = 0; y < height; y++) {
            let color = _imgData.getPixelColor(x, y).toString(16);

            let hex = color.slice(0, -2);
            let transparency = color.slice(-2);
            
            if(transparency == "ff") {
                imageData[x][y] = hex;
            } else {
                imageData[x][y] = "transparent";
            }
        }
    }
    
    return imageData;
}
function convertToRGB(_imgData) {
    let imgArray = imageToArrayData(_imgData);
    return imgArray;
}