<?php

/**
 * Series registration controller
 */
class SeriesRegisterController extends ApiBaseController {
	/**
	 * Series registration screen
	 */
	public function import()
	{
		$default_domain = ServerParam::getVal('defaultDomain');
		$domain_list = ServerParam::getDomainList();

		return View::make('series.input')
			->with('max_filesize', ini_get('upload_max_filesize'))
			->with('max_file_uploads', intval(ini_get('max_file_uploads')))
			->with('default_domain', $default_domain)
			->with('domains', $domain_list);
	}

	/**
	 * Actual registration (AJAX)
	 */
	public function register()
	{
		try {
			// delete old temporary files
			CommonHelper::deleteOlderTemporaryFiles(storage_path('uploads'), true, '-1 day');

			// Acquire information on the upload files
			$uploads = Input::file('files');
			if (!is_array($uploads)) throw new Exception('Upload files not specified.');

			//domain unselected
			$domain = Input::get('domain');
			if (!$domain)
				throw new Exception('Please select domain.');
			//domains no regist
			$domains = ServerParam::getVal('domains');
			if (!$domains)
				throw new Exception('Please set the domains from the management screen.');
			//domain check
			if (array_key_exists($domain, ServerParam::getDomainList()) === false)
				throw new Exception('Domain is invalid.');

			$auth_sess_key = Auth::getSession()->getId();
			$tmp_dir = storage_path('uploads/' . $auth_sess_key);
			// clear current contents of the upload folder
			CommonHelper::deleteOlderTemporaryFiles(storage_path('uploads/'. $auth_sess_key), true);

			foreach ($uploads as $upload) {
				Log::info('HELLO ' . $upload->getClientOriginalName());
				$ext = strtolower($upload->getClientOriginalExtension());
				$target = "$tmp_dir/" . $upload->getClientOriginalName();
				if ($ext == 'zip') {
					// Extract the zip file into a temp dir and import it later
					$this->thawZip($upload, $target);
				} else {
					// Import a single DICOM file
					$upload->move($tmp_dir, $upload->getClientOriginalName());
				}
			}
			// invoke artisan command to import files
			Log::debug(['IMPORT', $target]);
			$escaped_tmp_dir = escapeshellarg($tmp_dir);
			//TODO::選択されたドメインの渡し方
			$task = Task::startNewTask("image:import --recursive $escaped_tmp_dir");
			if (!$task) {
				throw new Exception('Failed to invoke image importer process.');
			}

			Session::forget('edit_case_id'); // TODO: Do we really need this?

			return Response::json(array(
				'result' => true,
				'taskID' => $task->taskID
			));
		} catch (Exception $e) {
			Log::info('[' . get_class($e) . ']');
			Log::info($e);
			return Response::json(
				array('result' => false, 'errorMessage' => $e->getMessage()),
				400
			);
		}
	}

	/**
	 * Extract a zip file.
	 * @param string $file Path to zip file
	 * @return string Extracted folder path
	 */
	protected function thawZip($file, $dir)
	{
		$zip = new ZipArchive();
		$res = $zip->open($file);
		if ($res !== true)
			throw new Exception("Error while extracting the zip file. [Error Code $res]");
		$zip->extractTo($dir);
		$zip->close();
	}

}
