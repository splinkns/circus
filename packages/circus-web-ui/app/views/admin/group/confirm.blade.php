@extends('common.layout')
@include('common.header')
@section('content')
<script type="text/javascript">
	$(function() {
		$('.link_group_input').click(function(){
			//送信するフォームIDを取得
			$(this).closest('p').find('.frm_back').submit();
			return false;
		});
	});
</script>
<div class="page_contents_outer">
	<div class="page_contents_inner">
		<div class="page_unique">
			<h1 class="page_ttl">Add new Group</h1>
			{{Form::open(['url' => asset('admin/group/complete'), 'method' => 'post'])}}
				<table class="common_table mar_b_20">
					<colgroup>
						<col width="20%">
						<col width="80%">
					</colgroup>
					<tr>
						<th>Group ID</th>
						<td>
							{{$inputs['GroupID']}}
							<span class="font_red">(IDはシステム側で自動生成)</span>
						</td>
					</tr>
					<tr>
						<th>Group Name</th>
						<td>{{$inputs['GroupName']}}</td>
					</tr>
				</table>
				<h2 class="con_ttl">Admin Role</h2>
				<table class="common_table al_l">
					<colgroup>
						<col width="20%">
						<col width="80%">
					</colgroup>
					<tbody>
						<tr>
							<th>Create Project</th>
							<td>
								@if ($inputs['priviledges_createProject'] == 1)
									Yes
								@else
									No
								@endif
							</td>
						</tr>
						<tr>
							<th>Create Case</th>
							<td>
								@if ($inputs['priviledges_createCase'] == 1)
									Yes
								@else
									No
								@endif
							</td>
						</tr>
					</tbody>
				</table>
				<p class="submit_area">
					{{Form::button('Back to Edit', array('class' => 'common_btn link_group_input'))}}
					{{Form::button('Save', array('class' => 'common_btn', 'type' => 'submit'))}}
				</p>
			{{Form::close()}}
			{{Form::open(['url' => asset('admin/group/input'), 'method' => 'POST', 'id' => 'frm_back'])}}
				{{Form::hidden('btnBack', 'btnBack')}}
			{{Form::close()}}
		</div>
	</div>
	@include('common.navi')
	<div class="clear">&nbsp;</div>
</div>
@stop
@include('common.footer')