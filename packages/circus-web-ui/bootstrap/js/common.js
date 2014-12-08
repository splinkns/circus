$(function(){

	//背景色切替
	$('#btn_area').find('.color_select').change(function(){
		console.log("Color Change");
		var mode_flg	=	$('#btn_area').find('.color_select:checked').val();
		console.log("mode::"+mode_flg);
		if(mode_flg==0){
			console.log("Mode::Black");
			//白背景モード
			$('body').removeClass('mode_black')
				.addClass('mode_white');
		}else{
			console.log("Mode::White");
			//黒背景モード
			$('body').removeClass('mode_white')
				.addClass('mode_black');
		}
	});



	/*jQuery UI widget Run*/

	//datepicker
	if($('.datepicker').length>0){
		$('.datepicker').datepicker({
			dateFormat:"yy/mm/dd"
		});
	}

	//droppable area
	if($('.droppable_area').length>0){

		jQuery.event.props.push('dataTransfer');
		$('.droppable_area').each(function(){

			var droppable_area	=	$(this);
			var the_form	=	$(this).closest('form');
			var input_elm	=	$(this)	.find('.upload_file_input_elm');

			 // ファイル選択フォームからの入力
			 input_elm.bind("change", function(){
				  // 選択されたファイル情報を取得
				  var files = this.files;

				  // アップロード処理
				  uploadAjax(files);
			 });

			 // ドラッグドロップからの入力
			droppable_area.bind("drop", function(event){
				event.stopPropagation();
				event.preventDefault();

				var dt = event.dataTransfer;
				var ajax_files = dt.files[0];
				var the_url	=	the_form.attr('action');
				uploadAjax(the_url,ajax_files);

			 }).bind("dragenter dragover", false);

		});//eachここまで

	}//droppable_areaへのイベント付与のためのif文ここまで

	//Ui multiple select
	if($('.multi_select').length>0){
		multiSelectActivate();
	}

	//UI soirtable
	if($('.ui-sortable').length>0){
		$('.ui-sortable').sortable();
	}

});



var multiSelectActivate	=	function(){

	$('.multi_select').not('.active').multiselect({
		header: false,
		noneSelectedText: '(all)',
		selectedList: 10
	})
	.addClass('active');

}



//ファイルアップロード時ajax
var uploadAjax = function (ajax_url,files) {

  var fd = new FormData();// FormData オブジェクトを用意

  // ファイル情報を追加する
  for (var i = 0; i < files.length; i++) {
		fd.append("files", files[i]);
  }

  alert('本来はここでAjax');	//開発用,本来はこのアラートはない

  // XHR で送信
  $.ajax({
	url: ajax_url,
	type: "POST",
	data: fd,
	processData: false,
	contentType: false
  });
};

//桁数整形
var zeroFormat=function(e,t){var n=String(e).length;if(t>n){return(new Array(t-n+1)).join(0)+e}else{return e}}