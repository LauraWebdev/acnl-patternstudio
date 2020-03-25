const { dialog, shell } = require('electron').remote;
const fs = require('fs');
const Jimp = require('jimp');
const QRReader = require("jsqr");
const QRWriter = require('qrcode');
const ACNLP = require('./assets/js/acnlp.js');

let currentPattern;
let patternCanvas = document.querySelector(".pattern-canvas");
let patternColors = document.querySelectorAll(".color-palette .colors .color");

// Load Empty On Startup
fs.readFile("src/assets/empty.acnl", (err, data)=> {
    if(err) {
        alert("An error occured reading the file: " + err.message);
        return;
    }

    LoadPattern(data);

    setTimeout(function() {
        hideStartup();
    }, 5000);
});

function LoadPattern(_data) {
    currentPattern = new ACNLP(_data);

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

// Tool 0
DOMviewer.addEventListener('wheel', function(event) {
    if(currentTool == 0) {
        if (event.deltaY < 0) {
            currentZoomLevel++;
        }
        else if (event.deltaY > 0) {
            if(currentZoomLevel - 1 > 0) {
                currentZoomLevel--;
            }
        }

        rescalePattern();
    }
});

function rescalePattern() {
    DOMviewerPattern.style.width = 32 * currentZoomLevel + "px";
    DOMviewerPattern.style.height = 32 * currentZoomLevel + "px";

    DOMviewerPattern.style.marginLeft = "-" + (32 * currentZoomLevel) / 2 + "px";
    DOMviewerPattern.style.marginTop = "-" + (32 * currentZoomLevel) / 2 + "px";
}

// Tool 1
let isDrawing = false;
DOMviewerPattern.addEventListener('click', function(event) {
    if(currentTool == 1) {
        let posX = Math.floor(event.offsetX / currentZoomLevel);
        let posY = Math.floor(event.offsetY / currentZoomLevel);

        currentPattern.colorPixel(patternCanvas.getContext('2d'), posX, posY, currentColor);
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
    if(currentTool == 1) {
        isDrawing = true;
    }
});
DOMviewerPattern.addEventListener('mouseup', function(event) {
    if(currentTool == 1) {
        isDrawing = false;
    }
});
DOMviewerPattern.addEventListener('mousemove', function(event) {
    if(currentTool == 1 && isDrawing) {
        let posX = Math.floor(event.offsetX / currentZoomLevel);
        let posY = Math.floor(event.offsetY / currentZoomLevel);

        currentPattern.colorPixel(patternCanvas.getContext('2d'), posX, posY, currentColor);
    }
});

// Exporter
let DOMpatternExportTemplate = document.querySelector(".patternExportTemplate");
let DOMpatternExportQRHolder = document.createElement("canvas");
let DOMpatternExport = document.createElement("canvas");
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
    QRWriter.toCanvas(DOMpatternExportQRHolder, [{data: currentPattern.getData(), mode: 'byte'}]);
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


// DEBUG
/*
let debugCanvasPreview = document.querySelector("canvas.debug_canvaspreview");
let debugCanvasBoard = document.querySelector("canvas.debug_canvasboard");

let debugTitle = document.querySelector(".debug_title");
let debugCreator = document.querySelector(".debug_creator");
let debugTown = document.querySelector(".debug_town");
let debugType = document.querySelector(".debug_type");
let debugPalette = document.querySelector(".debug_palette");

let debugSaveImageButton = document.querySelector("button.debug_saveimage"); */



/* INIT */
/*
buttonNew.addEventListener('click', function() {

    loadSection(sectionCreator);
});

buttonLoadACNL.addEventListener('click', function() {
});

buttonLoadQRCode.addEventListener('click', function() {
}); */

/* CREATOR */
/* 
buttonBack.addEventListener('click', function() {
    loadSection(sectionInit);
});
function LoadData(_data) {
    currentPattern = new ACNLP(_data);

    loadSection(sectionCreator);

    // Set Info
    debugTitle.innerHTML = currentPattern.getTitle();
    debugCreator.innerHTML = currentPattern.getCreator();
    debugTown.innerHTML = currentPattern.getTown();
    debugType.innerHTML = currentPattern.getType();

    // Draw Canvas
    currentPattern.draw(debugCanvasBoard.getContext('2d'), 0);
    currentPattern.draw(debugCanvasPreview.getContext('2d'), 0);

    debugPalette.innerHTML = "";
    for(let i = 0; i < 16; i++) {
        let newPaletteItem = document.createElement("div");
        let color = currentPattern.getColor(i);
        newPaletteItem.style.backgroundColor = color;
        newPaletteItem.innerHTML = (0x58 + i).toString(16);
        newPaletteItem.style.color = getContrastYIQ(color);

        debugPalette.appendChild(newPaletteItem);
    }
}
debugSaveImageButton.addEventListener('click', function() {
});

function getContrastYIQ(hexcolor){
    hexcolor = hexcolor.replace("#", "");
    var r = parseInt(hexcolor.substr(0,2),16);
    var g = parseInt(hexcolor.substr(2,2),16);
    var b = parseInt(hexcolor.substr(4,2),16);
    var yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'black' : 'white';
} */