$( function(){
	var rs = circusrs;
	var dummyConfig = {
		width: 512,
		height: 512,
		depth: 128,
		// pixelFormat: PixelFormat.Int16,
		vx: 0.5,
		vy: 0.5,
		vz: 0.5
	};
	var rsDummyImageSource = new rs.MockImageSource(dummyConfig);
	var rsViewState = new rs.ViewState(
		[512,512], // canvasSize
		[0,0, dummyConfig.depth / 2], // cOrigin
		[ dummyConfig.width, 0, 0 ],// cX
		[ 0, dummyConfig.height, 0 ], // cY
		1500, // windowLevel
		2000 // windowWidth
	);

	var canvas2 = document.getElementById('rs-canvas');
	var rsViewer2 = new rs.Viewer( canvas2 );
	rsViewer2.setImageSource( rsDummyImageSource );
	rsViewer2.setViewState( rsViewState );
	var pointTool = new rs.PointTool(0);
	rsViewer2.setBackgroundEventCapture(pointTool);
	var textObj = new rs.ArrowText("サンプル");
	// var arrowAnnotation=new rs.ArrowAnnotation([150,150,100], [50,50,50], textObj);
	//pen annotation
	//dummy data

	var dummyPenData = [
		[100,100,100],
		[101,100,100],
		[102,100,100],
		[103,100,100],
		[104,100,100],
		[105,100,100],
		[106,100,100],
		[107,100,100],
		[108,100,100],
		[109,100,100],
		[100,101,100],
		[101,101,100],
		[102,101,100],
		[103,101,100],
		[104,101,100],
		[105,101,100],
		[106,101,100],
		[107,101,100],
		[108,101,100],
		[109,101,100],
	];

	var penAnnotation = new rs.VoxelCloudAnnotation([512, 512, 128], dummyPenData, [0, 255, 0, 1.0]);

	var dotText = new rs.PointText("サンプル");
	var dotAnnotation = new rs.PointAnnotation(
		0,
		[150, 100, 30],
		10,
		[255, 0, 0, 1],
		dotText);
	var circleAnnotation = new rs.PointAnnotation(
		1,
		[200, 130, 30],
		10,
		[0, 255, 0, 1],
		dotText);
	//set event before append
	rsViewer2.getAnnotationCollection().on("append", function(annoCol){
		var liElm = document.createElement("li");
		var frag = document.createDocumentFragment();
		for (var i = 0; i < annoCol.length; i++) {
			var c = annoCol[i];
			if (c instanceof rs.Annotation) {//some kind of annotation
				var clone = liElm.cloneNode(false);
				var label = "annotation";
				if(c instanceof rs.PointAnnotation) {
					label = "point annotation";
					//add extra attribute
					clone.setAttribute("data-coordinate-x", c.getCenter()[0]);
					clone.setAttribute("data-coordinate-y", c.getCenter()[1]);
					clone.setAttribute("data-coordinate-z", c.getCenter()[2]);
				}
				clone.setAttribute("data-vox-anno-id", c.getId());
				clone.appendChild(document.createTextNode(label));
				frag.appendChild(clone);
			}
		}

		var pointListElm = document.getElementById("point_list");
		$(pointListElm).empty();
		pointListElm.appendChild(frag);
	});
	// rsViewer2.getAnnotationCollection().append( arrowAnnotation );
	// rsViewer2.getAnnotationCollection().append( penAnnotation );
	var dotId = rsViewer2.getAnnotationCollection().append( dotAnnotation );
	var circleid = rsViewer2.getAnnotationCollection().append( circleAnnotation );

	rsViewer2.render();
	//------------------------------
	//tool selection section
	$("input[name=tool]").on("change", function(){
		rsViewer2.clearBackgroundEventCapture();
		var tool = null;
		switch(this.value){
			case "dot":
				tool = new rs.PointTool(0);
				break;
			case "circle":
				tool = new rs.PointTool(1);
				break;
			case "pen":
				tool = new rs.PenTool();
				break;
			case "bucket":
				tool = new rs.BucketTool();
				break;
			case "other":
				//do nothing
				break;
		}
		if (tool !== null) {
			rsViewer2.setBackgroundEventCapture(tool);
		}
	});
	//annotation selection event-------------------
	//move center to the selected point
	$("#point_list").on("click", function(e){
		var vs = rsViewer2.getViewState();
		var currentViewCenter = vs.getCenter();
		if (e.target.hasAttribute("data-coordinate-x")
			&& e.target.hasAttribute("data-coordinate-y")
			&& e.target.hasAttribute("data-coordinate-z")) {
			var targetPoint = [
				e.target.getAttribute("data-coordinate-x"),
				e.target.getAttribute("data-coordinate-y"),
				e.target.getAttribute("data-coordinate-z"),
			];
			var translateDistance = [
				targetPoint[0] - currentViewCenter[0],
				targetPoint[1] - currentViewCenter[1],
				targetPoint[2] - currentViewCenter[2]
			];
			vs.transrate(translateDistance[0], translateDistance[1], translateDistance[2]);
			rsViewer2.render();
		}
		if (e.target.hasAttribute("data-vox-anno-id")) {
			var targetId = e.target.getAttribute("data-vox-anno-id");
			rsViewer2.getAnnotationCollection().setCurrentAnnotationId(targetId);
		}
	});
	//add annotation button event
	$("#add_voxel_annotation_btn").on("click", function(){
		var r=document.getElementById("r_color").value;
		var g=document.getElementById("g_color").value;
		var b=document.getElementById("b_color").value;
		var newVoxelAnnotation = new rs.VoxelCloudAnnotation([512, 512, 128], [], [r, g, b, 1.0]);
		var newId = rsViewer2.getAnnotationCollection().append(newVoxelAnnotation);
		rsViewer2.getAnnotationCollection().setCurrentAnnotationId(newId);
	});

	//==================================================
	var viewStateCanvas = document.getElementById('view-state-canvas');
	var rsViewer = new rs.Viewer( viewStateCanvas );
	var rsImageSource = new rs.ViewStateImageSource(
		dummyConfig.width,
		dummyConfig.height,
		dummyConfig.depth );
	rsViewer.setImageSource( rsImageSource );
	rsViewer.setViewState( rsViewState );

	var rsAnnotationCollection = rsViewer.getAnnotationCollection();

	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		5, 0, 0, // xAxis
		350, 30, 30, 'rgba(255,255,0,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		0, 5, 0, // yAxis
		400, 30, 30, 'rgba(255,0,255,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlTransAnnotation(
		0, 0, 5, // zAxis
		450, 30, 30, 'rgba(0,255,255,0.3)'
	) );

	rsAnnotationCollection.append( new rs.ControlRotateAnnotation(
		1, 0, 0, // xAxis
		350, 70, 30, 'rgba(255,0,0,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlRotateAnnotation(
		0, 1, 0, // yAxis
		400, 70, 30, 'rgba(0,255,0,0.3)'
	) );
	rsAnnotationCollection.append( new rs.ControlRotateAnnotation(
		0, 0, 1, // zAxis
		450, 70, 30, 'rgba(0,0,255,0.3)'
	) );

	rsAnnotationCollection.append( new rs.ControlScaleAnnotation(
		1.1, // scale
		450, 110, 30, 'rgba(128,128,128,0.3)'
	) );
	rsViewer.render();
	rsViewer.on('render',function( e ){
		rsViewer2.render();
	});
});
