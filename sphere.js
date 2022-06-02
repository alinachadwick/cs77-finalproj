var SpherePositions = [];
var SphereNormals = [];
var SphereTriIndices = [];
var SphereIndices = [];

var Task1_SpherePositions = [];

(function() {
    var NumPhiBands = 30;
    var NumThetaBands = NumPhiBands/2;

    for (var i = 0; i <= NumThetaBands; ++i) {
        for (var j = 0; j < NumPhiBands; ++j) {
            var theta = (i/NumThetaBands - 0.5)*Math.PI;
            var phi = 2*Math.PI*j/NumPhiBands

            var x = Math.cos(phi)*Math.cos(theta);
            var y = Math.sin(theta);
            var z = Math.sin(phi)*Math.cos(theta);

            SpherePositions.push(x);
            SpherePositions.push(y);
            SpherePositions.push(z);
            SphereNormals.push(x);
            SphereNormals.push(y);
            SphereNormals.push(z);

            if (i < NumThetaBands) {
                var i0 = i, i1 = i + 1;
                var j0 = j, j1 = (j + 1) % NumPhiBands;
                SphereIndices.push(i0*NumPhiBands + j0);
                SphereIndices.push(i0*NumPhiBands + j1);
                SphereIndices.push(i1*NumPhiBands + j0);
                SphereIndices.push(i0*NumPhiBands + j0);
                SphereTriIndices.push(i0*NumPhiBands + j0);
                SphereTriIndices.push(i0*NumPhiBands + j1);
                SphereTriIndices.push(i1*NumPhiBands + j1);
                SphereTriIndices.push(i0*NumPhiBands + j0);
                SphereTriIndices.push(i1*NumPhiBands + j1);
                SphereTriIndices.push(i1*NumPhiBands + j0);
            }
        }
    }
})();

(function() {
    var NumPhiBands = 30;
    var NumThetaBands = NumPhiBands/2;

    for (var i = 0; i <= NumThetaBands; ++i) {
        for (var j = 0; j < NumPhiBands; ++j) {
            var theta = (i/NumThetaBands - 0.5)*Math.PI;
            var phi = 2*Math.PI*j/NumPhiBands

            var x = Math.cos(phi)*Math.cos(theta);
            var y = Math.sin(theta);
            var z = Math.sin(phi)*Math.cos(theta) + 13;

            Task1_SpherePositions.push(x);
            Task1_SpherePositions.push(y);
            Task1_SpherePositions.push(z);
        }
    }
})();
