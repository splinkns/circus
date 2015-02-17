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

//Login / logout
Route::get('/', function(){return Redirect::to('login');});
Route::get('login', 'LoginController@getIndex');
Route::post('login', 'LoginController@login');
Route::get('logout', 'LoginController@logout');

// APIs
Route::resource('api/user', 'UserApiController');
Route::resource('api/group', 'GroupApiController');
Route::resource('api/storage', 'StorageApiController');
Route::put('api/storage/setactive/{storageID}', 'StorageApiController@setActive');
Route::resource('api/preference', 'UserPreferenceApiController');

Route::post('home', 'TopController@getIndex');
Route::get('home', 'TopController@getIndex');

//Case
Route::get('case/search', 'CaseController@search');
Route::post('case/search', 'CaseController@search');
Route::post('case/detail', 'CaseController@detail');
Route::post('case/edit', 'CaseController@input');
Route::post('case/input', 'CaseController@input');
Route::post('case/confirm', 'CaseController@confirm');
Route::post('case/complete', 'CaseController@register');
Route::get('case/complete', 'CaseController@complete');
//Case (for Ajax)
Route::any('case/revision', 'CaseController@revision_ajax');
Route::any('case/search_result', 'CaseController@search_ajax');
Route::any('case/save_search', 'CaseController@save_search');
Route::any('case/save_label', 'CaseController@save_label');
Route::any('case/load_label', 'CaseController@load_label');
//test用
Route::get('case/save_label', function(){
	$js = array();
	$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
	$result['js'] = $js;
	$result['title'] = 'Label save test';
	$result['url'] = '/case/save_label';
	return View::make('/sample/sample', $result);
});
Route::get('case/load_label', function(){
	$js = array();
	$js['jquery-ui.min.js'] = 'js/jquery-ui.min.js';
	$result['js'] = $js;
	$result['title'] = 'Label load test';
	$result['url'] = '/case/load_label';
	return View::make('/sample/load_sample', $result);
});

//Series
Route::get('series/search', 'SeriesController@search');
Route::post('series/search', 'SeriesController@search');
Route::post('series/detail', 'SeriesController@detail');
Route::get('series/import', 'SeriesController@input');
Route::post('series/complete', 'SeriesController@register');
Route::get('series/complete', 'SeriesController@complete');
//Series (for Ajax)
Route::any('series/save_search', 'SeriesController@save_search');
Route::get('series/get_series', 'SeriesController@get_series');

// Management screen
Route::get('admin', 'AdminController@getIndex');
// Individual Administration pages
Route::get('administration/{adminkind}', ['before' => 'auth', 'uses' => 'AdministrationController@index'])
	->where('adminkind', '^(user|group|storage|project)$');
// Preference
Route::get('preference', 'UserPreferenceController@index');

//404 pages
Event::listen('404', function()
{
    return App::abort(404);
});


