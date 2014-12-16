<?php
/**
 * グループの操作を行うクラス
 * @author stani
 * @since 2014/12/16
 */
class GroupController extends BaseController {
	/**
	 * グループ検索結果
	 * @author stani
	 * @since 2014/12/16
	 */
	public function search() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		$inputs = Input::all();

		//データ取得
		//取得カラムの設定
		$select_col = array('GroupID', 'GroupName');

		//総件数取得
		$group_count = Groups::count();

		//paginate(10)という風にpaginateを使う場合はget(select句)が指定できない
		$group_list = Groups::orderby('updateTime', 'desc')
							->get($select_col);

		$result['title'] = 'Group';
		$result['url'] = 'admin/group/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		$result['group_list'] = $group_list;

		return View::make('admin/group/search', $result);
	}

	/**
	 * グループ詳細画面
	 * @author stani
	 * @since 2014/12/16
	 */
	public function detail() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//エラーメッセージ初期化
		$error_msg = "";
		$result = array();

		//POSTデータ取得
		$inputs = Input::all();

		if (array_key_exists('GroupID', $inputs) === FALSE)
			$error_msg = 'グループIDを指定してください。';

		if (!$error_msg) {
			$group_info = Groups::addWhere($inputs)
								->get();

			if (!$group_info) {
				$error_msg = '存在しないグループIDです。';
			} else {
				$group_data = $group_info[0];
			}
		}

		Log::debug("グループ情報");
		Log::debug($group_data);
		//エラーメッセージがない場合はグループ詳細情報を表示する
		Log::debug($error_msg);
		if (!$error_msg) {
			$result['group_detail'] = $group_data;
		} else {
			$result['error_msg'] = $error_msg;
		}
		$result['title'] = 'Group Detail';
		$result['url'] = 'admin/group/detail';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();
		Log::debug($result);
		return View::make('/admin/group/detail', $result);
	}

	/**
	 * グループ登録入力
	 * @author stani
	 * @since 2014/12/16
	 */
	public function input() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();
		$series_list = array();
		$error_msg = '';
		//入力値取得
		$inputs = Input::all();

		//ページ設定
		$result['title'] = 'Add new Group';
		$result['url'] = '/admin/group/input';
		$result['back_url'] = '/group/search';
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		if (array_key_exists('GroupID', $inputs)) {
			$group_data = Groups::addWhere($inputs)
								->get();
			if ($group_data) {
				$result['inputs'] = $group_data[0];
				Session::put('id', $group_data[0]->_id);
			}
		} else {
			$result['inputs'] = array('GroupID' => self::createGroupID());
		}

		//エラーメッセージの設定
		if ($error_msg) {
			$result["error_msg"] = $error_msg;
		} else {
			Session::put('group.input', $result['inputs']);
		}
		return View::make('/admin/group/input', $result);
	}

	/**
	 * グループ登録確認
	 * @author stani
	 * @since 2014/12/16
	 */
	public function confirm() {
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();
		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//入力値取得
		$inputs = Input::all();
		$group_data = Session::get('group.input', $inputs);
		$inputs['GroupID'] = $group_data['GroupID'];
		Session::put('group.input', $inputs);

		$result['inputs'] = $inputs;

		Log::debug('入力値');
		Log::debug($inputs);

		//セッション情報取得
		$id = Session::get('id');

		//Validateチェック用オブジェクト生成
		$group_obj = $id ?
			Groups::find($id) : App::make('Groups');

		//Validateチェック用の値を設定
		$group_obj->GroupID = $inputs['GroupID'];
		$group_obj->GroupName = $inputs['GroupName'];

		//ValidateCheck
		$validator = Validator::make($inputs, Groups::getValidateRules());
		if ($validator->fails()) {
			//Validateエラー時の処理
			$result['title'] = 'Add new Group';
			$result['url'] = '/admin/group/input';
			$result['errors'] = $validator->messages();
			return View::make('/admin/group/input', $result);
		} else {
			//エラーがないので確認画面を表示
			$result['title'] = 'Add new Group Confirmation';
			$result['url'] = '/admin/group/confirm';
			return View::make('/admin/group/confirm', $result);
		}
	}

	/**
	 * グループ登録
	 * @author stani
	 * @since 2014/12/16
	 */
	public function regist(){
		//ログインチェック
		if (!Auth::check()) {
			//ログインしていないのでログイン画面に強制リダイレクト
			return Redirect::to('login');
		}

		//初期設定
		$result = array();

		//入力値取得
		//$inputs = Input::all();
		//セッションから情報取得
		$inputs = Session::get('group.input');

		Log::debug("入力値(Complete)");
		Log::debug($inputs);

		$result['css'] = self::cssSetting();
		$result['js'] = self::jsSetting();

		//Validateチェック用オブジェクト生成
		$group_obj = App::make('Groups');
		//Validateチェック用の値を設定
		$group_obj->GroupID = $inputs['GroupID'];
		$group_obj->GroupName = $inputs['GroupName'];

		//ValidateCheck
		$validator = Validator::make($inputs, Groups::getValidateRules());
		if (!$validator->fails()) {
			//Validate成功時の処理
			//エラーがないので登録する
			$dt = new MongoDate(strtotime(date('Y-m-d H:i:s')));
			$group_obj->updateTime = $dt;
			$group_obj->createTime = $dt;
			$priviledges = array();
			if (array_key_exists('priviledges_createProject', $inputs) !== FALSE){
				$priviledges[] = 'createProject';
			}
			if (array_key_exists('priviledges_createCase', $inputs) !== FALSE) {
				$priviledges[] = 'createCase';
			}
			$group_obj->priviledges = $priviledges;
			$group_obj->domains = array();
			$group_obj->save();

			if (Session::get("id"))
				$result['title'] = 'Group Edit Complete';
			else
				$result['title'] = 'Add new Group Complete';
			$result['url'] = '/admin/group/complete';
			$result['msg'] = "グル―プ情報の登録が完了しました。";
			$result['GroupID'] = $inputs['GroupID'];
			//セッション破棄
			Session::remove('group.input');
			return View::make('/admin/group/complete', $result);
		} else {
			//Validateエラー時の処理
			$result['errors'] = $validator->messages();
			$result['inputs'] = $inputs;
			if (Session::get("id"))
				$result['title'] = 'Add new Group';
			else
				$result['title'] = 'Group Edit';
			$result['url'] = '/admin/group/input';
			return View::make('/admin/group/input', $result);
		}
	}

	/**
	 * ページ個別CSS設定
	 * @author stani
	 * @since 2014/12/16
	 */
	public function cssSetting($mode = 'search') {
		$css = array();
		$css["page.css"] = "css/page.css";
		$css["color.css"] = "css/color.css";
	  	return $css;
	}

	/**
	 * ページ個別のJSの設定を行う
	 * @return ページ個別のJS設定配列
	 * @author stani
	 * @since 2014/12/16
	 */
	public function jsSetting() {
		$js = array();
		return $js;
	}

	/**
	 * グループID作成(SHA256+uniqid)
	 * @return uniqidをSHA256でHash化した文字列(ケースID)
	 * @author stani
	 * @since 2014/12/16
	 */
	public function createGroupID(){
		return hash_hmac('sha256', uniqid(), Config::get('const.hash_key'));
	}
}
