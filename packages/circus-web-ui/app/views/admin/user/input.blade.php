@extends('common.layout')
@section('content')
<script type="text/javascript">
	$(function() {
		//Confirmation button is pressed during processing
		//Cancel button is pressed at the time of processing
		$('.user_cancel').click(function(){
			if (window.confirm('Do you input content but you sure will be destroyed?')){
				var target_elm = $('.frm_user_input');
				target_elm.empty();
			}
			return false;
		});
	});
</script>
{{HTML::script('/js/ajax/user.js')}}
<div class="page_unique">
	<h1 class="page_ttl">{{$title}}</h1>
	@if (isset($error_msg))
		<span class="text_alert">{{$error_msg}}</span>
	@else
		{{Form::open(['url' => asset('admin/user/confirm'), 'method' => 'POST', 'class' => 'frm_user_confirm'])}}
			<table class="common_table mar_b_10">
				<colgroup>
					<col width="20%">
					<col width="80%">
				</colgroup>
				<tr>
					<th>User ID</th>
					<td>
						{{$inputs['userID']}}
						<span class="font_red">(ID is automatically generated by the system side)</span>
						@if (isset($errors) && $errors->has('userID'))
							<br><span class="txt_alert">{{$errors->first('userID')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>Login ID</th>
					<td>
						{{Form::text('loginID', isset($inputs['loginID']) && $inputs['loginID'] ? $inputs['loginID'] : '', array('class' => 'common_input_text w_300'))}}
						@if (isset($errors) && $errors->has('loginID'))
							<br><span class="txt_alert">{{$errors->first('loginID')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>Password</th>
					<td>
						{{Form::password('password', array('class' => 'common_input_text w_300'))}}
						@if (isset($errors) && $errors->has('password'))
							<br><span class="txt_alert">{{$errors->first('password')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>Description</th>
					<td>
						{{Form::text('description', isset($inputs['description']) && $inputs['description'] ? $inputs['description'] : '', array('class' => 'common_input_text w_300'))}}
						@if (isset($errors) && $errors->has('description'))
							<br><span class="txt_alert">{{$errors->first('description')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>Group</th>
					<td>
						{{Form::select('groups[]', $group_list, isset($inputs['groups']) ? $inputs['groups'] : null, array('class' => 'multi_select w_300', 'multiple' => 'multiple'))}}
						(multiple select available)
						@if (isset($errors) && $errors->has('groups'))
							<br><span class="txt_alert">{{$errors->first('groups')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>Login Enabled</th>
					<td>
						{{Form::checkbox('loginEnabled', true, isset($inputs['loginEnabled']) && $inputs['loginEnabled'] == true ? true : false)}}
						@if (isset($errors) && $errors->has('loginEnabled'))
							<br><span class="txt_alert">{{$errors->first('loginEnabled')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>Theme</th>
					<td>
						<label>
							{{Form::radio('preferences_theme', 'mode_white', isset($inputs['preferences_theme']) && $inputs['preferences_theme'] == 'mode_white' ? true : false)}}
							mode_white
						</label>
						<label>
							{{Form::radio('preferences_theme', 'mode_black', isset($inputs['preferences_theme']) && $inputs['preferences_theme'] == 'mode_black' ? true : false)}}
							mode_black
						</label>
						@if (isset($errors) && $errors->has('preferences_theme'))
							<br><span class="txt_alert">{{$errors->first('preferences_theme')}}</span>
						@endif
					</td>
				</tr>
				<tr>
					<th>Personal View</th>
					<td>
						{{Form::checkbox('preferences_personalView', true, isset($inputs['preferences_personalView']) && $inputs['preferences_personalView'] == true ? true : false)}}
						@if (isset($errors) && $errors->has('preferences_personalView'))
							<br><span class="txt_alert">{{$errors->first('preferences_personalView')}}</span>
						@endif
					</td>
				</tr>
			</table>
			<p class="al_c">
				{{Form::button('Cancel', array('class' => 'common_btn user_cancel'))}}
				{{Form::button('Confirmation', array('class' => 'common_btn user_confirm'))}}
			</p>
		{{Form::close()}}
	@endif
</div>
@stop