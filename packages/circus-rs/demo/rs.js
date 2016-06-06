$(function(){
	
	var imageSourceSelector = prepareImageSourceSelector();
	
	var state = {
		section: {
			origin: [0,0, 186],
			xAxis: [512,0,0],
			yAxis: [0,512,0]
		},
		window: {
			level: 138,
			width: 2277
		}
	};
	
	var axialElement = document.getElementById('rs-canvas');
	
	var viewer = new circusrs.Viewer( axialElement );
	viewer.viewState = state;
	
	imageSourceSelector.addViewer( viewer );
	imageSourceSelector.use('mock');
	
	/**
	 * tool
	 */
	var toolDriver = new circusrs.ToolDriver();
	viewer.backgroundEventTarget = toolDriver;
	
	var stateToolSelector = new circusrs.ToolSelector();
	var drawToolSelector = new circusrs.ToolSelector();

	/**
	 * hand tool
	 */
	(function(){
		var tool = new circusrs.HandTool();
		var iconElement = document.querySelector('#tool-icon-hand');
		
		$( iconElement ).on('click', function(){
			drawToolSelector.disactivate();
			tool.activate();
		} );
		tool.on('activate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
			iconElement.className += ' active-tool ';
		} );
		tool.on('disactivate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
		} );
		
		toolDriver.append( tool );
		stateToolSelector.append( tool );
	})();
	
	/**
	 * rotate tool
	 */
	(function(){
		var tool = new circusrs.RotateTool();
		var iconElement = document.querySelector('#celestial-rotate');
		
		$( iconElement ).on('click', function(){
			drawToolSelector.disactivate();
			tool.activate();
		} );
		tool.on('activate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
			iconElement.className += ' active-tool ';
		} );
		tool.on('disactivate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
		} );
		
		toolDriver.append( tool );
		stateToolSelector.append( tool );
	})();
	
	/**
	 * cloud-tool
	 */
	(function(){
		var tool = new circusrs.CloudTool();
		var iconElement = document.querySelector('#tool-icon-brush');
		
		$( iconElement ).on('click', function(){
			if( tool.clouds.length > 0 ){
				tool.activate();
			}else{
				alert('No cloud to write');
			}
		} );
		tool.on('activate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
			iconElement.className += ' active-tool ';
		} );
		tool.on('disactivate', function(){
			iconElement.className = iconElement.className.replace( / active-tool /g, '' );
		} );
		
		viewer.painters.push( tool.renderer );
		
		var $addBtn = $('[name=add-new-cloud]');
		
		var colorCount = 0;
		var colors = [
			[ 0xff, 0, 0, 0xff ],
			[ 0, 0xff, 0, 0xff ],
			[ 0, 0, 0xff, 0xff ],
			[ 0, 0xff, 0xff, 0xff ],
			[ 0xff, 0, 0xff, 0xff ],
			[ 0xff, 0xff, 0, 0xff ]
		];
		var add = function(){
			var color = colors[ colorCount++ % colors.length ];
			var label = 'LABEL' + colorCount.toString();
			var dim = viewer.imageSource.getDimension();
			var cloud = new circusrs.VoxelCloud();

			cloud.label = label;
			cloud.color = color;
			cloud.setDimension( dim[0], dim[1], dim[2] );
			
			var $cloudControl = $( document.createElement('div') ).addClass('row').appendTo( $('#clouds') );
			
			
			var $btn = $( document.createElement('button') ).addClass('btn btn-block btn-default btn-xs').append(label).on('click',function(){
				tool.setCloud( cloud );
			}).css('color', 'rgba(' + color.join(',') + ')' ).appendTo(
				$( document.createElement('div') ).addClass('col-xs-4').appendTo($cloudControl)
			);
			
			var $alpha = $( document.createElement('input') ).attr({
				'type': 'range',
				'min': 0,
				'max': 255,
				'value': color[3]
			}).on('input', function(){
				color[3] = Number( $(this).val() );
				viewer.render();
			}).appendTo(
				$( document.createElement('div') ).addClass('col-xs-8').appendTo($cloudControl)
			);
			tool.on('cloudchange', function( prev, set ){
				$btn.toggleClass('btn-info', set === cloud).toggleClass('btn-default',set !== cloud);
			});
			
			tool.addCloud( cloud );
			
		};
		$addBtn.on('click', function(){
			add();
		} );
		
		toolDriver.prepend( tool );
		drawToolSelector.append( tool );
	})();
	
	/**
	 * zoom-tool
	 */
	/*
	(function(){
		
		var iconElement = document.getElementById('zoom');
		var tool = new circusrs.ZoomTool();
		
		var ve = viewer.createEvent('someCustomEvent');
		
		viewer.painters.push( tool.icon );
		
	})();
	*/

	/**
	 * viewer control
	 */
	setupViewerControl(viewer);
	
	viewer.render()
		// cross section check
		.then( function(){ setupStateViewer( viewer ) } );
});

