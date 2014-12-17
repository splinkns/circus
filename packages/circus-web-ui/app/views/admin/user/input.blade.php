@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Add new User</h1>
			<div class="al_l mar_b_10">
				{{HTML::link(asset('admin/user/search'), 'Back to User List', array('class' => 'common_btn'))}}
			</div>
			@if (isset($error_msg))
				<span class="text_alert">{{$error_msg}}</span>
			@else
				{{Form::open(['url' => asset('admin/user/confirm'), 'method' => 'POST'])}}
					<table class="common_table mar_b_10">
						<colgroup>
							<col width="20%">
							<col width="80%">
						</colgroup>
						<tr>
							<th>User ID</th>
							<td>
								{{$inputs['userID']}}
								<span class="font_red">(IDはシステム側で自動生成)</span>
								@if (isset($errors) && $errors->has('userID'))
									<br><span class="text_alert">{{$errors->first('userID')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>Login ID</th>
							<td>
								{{Form::text('loginID', isset($inputs['loginID']) && $inputs['loginID'] ? $inputs['loginID'] : '', array('class' => 'common_input_text w_300'))}}
								@if (isset($errors) && $errors->has('loginID'))
									<br><span class="text_alert">{{$errors->first('loginID')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>Password</th>
							<td>
								{{Form::password('password', array('class' => 'common_input_text w_300'))}}
								@if (isset($errors) && $errors->has('password'))
									<br><span class="text_alert">{{$errors->first('password')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>User Name</th>
							<td>
								{{Form::text('description', isset($inputs['description']) && $inputs['description'] ? $inputs['description'] : '', array('class' => 'common_input_text w_300'))}}
								@if (isset($errors) && $errors->has('description'))
									<br><span class="text_alert">{{$errors->first('description')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>Group</th>
							<td>
								{{Form::select('groups[]', $group_list, isset($inputs["groups"]) ? $inputs["groups"] : null, array('class' => 'multi_select w_300', "multiple" => "multiple"))}}
								(multiple select available)
								@if (isset($errors) && $errors->has('groups'))
									<br><span class="text_alert">{{$errors->first('groups')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>Login Enabled</th>
							<td>
								{{Form::checkbox('loginEnabled', true, isset($inputs['loginEnabled']) && $inputs['loginEnabled'] == true ? true : false)}}
								@if (isset($errors) && $errors->has('loginEnabled'))
									<br><span class="text_alert">{{$errors->first('loginEnabled')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>Theme</th>
							<td>
								<label>
									{{Form::radio('preferences_theme', 'mode_white', isset($inputs['preferences_theme']) && $inputs['preferences_theme'] == 0 ? true : false)}}
									mode_white
								</label>
								<label>
									{{Form::radio('preferences_theme', 'mode_black', isset($inputs['preferences_theme']) && $inputs['preferences_theme'] == 1 ? true : false)}}
									mode_black
								</label>
							</td>
						</tr>
						<tr>
							<th>Personal View</th>
							<td>
								{{Form::checkbox('preferences_personalView', true, isset($inputs['preferences_personalView']) && $inputs['preferences_personalView'] == true ? true : false)}}
								@if (isset($errors) && $errors->has('preferences_personalView'))
									<br><span class="text_alert">{{$errors->first('preferences_personalView')}}</span>
								@endif
							</td>
						</tr>
					</table>
					<p class="al_c">
						{{Form::button('Confirmation', array('type' => 'submit', 'class' => 'common_btn'))}}
					</p>
				{{Form::close()}}
			@endif
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')