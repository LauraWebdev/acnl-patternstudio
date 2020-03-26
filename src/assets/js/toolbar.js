let currentTool = 0;
let DOMtoolbarItems = document.querySelectorAll(".toolbar-item");
let DOMtoolboxItems = document.querySelectorAll(".tools .toolbar-item");
let DOMsubtoolboxes = document.querySelectorAll(".sub-toolbar");
let DOMtooltip = document.querySelector(".tooltip");

// Tools: 0 - Move, 1 - Pen, 2 - Eraser, 3 - Eyedropper, 4 - Fill, 5 - Info
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

// Tooltips
DOMtoolbarItems.forEach(function(item) {
    item.addEventListener('mouseover', function(event) {
        ShowTooltip(item);
    });
    item.addEventListener('mouseout', function(event) {
        HideTooltip(item);
    });
});

function ShowTooltip(_toolbarItem) {
    DOMtooltip.innerHTML = _toolbarItem.dataset.tooltip;
    DOMtooltip.classList.add("active");
    DOMtooltip.style.left = (_toolbarItem.getBoundingClientRect().x + (_toolbarItem.getBoundingClientRect().width / 2) - (DOMtooltip.getBoundingClientRect().width / 2)) + "px";
    DOMtooltip.style.top = (_toolbarItem.getBoundingClientRect().y + _toolbarItem.getBoundingClientRect().height - 10) + "px";
}
function HideTooltip(_toolbarItem) {
    DOMtooltip.classList.remove("active");
}