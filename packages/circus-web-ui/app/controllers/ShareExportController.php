<?php

/**
 * Export feature
 */
class ShareExportController extends BaseController
{
	/**
	 * Share Export
	 */
	public function export()
	{
		$inputs = Input::all();
		try {
			// Validation
			$this->validate($inputs);

			// Create temporary folder
			$tmp_dir = Str::random(32);
			$tmp_dir_path = storage_path('cache') . '/' . $tmp_dir;
			if (!mkdir($tmp_dir_path))
				throw new Exception('Failed to create a temporary folder.');

			// Command execution
			$caseIds = str_replace('_', ',', $_COOKIE['exportCookie']);
			$cmd_str = ' ' . $caseIds . ' ' . $tmp_dir_path;
			if ($inputs['personal'] == 0)
				$cmd_str .= ' --without-personal';
			if ($inputs['tags']) {
				$tags = implode(',', json_decode($inputs['tags'], true));
				$cmd_str .= ' --tag=' . $tags;
			}

			// Delete old transfer files
			CommonHelper::deleteOlderTemporaryFiles(storage_path('transfer'), true, '-2 day');

			$task = Task::startNewTask("case:export-volume " . $cmd_str);
			if (!$task) {
				throw new Exception('Failed to invoke export process.');
			}

			// TODO: Fix security
			if (!is_dir(storage_path('transfer'))) {
				mkdir(storage_path('transfer'), 0777, true);
			}
			$res = array(
				'file_name' => 'data.tgz',
				'dir_name' => $tmp_dir_path . '/data.tgz'
			);

			return Response::json(array(
				'result' => true,
				'taskID' => $task->taskID,
				'response' => $res
			));
		} catch (Exception $e) {
			Log::error($e);
			return Response::json(
				array('result' => false, 'errorMessage' => $e->getMessage()),
				400
			);
		}
	}

	private function validate($data)
	{
		// Check the target cases
		if ($data['export_type'] === 'btnExportSelect') {
			// export the cases which are checked
			$cases = $_COOKIE['exportCookie'];
			if (!$cases)
				throw new Exception('No cases are selected.');
			$caseIds = explode('_', $cases);
		} else {
			// export all cases matching the search criteria
			$search_data = Session::get('share.search');
			$result = ClinicalCase::searchCase($search_data);
			$caseIds = array();
			if (!$result) {
				foreach ($result as $rec) {
					$caseIds[] = $rec->caseID;
				}
			}
		}

		$projectId = "";
		foreach ($caseIds as $caseId) {
			$case = ClinicalCase::find($caseId);
			if (!$case)
				throw new Exception("Invalid case ID: $caseId.");

			if (!$projectId) $projectId = $case->projectID;
			if ($projectId !== $case->projectID)
				throw new Exception('The target cases belong to more than one project.');
		}

		if ($data['personal'] != 0 && $data['personal'] != 1)
			throw new Exception('Invalid personal data inclusion flag.');

		if ($data['tags']) {
			$tags = json_decode($data['tags'], true);
			$project = Project::find($projectId);
			foreach ($tags as $tag) {
				if (!isset($project->tags[intval($tag)])) {
					throw new Exception('Undefined tag specified.');
				}
			}
		}
	}
}
