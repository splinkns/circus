$(function(){
	var save = JSON.parse(localStorage.getItem('rs-demo1-save'));
	if (save) {
		$('#series').val(save.series);
		$('#server').val(save.server);
	}
	
	var r = initializeViewer();
	var viewer = r.viewer;
	var state = r.state;
	var stateViewer = r.stateViewer;
	
	$('#window-level').change( function(){
		state.windowLevel = parseInt( $(this).val() );
		state.change();
	} );
	$('#window-width').change( function(){
		state.windowWidth = parseInt( $(this).val() );
		state.change();
	} );
	
	$('#scale').change( function(){
		state.scale( state.zoom * Math.pow( 1.1, $(this).val() ) );
	} );
	$('#origin-x').change( function(){
		state.origin[0] = parseInt( $(this).val() );
		state.change();
	} );
	$('#origin-y').change( function(){
		state.origin[1] = parseInt( $(this).val() );
		state.change();
	} );
	$('#origin-z').change( function(){
		state.origin[2] = parseInt( $(this).val() );
		state.change();
	} );
	
	state.on('change', function(){
		stateViewer.render();
		viewer.render();
		
		$('#window-level').val( this.windowLevel );
		$('#window-width').val( this.windowWidth );
		
		/*
		var scale = -10;
		while( this.zoom < Math.pow(1.1, scale) ){
			scale++;
		}
		$('#scale').val( scale );
		*/
		$('#origin-x').val( this.origin[0] );
		$('#origin-y').val( this.origin[1] );
		$('#origin-z').val( this.origin[2] );
	});
	state.change();
	
	
	$('#start').click( function(){
		var self = this;
		var config = {
			series: $('#series').val(),
			server: $('#server').val()
		};
		localStorage.setItem('rs-demo1-save', JSON.stringify(config));
		
		$( self ).prop('disabled', true);
		$( self ).text('Loading ... ');
		loadImageSource( viewer, config ).then( function(){
			$( self ).text('Load');
			$( self ).prop('disabled', false);
		} );
	});
	
});

function loadImageSource( viewer, config ){
	/**
	 * Prepare the image source you want to see realy
	 */
	
	return new Promise( function( resolve, reject ){
		var loader = new circusrs.RawDataLoader( {
			server: config.server
		} );
		var imageSource = new circusrs.RawVolumeImageSource( loader );
		imageSource.setSeries( config.series );
		imageSource.load();
		imageSource.once('loaded', function(vol){
			viewer.setImageSource( imageSource );
			viewer.render();
			resolve();
		});
	} );
}

function initializeViewer() {

	/**
	 * You can use other image source while loading, if know the size.
	 */
	// Prepare image source
	var dummyImageSource = new circusrs.MockImageSource({
		width: 512,
		height: 512,
		depth: 419
	});
	// Prepare viewer
	var dim = dummyImageSource.getDimension();
	var canvas = document.getElementById('rs-canvas');
	var viewer = new circusrs.Viewer( canvas );
	viewer.setImageSource( dummyImageSource );

	// Prepare view state
	var viewState = new circusrs.VolumeViewState(
		[ canvas.getAttribute('width'), canvas.getAttribute('height')], // canvasSize,
		[0,0, 186], // cOrigin
		[ dim[0], 0, 0 ],// cX
		[ 0, dim[1], 0 ], // cY
		138, // windowLevel
		2277 // windowWidth
	);
	viewer.setVolumeViewState( viewState );
	viewer.render();

	/**
	 * Prepare viewer to check viewport for debug
	 */
	var stateImageSource = new circusrs.VolumeViewStateImageSource( dim[0], dim[1], dim[2] );
	var viewStateCanvas = document.getElementById('view-state-canvas');
	var viewStateCanvasSize = [ viewStateCanvas.getAttribute('width'), viewStateCanvas.getAttribute('height')]
	var stateViewer = new circusrs.Viewer( viewStateCanvas );
	stateViewer.setImageSource( stateImageSource );
	
	// Attention: the same view state
	stateViewer.setVolumeViewState( viewState );

	// Append some annotations to stateViewer
	var rsAnnotationCollection = stateViewer.getAnnotationCollection();
	rsAnnotationCollection.append( new circusrs.ControlTransAnnotation(
		1, 0, 0, // xAxis
		viewStateCanvasSize[0]-40, 10, 30, 'rgba(0,255,96,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlTransAnnotation(
		0, 1, 0, // yAxis
		viewStateCanvasSize[0]-40, 50, 30, 'rgba(9,101,255,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlTransAnnotation(
		0, 0, 1, // zAxis
		viewStateCanvasSize[0]-40, 90, 30, 'rgba(248,139,76,0.7)'
	) );

	rsAnnotationCollection.append( new circusrs.ControlRotateAnnotation(
		1, 0, 0, // xAxis
		10, viewStateCanvasSize[1]-40, 30, 'rgba(0,255,96,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlRotateAnnotation(
		0, 1, 0, // yAxis
		50, viewStateCanvasSize[1]-40, 30, 'rgba(9,101,255,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlRotateAnnotation(
		0, 0, 1, // zAxis
		90, viewStateCanvasSize[1]-40, 30, 'rgba(248,139,76,0.7)'
	) );
	rsAnnotationCollection.append( new circusrs.ControlScaleAnnotation(
		1.1, // scale
		viewStateCanvasSize[0]-40, viewStateCanvasSize[1]-40, 30, 'rgba(128,128,128,0.3)'
	) );
	stateViewer.render();

	return {
		viewer: viewer,
		stateViewer: stateViewer,
		state: viewState
	};
}

circusrs.MockImageSource.prototype.load = function(){};
circusrs.MockImageSource.prototype.setSeries = function(){};
circusrs.MockImageSource.prototype.getDimension = function(){ return [ this.config.width,this.config.height,this.config.depth]; };
circusrs.MockImageSource.prototype.once = function(s,f){ f(this); };
