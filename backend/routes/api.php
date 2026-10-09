<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);


    /*
    |--------------------------------------------------------------------------
    | Authenticated Routes
    |--------------------------------------------------------------------------
    */

    Route::middleware('auth:sanctum')->group(function () {

        // Authentication

        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::put('/auth/profile', [AuthController::class, 'update']);

        Route::put('/auth/password', [AuthController::class, 'changePassword']);

        Route::post('/auth/logout', [AuthController::class, 'logout']);


        // Orders

        Route::post('/orders', [OrderController::class, 'store']);

        Route::get('/orders', [OrderController::class, 'index']);

        Route::get('/orders/{orderNumber}', [OrderController::class, 'show']);

        // Cancel order

        Route::post(
            '/orders/{orderNumber}/cancel',
            [OrderController::class, 'cancel']
        );

        // Delete cancelled order

        Route::delete(
            '/orders/{orderNumber}',
            [OrderController::class, 'destroy']
        );

        // Test payment

        Route::post(
            '/orders/{orderNumber}/pay',
            [OrderController::class, 'pay']
        );


        /*
        |--------------------------------------------------------------------------
        | Admin
        |--------------------------------------------------------------------------
        */

        Route::middleware('admin')->prefix('admin')->group(function () {
            Route::get('/dashboard', [AdminController::class, 'dashboard']);
        });
    });


    /*
    |--------------------------------------------------------------------------
    | Categories
    |--------------------------------------------------------------------------
    */

    Route::get('/categories', [CategoryController::class, 'index']);

    Route::get('/categories/{slug}', [CategoryController::class, 'show']);


    /*
    |--------------------------------------------------------------------------
    | Brands
    |--------------------------------------------------------------------------
    */

    Route::get('/brands', [BrandController::class, 'index']);

    Route::get('/brands/{slug}', [BrandController::class, 'show']);


    /*
    |--------------------------------------------------------------------------
    | Products
    |--------------------------------------------------------------------------
    */

    Route::get('/products', [ProductController::class, 'index']);

    Route::get('/products/featured', [ProductController::class, 'featured']);

    Route::get('/products/newest', [ProductController::class, 'newest']);

    Route::get('/products/{slug}', [ProductController::class, 'show']);
});