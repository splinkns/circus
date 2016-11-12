<?php

/**
 * Manager for CIRCUS RS system.
 */
class RsManager
{
	protected $rs_dir;

	public function __construct()
	{
		$this->rs_dir = realpath(app_path() . '/../vendor/utrad-ical/circus-rs');
	}

	public function getRsDir()
	{
		return $this->rs_dir;
	}

	public function checkForever()
	{
		if (!is_dir($this->rs_dir)) {
			return 'Error: CIRCUS RS package is not installed using Composer.';
		}
		if (!is_file($this->rs_dir . '/node_modules/.bin/forever')) {
			return 'Error: CIRCUS RS package is installed, but building process is not complete.' . $this->script;
		}
		if (!is_file($this->rs_dir . '/server.js')) {
			return 'Error: CIRCUS RS package is installed, but building process is not complete.';
		}
		return true;
	}

	protected function makeConfig()
	{
		$useAuthorization = ServerParam::getVal('skipRsAuthorization') !== true;
		$dbRepositoryPath = app_path() . '/dicom-file-repository/CircusDbDicomFileRepository';

		$data = [
			'dicomFileRepository' => [
				'module' => $dbRepositoryPath,
				'options' => [
					'configPath' => realpath(app_path() . '/config/db_config.json')
				]
			],
			'logger' => [
				'module' => 'Log4JsLogger',
				'options' => [
					'appenders' => [
						[
							'type' => 'dateFile',
							'filename' => storage_path('logs/circus-rs'),
							'pattern' => '-yyyy-MM-dd.log',
							'alwaysIncludePattern' => true
						]
					]
				]
			],
			'authorization' => ['enabled' => $useAuthorization]
		];
		$confFileName = storage_path('cache/circus-rs.json5');
		$content = "// Automatically generated by CIRCUS DB\n\n" . json_encode($data, JSON_PRETTY_PRINT);
		file_put_contents($confFileName, $content);
		return $confFileName;
	}

	protected function exec($command, $script = '')
	{
		$forever_root = storage_path('forever');
		putenv('FOREVER_ROOT=' . $forever_root);
		chdir($this->rs_dir);
		$script = $script ? (" " . $script) : '';
		$d = DIRECTORY_SEPARATOR;
		$com = ".{$d}node_modules{$d}.bin{$d}forever $command --plain$script";
		exec($com, $out, $retvar);
		return implode("\n", $out);
	}

	public function status()
	{
		if (($error = $this->checkForever()) !== true) {
			return $error;
		}
		return $this->exec('list');
	}

	public function start()
	{
		if (($error = $this->checkForever()) !== true) {
			return $error;
		}
		$confFile = $this->makeConfig();
		$this->exec('start', 'circus-rs.js --config=' . escapeshellarg($confFile));
		return $this->exec('list');
	}

	public function stop()
	{
		if (($error = $this->checkForever()) !== true) {
			return $error;
		}
		$this->exec('stop', 'circus-rs.js');
		return $this->exec('list');
	}

}