function setupViewerControl( viewer ){
	
	var controller = new circusrs.ViewerControl( viewer, 'axial' );
	
	$('#window-level').change( function(){ controller.setWindowLevel( $(this).val() ); } );
	$('#window-width').change( function(){ controller.setWindowWidth( $(this).val() ); } );
	$('#scale').change( function(){ controller.setScale( $(this).val() ); } );
	$('#rotate-x').change( function(){ controller.setRotateX( $(this).val() ); } );
	$('#rotate-y').change( function(){ controller.setRotateY( $(this).val() ); } );
	$('#rotate-z').change( function(){ controller.setRotateZ( $(this).val() ); } );

	viewer.on('statechange', function(){
		$('#window-level').val( controller.getWindowLevel() );
		$('#window-width').val( controller.getWindowWidth() );
		$('#scale').val( controller.getScale() );
		$('#rotate-x').val( controller.getRotateX() );
		$('#rotate-y').val( controller.getRotateY() );
		$('#rotate-z').val( controller.getRotateZ() );
	});
	
}

function setupStateViewer( viewer ){

	var stateViewerCanvas = document.getElementById('state-canvas');
	var xRot = 46, yRot = 34;
	
	var stateViewer = new circusrs.StateViewer();
	stateViewer.pan = 2.0;
	stateViewer.setCelestialCamera( xRot, yRot );
	
	var stateViewerRendering = function(){

		stateViewer.clearObject();
		
		if( viewer.imageSource ){
			var volumeModel = new circusrs.WireAxisBoxObject( viewer.imageSource.getDimension() );
			stateViewer.addObject( volumeModel );

			var sectionModel = new circusrs.CrossSectionObject( viewer.viewState.section );
			stateViewer.addObject( sectionModel );
			
			// stateViewer.setCelestialCamera( xRot+=1, yRot+=1 );
		}
		
		stateViewerCanvas.getContext('2d').clearRect(0,0, stateViewerCanvas.getAttribute('width'), stateViewerCanvas.getAttribute('height') );
		stateViewer.draw( stateViewerCanvas );
	};
	viewer.on('statechange', stateViewerRendering );
	viewer.on('sourcechange', stateViewerRendering );

	
	$( 'input#pan-zoom' ).on( 'input', function () {
		stateViewer.pan = $(this).val();
		stateViewerRendering();
	} ).val( stateViewer.pan );
	
	$( 'input#cam-rotate-x' ).on( 'input', function () {
		stateViewer.setCelestialCamera( $('input#cam-rotate-x').val(), $('input#cam-rotate-y').val() );
		$(this).next().text('(' + $('input#cam-rotate-x').val() + ')');
		stateViewerRendering();
	} ).val( xRot );

	$( 'input#cam-rotate-y' ).on( 'input', function () {
		stateViewer.setCelestialCamera( $('input#cam-rotate-x').val(), $('input#cam-rotate-y').val() );
		$(this).next().text('(' + $('input#cam-rotate-y').val() + ')');
		stateViewerRendering();
	} ).val( yRot );
	
	stateViewerRendering();
}

