let currentTool = 0;
let DOMtoolboxItems = document.querySelectorAll(".tools .toolbar-item");
let DOMsubtoolboxes = document.querySelectorAll(".sub-toolbar");

// Tools: 0 - Move, 1 - Pen, 2 - Eraser, 3 - Eyedropper, 4 - Fill
function changeCurrentTool(_newTool) {
    currentTool = _newTool;

    DOMtoolboxItems.forEach(function(item) {
        item.classList.remove("active");
    });

    DOMtoolboxItems[_newTool].classList.add("active");

    DOMsubtoolboxes.forEach(function(item) {
        item.classList.remove("active");
    });

    DOMsubtoolboxes[_newTool].classList.add("active");
}