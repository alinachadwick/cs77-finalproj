
Slider = function(targetId, minValue, maxValue, initialValue, hasLabel, callback, callbackArgs) {
    var target = isString(targetId) ? document.getElementById(targetId) : targetId;
    if (!target)
        return;
        
    this.sliderBackground = document.createElement("div");
    this.sliderBackground.className = "slider";
    
    this.minValue = minValue;
    this.maxValue = maxValue;
    this.callback = callback;
    this.callbackArgs = callbackArgs || [];
    this.callbackArgs.push(initialValue);
    
    this.sliderBar = document.createElement("div");
    this.sliderBar.className = "slider-bar";
    this.sliderBackground.appendChild(this.sliderBar);
    
    this.sliderHandle = document.createElement("a");
    this.sliderHandle.className = "slider-handle";
    this.sliderBackground.appendChild(this.sliderHandle);
    
    var mouseMoveListener = this.mouseMove.bind(this);
    function mouseUpListener(event) {
        document.removeEventListener("mousemove", mouseMoveListener);
        document.removeEventListener("mouseup", mouseUpListener);
    }
    
    this.sliderHandle.addEventListener("mousedown", function(event) {
        event.preventDefault();
        document.addEventListener("mousemove", mouseMoveListener);
        document.addEventListener("mouseup", mouseUpListener);
    });
    
    var parent = target.parentNode;
    parent.replaceChild(this.sliderBackground, target);
    
    if (hasLabel) {
        this.label = document.createElement("p");
        this.label.className = "slider-label";
        parent.insertBefore(this.label, this.sliderBackground.nextSibling);
    }

    this.setPosition((initialValue - minValue)/(maxValue - minValue));
}

Slider.prototype.mouseMove = function(event) {
    var rect = this.sliderBackground.getBoundingClientRect();
    this.setPosition((event.clientX - rect.left)/(rect.right - rect.left));
}