<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the Closure to execute when that URI is requested.
|
*/

//ログイン画面
Route::get('/', function()
{
	//return View::make('login');
	echo "Called!!";
	return Redirect::to('login');
});
/*
Route::get('login', function(){
//	return View::make('login');
});
*/
Route::get('login', 'Logincontroller@getIndex');

Route::post('login', 'LoginController@login');

//トップページ
Route::post('home', 'TopController@getIndex');
Route::get('home', 'TopController@getIndex');

//ケース検索
Route::get('case/search', 'CaseController@getIndex');
Route::post('case/search', 'CaseController@search');

/*
//シリーズ検索
Route::get('series/search', 'SeriesController@getIndex');
Route::post('series/search', 'SeriesController@search');
*/