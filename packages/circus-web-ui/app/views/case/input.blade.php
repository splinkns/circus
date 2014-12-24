@extends('common.layout')
@include('common.header')
@section('content')
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique" id="page_case_input">
			<h1 class="page_ttl">Add new Case</h1>
			<div class="al_l mar_b_10">
				{{HTML::link(asset($back_url), 'Back to Case Search', array('class' => 'common_btn', 'id' => 'btnBack'))}}
			</div>
			@if (isset($error_msg))
				<span class="txt_alert">{{$error_msg}}</span>
			@else
				{{Form::open(['url' => asset('/case/confirm'), 'method' => 'post'])}}
					<table class="common_table mar_b_10">
						<colgroup>
							<col width="10%">
							<col width="10%">
							<col width="40%">
							<col width="10%">
							<col width="30%">
						</colgroup>
						<tr>
							<th colspan="2">Case ID</th>
							<td colspan="3">{{$inputs['caseID']}}
								<span class="font_red">(ID is automatically generated by the system side)</span>
								@if (isset($errors) && $errors->has('caseID'))
									<br><span class="txt_alert">{{$errors->first('caseID')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th colspan="2">Project ID</th>
							<td colspan="3">
								{{Form::select('projectID', $project_list, isset($inputs['projectID']) ? $inputs['projectID'] : '', array('common_input_select w_300'))}}
								@if (isset($errors) && $errors->has('projectID'))
									<br><span class="txt_alert">{{$errors->first('projectID')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th rowspan="2">Patient</th>
							<th>ID</th>
							<td>
								{{$inputs['patientInfo']['patientID']}}
								@if (isset($errors) && $errors->has('patientInfo_patientID'))
									<br><span class="txt_alert">{{$errors->first('patientInfo_patientID')}}</span>
								@endif
							</td>
							<th>Age</th>
							<td>
								{{$inputs['patientInfo']['age']}}
								@if (isset($errors) && $errors->has('patientInfo_age'))
									<br><span class="txt_alert">{{$errors->first('patientInfo_age')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th>Name</th>
							<td>
								{{$inputs['patientInfo']['patientName']}}
								@if (isset($errors) && $errors->has('patientInfo_patientName'))
									<br><span class="txt_alert">{{$errors->first('patientInfo_patientName')}}</span>
								@endif
							</td>
							<th>Sex</th>
							<td>
								{{$inputs['patientInfo']['sex']}}
								@if (isset($errors) && $errors->has('patientInfo_sex'))
									<br><span class="txt_alert">{{$errors->first('patientInfo_sex')}}</span>
								@endif
							</td>
						</tr>
						<tr>
							<th colspan="2">Series</th>
							<td colspan="3">
								<p>Please correct the order of the series.</p>
								<div id="series_order_wrap" class="w_500">
									<ul class="ui-sortable">
										@foreach($series_list as $key => $value)
											<li class="ui-state-dafault">{{$value}}
												<input type="hidden" value="{{$key}}" name="series[]">
											</li>
										@endforeach
									</ul>
								</div>
								@if (isset($errors) && $errors->has('series'))
									<br><span class="txt_alert">{{$errors->first('series')}}</span>
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